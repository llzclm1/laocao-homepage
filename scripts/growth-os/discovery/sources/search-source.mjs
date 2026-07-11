export async function collectSearchSource({ platform, queries = [], provider, now = new Date(), perSourceLimit = 10, cooldownHours = 12 }) {
  const sourceName = `search:${provider.name}:${platform}`;
  const collectedAt = now.toISOString();
  if (provider.status !== "configured") {
    return sourceResult({ platform, sourceName, collectedAt, status: "not_configured", cooldownHours });
  }

  const items = [];
  const errors = [];
  for (const query of queries) {
    const result = await provider.search({ query, platform });
    if (result.status !== "success") {
      errors.push({
        platform,
        source: sourceName,
        timestamp: collectedAt,
        error_type: "search_provider_failed",
        message: result.error || "Search provider returned no usable response",
        retry_recommendation: "Check provider configuration or retry after the source cooldown."
      });
      continue;
    }
    items.push(...(result.items || []).slice(0, perSourceLimit).map((item) => ({
      platform,
      url: item.url || "",
      canonical_url: item.canonical_url || item.url || "",
      external_id: item.external_id || null,
      title: item.title || "",
      author: item.author || null,
      snippet: item.snippet || "",
      published_at: item.published_at || null,
      discovered_at: collectedAt,
      source_method: "search",
      source_name: sourceName,
      matched_keywords: Array.isArray(item.matched_keywords) ? item.matched_keywords : [],
      raw_topic: item.raw_topic || item.title || ""
    })));
  }
  return sourceResult({ platform, sourceName, collectedAt, items, errors, status: errors.length ? "failed" : "success", cooldownHours });
}

function sourceResult({ platform, sourceName, collectedAt, items = [], errors = [], status, cooldownHours = 12 }) {
  return {
    platform,
    source_name: sourceName,
    source_method: "search",
    collection_status: status,
    collected_at: collectedAt,
    items,
    errors,
    rate_limit: { max_requests_per_run: 1, cooldown_hours: cooldownHours }
  };
}
