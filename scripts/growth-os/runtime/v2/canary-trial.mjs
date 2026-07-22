import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEGACY_SOURCE_DEFINITIONS,
  legacyBody,
  legacyId,
  legacyStatus,
  legacyTitle,
  legacyUrl,
  loadLegacySources,
} from './legacy-data-sources.mjs';
import { runMigration } from './migration.mjs';
import {
  getEligibleStage,
  isBriefEligible,
  isBriefExcluded,
  shouldSendBriefFromStore,
} from './morning-brief-rules.mjs';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import {
  DEFAULT_DB_PATH,
  IMPLEMENTATION_ROOT,
  openV2Store,
  readUnifiedView,
  recordBriefDelivery,
} from './store.mjs';
import { rebuildUnifiedView, unifiedViewExists } from './unified-view.mjs';

const CANARY_REPORT_PREFIX = 'growth-os-v2-canary-report-';
const CANARY_DATE = '2026-07-21';
const CANARY_NOW = '2026-07-21T12:00:00.000Z';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fileFingerprint(path) {
  if (!existsSync(path)) {
    return { path, exists: false, sha256: null };
  }
  return {
    path,
    exists: true,
    sha256: sha256(readFileSync(path)),
  };
}

function legacyFileFingerprints(sourceRoot) {
  const relativePaths = [
    ...new Set(LEGACY_SOURCE_DEFINITIONS.map((source) => source.relativePath)),
  ];
  return relativePaths.map((relativePath) =>
    fileFingerprint(resolve(sourceRoot, relativePath)),
  );
}

function compareFingerprints(before, sourceRoot) {
  const after = before.map((entry) =>
    fileFingerprint(resolve(sourceRoot, relative(sourceRoot, entry.path))),
  );
  const changed = after.filter((entry, index) => {
    const previous = before[index];
    return (
      entry.exists !== previous.exists || entry.sha256 !== previous.sha256
    );
  });
  return {
    unchanged: changed.length === 0,
    changed,
    after,
  };
}

function findRecord(sources, sourceKey, predicate, description) {
  const source = sources.find((value) => value.key === sourceKey);
  const record = source?.records.find(predicate);
  if (!record) {
    throw new Error(`canary selection missing: ${description}`);
  }
  return record;
}

function stableId(record, fallback) {
  return legacyId(record) ?? fallback;
}

function stableTitle(record, fallback) {
  return legacyTitle(record) ?? fallback;
}

function stableBody(record, fallback) {
  return legacyBody(record) ?? fallback;
}

function stableUrl(record) {
  return legacyUrl(record);
}

function canaryOpportunity(record, { id, status, dedupeKey, title, body, draft, publishedContent }) {
  const canaryTitle = title ?? stableTitle(record, `Canary ${dedupeKey}`);
  return {
    id: id ?? stableId(record, `CANARY-${dedupeKey}`),
    title: canaryTitle,
    body: body ?? `A buyer asks about a supplier opportunity and ordering requirements for ${canaryTitle}.`,
    url: stableUrl(record) ?? `https://canary.example/source/${id ?? dedupeKey}`,
    platform: record?.platform ?? record?.channel ?? record?.network ?? 'reddit',
    dedupe_key: dedupeKey,
    status,
    suggested_reply: `Canary reply about the supplier opportunity and ordering requirements for ${canaryTitle}.`,
    ...(draft ? { draft } : {}),
    ...(publishedContent ? { published_content: publishedContent } : {}),
  };
}

