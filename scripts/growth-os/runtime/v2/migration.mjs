import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  legacyBody,
  legacyDedupeKey,
  legacyId,
  legacyStatus,
  legacyTimestamp,
  legacyTitle,
  legacyUrl,
  loadLegacySources,
} from './legacy-data-sources.mjs';
import { buildLegacyInventory } from './legacy-data-inventory.mjs';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import { isBriefExcluded } from './morning-brief-rules.mjs';
import { PerformanceStore } from './performance-store.mjs';
import {
  DEFAULT_DB_PATH,
  IMPLEMENTATION_ROOT,
  openV2Store,
  readUnifiedView,
} from './store.mjs';
import { rebuildUnifiedView } from './unified-view.mjs';

export const MIGRATION_DEFAULT_TIME = '2000-01-01T00:00:00.000Z';

const STATUS_MAP = Object.freeze({
  inbox: 'pending_review',
  today: 'pending_review',
  review_pending: 'pending_review',
  pending_review: 'pending_review',
  pending: 'pending_review',
  draft: 'pending_review',
  revision_required: 'pending_review',
  published_candidate: 'pending_review',
  approved: 'approved',
  draft_ready: 'ready_to_publish',
  publish_ready: 'ready_to_publish',
  ready_to_publish: 'ready_to_publish',
  published: 'published',
  ignored: 'archived',
  archived: 'archived',
  closed: 'archived',
});

const ACTION_STATUS_MAP = Object.freeze({
  approve: 'approved',
  approved: 'approved',
  ready_to_publish: 'ready_to_publish',
  publish_ready: 'ready_to_publish',
  mark_ready_to_publish: 'ready_to_publish',
  publish: 'published',
  published: 'published',
  mark_published: 'published',
  archive: 'archived',
  archived: 'archived',
  close: 'archived',
  closed: 'archived',
  ignore: 'archived',
  ignored: 'archived',
  revision: 'pending_review',
  revise: 'pending_review',
});

const READ_ONLY_STATUSES = new Set(['viewed', 'monitoring']);

