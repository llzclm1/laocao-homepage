const ARCHIVE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function mergeSignalHistory(candidates, previousSignals = [], now = new Date()) {
  const previous = new Map((previousSignals || []).map((signal) => [signal.normalized_key || signal.id, signal]));
  const merged = new Map();

  for (const candidate of candidates) {
    const key = candidate.normalized_key || candidate.id;
    const prior = previous.get(key);
    const next = prior ? mergeOne(prior, candidate) : candidate;
    merged.set(key, next);
  }

  for (const prior of previousSignals || []) {
    const key = prior.normalized_key || prior.id;
    if (merged.has(key)) continue;
    merged.set(key, archiveIfStale(prior, now));
  }

  return [...merged.values()].sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || String(a.id).localeCompare(String(b.id)));
}

function mergeOne(prior, candidate) {
  const timesSeen = Math.max(1, Number(prior.times_seen || 1)) + 1;
  const wasConsumed = prior.status === "consumed" || Boolean(prior.consumed_at);
  return {
    ...candidate,
    first_seen: prior.first_seen || candidate.first_seen,
    last_seen: candidate.last_seen || candidate.observed_at || prior.last_seen,
    times_seen: timesSeen,
    status: wasConsumed ? "consumed" : timesSeen >= 2 ? "confirmed" : "detected",
    consumed_at: prior.consumed_at || null,
    evidence: mergeEvidence(prior.evidence, candidate.evidence)
  };
}

function archiveIfStale(signal, now) {
  const lastSeen = Date.parse(signal.last_seen || signal.observed_at || "");
  if (lastSeen && Date.parse(now) - lastSeen >= ARCHIVE_AFTER_MS && signal.status !== "archived") {
    return { ...signal, status: "archived" };
  }
  return signal;
}

function mergeEvidence(previous = [], current = []) {
  const seen = new Set();
  return [...previous, ...current].filter((item) => {
    const key = JSON.stringify([item.source, item.observed_at, item.supporting_metric]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildLifecycleFields({ observedAt, now = observedAt, previous = null } = {}) {
  return {
    status: previous?.status || "detected",
    first_seen: previous?.first_seen || observedAt || now || null,
    last_seen: observedAt || now || null,
    times_seen: Number(previous?.times_seen || 0) + 1,
    consumed_at: previous?.consumed_at || null
  };
}
