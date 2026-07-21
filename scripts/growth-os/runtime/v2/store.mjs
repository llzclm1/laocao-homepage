import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { rebuildUnifiedView } from './unified-view.mjs';

export const IMPLEMENTATION_ROOT = '/Users/caocao/Documents/我的主页';
export const DEFAULT_DB_PATH = `${IMPLEMENTATION_ROOT}/data/growth-os/state/growth-os-v2.sqlite`;

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

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
  if (rebuildView) {
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
  return db.prepare(`
    SELECT
      opportunity_id,
      dedupe_key,
      source_url,
      title,
      body,
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
