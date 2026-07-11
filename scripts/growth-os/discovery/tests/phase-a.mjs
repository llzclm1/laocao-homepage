import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSearchProvider } from "../providers/search-provider.mjs";
import { sourceInCooldown, updateSourceStatus } from "../collect-social-opportunities.mjs";
import { collectRedditRssSource } from "../sources/reddit-rss-source.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(directory, "../fixtures/reddit-rss-sample.xml"), "utf8");
const now = new Date("2026-07-11T08:00:00.000Z");

const successful = await collectRedditRssSource({
  subreddit: "smallbusiness",
  now,
  cooldownHours: 12,
  fetchImpl: async () => new Response(fixture, { status: 200 })
});
assert(successful.collection_status === "success", "RSS success status");
assert(["platform", "source_name", "source_method", "collection_status", "collected_at", "items", "errors", "rate_limit"].every((key) => key in successful), "RSS returns the source adapter contract");
assert(successful.items.length === 1, "RSS returns one fixture item");
assert(successful.items[0].url === "https://www.reddit.com/r/smallbusiness/comments/1de3t7g/how_to_pay_supplier/", "RSS preserves real public URL");
assert(successful.items[0].author === null, "RSS leaves an unknown author as null");
assert(successful.items[0].external_id === "1de3t7g", "RSS extracts the public post id");

for (const status of [403, 429]) {
  const blocked = await collectRedditRssSource({
    subreddit: "smallbusiness",
    now,
    fetchImpl: async () => new Response("blocked", { status })
  });
  assert(blocked.collection_status === "blocked", `RSS ${status} blocks the source`);
  assert(blocked.errors.length === 1, `RSS ${status} records one error`);
  const sourceState = updateSourceStatus({ sources: {} }, [blocked], now);
  const record = sourceState.sources[blocked.source_name];
  assert(Boolean(record.cooldown_until), `RSS ${status} sets a cooldown`);
  assert(sourceInCooldown(record, now, false), `RSS ${status} does not retry during cooldown`);
}

const provider = createSearchProvider({});
const disabled = await provider.search({ query: "supplier payment terms China", platform: "quora" });
assert(provider.status === "not_configured", "Search provider falls back when no configuration exists");
assert(disabled.items.length === 0, "Disabled provider returns no fabricated items");

console.log("Social Discovery Phase A tests passed");

function assert(condition, message) {
  if (!condition) throw new Error(`Failed: ${message}`);
}