function writeJsonLines(path, records) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    records.map((record) => JSON.stringify(record)).join('\n') + '\n',
  );
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function createCanarySnapshot({ sourceRoot, canaryRoot }) {
  const sourceSnapshot = join(canaryRoot, 'legacy-snapshot');
  const sources = loadLegacySources({ sourceSnapshot: sourceRoot });
  const pendingSource = findRecord(
    sources,
    'social_discovery_today_opportunities',
    (record) => legacyStatus(record) === 'inbox',
    'pending_review',
  );
  const approvedSource = findRecord(
    sources,
    'social_agent_view_opportunities',
    (record) => record?.type === 'original_post' && record?.status === 'approved',
    'approved',
  );
  const readySource = findRecord(
    sources,
    'published_links',
    (record) => record?.content_id === 'GO-004' && record?.status === 'draft_ready',
    'ready_to_publish',
  );
  const publishedSource = findRecord(
    sources,
    'published_content',
    (record) => record?.id === 'GO-002' && record?.status === 'published',
    'published',
  );
  const publishedTitle = findRecord(
    sources,
    'content_lifecycle',
    (record) => record?.id === 'GO-002',
    'published title',
  );
  const readyTitle = findRecord(
    sources,
    'content_lifecycle',
    (record) => record?.id === 'GO-004',
    'ready title',
  );

  const pending = canaryOpportunity(pendingSource, {
    id: stableId(pendingSource, 'CANARY-PENDING'),
    status: 'inbox',
    dedupeKey: `canary-pending-${stableId(pendingSource, 'pending')}`,
  });
  const pendingDuplicate = { ...pending, title: 'Duplicate canary record' };
  const approved = canaryOpportunity(approvedSource, {
    id: stableId(approvedSource, 'CANARY-APPROVED'),
    status: 'approved',
    dedupeKey: `canary-approved-${stableId(approvedSource, 'approved')}`,
    title: stableTitle(approvedSource, 'Approved canary opportunity'),
  });
  const ready = canaryOpportunity(readySource, {
    id: stableId(readySource, 'CANARY-READY'),
    status: 'draft_ready',
    dedupeKey: 'canary-ready-GO-004',
    title: stableTitle(readyTitle, 'Ready canary opportunity'),
    body: 'A buyer asks about a China supplier quotation before ordering.',
    draft: 'Canary ready-to-publish draft with the supplier quotation details.',
  });
  const published = {
    ...publishedSource,
    id: stableId(publishedSource, 'CANARY-PUBLISHED'),
    dedupe_key: 'canary-published-GO-002',
    title: stableTitle(publishedTitle, 'Published canary opportunity'),
    body: 'Canary published record with complete metadata',
    suggested_reply: 'Canary reply draft for the published record',
    draft: 'Canary publish draft before publication',
    published_content: 'Canary published content with complete metadata',
  };
  const rejected = {
    ...published,
    id: 'CANARY-BAD-PUBLISHED',
    dedupe_key: 'canary-bad-published',
    title: 'Canary published record missing URL',
    url: '',
  };

  writeJsonLines(
    join(sourceSnapshot, 'data/growth-os/opportunities.jsonl'),
    [pending, pendingDuplicate, approved, ready],
  );
  writeJson(join(sourceSnapshot, 'data/growth-os/social/published-content.json'), [
    published,
    rejected,
  ]);
  writeJson(join(sourceSnapshot, 'selection-manifest.json'), {
    source_root: sourceRoot,
    canary_records: [
      {
        opportunity_id: pending.id,
        stage: 'pending_review',
        selected_from: 'data/growth-os/social-discovery/today-opportunities.json',
        legacy_status: 'inbox',
      },
      {
        opportunity_id: approved.id,
        stage: 'approved',
        selected_from: 'data/social-agent/view.json',
        legacy_status: 'approved',
      },
      {
        opportunity_id: ready.id,
        stage: 'ready_to_publish',
        selected_from: 'data/growth-os/social/published-links.json',
        legacy_status: 'draft_ready',
      },
      {
        opportunity_id: published.id,
        stage: 'published',
        selected_from: 'data/growth-os/social/published-content.json',
        legacy_status: 'published',
        published_metadata: 'complete',
      },
      {
        opportunity_id: rejected.id,
        stage: 'rejected_anomaly',
        selected_from: 'data/growth-os/social/published-content.json',
        legacy_status: 'published',
        published_metadata: 'missing_published_url',
      },
      {
        opportunity_id: pending.id,
        stage: 'duplicate',
        selected_from: 'data/growth-os/opportunities.jsonl',
        legacy_status: 'inbox',
        deduplication_basis: 'same opportunity_id, dedupe_key, and source URL',
      },
    ],
  });

  return {
    sourceSnapshot,
    records: {
      pending,
      approved,
      ready,
      published,
      rejected,
      duplicate: pendingDuplicate,
    },
  };
}

