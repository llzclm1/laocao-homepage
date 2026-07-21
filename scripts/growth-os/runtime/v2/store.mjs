import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { rebuildUnifiedView, unifiedViewExists } from './unified-view.mjs';
import { readContentPackets } from './content-store.mjs';

export const IMPLEMENTATION_ROOT = '/Users/caocao/Documents/我的主页';
export const DEFAULT_DB_PATH = `${IMPLEMENTATION_ROOT}/data/growth-os/state/growth-os-v2.sqlite`;

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

const lifecycleEventsUpgradeSql = `
  CREATE TABLE lifecycle_events_v2 (
    event_seq INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    opportunity_id TEXT NOT NULL
      REFERENCES opportunities (opportunity_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
    from_status TEXT,
    to_status TEXT NOT NULL
      CHECK (to_status IN (
        'pending_review',
        'approved',
        'ready_to_publish',
        'published',
        'archived'
      )),
    event_type TEXT NOT NULL
      CHECK (event_type IN (
        'create_opportunity',
        'approve',
        'mark_ready_to_publish',
        'mark_published',
        'archive',
        'archive_irrelevant_discovery',
        'admin_restore_pending_review',
        'admin_reconcile_missing_publish_draft'
      )),
    actor TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    evidence_ref TEXT,
    published_at TEXT,
    platform TEXT,
    published_url TEXT,
    CHECK (
      to_status <> 'published'
      OR (
        published_at IS NOT NULL
        AND length(trim(published_at)) > 0
        AND platform IS NOT NULL
        AND length(trim(platform)) > 0
        AND published_url IS NOT NULL
        AND length(trim(published_url)) > 0
      )
    ),
    CHECK (
      to_status = 'published'
      OR (
        published_at IS NULL
        AND platform IS NULL
        AND published_url IS NULL
      )
    )
  );
  INSERT INTO lifecycle_events_v2 (
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
  )
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
  FROM lifecycle_events;
  DROP TABLE lifecycle_events;
  ALTER TABLE lifecycle_events_v2 RENAME TO lifecycle_events;
  CREATE INDEX lifecycle_events_opportunity_order
    ON lifecycle_events (opportunity_id, event_seq DESC);
  CREATE UNIQUE INDEX lifecycle_events_one_published_per_opportunity
    ON lifecycle_events (opportunity_id)
    WHERE to_status = 'published';
  CREATE TRIGGER lifecycle_events_append_only_update
  BEFORE UPDATE ON lifecycle_events
  BEGIN
    SELECT RAISE(ABORT, 'lifecycle_events is append-only');
  END;
  CREATE TRIGGER lifecycle_events_append_only_delete
  BEFORE DELETE ON lifecycle_events
  BEGIN
    SELECT RAISE(ABORT, 'lifecycle_events is append-only');
  END;
`;

function ensureLifecycleRecoveryEventType(db) {
  const table = db
    .prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'lifecycle_events'")
    .get();
  if (
    table?.sql?.includes('admin_restore_pending_review')
    && table?.sql?.includes('archive_irrelevant_discovery')
    && table?.sql?.includes('admin_reconcile_missing_publish_draft')
  ) {
    return;
  }

  db.exec('DROP VIEW IF EXISTS unified_view');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(lifecycleEventsUpgradeSql);
    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Preserve the original schema upgrade error.
    }
    throw error;
  }
}

export function withTransaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Preserve the original database error.
    }
    throw error;
  }
}

export function openV2Store({ dbPath = DEFAULT_DB_PATH, rebuildView = true } = {}) {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec(schemaSql);
  ensureLifecycleRecoveryEventType(db);
  if (rebuildView || !unifiedViewExists(db)) {
    rebuildUnifiedView(db);
  }

  return {
    db,
    close() {
      db.close();
    },
  };
}

export function readUnifiedView(db) {
  const rows = db.prepare(`
    SELECT
      opportunity_id,
      dedupe_key,
      source_url,
      title,
      body,
      evidence_json,
      created_at,
      updated_at,
      current_status,
      status_changed_at,
      latest_event_id,
      published_at,
      platform,
      published_url,
      performance_status,
      performance_updated_at
    FROM unified_view
    ORDER BY status_changed_at ASC, opportunity_id ASC
  `).all();
  const packets = readContentPackets(db, rows.map((row) => row.opportunity_id));
  return rows.map((row) => {
    let evidence = null;
    try { evidence = row.evidence_json ? JSON.parse(row.evidence_json) : null; } catch { evidence = null; }
    const { evidence_json: _evidenceJson, ...viewRow } = row;
    return {
      ...viewRow,
      evidence,
      content: packets.get(row.opportunity_id),
    };
  });
}

export function recordBriefDelivery(
  db,
  { briefDate, opportunityId, eligibleStage, generatedAt },
) {
  if (!briefDate || !opportunityId || !eligibleStage || !generatedAt) {
    throw new Error(
      'briefDate, opportunityId, eligibleStage, and generatedAt are required',
    );
  }

  return withTransaction(db, () =>
    db
      .prepare(`
        INSERT INTO brief_deliveries (
          brief_date,
          opportunity_id,
          eligible_stage,
          last_brief_generated_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT (brief_date, opportunity_id, eligible_stage)
        DO UPDATE SET last_brief_generated_at = excluded.last_brief_generated_at
      `)
      .run(briefDate, opportunityId, eligibleStage, generatedAt),
  );
}

export function getBriefDelivery(
  db,
  { briefDate, opportunityId, eligibleStage },
) {
  return db
    .prepare(
      'SELECT brief_date, opportunity_id, eligible_stage, last_brief_generated_at FROM brief_deliveries WHERE brief_date = ? AND opportunity_id = ? AND eligible_stage = ?',
    )
    .get(briefDate, opportunityId, eligibleStage);
}
