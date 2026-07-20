import { buildLifecycleFields } from "../core/lifecycle.mjs";
import { classifyBusinessLine, isBuyerGuideUrl, isReplyReviewUrl, normalizeUrl, observedAt, sourceStatus } from "../core/normalize.mjs";

export function detectFirstPageImpression({ current, previous, now = new Date() } = {}) {
  const source = current?.sources?.find((item) => item.key === "gsc");
  if (!source || !["live", "collected", "partial"].includes(sourceStatus(source))) return [];
  const previousSource = previous?.sources?.find((item) => item.key === "gsc");
  const rows = source.metrics?.page_rows || current?.gsc_pages || [];
  const previousRows = previousSource?.metrics?.page_rows || previous?.gsc_pages || [];
  const previousKeys = new Set(previousRows.map((row) => normalizeUrl(row.url || row.page)).filter(Boolean));
  const at = observedAt(source, current.completed_at || now.toISOString());
  return rows.filter((row) => {
    const url = row.url || row.page;
    return url && !previousKeys.has(normalizeUrl(url));
  }).map((row) => {
    const url = row.url || row.page;
    const businessLine = classifyBusinessLine({ url });
    const isBuyerGuide = isBuyerGuideUrl(url);
    const isReview = isReplyReviewUrl(url);
    return {
      id: `search-page-first-impression:${businessLine}:${normalizeUrl(url)}`,
      event: isBuyerGuide ? "content.buyer_guide.first_impression" : isReview ? "content.reply_review.first_impression" : "search.page.first_impression",
      category: isBuyerGuide || isReview ? "content" : "search",
      business_line: businessLine,
      priority: businessLine === "factory_bridge" ? (isBuyerGuide || isReview ? 4 : 3) : 1,
      confidence: "high",
      severity: "info",
      title: isBuyerGuide ? "A Buyer Guide page received its first impression" : isReview ? "Supplier Reply Review received its first impression" : "A page received its first impression",
      detail: "The page appeared in the current Search Console snapshot but not in the comparison snapshot.",
      payload: { url: normalizeUrl(url), business_line: businessLine, impressions: row.impressions ?? null, clicks: row.clicks ?? null },
      normalized_key: `search.page.first_impression:${businessLine}:${normalizeUrl(url)}`,
      source: "gsc",
      source_status: sourceStatus(source),
      observed_at: at,
      supporting_metric: { impressions: row.impressions ?? null, clicks: row.clicks ?? null, url: normalizeUrl(url) },
      evidence: [{ source: "gsc", source_status: sourceStatus(source), observed_at: at, supporting_metric: { url: normalizeUrl(url), impressions: row.impressions ?? null, clicks: row.clicks ?? null } }],
      ...buildLifecycleFields({ observedAt: at, now: now.toISOString() })
    };
  });
}
