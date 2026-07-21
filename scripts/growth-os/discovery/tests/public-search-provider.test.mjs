import assert from "node:assert/strict";
import test from "node:test";

import { createPublicSearchProvider, parseDuckDuckGoHtml } from "../providers/public-search-provider.mjs";

test("asynchronous public-search challenges are reported as blocked", async () => {
  const provider = createPublicSearchProvider({ SOCIAL_DISCOVERY_PUBLIC_SEARCH: "1" }, async () => new Response("challenge", { status: 202 }));
  const result = await provider.search({ query: "site:quora.com supplier payment", platform: "quora" });

  assert.equal(result.status, "blocked");
  assert.equal(result.items.length, 0);
  assert.match(result.error, /202/);
});

test('public search accepts only real Reddit post paths and rejects help pages', () => {
  const html = [
    '<a class="result__a" href="https://www.reddit.com/r/Alibaba/comments/abc123/supplier_question">Supplier question</a><div class="result__snippet">How do I source from China?</div>',
    '<a class="result__a" href="https://www.reddit.com/r/Alibaba/">Alibaba subreddit</a><div class="result__snippet">Browse</div>',
    '<a class="result__a" href="https://help.quora.com/hc/en-us/articles/1">Help Center</a><div class="result__snippet">Policy</div>',
  ].join('');

  const redditItems = parseDuckDuckGoHtml(html, 'reddit');
  assert.deepEqual(redditItems.map((item) => item.url), [
    'https://www.reddit.com/r/Alibaba/comments/abc123/supplier_question',
  ]);
  assert.deepEqual(parseDuckDuckGoHtml(html, 'quora'), []);
});
