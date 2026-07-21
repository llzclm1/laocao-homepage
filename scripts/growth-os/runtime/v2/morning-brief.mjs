import { withTransaction, getBriefDelivery, readUnifiedView, recordBriefDelivery } from './store.mjs';
import { getEligibleStage, isBriefEligible, shouldSendBrief } from './morning-brief-rules.mjs';

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function deliver(db, { briefDate, row, generatedAt }) {
  const eligibleStage = getEligibleStage(row);
  if (!eligibleStage) return false;

  return withTransaction(db, () => {
    const delivery = getBriefDelivery(db, {
      briefDate,
      opportunityId: row.opportunity_id,
      eligibleStage,
    });
    if (!shouldSendBrief({
      lastBriefGeneratedAt: delivery?.last_brief_generated_at ?? null,
      statusChangedAt: row.status_changed_at,
      now: generatedAt,
    })) {
      return false;
    }
    db.prepare(`
      INSERT INTO brief_deliveries (
        brief_date,
        opportunity_id,
        eligible_stage,
        last_brief_generated_at
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT (brief_date, opportunity_id, eligible_stage)
      DO UPDATE SET last_brief_generated_at = excluded.last_brief_generated_at
    `).run(briefDate, row.opportunity_id, eligibleStage, generatedAt);
    return true;
  });
}

export function buildMorningBrief(db, { now = new Date(), briefDate = dateKey(now) } = {}) {
  const generatedAt = new Date(now).toISOString();
  const eligible = readUnifiedView(db).filter(isBriefEligible);
  const delivered = eligible.filter((row) => deliver(db, {
    briefDate,
    row,
    generatedAt,
  }));

  return {
    brief_date: briefDate,
    generated_at: generatedAt,
    eligible_count: eligible.length,
    delivered_count: delivered.length,
    delivered: delivered.map((row) => ({
      opportunity_id: row.opportunity_id,
      stage: getEligibleStage(row),
      title: row.title,
      source_url: row.source_url,
      current_status: row.current_status,
      performance_status: row.performance_status,
    })),
    skipped_opportunity_ids: eligible
      .filter((row) => !delivered.some((item) => item.opportunity_id === row.opportunity_id))
      .map((row) => row.opportunity_id),
  };
}

if (process.argv[1] && process.argv[1].endsWith('/morning-brief.mjs')) {
  const { DEFAULT_DB_PATH, openV2Store } = await import('./store.mjs');
  const store = openV2Store({ dbPath: process.env.GROWTH_OS_V2_DB || DEFAULT_DB_PATH, rebuildView: false });
  try {
    console.log(JSON.stringify(buildMorningBrief(store.db), null, 2));
  } finally {
    store.close();
  }
}