function text(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function hashRecord(sourceKey, index, record) {
  return createHash('sha256')
    .update(sourceKey + ':' + index + ':' + JSON.stringify(record))
    .digest('hex')
    .slice(0, 16);
}

function timestamp(record) {
  const value = legacyTimestamp(record);
  if (value && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return MIGRATION_DEFAULT_TIME;
}

function metadata(record) {
  const publishedUrl = text(record, [
    'published_url',
    'publishedUrl',
    'url',
    'link',
  ]);
  const publishedAtValue = text(record, [
    'published_at',
    'publishedAt',
    'published_date',
    'publishedDate',
    'date',
  ]);
  const publishedAt =
    publishedAtValue && Number.isFinite(Date.parse(publishedAtValue))
      ? new Date(publishedAtValue).toISOString()
      : null;
  const platform = text(record, ['platform', 'channel', 'network']);
  return { publishedAt, platform, publishedUrl };
}

function hasPublicationMetadata(record) {
  const value = metadata(record);
  return Boolean(value.publishedAt && value.platform && value.publishedUrl);
}

function statusValue(record, category) {
  const raw = (legacyStatus(record) ?? '').toLowerCase();
  if (raw === 'outcome_pending') {
    return hasPublicationMetadata(record) ? 'published' : 'ready_to_publish';
  }
  if (READ_ONLY_STATUSES.has(raw)) {
    return null;
  }
  if (raw) {
    return STATUS_MAP[raw] ?? null;
  }
  if (category === 'publication' && hasPublicationMetadata(record)) {
    return 'published';
  }
  if (category === 'opportunity' || category === 'lifecycle_state') {
    return 'pending_review';
  }
  return null;
}

function actionStatus(record) {
  const rawAction = text(record, ['action', 'event_type', 'eventType']);
  if (!rawAction) {
    return statusValue(record, 'lifecycle_event');
  }
  const normalized = rawAction.toLowerCase();
  return ACTION_STATUS_MAP[normalized] ?? null;
}

function sourceRecordKey(source, index) {
  return source.key + ':' + index;
}

function normalizeMetrics(record) {
  const nested = record?.performance ?? record?.metrics ?? null;
  const raw = nested && typeof nested === 'object' ? nested : record;
  const metricKeys = ['views', 'clicks', 'comments', 'likes', 'ctr', 'leads'];
  const metrics = {};
  let hasValue = false;
  for (const key of metricKeys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) {
      metrics[key] = raw[key];
      hasValue = true;
    }
  }
  return {
    metrics: hasValue ? metrics : null,
    performanceStatus:
      text(record, ['performance_status', 'performanceStatus']) ??
      text(nested, ['performance_status', 'performanceStatus', 'status']) ??
      (hasValue ? 'confirmed' : 'pending'),
    confirmedAt: text(record, ['confirmed_at', 'confirmedAt']),
    actionRequiredAt: text(record, ['action_required_at', 'actionRequiredAt']),
  };
}

function sameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function safeTargetPath(targetDb) {
  if (targetDb === ':memory:') {
    return;
  }
  if (resolve(targetDb) === resolve(DEFAULT_DB_PATH)) {
    throw new Error('dry-run refuses the production v2 database path');
  }
}

export function createDryRunPaths({ targetDb, reportPath } = {}) {
  if (targetDb) {
    safeTargetPath(targetDb);
  }
  if (reportPath) {
    if (!targetDb) {
      const directory = mkdtempSync(join(tmpdir(), 'growth-os-v2-migration-'));
      return {
        targetDb: join(directory, 'v2.sqlite'),
        reportPath,
      };
    }
    return {
      targetDb,
      reportPath,
    };
  }
  if (targetDb) {
    return {
      targetDb,
      reportPath: targetDb === ':memory:' ? join(mkdtempSync(join(tmpdir(), 'growth-os-v2-report-')), 'migration-report.json') : targetDb + '.migration-report.json',
    };
  }
  const directory = mkdtempSync(join(tmpdir(), 'growth-os-v2-migration-'));
  return {
    targetDb: join(directory, 'v2.sqlite'),
    reportPath: join(directory, 'migration-report.json'),
  };
}

class MigrationRunner {
  #db;
  #writer;
  #performance;
  #sources;
  #sourceSnapshot;
  #byLegacyId = new Map();
  #byDedupeKey = new Map();
  #byUrl = new Map();
  #ledger = [];
  #deduplications = [];
  #rejections = [];
  #unmappedStatuses = {};
  #generatedIds = [];
  #statusBefore = {};
  #migratedPublications = 0;
  #migratedPerformanceRecords = 0;
  #migratedLifecycleEvents = 0;

  constructor({ db, sources, sourceSnapshot }) {
    this.#db = db;
    this.#writer = new LifecycleEventStore({ db });
    this.#performance = new PerformanceStore({ db });
    this.#sources = sources;
    this.#sourceSnapshot = sourceSnapshot;
  }

  run() {
    for (const source of this.#sources.filter(
      (value) => value.includeInMigration && value.category !== 'lifecycle_event' && value.category !== 'publication' && value.category !== 'performance',
    )) {
      this.#processSource(source);
    }
    for (const source of this.#sources.filter(
      (value) => value.includeInMigration && value.category === 'lifecycle_event',
    )) {
      this.#processSource(source);
    }
    for (const source of this.#sources.filter(
      (value) => value.includeInMigration && value.category === 'publication',
    )) {
      this.#processSource(source);
    }
    for (const source of this.#sources.filter(
      (value) => value.includeInMigration && value.category === 'performance',
    )) {
      this.#processSource(source);
    }
    for (const source of this.#sources.filter((value) => value.includeInMigration)) {
      for (const parseError of source.parseErrors) {
        this.#reject(
          {
            source,
            index: parseError.line ?? 0,
            record: parseError,
          },
          'parse_error',
        );
      }
    }
    return this.#result();
  }

  #processSource(source) {
    source.records.forEach((record, index) => {
      const context = { source, index, record };
      if (source.category === 'publication') {
        this.#processPublication(context);
      } else if (source.category === 'performance') {
        this.#processPerformance(context);
      } else if (source.category === 'lifecycle_event') {
        this.#processLifecycleEvent(context);
      } else {
        this.#processOpportunity(context);
      }
    });
  }

  #processOpportunity({ source, index, record }) {
    const context = { source, index, record };
    const raw = (legacyStatus(record) ?? 'status_missing').toLowerCase();
    if (raw !== 'status_missing') {
      this.#statusBefore[raw] = (this.#statusBefore[raw] ?? 0) + 1;
    }
    if (READ_ONLY_STATUSES.has(raw)) {
      this.#reject(context, 'read_only_legacy_status');
      return;
    }
    const mappedStatus = statusValue(record, source.category);
    if (!mappedStatus) {
      this.#unmappedStatuses[raw] = (this.#unmappedStatuses[raw] ?? 0) + 1;
      this.#reject(context, 'unmapped_status');
      return;
    }
    const incompletePublished =
      mappedStatus === 'published' && !hasPublicationMetadata(record);
    const targetStatus = incompletePublished ? 'pending_review' : mappedStatus;
    let opportunity;
    try {
      opportunity = this.#ensureOpportunity(record, source, index, targetStatus);
    } catch (error) {
      this.#reject(context, 'opportunity_create_failed', error.message);
      return;
    }

    if (opportunity.created) {
      this.#migrateLedger(context, 'migrated', {
        opportunity_id: opportunity.id,
        target_status: targetStatus,
        status_downgraded: incompletePublished,
      });
    } else {
      const changed = this.#advance(opportunity.id, targetStatus, {
        record,
        source,
        index,
      });
      if (changed.createdEvents > 0) {
        this.#migrateLedger(context, 'migrated', {
          opportunity_id: opportunity.id,
          target_status: targetStatus,
          appended_events: changed.createdEvents,
        });
      } else if (incompletePublished) {
        this.#reject(context, 'published_metadata_missing', undefined, opportunity.id);
      } else {
        this.#dedupe(context, 'same_opportunity_id_or_key', opportunity.id);
      }
    }
  }

  #processLifecycleEvent({ source, index, record }) {
    const context = { source, index, record };
    const targetStatus = actionStatus(record);
    const rawStatus = (legacyStatus(record) ?? text(record, ['action']) ?? 'status_missing').toLowerCase();
    if (rawStatus !== 'status_missing') {
      this.#statusBefore[rawStatus] = (this.#statusBefore[rawStatus] ?? 0) + 1;
    }
    if (!targetStatus) {
      this.#unmappedStatuses[rawStatus] = (this.#unmappedStatuses[rawStatus] ?? 0) + 1;
      this.#reject(context, 'unmapped_status');
      return;
    }
    const sourceRecord = record?.snapshot ?? record;
    let opportunity = this.#findOpportunity(sourceRecord);
    if (!opportunity && record?.snapshot) {
      try {
        opportunity = this.#ensureOpportunity(
          record.snapshot,
          source,
          index,
          'pending_review',
        );
      } catch (error) {
        this.#reject(context, 'opportunity_create_failed', error.message);
        return;
      }
    }
    if (!opportunity) {
      this.#reject(context, 'unknown_opportunity');
      return;
    }
    if (targetStatus === 'published' && !hasPublicationMetadata(record) && !hasPublicationMetadata(record.snapshot)) {
      this.#reject(context, 'published_metadata_missing', undefined, opportunity.id);
      return;
    }
    const changed = this.#advance(opportunity.id, targetStatus, {
      record,
      source,
      index,
    });
    if (changed.createdEvents > 0) {
      this.#migrateLedger(context, 'migrated', {
        opportunity_id: opportunity.id,
        appended_events: changed.createdEvents,
      });
    } else if (changed.deduplicated) {
      this.#dedupe(context, 'lifecycle_event_already_reflected', opportunity.id);
    } else {
      this.#reject(context, changed.reason ?? 'invalid_transition', undefined, opportunity.id);
    }
  }

  #processPublication({ source, index, record }) {
    const context = { source, index, record };
    const raw = (legacyStatus(record) ?? 'status_missing').toLowerCase();
    this.#statusBefore[raw] = (this.#statusBefore[raw] ?? 0) + 1;
    if (raw !== 'published' && !hasPublicationMetadata(record)) {
      this.#reject(context, 'not_a_published_record');
      return;
    }
    const publication = metadata(record);
    if (!publication.publishedAt || !publication.platform || !publication.publishedUrl) {
      this.#reject(context, 'published_metadata_missing');
      return;
    }
    let opportunity = this.#findOpportunity(record);
    if (!opportunity) {
      try {
        opportunity = this.#ensureOpportunity(
          { ...record, status: 'ready_to_publish' },
          source,
          index,
          'ready_to_publish',
        );
      } catch (error) {
        this.#reject(context, 'opportunity_create_failed', error.message);
        return;
      }
    }
    const current = this.#writer.getCurrentEvent(opportunity.id);
    if (current?.to_status === 'published') {
      if (
        current.published_at === publication.publishedAt &&
        current.platform === publication.platform &&
        current.published_url === publication.publishedUrl
      ) {
        this.#dedupe(context, 'same_published_event', opportunity.id);
      } else {
        this.#reject(context, 'conflicting_published_metadata', undefined, opportunity.id);
      }
      return;
    }
    const changed = this.#advance(opportunity.id, 'published', {
      record,
      source,
      index,
      publication,
    });
    if (changed.createdEvents > 0) {
      this.#migratedPublications += 1;
      this.#migrateLedger(context, 'migrated', {
        opportunity_id: opportunity.id,
        appended_events: changed.createdEvents,
      });
    } else {
      this.#reject(context, changed.reason ?? 'invalid_transition', undefined, opportunity.id);
    }
  }

  #processPerformance({ source, index, record }) {
    const context = { source, index, record };
    const opportunity = this.#findOpportunity(record);
    if (!opportunity) {
      this.#reject(context, 'unknown_opportunity');
      return;
    }
    const current = this.#writer.getCurrentEvent(opportunity.id);
    if (!current || current.to_status !== 'published') {
      this.#reject(context, 'performance_without_published_opportunity', undefined, opportunity.id);
      return;
    }
    const normalized = normalizeMetrics(record);
    if (!['pending', 'confirmed', 'action_required'].includes(normalized.performanceStatus)) {
      this.#reject(context, 'unmapped_performance_status', undefined, opportunity.id);
      return;
    }
    const existing = this.#performance.getResult(opportunity.id);
    if (
      existing &&
      existing.performance_status === normalized.performanceStatus &&
      existing.metrics_json === JSON.stringify(normalized.metrics ?? null) &&
      existing.confirmed_at === normalized.confirmedAt &&
      existing.action_required_at === normalized.actionRequiredAt
    ) {
      this.#dedupe(context, 'same_performance_record', opportunity.id);
      return;
    }
    try {
      this.#performance.setResult({
        opportunityId: opportunity.id,
        performanceStatus: normalized.performanceStatus,
        metrics: normalized.metrics,
        confirmedAt: normalized.confirmedAt,
        actionRequiredAt: normalized.actionRequiredAt,
        updatedAt: timestamp(record),
      });
      this.#migratedPerformanceRecords += 1;
      this.#migrateLedger(context, 'migrated', {
        opportunity_id: opportunity.id,
        performance_status: normalized.performanceStatus,
      });
    } catch (error) {
      this.#reject(context, 'performance_write_failed', error.message, opportunity.id);
    }
  }

  #ensureOpportunity(record, source, index, targetStatus) {
    const existing = this.#findOpportunity(record);
    if (existing) {
      return { created: false, id: existing.id };
    }
    const id = legacyId(record) ?? 'MIG-' + hashRecord(source.key, index, record);
    const sourceUrl = legacyUrl(record);
    const dedupeKey =
      legacyDedupeKey(record) ??
      sourceUrl ??
      legacyId(record) ??
      'migration-' + hashRecord(source.key, index, record);
    const title =
      legacyTitle(record) ??
      (id ? 'Migrated opportunity ' + id : null);
    if (!title) {
      throw new Error('missing title and stable identity');
    }
    const evidence = {
      source: source.relativePath,
      source_snapshot: this.#sourceSnapshot,
      legacy_id: legacyId(record),
      raw_status: legacyStatus(record),
      migration_record: sourceRecordKey(source, index),
    };
    this.#writer.createOpportunity({
      opportunityId: id,
      dedupeKey,
      sourceUrl,
      title,
      body: legacyBody(record),
      evidence,
      actor: 'migration-dry-run',
      occurredAt: timestamp(record),
      evidenceRef: source.relativePath,
    });
    this.#migratedLifecycleEvents += 1;
    this.#remember(id, { legacyId: legacyId(record), dedupeKey, sourceUrl });
    this.#generatedIds.push({
      legacy_id: legacyId(record),
      generated_id: id,
      source: source.relativePath,
      record: sourceRecordKey(source, index),
    });
    const changed = this.#advance(id, targetStatus, {
      record,
      source,
      index,
    });
    if (changed.reason) {
      throw new Error(changed.reason);
    }
    return { created: true, id };
  }

  #findOpportunity(record) {
    const keys = [
      ['id', legacyId(record), this.#byLegacyId],
      ['dedupe_key', legacyDedupeKey(record), this.#byDedupeKey],
      ['url', legacyUrl(record), this.#byUrl],
    ];
    const found = keys
      .filter(([, value]) => value)
      .map(([, value, map]) => map.get(value))
      .filter(Boolean);
    const unique = [...new Set(found.map((value) => value.id))];
    if (unique.length > 1) {
      throw new Error('legacy identity collision: ' + unique.join(','));
    }
    return found[0] ?? null;
  }

  #remember(id, keys) {
    const value = { id };
    if (keys.legacyId) {
      this.#byLegacyId.set(keys.legacyId, value);
    }
    if (keys.dedupeKey) {
      this.#byDedupeKey.set(keys.dedupeKey, value);
    }
    if (keys.sourceUrl) {
      this.#byUrl.set(keys.sourceUrl, value);
    }
  }

  #advance(id, targetStatus, { record, source, index, publication }) {
    let current = this.#writer.getCurrentEvent(id);
    let createdEvents = 0;
    const eventOptions = () => ({
      actor: 'migration-dry-run',
      occurredAt: timestamp(record),
      evidenceRef: source.relativePath + '#' + (index + 1),
    });
    if (targetStatus === 'published') {
      const value = publication ?? metadata(record);
      if (!value.publishedAt || !value.platform || !value.publishedUrl) {
        return { reason: 'published_metadata_missing', createdEvents };
      }
      if (current.to_status === 'published') {
        return {
          deduplicated:
            current.published_at === value.publishedAt &&
            current.platform === value.platform &&
            current.published_url === value.publishedUrl,
          reason: 'conflicting_published_metadata',
          createdEvents,
        };
      }
      if (current.to_status === 'pending_review') {
        this.#writer.approve(id, eventOptions());
        this.#migratedLifecycleEvents += 1;
        createdEvents += 1;
        current = this.#writer.getCurrentEvent(id);
      }
      if (current.to_status === 'approved') {
        this.#writer.markReadyToPublish(id, eventOptions());
        this.#migratedLifecycleEvents += 1;
        createdEvents += 1;
        current = this.#writer.getCurrentEvent(id);
      }
      if (current.to_status !== 'ready_to_publish') {
        return { reason: 'invalid_transition_to_published', createdEvents };
      }
      this.#writer.markPublished(
        id,
        {
          ...eventOptions(),
          publishedAt: value.publishedAt,
          platform: value.platform,
          publishedUrl: value.publishedUrl,
        },
      );
      this.#migratedLifecycleEvents += 1;
      createdEvents += 1;
      return { createdEvents };
    }
    if (targetStatus === 'approved') {
      if (current.to_status === 'approved' || current.to_status === 'ready_to_publish' || current.to_status === 'published') {
        return { deduplicated: true, createdEvents };
      }
      if (current.to_status !== 'pending_review') {
        return { reason: 'invalid_transition_to_approved', createdEvents };
      }
      this.#writer.approve(id, eventOptions());
      this.#migratedLifecycleEvents += 1;
      return { createdEvents: 1 };
    }
    if (targetStatus === 'ready_to_publish') {
      if (current.to_status === 'ready_to_publish' || current.to_status === 'published') {
        return { deduplicated: true, createdEvents };
      }
      if (current.to_status === 'pending_review') {
        this.#writer.approve(id, eventOptions());
        this.#migratedLifecycleEvents += 1;
        createdEvents += 1;
        current = this.#writer.getCurrentEvent(id);
      }
      if (current.to_status !== 'approved') {
        return { reason: 'invalid_transition_to_ready_to_publish', createdEvents };
      }
      this.#writer.markReadyToPublish(id, eventOptions());
      this.#migratedLifecycleEvents += 1;
      return { createdEvents: createdEvents + 1 };
    }
    if (targetStatus === 'archived') {
      if (current.to_status === 'archived') {
        return { deduplicated: true, createdEvents };
      }
      this.#writer.archive(id, eventOptions());
      this.#migratedLifecycleEvents += 1;
      return { createdEvents: 1 };
    }
    if (targetStatus === 'pending_review') {
      return { deduplicated: current.to_status === 'pending_review', createdEvents };
    }
    return { reason: 'unsupported_target_status', createdEvents };
  }

  #migrateLedger(context, classification, details = {}) {
    const entry = {
      record: sourceRecordKey(context.source, context.index),
      source: context.source.relativePath,
      category: context.source.category,
      legacy_id: legacyId(context.record),
      classification,
      ...details,
    };
    this.#ledger.push(entry);
  }

  #dedupe(context, reason, opportunityId) {
    const entry = {
      record: sourceRecordKey(context.source, context.index),
      source: context.source.relativePath,
      category: context.source.category,
      legacy_id: legacyId(context.record),
      classification: 'deduplicated',
      reason,
      opportunity_id: opportunityId,
    };
    this.#ledger.push(entry);
    this.#deduplications.push(entry);
  }

  #reject(context, reason, message, opportunityId) {
    const entry = {
      record: sourceRecordKey(context.source, context.index),
      source: context.source.relativePath,
      category: context.source.category,
      legacy_id: legacyId(context.record),
      classification: 'rejected',
      reason,
      ...(message ? { message } : {}),
      ...(opportunityId ? { opportunity_id: opportunityId } : {}),
    };
    this.#ledger.push(entry);
    this.#rejections.push(entry);
  }

  #result() {
    const statusAfter = {};
    for (const row of readUnifiedView(this.#db)) {
      statusAfter[row.current_status] = (statusAfter[row.current_status] ?? 0) + 1;
    }
    const migratedRecords = this.#ledger.filter(
      (entry) => entry.classification === 'migrated',
    ).length;
    const deduplicatedRecords = this.#ledger.filter(
      (entry) => entry.classification === 'deduplicated',
    ).length;
    const rejectedRecords = this.#ledger.filter(
      (entry) => entry.classification === 'rejected',
    ).length;
    return {
      ledger: this.#ledger,
      migrated_records: migratedRecords,
      deduplicated_records: deduplicatedRecords,
      rejected_records: rejectedRecords,
      deduplications: this.#deduplications,
      rejections: this.#rejections,
      unmapped_statuses: this.#unmappedStatuses,
      generated_ids: this.#generatedIds,
      status_before: this.#statusBefore,
      status_after: statusAfter,
      migrated_opportunities: this.#db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count,
      migrated_lifecycle_events: this.#migratedLifecycleEvents,
      migrated_publications: this.#migratedPublications,
      migrated_performance_records: this.#migratedPerformanceRecords,
      current_view: readUnifiedView(this.#db),
    };
  }
}