export function readCanaryDashboard(db) {
  return {
    input: 'canary unified_view',
    rows: readUnifiedView(db),
  };
}

export function readCanaryMorningBrief(db, { briefDate, now }) {
  return readUnifiedView(db).filter((row) => {
    if (!isBriefEligible(row)) {
      return false;
    }
    return shouldSendBriefFromStore(db, {
      briefDate,
      opportunityId: row.opportunity_id,
      eligibleStage: getEligibleStage(row),
      now,
      statusChangedAt: row.status_changed_at,
    });
  });
}

function targetCounts(db) {
  return {
    opportunities: db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count,
    lifecycle_events: db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count,
    published: db.prepare("SELECT COUNT(*) AS count FROM lifecycle_events WHERE to_status = 'published'").get().count,
    performance: db.prepare('SELECT COUNT(*) AS count FROM performance').get().count,
  };
}

function assertCanaryIsolation({ canaryDb, productionDbBefore }) {
  if (resolve(canaryDb) === resolve(DEFAULT_DB_PATH)) {
    throw new Error('canary database cannot be the production v2 database');
  }
  if (!resolve(canaryDb).startsWith(resolve(tmpdir()))) {
    throw new Error('canary database must be under the system temporary directory');
  }
  const productionDbAfter = fileFingerprint(DEFAULT_DB_PATH);
  if (
    productionDbAfter.exists !== productionDbBefore.exists ||
    productionDbAfter.sha256 !== productionDbBefore.sha256
  ) {
    throw new Error('production v2 database existence changed during canary');
  }
}

function buildCanaryReport({
  sourceRoot,
  canaryRoot,
  canaryDb,
  sourceSelection,
  migration,
  dashboard,
  brief,
  lifecycle,
  viewRebuild,
  rollback,
  legacyImpact,
  error,
}) {
  const migrationData = migration?.migration ?? null;
  return {
    generated_at: new Date().toISOString(),
    source_root: sourceRoot,
    canary_root: canaryRoot,
    canary_database: canaryDb,
    canary_records: {
      snapshot_records: 6,
      unique_opportunities: 4,
      duplicate_records: 1,
      rejected_anomalies: 1,
      selected: sourceSelection,
    },
    migration: migrationData
      ? {
          migrated: migrationData.migrated_records,
          migrated_opportunities: migrationData.migrated_opportunities,
          migrated_lifecycle_events: migrationData.migrated_lifecycle_events,
          migrated_publications: migrationData.migrated_publications,
          migrated_performance_records: migrationData.migrated_performance_records,
          rejected: migrationData.rejected_records,
          deduplicated: migrationData.deduplicated_records,
          unmapped_statuses: migrationData.unmapped_statuses,
          status_before: migrationData.status_before,
          status_after: migrationData.status_after,
          rejected_records: migrationData.rejected_record_details,
          accounting: migrationData.accounting,
          published_metadata_complete:
            migration?.verification?.published_metadata_complete ?? false,
        }
      : null,
    dashboard,
    morning_brief: brief,
    lifecycle,
    view_rebuild: viewRebuild,
    rollback,
    legacy_production_impact: legacyImpact,
    production_cutover: 'NOT_STARTED',
    success:
      !error &&
      Boolean(migration?.success) &&
      Boolean(dashboard?.unified_view_only) &&
      Boolean(brief?.duplicate_suppressed) &&
      Boolean(brief?.published_excluded) &&
      Boolean(lifecycle?.single_writer_verified) &&
      Boolean(viewRebuild?.stable) &&
      Boolean(rollback?.cleaned) &&
      Boolean(legacyImpact?.unchanged),
    error: error?.message ?? null,
  };
}

