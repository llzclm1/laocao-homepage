import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import { DEFAULT_DB_PATH, openV2Store, readUnifiedView } from './store.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function parseArgs(argv) {
  const options = { dbPath: DEFAULT_DB_PATH, execute: false, confirmProduction: false };
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--db') options.dbPath = argv[++index];
    else if (value === '--manifest') options.manifestPath = argv[++index];
    else if (value === '--report') options.reportPath = argv[++index];
    else if (value === '--execute') options.execute = true;
    else if (value === '--confirm-production') options.confirmProduction = true;
  }
  return options;
}

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function loadManifest(file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  requiredText(manifest.reconciliation_id, 'reconciliation_id');
  requiredText(manifest.dry_run_report, 'dry_run_report');
  if (!Array.isArray(manifest.records) || !manifest.records.length) throw new Error('manifest.records is required');
  const ids = new Set();
  for (const record of manifest.records) {
    requiredText(record.opportunity_id, 'record.opportunity_id');
    requiredText(record.action, 'record.action');
    requiredText(record.recovery_reason, 'record.recovery_reason');
    requiredText(record.source_assessment, 'record.source_assessment');
    if (ids.has(record.opportunity_id)) throw new Error(`duplicate opportunity_id: ${record.opportunity_id}`);
    ids.add(record.opportunity_id);
  }
  return manifest;
}

function statusCounts(view) {
  return view.reduce((counts, row) => {
    counts[row.current_status] = (counts[row.current_status] || 0) + 1;
    return counts;
  }, {});
}

function contentCounts(db) {
  return db.prepare('SELECT content_type, COUNT(*) AS count FROM content_items GROUP BY content_type ORDER BY content_type').all();
}

function snapshot(store, manifest) {
  const view = readUnifiedView(store.db);
  const rows = new Map(view.map((row) => [row.opportunity_id, row]));
  return {
    statuses: statusCounts(view),
    lifecycle_events: store.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count,
    content_items: contentCounts(store.db),
    records: manifest.records.map((record) => {
      const row = rows.get(record.opportunity_id);
      return {
        opportunity_id: record.opportunity_id,
        current_status: row?.current_status || null,
        publish_draft_exists: Boolean(row?.content?.latest_publish_draft),
        action: record.action,
      };
    }),
  };
}

function writeReport(file, report) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

export function reconcileInvalidReady({ dbPath = DEFAULT_DB_PATH, manifestPath, reportPath, execute = false, confirmProduction = false, now = new Date() } = {}) {
  if (!manifestPath) throw new Error('--manifest is required');
  if (execute && path.resolve(dbPath) === path.resolve(DEFAULT_DB_PATH) && !confirmProduction) {
    throw new Error('production execution requires --confirm-production');
  }
  const manifest = loadManifest(manifestPath);
  const store = openV2Store({ dbPath, rebuildView: true });
  try {
    const before = snapshot(store, manifest);
    const rows = new Map(readUnifiedView(store.db).map((row) => [row.opportunity_id, row]));
    const decisions = manifest.records.map((record) => {
      const row = rows.get(record.opportunity_id);
      if (!row) return { ...record, result: 'skipped_missing_opportunity' };
      if (row.current_status !== 'ready_to_publish') return { ...record, result: `skipped_state_${row.current_status}` };
      if (row.content?.latest_publish_draft) return { ...record, result: 'skipped_publish_draft_exists' };
      return { ...record, result: execute ? 'reconciled' : 'planned_reconciliation' };
    });

    if (execute) {
      const writer = new LifecycleEventStore({ db: store.db });
      for (const decision of decisions) {
        if (decision.result !== 'reconciled') continue;
        const event = writer.reconcileMissingPublishDraft(decision.opportunity_id, {
          reconciliationId: manifest.reconciliation_id,
          recoveryReason: decision.recovery_reason,
          sourceAssessment: decision.source_assessment,
          dryRunReport: manifest.dry_run_report,
          actor: 'system-content-reconciliation',
          occurredAt: now.toISOString(),
        });
        decision.event_id = event.event_id;
      }
    }

    const after = snapshot(store, manifest);
    const report = {
      reconciliation_id: manifest.reconciliation_id,
      dry_run_report: manifest.dry_run_report,
      db_path: dbPath,
      mode: execute ? 'execute' : 'dry_run',
      generated_at: now.toISOString(),
      before,
      decisions,
      after,
      lifecycle_events_added: after.lifecycle_events - before.lifecycle_events,
      content_items_added: after.content_items.reduce((sum, item) => sum + item.count, 0) - before.content_items.reduce((sum, item) => sum + item.count, 0),
    };
    if (reportPath) writeReport(reportPath, report);
    return report;
  } finally {
    store.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv);
    const report = reconcileInvalidReady(options);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
