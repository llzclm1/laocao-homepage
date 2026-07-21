import { getBriefDelivery } from './store.mjs';

export const ELIGIBLE_STATUSES = Object.freeze([
  'pending_review',
  'ready_to_publish',
]);

export const EXCLUDED_STATUSES = Object.freeze([
  'approved',
  'published',
  'archived',
]);

export const ACTION_REQUIRED = 'action_required';
export const DEFAULT_REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function rowStatus(row) {
  return row.current_status ?? row.status ?? null;
}

export function getEligibleStage(row) {
  if (row.performance_status === ACTION_REQUIRED) {
    return ACTION_REQUIRED;
  }

  const status = rowStatus(row);
  return ELIGIBLE_STATUSES.includes(status) ? status : null;
}

export function isBriefEligible(row) {
  return getEligibleStage(row) !== null;
}

export function isBriefExcluded(row) {
  if (row.performance_status === ACTION_REQUIRED) {
    return false;
  }
  return !isBriefEligible(row) || EXCLUDED_STATUSES.includes(rowStatus(row));
}

export function getBriefDeduplicationKey({
  briefDate,
  opportunityId,
  eligibleStage,
}) {
  if (!briefDate || !opportunityId || !eligibleStage) {
    throw new Error('briefDate, opportunityId, and eligibleStage are required');
  }
  return `${briefDate}:${opportunityId}:${eligibleStage}`;
}

export function shouldSendBrief({
  lastBriefGeneratedAt = null,
  statusChangedAt = null,
  signalChangedAt = null,
  now,
  cooldownMs = DEFAULT_REMINDER_COOLDOWN_MS,
}) {
  if (!now) {
    throw new Error('now is required');
  }
  if (!lastBriefGeneratedAt) {
    return true;
  }

  const lastGenerated = Date.parse(lastBriefGeneratedAt);
  const nowTime = Date.parse(now);
  if (!Number.isFinite(lastGenerated) || !Number.isFinite(nowTime)) {
    throw new Error('brief timestamps must be valid ISO dates');
  }

  const changedAfterLastBrief = [statusChangedAt, signalChangedAt]
    .filter(Boolean)
    .some((value) => {
      const changedAt = Date.parse(value);
      if (!Number.isFinite(changedAt)) {
        throw new Error('change timestamps must be valid ISO dates');
      }
      return changedAt > lastGenerated;
    });

  return changedAfterLastBrief || nowTime - lastGenerated >= cooldownMs;
}

export function shouldSendBriefFromStore(
  db,
  { briefDate, opportunityId, eligibleStage, ...ruleInput },
) {
  const delivery = getBriefDelivery(db, {
    briefDate,
    opportunityId,
    eligibleStage,
  });
  return shouldSendBrief({
    ...ruleInput,
    lastBriefGeneratedAt: delivery?.last_brief_generated_at ?? null,
  });
}
