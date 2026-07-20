import { buildLifecycleFields } from "../core/lifecycle.mjs";
import { classifyBusinessLine, normalizeQuery, observedAt, sourceStatus } from "../core/normalize.mjs";

export function detectFirstQuery({ current, previous, now = new Date() } = {}) {
  const source = current?.sources?.find((item) => item.key === "gsc");
  if (!source || !["live", "collected", "partial"].includes(sourceStatus(source))) return [];
  const previousSource = previous?.sources?.find((item) => item.key === "gsc");
  const rows = source.metrics?.query_rows || current?.gsc_queries || [];
  const previousRows = previousSource?.metrics?.query_rows || previous?.gsc_queries || [];
  const previousKeys = new Set(previousRows.map((row) => normalizeQuery(row.query || row.term)).filter(Boolean));
  const at = observedAt(source, current.completed_at || now.toISOString());
  return rows.filter((row) => normalizeQuery(row.query || row.term) && !previousKeys.has(normalizeQuery(row.query || row.term))).map((row) => {
    const query = String(row.query || row.term).trim();
    const url = row.url || row.page || "";
    const businessLine = classifyBusinessLine({ query, url });
    return {
      id: `search-query-first-seen:${businessLine}:${normalizeQuery(query)}`,
      event: "search.query.first_seen",
      category: "search",
      business_line: businessLine,
      priority: businessLine === "factory_bridge" ? 5 : 2,
      confidence: "high",
      severity: "info",
      title: "A new search query appeared",
      detail: "A query was observed in the current Search Console snapshot for the first time in the available comparison window.",
      payload: { query, normalized_query: normalizeQuery(query), url, business_line: businessLine },
      normalized_key: `search.query:${businessLine}:${normalizeQuery(query)}`,
      source: "gsc",
      source_status: sourceStatus(source),
      observed_at: at,
      supporting_metric: { impressions: row.impressions ?? null, clicks: row.clicks ?? null, position: row.position ?? null },
      evidence: [{ source: "gsc", source_status: sourceStatus(source), observed_at: at, supporting_metric: { query, url, impressions: row.impressions ?? null, clicks: row.clicks ?? null } }],
      ...buildLifecycleFields({ observedAt: at, now: now.toISOString() })
    };
  });
}
