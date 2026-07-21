import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import { DEFAULT_DB_PATH, openV2Store } from './store.mjs';

const CLEANUP_ACTOR = 'system-relevance-cleanup';
const REQUIRED_KEEP_COUNT = 5;
const REQUIRED_ARCHIVE_COUNT = 50;

function parseArgs(argv) {
  const args = {
    dbPath: DEFAULT_DB_PATH,
    reportPath: null,
    outputPath: null,
    backupPath: null,
    reuseBackup: false,
    cleanupId: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--db') args.dbPath = argv[++index];
    if (value === '--report') args.reportPath = argv[++index];
    if (value === '--output') args.outputPath = argv[++index];
    if (value === '--backup') args.backupPath = argv[++index];
    if (value === '--reuse-backup') args.reuseBackup = true;
    if (value === '--cleanup-id') args.cleanupId = argv[++index];
  }
  return args;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function requireArgument(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function loadFrozenReport(reportPath) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  if (report.production_data_changed !== false) {
    throw new Error('dry-run report is not marked production_data_changed=false');
  }
  const keep = report.dry_run?.keep;
  const archive = report.dry_run?.archive;
  const manualReview = report.dry_run?.manual_review || [];
  if (!Array.isArray(keep) || !Array.isArray(archive) || !Array.isArray(manualReview)) {
    throw new Error('dry-run report has invalid dry_run lists');
  }
  if (keep.length !== REQUIRED_KEEP_COUNT || archive.length !== REQUIRED_ARCHIVE_COUNT) {
    throw new Error(
      `dry-run report must contain exactly ${REQUIRED_KEEP_COUNT} keep and ${REQUIRED_ARCHIVE_COUNT} archive records`,
    );
  }
  if (manualReview.length > 0) {
    throw new Error('dry-run report contains manual_review records');
  }

  const seen = new Set();
  for (const row of [...keep, ...archive]) {
    if (!row.opportunity_id || seen.has(row.opportunity_id)) {
      throw new Error(`dry-run report has duplicate or missing opportunity_id: ${row.opportunity_id}`);
    }
    seen.add(row.opportunity_id);
  }
  for (const row of archive) {
    if (row.decision !== 'reject' || !['C', 'D', 'E'].includes(row.category)) {
      throw new Error(`archive record is not a frozen C/D/E rejection: ${row.opportunity_id}`);
    }
    if (!Number.isFinite(Number(row.score)) || !row.rejection_reason && !row.reasons?.length) {
      throw new Error(`archive record lacks score or rejection reason: ${row.opportunity_id}`);
    }
  }

  return { keep, archive, manualReview };
}

function statusCounts(db) {
  return Object.fromEntries(
    db
      .prepare('SELECT current_status AS status, COUNT(*) AS count FROM unified_view GROUP BY current_status')
      .all()
      .map(({ status, count }) => [status, Number(count)]),
  );
}

function tableCounts(db) {
  const tables = ['opportunities', 'lifecycle_events', 'performance', 'brief_deliveries'];
  return Object.fromEntries(tables.map((table) => [
    table,
    Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count),
  ]));
}

function currentStatus(db, opportunityId) {
  return db
    .prepare('SELECT current_status FROM unified_view WHERE opportunity_id = ?')
    .get(opportunityId)?.current_status || null;
}

function existingCleanupEvent(db, opportunityId, cleanupId) {
  const event = db
    .prepare(`
      SELECT event_id, opportunity_id, from_status, to_status, event_type, actor,
             occurred_at, evidence_ref
      FROM lifecycle_events
      WHERE opportunity_id = ?
        AND event_type = 'archive_irrelevant_discovery'
        AND actor = ?
      ORDER BY event_seq DESC
      LIMIT 1
    `)
    .get(opportunityId, CLEANUP_ACTOR);
  if (!event) return null;
  try {
    return JSON.parse(event.evidence_ref || '{}').cleanup_id === cleanupId ? event : null;
  } catch {
    return null;
  }
}

