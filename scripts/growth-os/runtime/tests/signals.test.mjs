import assert from "node:assert/strict";
import test from "node:test";

import { buildSignalSnapshot } from "../signals/signal-engine.mjs";

const run = (metrics, completedAt = "2026-07-20T08:00:00.000Z") => ({
  task_id: "GROWTH-004",
  completed_at: completedAt,
  sources: [{
    key: "gsc",
    state: "live",
    status: "collected",
    source: "fixture:gsc",
    updated_at: completedAt,
    metrics
  }]
});

test("emits factory query and buyer guide events without mixing games", () => {
  const snapshot = buildSignalSnapshot(run({
    query_rows: [
      { query: "supplier comments", url: "https://gewuji.dev/supplier-reply-review/", impressions: 2, clicks: 0 },
      { query: "repo extraction tracker", url: "https://games.gewuji.dev/repo-extraction-loop-explained/", impressions: 3, clicks: 0 }
    ],
    page_rows: [
      { url: "https://gewuji.dev/buyer-guides/questions-before-ordering-samples-from-china/", impressions: 1, clicks: 0 }
    ],
    web_search_clicks: 0
  }), { now: new Date("2026-07-20T08:00:00.000Z") });

  assert.ok(snapshot.signals.some((signal) => signal.event === "search.query.first_seen" && signal.business_line === "factory_bridge"));
  assert.ok(snapshot.signals.some((signal) => signal.event === "content.buyer_guide.first_impression"));
  assert.ok(snapshot.signals.some((signal) => signal.business_line === "games"));
  assert.ok(snapshot.signals.filter((signal) => signal.business_line === "games").every((signal) => signal.business_line !== "factory_bridge"));
});

test("normalizes duplicate sources into one signal with merged evidence", () => {
  const current = run({ query_rows: [{ query: "supplier comments", impressions: 1, clicks: 0 }] });
  const duplicate = { ...current, sources: [{ ...current.sources[0], metrics: { ...current.sources[0].metrics, query_rows: [{ query: "supplier comments", impressions: 2, clicks: 0 }] } }] };
  const snapshot = buildSignalSnapshot({ ...current, sources: [...current.sources, ...duplicate.sources] }, { now: new Date("2026-07-20T08:00:00.000Z") });
  const firstSeen = snapshot.signals.filter((signal) => signal.event === "search.query.first_seen");
  assert.equal(firstSeen.length, 1);
  assert.ok(firstSeen[0].evidence.length >= 1);
});

test("promotes a repeated signal and preserves consumed state", () => {
  const first = buildSignalSnapshot(run({ query_rows: [{ query: "supplier comments", impressions: 1 }] }), { now: new Date("2026-07-20T08:00:00.000Z") });
  const prior = first.signals.map((signal) => ({ ...signal, status: "consumed", consumed_at: "2026-07-20T08:01:00.000Z" }));
  const second = buildSignalSnapshot(run({ query_rows: [{ query: "supplier comments", impressions: 2 }] }, "2026-07-21T08:00:00.000Z"), { previousSignals: prior, now: new Date("2026-07-21T08:00:00.000Z") });
  const signal = second.signals.find((item) => item.event === "search.query.first_seen");
  assert.equal(signal.status, "consumed");
  assert.equal(signal.times_seen, 2);
  assert.equal(signal.consumed_at, "2026-07-20T08:01:00.000Z");
});

test("confirms a query that remains visible on the following run", () => {
  const firstRun = run({ query_rows: [{ query: "supplier comments", impressions: 1 }] });
  const first = buildSignalSnapshot(firstRun, { now: new Date("2026-07-20T08:00:00.000Z") });
  const secondRun = run({ query_rows: [{ query: "supplier comments", impressions: 2 }] }, "2026-07-21T08:00:00.000Z");
  const second = buildSignalSnapshot(secondRun, {
    previous: firstRun,
    previousSignals: first.signals,
    now: new Date("2026-07-21T08:00:00.000Z")
  });
  const signal = second.signals.find((item) => item.event === "search.query.first_seen");
  assert.equal(signal.status, "confirmed");
  assert.equal(signal.times_seen, 2);
});

test("archives a signal after seven days without a new observation", () => {
  const prior = [{
    id: "old-signal",
    normalized_key: "search.query:factory_bridge:supplier comments",
    event: "search.query.first_seen",
    business_line: "factory_bridge",
    status: "confirmed",
    first_seen: "2026-07-01T08:00:00.000Z",
    last_seen: "2026-07-01T08:00:00.000Z",
    times_seen: 2,
    evidence: []
  }];
  const snapshot = buildSignalSnapshot({ completed_at: "2026-07-10T08:00:00.000Z", sources: [] }, {
    previousSignals: prior,
    now: new Date("2026-07-10T08:00:00.000Z")
  });
  assert.equal(snapshot.signals[0].status, "archived");
});

test("does not emit search signals when GSC is unavailable", () => {
  const snapshot = buildSignalSnapshot({ completed_at: "2026-07-20T08:00:00.000Z", sources: [{ key: "gsc", state: "unavailable", metrics: { query_rows: [{ query: "supplier comments" }] } }] });
  assert.deepEqual(snapshot.signals, []);
});
