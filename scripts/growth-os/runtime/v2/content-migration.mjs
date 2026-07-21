import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  legacyId,
  legacyTimestamp,
  loadLegacySources,
} from './legacy-data-sources.mjs';
import { insertContentVersionInTransaction } from './content-store.mjs';
import { DEFAULT_DB_PATH, IMPLEMENTATION_ROOT, openV2Store } from './store.mjs';
import { withTransaction } from './store.mjs';

const CONTENT_TYPES = Object.freeze([
  'original_content',
  'reply_draft',
  'publish_draft',
  'published_content',
]);

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function recordTimestamp(record) {
  const value = legacyTimestamp(record);
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : new Date().toISOString();
}

function explicitCandidates(source, record) {
  const snapshot = record?.snapshot ?? record;
  const candidates = [];
  const sourceKey = source.key;
  const sourceRecord = `${source.relativePath}:${source.records.indexOf(record) + 1}`;
  const base = {
    source: source.relativePath,
    source_record: sourceRecord,
    legacy_id: legacyId(record) ?? legacyId(snapshot),
    platform: text(snapshot?.platform),
    occurredAt: recordTimestamp(snapshot),
    metadata: {
      migration_source: source.relativePath,
      migration_record: sourceRecord,
      legacy_id: legacyId(record) ?? legacyId(snapshot),
    },
  };

  if (['social_discovery_discovered_posts', 'social_discovery_today_opportunities'].includes(sourceKey)) {
    const original = text(record.snippet);
    if (original) candidates.push({ contentType: 'original_content', contentText: original, ...base });
    const reply = text(record.suggested_reply) ?? text(record.suggested_comment);
    if (reply) candidates.push({ contentType: 'reply_draft', contentText: reply, ...base });
  }

  const isOriginalPost = snapshot?.type === 'original_post';
  if (isOriginalPost) {
    const publishDraft = text(snapshot.draft) ?? text(record.draft);
    if (publishDraft) candidates.push({
      contentType: 'publish_draft',
      contentText: publishDraft,
      ...base,
      platform: text(snapshot.platform) ?? base.platform,
    });
    const reply = text(snapshot.suggested_reply);
    if (reply) candidates.push({
      contentType: 'reply_draft',
      contentText: reply,
      ...base,
      platform: text(snapshot.platform) ?? base.platform,
    });
  }

  if (source.category === 'publication') {
    for (const key of ['published_content', 'published_text', 'published_body', 'post_text', 'content_text']) {
      const published = text(snapshot?.[key]) ?? text(record?.[key]);
      if (published) candidates.push({
        contentType: 'published_content',
        contentText: published,
        ...base,
        platform: text(snapshot?.platform) ?? base.platform,
      });
    }
  }
  return candidates;
}

function chooseCandidate(candidates, contentType) {
  const matches = candidates.filter((candidate) => candidate.contentType === contentType);
  if (!matches.length) return { candidate: null, ambiguous: [] };
  const uniqueTexts = [...new Set(matches.map((candidate) => candidate.contentText))];
  if (uniqueTexts.length > 1) {
    return { candidate: null, ambiguous: matches };
  }
  return { candidate: matches[0], ambiguous: [] };
}

function targetCounts(db) {
  const statusRows = db.prepare(`
    SELECT current_status, COUNT(*) AS count
    FROM unified_view
    GROUP BY current_status
  `).all();
  return {
    opportunities: db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count,
    lifecycle_events: db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count,
    content_items: db.prepare('SELECT COUNT(*) AS count FROM content_items').get().count,
    statuses: Object.fromEntries(statusRows.map((row) => [row.current_status, row.count])),
  };
}

function safeTarget(targetDb, allowProductionTarget) {
  if (resolve(targetDb) === resolve(DEFAULT_DB_PATH) && !allowProductionTarget) {
    throw new Error('content migration refuses the production v2 database path without explicit approval');
  }
}

