import assert from "node:assert/strict";
import test from "node:test";

import {
  BROWSER_ADAPTERS,
  createChromeAdapter,
  createSafariAdapter,
  isBrowserFallbackError
} from "../browser-adapter.mjs";

test("recognizes Chrome and Browser Act failures as Safari fallback triggers", () => {
  assert.equal(isBrowserFallbackError("Operation not permitted (error_code: 230404)"), true);
  assert.equal(isBrowserFallbackError("No running chrome-direct browser is available."), true);
  assert.equal(isBrowserFallbackError("Safari page had no visible metrics"), false);
});

test("Chrome adapter keeps the existing browser-act command surface", async () => {
  const calls = [];
  const adapter = createChromeAdapter({
    browserId: "chrome-1",
    browserCommand: async (session, args) => { calls.push([session, args]); return { ok: true }; },
    closeSession: async (session) => { calls.push([session, ["session", "close"]]); }
  });

  await adapter.open("session-1", "https://example.com");
  await adapter.navigate("session-1", "https://example.com/page");
  await adapter.waitStable("session-1");
  await adapter.state("session-1");
  await adapter.click("session-1", 4);
  await adapter.scroll("session-1", "down", 600);
  await adapter.close("session-1");

  assert.equal(adapter.kind, BROWSER_ADAPTERS.CHROME);
  assert.deepEqual(calls, [
    ["session-1", ["browser", "open", "chrome-1", "https://example.com"]],
    ["session-1", ["navigate", "https://example.com/page"]],
    ["session-1", ["wait", "stable"]],
    ["session-1", ["state"]],
    ["session-1", ["click", "4"]],
    ["session-1", ["scroll", "down", "--amount", "600"]],
    ["session-1", ["session", "close"]]
  ]);
});

test("Safari adapter is explicit and does not masquerade as Chrome", () => {
  const adapter = createSafariAdapter({ executable: "safaridriver" });
  assert.equal(adapter.kind, BROWSER_ADAPTERS.SAFARI);
  assert.notEqual(adapter.kind, BROWSER_ADAPTERS.CHROME);
});