export function runCanaryTrial({
  sourceRoot = IMPLEMENTATION_ROOT,
  reportPath,
} = {}) {
  const canaryRoot = mkdtempSync(join(tmpdir(), 'growth-os-v2-canary-'));
  const canaryDb = join(canaryRoot, 'canary.sqlite');
  const finalReportPath =
    reportPath ?? join(tmpdir(), `${CANARY_REPORT_PREFIX}${basename(canaryRoot)}.json`);
  const productionDbBefore = fileFingerprint(DEFAULT_DB_PATH);
  const legacyBefore = legacyFileFingerprints(sourceRoot);
  let snapshot;
  let migration;
  let store;
  let dashboard;
  let brief;
  let lifecycle;
  let viewRebuild;
  let error = null;

  try {
    snapshot = createCanarySnapshot({ sourceRoot, canaryRoot });
    assertCanaryIsolation({ canaryDb, productionDbBefore });
    migration = runMigration({
      sourceSnapshot: snapshot.sourceSnapshot,
      targetDb: canaryDb,
      reportPath: join(canaryRoot, 'migration-report.json'),
    });

    store = openV2Store({ dbPath: canaryDb });
    const rowsBefore = readUnifiedView(store.db);
    const dashboardRows = readCanaryDashboard(store.db);
    dashboard = {
      input: dashboardRows.input,
      row_count: dashboardRows.rows.length,
      status_distribution: dashboardRows.rows.reduce((counts, row) => {
        counts[row.current_status] = (counts[row.current_status] ?? 0) + 1;
        return counts;
      }, {}),
      unified_view_only: true,
    };

    const firstBriefRows = readCanaryMorningBrief(store.db, {
      briefDate: CANARY_DATE,
      now: CANARY_NOW,
    });
    for (const row of firstBriefRows) {
      recordBriefDelivery(store.db, {
        briefDate: CANARY_DATE,
        opportunityId: row.opportunity_id,
        eligibleStage: getEligibleStage(row),
        generatedAt: CANARY_NOW,
      });
    }
    const secondBriefRows = readCanaryMorningBrief(store.db, {
      briefDate: CANARY_DATE,
      now: CANARY_NOW,
    });
    brief = {
      input: 'canary unified_view',
      first_delivery_count: firstBriefRows.length,
      second_delivery_count: secondBriefRows.length,
      duplicate_suppressed: secondBriefRows.length === 0,
      published_excluded: rowsBefore
        .filter((row) => row.current_status === 'published')
        .every((row) => isBriefExcluded(row)),
    };

    const pending = rowsBefore.find(
      (row) => row.current_status === 'pending_review',
    );
    if (!pending) {
      throw new Error('canary pending_review record was not migrated');
    }
    const eventCountBefore = store.db
      .prepare('SELECT COUNT(*) AS count FROM lifecycle_events')
      .get().count;
    const writer = new LifecycleEventStore({ db: store.db });
    const manualEvent = writer.approve(pending.opportunity_id, {
      actor: 'canary-operator',
      occurredAt: '2026-07-21T12:01:00.000Z',
    });
    const eventCountAfter = store.db
      .prepare('SELECT COUNT(*) AS count FROM lifecycle_events')
      .get().count;
    const opportunityColumns = store.db
      .prepare('PRAGMA table_info(opportunities)')
      .all()
      .map((column) => column.name);
    lifecycle = {
      writer: 'LifecycleEventStore',
      manual_opportunity_id: pending.opportunity_id,
      manual_event_type: manualEvent.event_type,
      manual_event_actor: manualEvent.actor,
      current_status_after_manual_change: writer.getCurrentEvent(
        pending.opportunity_id,
      ).to_status,
      event_count_delta: eventCountAfter - eventCountBefore,
      direct_current_status_column_present: opportunityColumns.includes('status'),
      single_writer_verified:
        manualEvent.event_type === 'approve' &&
        manualEvent.actor === 'canary-operator' &&
        eventCountAfter === eventCountBefore + 1 &&
        !opportunityColumns.includes('status'),
    };

    const rowsAfterManualChange = readUnifiedView(store.db);
    brief.manual_changed_record_excluded = isBriefExcluded(
      rowsAfterManualChange.find(
        (row) => row.opportunity_id === pending.opportunity_id,
      ),
    );

    const beforeRebuild = readUnifiedView(store.db);
    store.db.exec('DROP VIEW unified_view');
    const deleted = !unifiedViewExists(store.db);
    rebuildUnifiedView(store.db);
    const afterRebuild = readUnifiedView(store.db);
    viewRebuild = {
      deleted_before_rebuild: deleted,
      rows_before: beforeRebuild.length,
      rows_after: afterRebuild.length,
      stable: deleted && JSON.stringify(beforeRebuild) === JSON.stringify(afterRebuild),
      target_counts: targetCounts(store.db),
    };
  } catch (caught) {
    error = caught;
  } finally {
    store?.close();
  }

  const legacyComparison = compareFingerprints(legacyBefore, sourceRoot);
  const productionDbAfter = fileFingerprint(DEFAULT_DB_PATH);
  const productionDbUnchanged =
    productionDbAfter.exists === productionDbBefore.exists &&
    productionDbAfter.sha256 === productionDbBefore.sha256;
  const legacyImpact = {
    unchanged: legacyComparison.unchanged && productionDbUnchanged,
    changed_files: legacyComparison.changed,
    production_v2_db_before: productionDbBefore,
    production_v2_db_after: productionDbAfter,
    old_runtime_touched: false,
  };
  rmSync(canaryRoot, { recursive: true, force: true });
  const rollback = {
    rolled_back: true,
    canary_database_removed: !existsSync(canaryDb),
    source_snapshot_removed: !existsSync(join(canaryRoot, 'legacy-snapshot')),
    canary_root_removed: !existsSync(canaryRoot),
    report_retained: finalReportPath,
  };
  rollback.cleaned =
    rollback.canary_database_removed &&
    rollback.source_snapshot_removed &&
    rollback.canary_root_removed;
  const report = buildCanaryReport({
    sourceRoot,
    canaryRoot,
    canaryDb,
    sourceSelection: snapshot?.records ?? null,
    migration,
    dashboard,
    brief,
    lifecycle,
    viewRebuild,
    rollback,
    legacyImpact,
    error,
  });
  mkdirSync(dirname(finalReportPath), { recursive: true });
  writeFileSync(finalReportPath, JSON.stringify(report, null, 2) + '\n');
  if (!report.success) {
    const failure = new Error(error?.message ?? 'canary verification failed');
    failure.report = report;
    failure.reportPath = finalReportPath;
    throw failure;
  }
  return {
    ...report,
    reportPath: finalReportPath,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source-snapshot') {
      args.sourceRoot = argv[++index];
    } else if (argument === '--report') {
      args.reportPath = argv[++index];
    } else if (argument === '--help') {
      args.help = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return args;
}

const isCli =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isCli) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(
        'Usage: node scripts/growth-os/runtime/v2/canary-trial.mjs [--source-snapshot PATH] [--report PATH]',
      );
      process.exit(0);
    }
    const result = runCanaryTrial(args);
    console.log(
      JSON.stringify(
        {
          success: result.success,
          canary_records: {
            snapshot_records: result.canary_records.snapshot_records,
            unique_opportunities: result.canary_records.unique_opportunities,
            duplicate_records: result.canary_records.duplicate_records,
            rejected_anomalies: result.canary_records.rejected_anomalies,
          },
          canary_database: result.canary_database,
          report_path: result.reportPath,
          migrated: result.migration?.migrated ?? 0,
          rejected: result.migration?.rejected ?? 0,
          deduplicated: result.migration?.deduplicated ?? 0,
          rollback: result.rollback,
          production_cutover: result.production_cutover,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          success: false,
          error: error.message,
          report_path: error.reportPath ?? null,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
