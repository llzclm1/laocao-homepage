import { withTransaction } from './store.mjs';

const PERFORMANCE_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'action_required',
]);

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(fieldName + ' is required');
  }
  return value.trim();
}

function serializeMetrics(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export class PerformanceStore {
  #db;

  constructor({ db }) {
    if (!db) {
      throw new Error('db is required');
    }
    this.#db = db;
  }

  setResult({
    opportunityId,
    performanceStatus,
    metrics = null,
    confirmedAt = null,
    actionRequiredAt = null,
    updatedAt,
  }) {
    const id = requiredText(opportunityId, 'opportunityId');
    if (!PERFORMANCE_STATUSES.includes(performanceStatus)) {
      throw new Error('invalid performance status: ' + performanceStatus);
    }
    const timestamp = requiredText(updatedAt, 'updatedAt');
    const currentEvent = this.#db
      .prepare(
        'SELECT to_status FROM lifecycle_events WHERE opportunity_id = ? ORDER BY event_seq DESC LIMIT 1',
      )
      .get(id);
    if (!currentEvent || currentEvent.to_status !== 'published') {
      throw new Error(
        'performance requires a published opportunity: ' + id,
      );
    }

    return withTransaction(this.#db, () =>
      this.#db
        .prepare(
          'INSERT INTO performance (opportunity_id, performance_status, metrics_json, confirmed_at, action_required_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (opportunity_id) DO UPDATE SET performance_status = excluded.performance_status, metrics_json = excluded.metrics_json, confirmed_at = excluded.confirmed_at, action_required_at = excluded.action_required_at, updated_at = excluded.updated_at',
        )
        .run(
          id,
          performanceStatus,
          serializeMetrics(metrics),
          confirmedAt,
          actionRequiredAt,
          timestamp,
        ),
    );
  }

  getResult(opportunityId) {
    return this.#db
      .prepare(
        'SELECT opportunity_id, performance_status, metrics_json, confirmed_at, action_required_at, updated_at FROM performance WHERE opportunity_id = ?',
      )
      .get(opportunityId);
  }
}