function createBackup(dbPath, backupPath) {
  if (!existsSync(dbPath)) {
    throw new Error(`production database does not exist: ${dbPath}`);
  }
  if (existsSync(backupPath)) {
    throw new Error(`backup already exists: ${backupPath}`);
  }
  mkdirSync(dirname(backupPath), { recursive: true });
  const source = new DatabaseSync(dbPath, { readOnly: true });
  try {
    writeFileSync(backupPath, source.serialize());
  } finally {
    source.close();
  }
  return backupPath;
}

function cleanup({ dbPath, reportPath, outputPath, backupPath, reuseBackup, cleanupId }) {
  if (resolve(dbPath) !== resolve(DEFAULT_DB_PATH)) {
    throw new Error(`refusing non-production database: ${dbPath}`);
  }
  const frozen = loadFrozenReport(reportPath);
  const generatedAt = new Date().toISOString();
  const defaultBackupPath = `${dirname(dbPath)}/growth-os-v2-before-relevance-cleanup-${timestamp()}.sqlite`;
  const resolvedBackupPath = backupPath || defaultBackupPath;
  const resolvedCleanupId = cleanupId || `GROWTH-RELEVANCE-CLEANUP-${timestamp()}`;
  const resolvedOutputPath = outputPath
    || `${dirname(dbPath)}/../import-reports/growth-os-v2-relevance-cleanup-${timestamp()}.json`;
  const frozenReportPath = resolve(reportPath);

  if (!reuseBackup) {
    createBackup(dbPath, resolvedBackupPath);
  } else if (!existsSync(resolvedBackupPath)) {
    throw new Error(`requested existing backup does not exist: ${resolvedBackupPath}`);
  }

  // The lifecycle constraint upgrade may recreate lifecycle_events. Rebuild the
  // derived view in the same store-open step before any status checks or writes.
  const preparedStore = openV2Store({ dbPath, rebuildView: true });
  preparedStore.close();

  const beforeDb = new DatabaseSync(dbPath);
  const before = {
    status_counts: statusCounts(beforeDb),
    table_counts: tableCounts(beforeDb),
  };
  const eligible = [];
  const alreadyArchived = [];
  const skipped = [];
  for (const row of frozen.archive) {
    const status = currentStatus(beforeDb, row.opportunity_id);
    if (status === 'pending_review') {
      eligible.push(row);
    } else if (status === 'archived' && existingCleanupEvent(beforeDb, row.opportunity_id, resolvedCleanupId)) {
      alreadyArchived.push(row);
    } else {
      skipped.push({
        opportunity_id: row.opportunity_id,
        title: row.title,
        source_url: row.source_url,
        expected_status: 'pending_review',
        actual_status: status,
        reason: status ? 'state_changed_before_cleanup' : 'opportunity_not_found',
      });
    }
  }
  beforeDb.close();

  const archived = [];
  const executionSkips = [];
  let store;
  try {
    store = openV2Store({ dbPath, rebuildView: true });
    const writer = new LifecycleEventStore({ db: store.db });
    for (const row of eligible) {
      const archivedAt = new Date().toISOString();
      const rejectionReason = Array.isArray(row.rejection_reason || row.reasons)
        ? (row.rejection_reason || row.reasons).join('; ')
        : String(row.rejection_reason || row.reasons);
      try {
        const event = writer.archiveIrrelevantDiscovery(row.opportunity_id, {
          cleanupId: resolvedCleanupId,
          relevanceScore: row.score,
          relevanceCategory: row.category,
          rejectionReason,
          sourceUrl: row.source_url,
          dryRunReport: frozenReportPath,
          archivedAt,
          actor: CLEANUP_ACTOR,
        });
        archived.push({
          opportunity_id: row.opportunity_id,
          title: row.title,
          source_url: row.source_url,
          score: row.score,
          category: row.category,
          rejection_reason: rejectionReason,
          event_id: event.event_id,
          archived_at: archivedAt,
        });
      } catch (error) {
        const actualStatus = currentStatus(store.db, row.opportunity_id);
        executionSkips.push({
          opportunity_id: row.opportunity_id,
          title: row.title,
          source_url: row.source_url,
          expected_status: 'pending_review',
          actual_status: actualStatus,
          reason: actualStatus && actualStatus !== 'pending_review'
            ? 'state_changed_during_cleanup'
            : 'archive_write_failed',
          error: error.message,
        });
      }
    }
  } finally {
    store?.close();
  }

  const afterDb = new DatabaseSync(dbPath, { readOnly: true });
  const after = {
    status_counts: statusCounts(afterDb),
    table_counts: tableCounts(afterDb),
  };
  const archiveEvents = afterDb
    .prepare(`
      SELECT event_id, opportunity_id, from_status, to_status, event_type, actor,
             occurred_at, evidence_ref
      FROM lifecycle_events
      WHERE event_type = 'archive_irrelevant_discovery'
        AND actor = ?
        AND json_extract(evidence_ref, '$.cleanup_id') = ?
      ORDER BY event_seq ASC
    `)
    .all(CLEANUP_ACTOR, resolvedCleanupId);
  const keptStatuses = Object.fromEntries(
    frozen.keep.map((row) => [row.opportunity_id, currentStatus(afterDb, row.opportunity_id)]),
  );
  afterDb.close();

  const allArchived = [...alreadyArchived, ...archived];
  const newArchiveEventCount = archived.length;
  const integrity = {
    archive_count_matches: allArchived.length === REQUIRED_ARCHIVE_COUNT,
    no_skips: skipped.length === 0 && executionSkips.length === 0,
    pending_review_expected: after.status_counts.pending_review === REQUIRED_KEEP_COUNT,
    approved_unchanged: after.status_counts.approved === before.status_counts.approved,
    ready_to_publish_unchanged: after.status_counts.ready_to_publish === before.status_counts.ready_to_publish,
    published_unchanged: after.status_counts.published === before.status_counts.published,
    opportunities_unchanged: after.table_counts.opportunities === before.table_counts.opportunities,
    performance_unchanged: after.table_counts.performance === before.table_counts.performance,
    brief_deliveries_unchanged: after.table_counts.brief_deliveries === before.table_counts.brief_deliveries,
    lifecycle_events_added_once: after.table_counts.lifecycle_events
      === before.table_counts.lifecycle_events + newArchiveEventCount,
    append_only_events_verified: archiveEvents.length === REQUIRED_ARCHIVE_COUNT
      && archiveEvents.every((event) => (
        event.from_status === 'pending_review'
        && event.to_status === 'archived'
        && event.event_type === 'archive_irrelevant_discovery'
        && event.actor === CLEANUP_ACTOR
      )),
    kept_statuses: keptStatuses,
  };
  const passed = Object.entries(integrity)
    .filter(([key]) => key !== 'kept_statuses')
    .every(([, value]) => value === true);
  const result = {
    cleanup_id: resolvedCleanupId,
    generated_at: generatedAt,
    database: dbPath,
    database_backup: resolvedBackupPath,
    dry_run_report: frozenReportPath,
    actor: CLEANUP_ACTOR,
    frozen_keep: frozen.keep,
    frozen_archive: frozen.archive,
    already_archived: alreadyArchived.map((row) => ({
      opportunity_id: row.opportunity_id,
      title: row.title,
      source_url: row.source_url,
    })),
    skipped_due_to_state_change: [...skipped, ...executionSkips],
    archived,
    archived_count: allArchived.length,
    new_archive_event_count: newArchiveEventCount,
    before,
    after,
    archive_events: archiveEvents,
    integrity,
    status: passed ? 'completed' : 'failed',
    production_data_changed: newArchiveEventCount > 0 || alreadyArchived.length > 0,
  };
  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ...result,
    output: resolve(resolvedOutputPath),
  }, null, 2));
  if (!passed) process.exitCode = 1;
  return result;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  requireArgument(args.reportPath, '--report');
  return cleanup({
    ...args,
    reportPath: resolve(args.reportPath),
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}

export { cleanup, loadFrozenReport, parseArgs };
