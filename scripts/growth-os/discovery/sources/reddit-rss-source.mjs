import { parseAtom } from "./xml-feed.mjs";

const userAgent = "GrowthOS-PublicDiscovery/3.0 (+local public candidate ranking; no login)";

export async function collectRedditRssSource({ subreddit, now = new Date(), perSourceLimit = 10, cooldownHours = 12, fetchImpl = fetch }) {
  const sourceName = `reddit_rss:${subreddit}`;
  const collectedAt = now.toISOString();
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new/.rss?limit=${Math.min(Math.max(Number(perSourceLimit) || 10, 1), 25)}`;
  try {
    const response = await fetchImpl(url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Reddit RSS returned ${response.status}`);
    const items = parseAtom(await response.text()).map((item) => ({
      ...item,
      platform: "reddit",
      canonical_url: item.url,
      external_id: redditPostId(item.url),
      discovered_at: collectedAt,
      source_method: "reddit_rss",
      source_name: sourceName,
      raw_topic: item.title
    }));
    return sourceResult({ sourceName, collectedAt, items, cooldownHours });
  } catch (error) {
    const message = String(error.message || error).slice(0, 240);
    const blocked = /\b(403|429)\b/.test(message);
    return sourceResult({
      sourceName,
      collectedAt,
      cooldownHours,
      status: blocked ? "blocked" : "failed",
      errors: [{
        platform: "reddit",
        source: sourceName,
        timestamp: collectedAt,
        error_type: blocked ? "public_rss_blocked" : "public_rss_failed",
        message,
        retry_recommendation: "Respect the source cooldown; do not bypass access controls."
      }]
    });
  }
}

function sourceResult({ sourceName, collectedAt, items = [], errors = [], status = "success", cooldownHours = 12 }) {
  return {
    platform: "reddit",
    source_name: sourceName,
    source_method: "reddit_rss",
    collection_status: status,
    collected_at: collectedAt,
    items,
    errors,
    rate_limit: { max_requests_per_run: 1, cooldown_hours: cooldownHours }
  };
}

function redditPostId(url) {
  return new URL(url).pathname.match(/\/comments\/([a-z0-9]+)/i)?.[1] || null;
}
