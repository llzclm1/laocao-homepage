import { randomUUID } from 'node:crypto';
import { ContentStore, insertContentVersionInTransaction } from './content-store.mjs';
import { withTransaction } from './store.mjs';

export const LIFECYCLE_STATUSES = Object.freeze([
  'pending_review',
  'approved',
  'ready_to_publish',
  'published',
  'archived',
]);

const transitions = Object.freeze({
  pending_review: ['approved', 'archived'],
  approved: ['ready_to_publish', 'archived'],
  ready_to_publish: ['published', 'archived'],
  published: ['archived'],
  archived: [],
});

const eventTypes = Object.freeze({
  approved: 'approve',
  ready_to_publish: 'mark_ready_to_publish',
  published: 'mark_published',
  archived: 'archive',
});

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

function optionalText(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return String(value).trim() || null;
}

function serializeEvidence(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export class LifecycleEventStore {
  #db;
  #clock;
  #content;

  constructor({ db, clock = () => new Date().toISOString(), contentStore = null }) {
    if (!db) {
      throw new Error('db is required');
    }
    this.#db = db;
    this.#clock = clock;
    this.#content = contentStore ?? new ContentStore({ db, clock });
  }

  createOpportunity(input) {
    const opportunityId = requiredText(input.opportunityId, 'opportunityId');
    const dedupeKey = requiredText(input.dedupeKey, 'dedupeKey');
    const title = requiredText(input.title, 'title');
    const sourceUrl = optionalText(input.sourceUrl);
    const body = optionalText(input.body);
    const evidenceJson = serializeEvidence(input.evidence);
    const occurredAt = input.occurredAt ?? this.#clock();
    const actor = requiredText(input.actor ?? 'operator', 'actor');
    const eventId = input.eventId ?? randomUUID();

    return withTransaction(this.#db, () => {
      this.#db
        .prepare(`
          INSERT INTO opportunities (
            opportunity_id,
            dedupe_key,
            source_url,
            title,
            body,
            evidence_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          opportunityId,
          dedupeKey,
          sourceUrl,
          title,
          body,
          evidenceJson,
          occurredAt,
          occurredAt,
        );

      this.#appendLifecycleEvent({
        eventId,
        opportunityId,
        fromStatus: null,
        toStatus: 'pending_review',
        eventType: 'create_opportunity',
        actor,
        occurredAt,
        evidenceRef: input.evidenceRef,
      });

      return this.#getLatestEvent(opportunityId);
    });
  }

  approve(opportunityId, options = {}) {
    return this.#transition(
      opportunityId,
      'approved',
      'approve',
      options,
    );
  }

  markReadyToPublish(opportunityId, options = {}) {
    return this.#transition(
      opportunityId,
      'ready_to_publish',
      'mark_ready_to_publish',
      { ...options, requiresPublishDraft: true },
    );
  }

  markPublished(
    opportunityId,
    { publishedAt, platform, publishedUrl, publishedContent, ...options } = {},
  ) {
    const publishedAtValue = requiredText(publishedAt, 'publishedAt');
    const platformValue = requiredText(platform, 'platform');
    const publishedUrlValue = requiredText(publishedUrl, 'publishedUrl');
    const publishedContentValue = requiredText(publishedContent, 'publishedContent');

    return withTransaction(this.#db, () => {
      const current = this.#requireCurrentEvent(opportunityId);
      this.#assertTransition(current.to_status, 'published');
      if (!this.#content.hasLatest(opportunityId, 'publish_draft')) {
        throw new Error('publish_draft is required before publishing');
      }
      const occurredAt = options.occurredAt ?? this.#clock();
      const actor = requiredText(options.actor ?? 'operator', 'actor');
      const eventId = options.eventId ?? randomUUID();

      this.#appendLifecycleEvent({
        eventId,
        opportunityId,
        fromStatus: current.to_status,
        toStatus: 'published',
        eventType: 'mark_published',
        actor,
        occurredAt,
        evidenceRef: options.evidenceRef,
        publishedAt: publishedAtValue,
        platform: platformValue,
        publishedUrl: publishedUrlValue,
      });

      insertContentVersionInTransaction(this.#db, {
        opportunityId,
        contentType: 'published_content',
        contentText: publishedContentValue,
        platform: platformValue,
        source: options.source ?? 'operator',
        createdBy: actor,
        occurredAt,
        metadata: {
          published_at: publishedAtValue,
          published_url: publishedUrlValue,
          lifecycle_event_id: eventId,
        },
      });

      this.#db
        .prepare(`
          INSERT INTO performance (
            opportunity_id,
            performance_status,
            metrics_json,
            confirmed_at,
            action_required_at,
            updated_at
          ) VALUES (?, 'pending', NULL, NULL, NULL, ?)
        `)
        .run(opportunityId, occurredAt);

      this.#db
        .prepare('UPDATE opportunities SET updated_at = ? WHERE opportunity_id = ?')
        .run(occurredAt, opportunityId);

      return this.#getLatestEvent(opportunityId);
    });
  }

  archive(opportunityId, options = {}) {
    return this.#transition(
      opportunityId,
      'archived',
      'archive',
      options,
    );
  }

  reconcileMissingPublishDraft(
    opportunityId,
    {
      reconciliationId,
      recoveryReason,
      sourceAssessment,
      dryRunReport,
      actor,
      occurredAt,
      eventId,
    } = {},
  ) {
    const id = requiredText(opportunityId, 'opportunityId');
    const reconciliation = requiredText(reconciliationId, 'reconciliationId');
    const reason = requiredText(recoveryReason, 'recoveryReason');
    const assessment = requiredText(sourceAssessment, 'sourceAssessment');
    const report = requiredText(dryRunReport, 'dryRunReport');
    const reconciliationActor = requiredText(actor, 'actor');
    if (reconciliationActor !== 'system-content-reconciliation') {
      throw new Error(
        'reconcileMissingPublishDraft requires actor system-content-reconciliation',
      );
    }
    const at = requiredText(occurredAt ?? this.#clock(), 'occurredAt');
    const event = eventId ?? randomUUID();

    return withTransaction(this.#db, () => {
      const current = this.#requireCurrentEvent(id);
      if (current.to_status !== 'ready_to_publish') {
        throw new Error(
          `missing-publish-draft reconciliation requires ready_to_publish, got ${current.to_status}`,
        );
      }
      if (this.#content.hasLatest(id, 'publish_draft')) {
        throw new Error('cannot reconcile an opportunity that has a publish_draft');
      }

      this.#appendLifecycleEvent({
        eventId: event,
        opportunityId: id,
        fromStatus: 'ready_to_publish',
        toStatus: 'approved',
        eventType: 'admin_reconcile_missing_publish_draft',
        actor: reconciliationActor,
        occurredAt: at,
        evidenceRef: {
          reconciliation_id: reconciliation,
          recovery_reason: reason,
          source_assessment: assessment,
          dry_run_report: report,
          reconciled_at: at,
          actor: reconciliationActor,
        },
      });

      this.#db
        .prepare('UPDATE opportunities SET updated_at = ? WHERE opportunity_id = ?')
        .run(at, id);

      return this.#getLatestEvent(id);
    });
  }

  archiveIrrelevantDiscovery(
    opportunityId,
    {
      cleanupId,
      relevanceScore,
      relevanceCategory,
      rejectionReason,
      sourceUrl,
      dryRunReport,
      archivedAt,
      actor,
      eventId,
    } = {},
  ) {
    const cleanup = requiredText(cleanupId, 'cleanupId');
    const category = requiredText(relevanceCategory, 'relevanceCategory');
    const reason = requiredText(rejectionReason, 'rejectionReason');
    const report = requiredText(dryRunReport, 'dryRunReport');
    const archivedAtValue = requiredText(archivedAt, 'archivedAt');
    const cleanupActor = requiredText(actor, 'actor');
    if (cleanupActor !== 'system-relevance-cleanup') {
      throw new Error(
        'archiveIrrelevantDiscovery requires actor system-relevance-cleanup',
      );
    }
    if (!Number.isFinite(Number(relevanceScore))) {
      throw new Error('relevanceScore is required');
    }

    return this.#transition(
      opportunityId,
      'archived',
      'archive_irrelevant_discovery',
      {
        actor: cleanupActor,
        eventId,
        occurredAt: archivedAtValue,
        evidenceRef: {
          cleanup_id: cleanup,
          relevance_score: Number(relevanceScore),
          relevance_category: category,
          rejection_reason: reason,
          source_url: sourceUrl ?? null,
          dry_run_report: report,
          archived_at: archivedAtValue,
          actor: cleanupActor,
        },
      },
    );
  }

  restorePendingReview(
    opportunityId,
    {
      incidentId,
      originalApproveEventId,
      recoveryReason,
      recoveredAt,
      actor,
      eventId,
    } = {},
  ) {
    const id = requiredText(opportunityId, 'opportunityId');
    const recoveryActor = requiredText(actor, 'actor');
    if (recoveryActor !== 'system-p0-recovery') {
      throw new Error('restorePendingReview requires actor system-p0-recovery');
    }
    const incident = requiredText(incidentId, 'incidentId');
    const originalEventId = requiredText(
      originalApproveEventId,
      'originalApproveEventId',
    );
    const reason = requiredText(recoveryReason, 'recoveryReason');
    const occurredAt = recoveredAt ?? this.#clock();
    const recoveryEventId = eventId ?? randomUUID();

    return withTransaction(this.#db, () => {
      const original = this.#db
        .prepare(`
          SELECT event_seq, event_id, opportunity_id, from_status, to_status, event_type
          FROM lifecycle_events
          WHERE event_id = ?
        `)
        .get(originalEventId);
      if (
        !original
        || original.opportunity_id !== id
        || original.from_status !== 'pending_review'
        || original.to_status !== 'approved'
        || original.event_type !== 'approve'
      ) {
        throw new Error('original approve event is not valid for recovery');
      }

      const current = this.#requireCurrentEvent(id);
      if (current.event_seq !== original.event_seq || current.to_status !== 'approved') {
        throw new Error('opportunity has subsequent activity and is not safe to recover');
      }

      this.#appendLifecycleEvent({
        eventId: recoveryEventId,
        opportunityId: id,
        fromStatus: 'approved',
        toStatus: 'pending_review',
        eventType: 'admin_restore_pending_review',
        actor: recoveryActor,
        occurredAt,
        evidenceRef: {
          incident_id: incident,
          original_approve_event_id: originalEventId,
          recovery_reason: reason,
          recovered_at: occurredAt,
          actor: recoveryActor,
        },
      });

      this.#db
        .prepare('UPDATE opportunities SET updated_at = ? WHERE opportunity_id = ?')
        .run(occurredAt, id);

      return this.#getLatestEvent(id);
    });
  }

  transition(opportunityId, toStatus, options = {}) {
    if (!LIFECYCLE_STATUSES.includes(toStatus)) {
      throw new Error(`invalid lifecycle status: ${toStatus}`);
    }
    if (toStatus === 'pending_review' || toStatus === 'published') {
      throw new Error(`use the dedicated writer method for ${toStatus}`);
    }
    return this.#transition(
      opportunityId,
      toStatus,
      eventTypes[toStatus],
      options,
    );
  }

  getCurrentEvent(opportunityId) {
    return this.#getLatestEvent(opportunityId);
  }

  getEvents(opportunityId) {
    return this.#db
      .prepare(`
        SELECT
          event_seq,
          event_id,
          opportunity_id,
          from_status,
          to_status,
          event_type,
          actor,
          occurred_at,
          evidence_ref,
          published_at,
          platform,
          published_url
        FROM lifecycle_events
        WHERE opportunity_id = ?
        ORDER BY event_seq ASC
      `)
      .all(opportunityId);
  }

  #transition(opportunityId, toStatus, eventType, options) {
    const id = requiredText(opportunityId, 'opportunityId');
    const actor = requiredText(options.actor ?? 'operator', 'actor');
    const occurredAt = options.occurredAt ?? this.#clock();
    const eventId = options.eventId ?? randomUUID();

    return withTransaction(this.#db, () => {
      const current = this.#requireCurrentEvent(id);
      this.#assertTransition(current.to_status, toStatus);
      if (options.requiresPublishDraft && !this.#content.hasLatest(id, 'publish_draft')) {
        throw new Error('publish_draft is required before ready_to_publish');
      }

      this.#appendLifecycleEvent({
        eventId,
        opportunityId: id,
        fromStatus: current.to_status,
        toStatus,
        eventType,
        actor,
        occurredAt,
        evidenceRef: options.evidenceRef,
      });

      this.#db
        .prepare('UPDATE opportunities SET updated_at = ? WHERE opportunity_id = ?')
        .run(occurredAt, id);

      return this.#getLatestEvent(id);
    });
  }

  #assertTransition(fromStatus, toStatus) {
    if (!LIFECYCLE_STATUSES.includes(toStatus)) {
      throw new Error(`invalid lifecycle status: ${toStatus}`);
    }
    if (!transitions[fromStatus]?.includes(toStatus)) {
      throw new Error(`invalid lifecycle transition: ${fromStatus} -> ${toStatus}`);
    }
  }

  #requireCurrentEvent(opportunityId) {
    const current = this.#getLatestEvent(opportunityId);
    if (!current) {
      throw new Error(`opportunity not found: ${opportunityId}`);
    }
    return current;
  }

  #getLatestEvent(opportunityId) {
    return this.#db
      .prepare(`
        SELECT
          event_seq,
          event_id,
          opportunity_id,
          from_status,
          to_status,
          event_type,
          actor,
          occurred_at,
          evidence_ref,
          published_at,
          platform,
          published_url
        FROM lifecycle_events
        WHERE opportunity_id = ?
        ORDER BY event_seq DESC
        LIMIT 1
      `)
      .get(opportunityId);
  }

  #appendLifecycleEvent({
    eventId,
    opportunityId,
    fromStatus,
    toStatus,
    eventType,
    actor,
    occurredAt,
    evidenceRef,
    publishedAt = null,
    platform = null,
    publishedUrl = null,
  }) {
    this.#db
      .prepare(`
        INSERT INTO lifecycle_events (
          event_id,
          opportunity_id,
          from_status,
          to_status,
          event_type,
          actor,
          occurred_at,
          evidence_ref,
          published_at,
          platform,
          published_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        eventId,
        opportunityId,
        fromStatus,
        toStatus,
        eventType,
        actor,
        occurredAt,
        serializeEvidence(evidenceRef),
        publishedAt,
        platform,
        publishedUrl,
      );
  }
}
