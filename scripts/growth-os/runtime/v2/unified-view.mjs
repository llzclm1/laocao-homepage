const UNIFIED_VIEW_NAME = 'unified_view';

const unifiedViewSql = `
  CREATE VIEW ${UNIFIED_VIEW_NAME} AS
  WITH latest_events AS (
    SELECT
      event_seq,
      event_id,
      opportunity_id,
      to_status,
      occurred_at,
      published_at,
      platform,
      published_url,
      ROW_NUMBER() OVER (
        PARTITION BY opportunity_id
        ORDER BY event_seq DESC
      ) AS event_rank
    FROM lifecycle_events
  )
  SELECT
    opportunities.opportunity_id,
    opportunities.dedupe_key,
    opportunities.source_url,
    opportunities.title,
    opportunities.body,
    opportunities.evidence_json,
    opportunities.created_at,
    opportunities.updated_at,
    latest_events.to_status AS current_status,
    latest_events.occurred_at AS status_changed_at,
    latest_events.event_id AS latest_event_id,
    latest_events.published_at,
    latest_events.platform,
    latest_events.published_url,
    performance.performance_status,
    performance.updated_at AS performance_updated_at
  FROM opportunities
  JOIN latest_events
    ON latest_events.opportunity_id = opportunities.opportunity_id
   AND latest_events.event_rank = 1
  LEFT JOIN performance
    ON performance.opportunity_id = opportunities.opportunity_id
`;

export function rebuildUnifiedView(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`DROP VIEW IF EXISTS ${UNIFIED_VIEW_NAME}`);
    db.exec(unifiedViewSql);
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Preserve the original builder error.
    }
    throw error;
  }
}

export function unifiedViewExists(db) {
  return Boolean(
    db
      .prepare(`
        SELECT 1
        FROM sqlite_schema
        WHERE type = 'view' AND name = ?
      `)
      .get(UNIFIED_VIEW_NAME),
  );
}