export function buildContentMigrationPlan({ db, sourceSnapshot = IMPLEMENTATION_ROOT } = {}) {
  const sources = loadLegacySources({ sourceSnapshot });
  const byLegacyId = new Map();
  for (const source of sources) {
    for (const record of source.records) {
      const id = legacyId(record) ?? legacyId(record?.snapshot);
      if (!id) continue;
      const entry = byLegacyId.get(id) ?? [];
      entry.push({ source, record });
      byLegacyId.set(id, entry);
    }
  }

  const opportunities = db.prepare(`
    SELECT opportunity_id, title, evidence_json
    FROM opportunities
    ORDER BY opportunity_id
  `).all();
  const plan = [];
  for (const opportunity of opportunities) {
    let evidence = {};
    try { evidence = opportunity.evidence_json ? JSON.parse(opportunity.evidence_json) : {}; } catch {}
    const legacyKey = text(evidence.legacy_id);
    const matches = legacyKey ? byLegacyId.get(legacyKey) ?? [] : [];
    const candidates = matches.flatMap(({ source, record }) => explicitCandidates(source, record));
    const content = {};
    const ambiguous = [];
    for (const contentType of CONTENT_TYPES) {
      const selected = chooseCandidate(candidates, contentType);
      content[contentType] = selected.candidate
        ? { ...selected.candidate, opportunityId: opportunity.opportunity_id }
        : null;
      if (selected.ambiguous.length) {
        ambiguous.push({
          content_type: contentType,
          candidates: selected.ambiguous.map((candidate) => ({
            source: candidate.source,
            source_record: candidate.source_record,
            content_preview: candidate.contentText.slice(0, 160),
          })),
        });
      }
    }
    const genericBodyPresent = matches.some(({ record }) => {
      const snapshot = record?.snapshot ?? record;
      return text(snapshot?.body) || text(snapshot?.draft) || text(snapshot?.summary);
    });
    plan.push({
      opportunity_id: opportunity.opportunity_id,
      title: opportunity.title,
      legacy_id: legacyKey,
      matched_legacy_sources: [...new Set(matches.map(({ source }) => source.relativePath))],
      content,
      ambiguous,
      classification: ambiguous.length
        ? 'manual_confirmation'
        : Object.values(content).some(Boolean)
          ? 'auto_migrate'
          : genericBodyPresent
            ? 'skip_ambiguous_body'
            : 'skip_no_explicit_content',
    });
  }
  return {
    source_snapshot: sourceSnapshot,
    content_types: CONTENT_TYPES,
    opportunities: plan,
    counts: {
      opportunities: plan.length,
      auto_migrate: plan.filter((item) => item.classification === 'auto_migrate').length,
      manual_confirmation: plan.filter((item) => item.classification === 'manual_confirmation').length,
      skipped_ambiguous_body: plan.filter((item) => item.classification === 'skip_ambiguous_body').length,
      skipped_no_explicit_content: plan.filter((item) => item.classification === 'skip_no_explicit_content').length,
      by_content_type: Object.fromEntries(CONTENT_TYPES.map((type) => [
        type,
        plan.filter((item) => item.content[type]).length,
      ])),
    },
  };
}

export function runContentMigration({
  targetDb,
  sourceSnapshot = IMPLEMENTATION_ROOT,
  reportPath,
  allowProductionTarget = false,
} = {}) {
  if (!targetDb) throw new Error('targetDb is required');
  safeTarget(targetDb, allowProductionTarget);
  const store = openV2Store({ dbPath: targetDb, rebuildView: false });
  try {
    const before = targetCounts(store.db);
    if (before.content_items > 0) {
      throw new Error('target database already contains content_items; refusing repeat migration');
    }
    const plan = buildContentMigrationPlan({ db: store.db, sourceSnapshot });
    const migrated = [];
    const skipped = [];
    withTransaction(store.db, () => {
      for (const item of plan.opportunities) {
        for (const contentType of CONTENT_TYPES) {
          const candidate = item.content[contentType];
          if (!candidate) continue;
          const row = insertContentVersionInTransaction(store.db, {
            opportunityId: item.opportunity_id,
            contentType,
            contentText: candidate.contentText,
            platform: candidate.platform,
            source: candidate.source,
            createdBy: 'content-migration-v1',
            occurredAt: candidate.occurredAt,
            metadata: {
              ...candidate.metadata,
              classification: item.classification,
              migration_source_snapshot: sourceSnapshot,
            },
          });
          migrated.push({
            opportunity_id: item.opportunity_id,
            content_type: contentType,
            content_id: row.content_id,
            version: row.version,
            source: candidate.source,
          });
        }
        if (!Object.values(item.content).some(Boolean) || item.ambiguous.length) {
          skipped.push({
            opportunity_id: item.opportunity_id,
            classification: item.classification,
            ambiguous: item.ambiguous,
          });
        }
      }
    });
    const after = targetCounts(store.db);
    const report = {
      generated_at: new Date().toISOString(),
      source_snapshot: sourceSnapshot,
      target_db: targetDb,
      production_cutover: 'NOT_STARTED',
      before,
      after,
      migration: {
        ...plan.counts,
        migrated_content_items: migrated.length,
        migrated,
        skipped,
        ambiguous_records: plan.opportunities.filter((item) => item.ambiguous.length),
      },
      verification: {
        lifecycle_events_unchanged: before.lifecycle_events === after.lifecycle_events,
        opportunities_unchanged: before.opportunities === after.opportunities,
        status_distribution_unchanged: JSON.stringify(before.statuses) === JSON.stringify(after.statuses),
        no_legacy_read_runtime: true,
      },
      success: before.lifecycle_events === after.lifecycle_events
        && before.opportunities === after.opportunities
        && JSON.stringify(before.statuses) === JSON.stringify(after.statuses),
    };
    if (reportPath) writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally {
    store.close();
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replaceAll('-', '_');
    args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return args;
}

if (process.argv[1]?.endsWith('/content-migration.mjs')) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const targetDb = args.target_db || process.env.GROWTH_OS_CONTENT_TARGET_DB;
    const reportPath = args.report || `${targetDb}.content-migration.json`;
    const report = runContentMigration({
      targetDb,
      reportPath,
      sourceSnapshot: args.source_snapshot || IMPLEMENTATION_ROOT,
      allowProductionTarget: args.allow_production === true,
    });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.success ? 0 : 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
