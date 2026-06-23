import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmptyOddsPayload,
  normalizeOddsEvents
} from "./worldcup-odds-utils.mjs";

test("buildEmptyOddsPayload marks odds as unavailable without pretending to have data", () => {
  const payload = buildEmptyOddsPayload({
    reason: "missing_api_key",
    syncedAt: "2026-06-23 20:00 Asia/Shanghai"
  });

  assert.equal(payload.available, false);
  assert.equal(payload.reason, "missing_api_key");
  assert.equal(payload.events.length, 0);
  assert.equal(payload.disclaimer.includes("不构成投注建议"), true);
});

test("normalizeOddsEvents keeps h2h, handicap, and totals market references", () => {
  const [event] = normalizeOddsEvents([
    {
      id: "event-1",
      sport_key: "soccer_fifa_world_cup",
      commence_time: "2026-06-24T11:00:00Z",
      home_team: "France",
      away_team: "Argentina",
      bookmakers: [
        {
          key: "samplebook",
          title: "SampleBook",
          last_update: "2026-06-23T10:00:00Z",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "France", price: 2.1 },
                { name: "Draw", price: 3.2 },
                { name: "Argentina", price: 3.4 }
              ]
            },
            {
              key: "spreads",
              outcomes: [
                { name: "France", price: 1.91, point: -0.5 },
                { name: "Argentina", price: 1.95, point: 0.5 }
              ]
            },
            {
              key: "totals",
              outcomes: [
                { name: "Over", price: 1.88, point: 2.5 },
                { name: "Under", price: 1.98, point: 2.5 }
              ]
            }
          ]
        }
      ]
    }
  ]);

  assert.equal(event.id, "event-1");
  assert.equal(event.homeTeam, "France");
  assert.equal(event.awayTeam, "Argentina");
  assert.equal(event.markets.h2h.outcomes.length, 3);
  assert.deepEqual(event.markets.spreads.line, { home: -0.5, away: 0.5 });
  assert.deepEqual(event.markets.totals.line, { over: 2.5, under: 2.5 });
  assert.equal(event.source.bookmakers, 1);
});
