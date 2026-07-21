import { writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLegacySources } from './legacy-data-sources.mjs';
import { scoreDiscoveryItem } from './discovery-relevance.mjs';
import { DEFAULT_DB_PATH } from './store.mjs';

function parseArgs(argv) {
  const args = { dbPath: DEFAULT_DB_PATH, reportPath: null, sourceSnapshot: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--db') args.dbPath = argv[++index];
    if (value === '--report') args.reportPath = argv[++index];
    if (value === '--source-snapshot') args.sourceSnapshot = argv[++index];
  }
  return args;
}

function readPendingRows(db) {
  return db.prepare(`
    SELECT
      unified_view.opportunity_id,
      unified_view.title,
      unified_view.source_url,
      unified_view.body,
      opportunities.evidence_json
    FROM unified_view
    JOIN opportunities
      ON opportunities.opportunity_id = unified_view.opportunity_id
    WHERE unified_view.current_status = 'pending_review'
    ORDER BY unified_view.opportunity_id ASC
  `).all();
}

function sourceRecordFor(row, sources, sourceSnapshot) {
  let evidence = {};
  try {
    evidence = JSON.parse(row.evidence_json || '{}');
  } catch {
    evidence = {};
  }
  const snapshot = sourceSnapshot || evidence.source_snapshot;
  const match = String(evidence.migration_record || '').match(/^([^:]+):(\d+)$/);
  const source = match ? sources.get(match[1]) : null;
  const record = source?.records?.find((candidate) =>
    [candidate?.id, candidate?.opportunity_id, candidate?.opportunityId]
      .some((value) => value && String(value) === String(row.opportunity_id))
  ) || source?.records?.[Number(match?.[2]) - 1];
  if (!record) return { input: row, basis: 'v2_opportunity_body' };
  return {
    basis: 'legacy_snapshot_record',
    snapshot,
    input: {
      ...row,
      title: record.title || record.topic || row.title,
      source_url: record.url || record.source_url || row.source_url,
      body: record.snippet || record.body || record.description || row.body,
      platform: record.platform,
      source_name: record.source_name,
      source_method: record.source_method,
      author: record.author,
    },
  };
}

function auditRow(row, sourceCache, sourceSnapshot) {
  let evidence = {};
  try {
    evidence = JSON.parse(row.evidence_json || '{}');
  } catch {
    evidence = {};
  }
  const snapshot = sourceSnapshot || evidence.source_snapshot;
  if (snapshot && !sourceCache.has(snapshot)) {
    sourceCache.set(snapshot, new Map(loadLegacySources({ sourceSnapshot: snapshot }).map((source) => [source.key, source])));
  }
  const resolved = sourceRecordFor(row, sourceCache.get(snapshot) || new Map(), snapshot);
  const relevance = scoreDiscoveryItem({
    ...resolved.input,
  });
  return {
    opportunity_id: row.opportunity_id,
    title: row.title,
    source_url: row.source_url,
    category: relevance.category,
    category_label: relevance.category_label,
    score: relevance.score,
    band: relevance.band,
    decision: relevance.decision,
    reasons: relevance.reasons,
    signals: relevance.signals,
    audit_basis: resolved.basis,
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const db = new DatabaseSync(args.dbPath);
  try {
    const sourceCache = new Map();
    const rows = readPendingRows(db).map((row) => auditRow(row, sourceCache, args.sourceSnapshot));
    const counts = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((category) => [
      category,
      rows.filter((row) => row.category === category).length,
    ]));
    const report = {
      generated_at: new Date().toISOString(),
      source: args.dbPath,
      production_data_changed: false,
      pending_review_total: rows.length,
      categories: counts,
      strongly_relevant: rows.filter((row) => row.category === 'A'),
      possibly_relevant: rows.filter((row) => row.category === 'B'),
      irrelevant: rows.filter((row) => row.category === 'C'),
      system_policy: rows.filter((row) => row.category === 'D'),
      automated_pinned: rows.filter((row) => row.category === 'E'),
      dry_run: {
        keep: rows.filter((row) => row.decision === 'keep'),
        archive: rows.filter((row) => row.decision === 'reject'),
        manual_review: rows.filter((row) => row.decision === 'manual_review'),
      },
    };
    if (args.reportPath) {
      writeFileSync(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      report.report_path = resolve(args.reportPath);
    }
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    db.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}

export { auditRow, main, readPendingRows };