function targetCounts(db) {
  return {
    opportunities: db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count,
    lifecycle_events: db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count,
    publications: db.prepare("SELECT COUNT(*) AS count FROM lifecycle_events WHERE to_status = 'published'").get().count,
    performance: db.prepare('SELECT COUNT(*) AS count FROM performance').get().count,
  };
}

function assertEmptyTarget(db) {
  const counts = targetCounts(db);
  if (Object.values(counts).some((value) => value > 0)) {
    throw new Error('target database is not empty; refusing a repeated migration');
  }
}

function verifyDryRun(db) {
  const before = readUnifiedView(db);
  const pendingReviewCount = db
    .prepare("SELECT COUNT(*) AS count FROM (SELECT opportunity_id, MAX(event_seq) AS latest_seq FROM lifecycle_events GROUP BY opportunity_id) latest JOIN lifecycle_events ON lifecycle_events.event_seq = latest.latest_seq WHERE lifecycle_events.to_status = 'pending_review'")
    .get().count;
  const duplicateDedupe = db
    .prepare('SELECT dedupe_key FROM opportunities GROUP BY dedupe_key HAVING COUNT(*) > 1')
    .all();
  const duplicateUrl = db
    .prepare('SELECT source_url FROM opportunities WHERE source_url IS NOT NULL GROUP BY source_url HAVING COUNT(*) > 1')
    .all();
  const publishedIncomplete = before.filter(
    (row) =>
      row.current_status === 'published' &&
      (!row.published_at || !row.platform || !row.published_url),
  );
  const publishedBriefEligible = before.filter(
    (row) => row.current_status === 'published' && !isBriefExcluded(row),
  );
  const currentIds = new Set(before.map((row) => row.opportunity_id));
  db.exec('DROP VIEW unified_view');
  rebuildUnifiedView(db);
  const after = readUnifiedView(db);
  return {
    view_rows_before_rebuild: before.length,
    view_rows_after_rebuild: after.length,
    view_rebuild_stable: JSON.stringify(before) === JSON.stringify(after),
    one_current_status_per_opportunity: currentIds.size === before.length,
    published_metadata_complete: publishedIncomplete.length === 0,
    published_not_in_morning_brief: publishedBriefEligible.length === 0,
    pending_review_count: pendingReviewCount,
    pending_review_matches_view: pendingReviewCount === before.filter((row) => row.current_status === 'pending_review').length,
    duplicate_dedupe_keys: duplicateDedupe,
    duplicate_source_urls: duplicateUrl,
    no_duplicate_dedupe_or_url: duplicateDedupe.length === 0 && duplicateUrl.length === 0,
    target_counts: targetCounts(db),
  };
}

