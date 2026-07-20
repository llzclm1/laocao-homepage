import { buildLifecycleFields } from "../core/lifecycle.mjs";
import { classifyBusinessLine, isHighIntentQuery, normalizeQuery, observedAt, sourceStatus } from "../core/normalize.mjs";

export function detectHighIntentQuery({ current, now = new Date() } = {}) {
  const source = current?.sources?.find((item) => item.key === "gsc");
  if (!source || !["live", "collected", "partial"].includes(sourceStatus(source))) return [];
  const rows = source.metrics?.query_rows || current?.gsc_queries || [];
  const at = observedAt(source, current.completed_at || now.toISOString());
  return rows.filter((row) => isHighIntentQuery(row.query || row.term)).map((row) => {
    const query = String(row.query || row.term).trim();
    const url = row.url || row.page || "";
    const businessLine = classifyBusinessLine({ query, url });
    return {
      id: `search-high-intent:${businessLine}:${normalizeQuery(query)}`,
      event: "search.query.high_intent",
      category: "search",
      business_line: businessLine,
      priority: businessLine === "factory_bridge" ? 4 : 1,
      confidence: "medium",
      severity: "info",
      title: "A high-intent search query was observed",
      detail: "The query contains supplier, factory, sample, payment, quote, or buyer-communication language.",
      payload: { query, normalized_query: normalizeQuery(query), url, business_line: businessLine },
      normalized_key: `search.query.high_intent:${businessLine}:${normalizeQuery(query)}`,
      source: "gsc",
      source_status: sourceStatus(source),
      observed_at: at,
      supporting_metric: { impressions: row.impressions ?? null, clicks: row.clicks ?? null, position: row.position ?? null },
      evidence: [{ source: "gsc", source_status: sourceStatus(source), observed_at: at, supporting_metric: { query, url, impressions: row.impressions ?? null, clicks: row.clicks ?? null } }],
      ...buildLifecycleFields({ observedAt: at, now: now.toISOString() })
    };
  });
}
