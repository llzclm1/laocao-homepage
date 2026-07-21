import { randomUUID } from 'node:crypto';
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

  constructor({ db, clock = () => new Date().toISOString() }) {
    if (!db) {
      throw new Error('db is required');
    }
    this.#db = db;
    this.#clock = clock;
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
      options,
    );
  }

  markPublished(
    opportunityId,
    { publishedAt, platform, publishedUrl, ...options } = {},
  ) {
    const publishedAtValue = requiredText(publishedAt, 'publishedAt');
    const platformValue = requiredText(platform, 'platform');
    const publishedUrlValue = requiredText(publishedUrl, 'publishedUrl');

    return withTransaction(this.#db, () => {
      const current = this.#requireCurrentEvent(opportunityId);
      this.#assertTransition(current.to_status, 'published');
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
        optionalText(evidenceRef),
        publishedAt,
        platform,
        publishedUrl,
      );
  }
}