function buildReport({
  sourceSnapshot,
  targetDb,
  reportPath,
  inventory,
  migration,
  verification,
  error,
}) {
  const legacyTotal = migration
    ? migration.ledger.length
    : inventory.totals.migratable_records + inventory.totals.parse_errors;
  const migratedRecords = migration?.migrated_records ?? 0;
  const deduplicatedRecords = migration?.deduplicated_records ?? 0;
  const rejectedRecords = migration?.rejected_records ?? inventory.totals.parse_errors;
  const accountingTotal = migratedRecords + deduplicatedRecords + rejectedRecords;
  const accountingMatches = accountingTotal === legacyTotal;
  return {
    generated_at: new Date().toISOString(),
    source_snapshot: sourceSnapshot,
    target_db: targetDb,
    report_path: reportPath,
    production_cutover: 'NOT_STARTED',
    legacy_data_inventory: inventory,
    migration: {
      legacy_total: legacyTotal,
      migrated_records: migratedRecords,
      migrated_opportunities: migration?.migrated_opportunities ?? 0,
      migrated_lifecycle_events: migration?.migrated_lifecycle_events ?? 0,
      migrated_publications: migration?.migrated_publications ?? 0,
      migrated_performance_records: migration?.migrated_performance_records ?? 0,
      deduplicated_records: deduplicatedRecords,
      rejected_records: rejectedRecords,
      unmapped_statuses: migration?.unmapped_statuses ?? {},
      status_before: migration?.status_before ?? {},
      status_after: migration?.status_after ?? {},
      deduplication_records: migration?.deduplications ?? [],
      rejected_record_details: migration?.rejections ?? [],
      accounting: {
        migrated_plus_deduplicated_plus_rejected: accountingTotal,
        matches_legacy_total: accountingMatches,
      },
      generated_ids: migration?.generated_ids ?? [],
    },
    verification: verification ?? null,
    success: !error && accountingMatches && Boolean(verification?.view_rebuild_stable) && Boolean(verification?.one_current_status_per_opportunity) && Boolean(verification?.published_metadata_complete) && Boolean(verification?.published_not_in_morning_brief) && Boolean(verification?.pending_review_matches_view) && Boolean(verification?.no_duplicate_dedupe_or_url),
    error: error ? error.message : null,
  };
}

export function runMigration({
  sourceSnapshot = IMPLEMENTATION_ROOT,
  targetDb,
  reportPath,
} = {}) {
  const paths = createDryRunPaths({ targetDb, reportPath });
  const inventory = buildLegacyInventory({ sourceSnapshot });
  let store;
  let migration;
  let verification;
  let error = null;
  try {
    safeTargetPath(paths.targetDb);
    store = openV2Store({ dbPath: paths.targetDb });
    assertEmptyTarget(store.db);
    const sources = loadLegacySources({ sourceSnapshot });
    const runner = new MigrationRunner({
      db: store.db,
      sources,
      sourceSnapshot,
    });
    migration = runner.run();
    verification = verifyDryRun(store.db);
  } catch (caught) {
    error = caught;
  }
  const report = buildReport({
    sourceSnapshot,
    targetDb: paths.targetDb,
    reportPath: paths.reportPath,
    inventory,
    migration,
    verification,
    error,
  });
  mkdirSync(dirname(paths.reportPath), { recursive: true });
  writeFileSync(paths.reportPath, JSON.stringify(report, null, 2) + '\n');
  if (store) {
    store.close();
  }
  if (!report.success) {
    const failure = new Error(error?.message ?? 'migration verification failed');
    failure.report = report;
    failure.reportPath = paths.reportPath;
    throw failure;
  }
  return {
    ...report,
    reportPath: paths.reportPath,
    targetDb: paths.targetDb,
  };
}
