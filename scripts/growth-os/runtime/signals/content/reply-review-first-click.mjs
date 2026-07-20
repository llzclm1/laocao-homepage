import { buildLifecycleFields } from "../core/lifecycle.mjs";
import { metricNumber, observedAt, sourceStatus } from "../core/normalize.mjs";

export function detectReplyReviewFirstClick({ current, previous, now = new Date() } = {}) {
  const source = current?.sources?.find((item) => item.key === "gsc");
  if (!source || !["live", "collected", "partial"].includes(sourceStatus(source))) return [];
  const currentClicks = metricNumber(source.metrics?.web_search_clicks ?? source.metrics?.clicks);
  const previousClicks = metricNumber(previous?.sources?.find((item) => item.key === "gsc")?.metrics?.web_search_clicks ?? previous?.sources?.find((item) => item.key === "gsc")?.metrics?.clicks) || 0;
  const rows = source.metrics?.page_rows || current?.gsc_pages || [];
  const reviewRow = rows.find((row) => /\/supplier-reply-review\//i.test(String(row.url || row.page || "")));
  const rowClicks = metricNumber(reviewRow?.clicks);
  if (!((rowClicks !== null && rowClicks > 0) || (currentClicks !== null && currentClicks > previousClicks))) return [];
  const at = observedAt(source, current.completed_at || now.toISOString());
  return [{
    id: "content.reply_review.first_click",
    event: "content.reply_review.first_click",
    category: "content",
    business_line: "factory_bridge",
    priority: 5,
    confidence: "high",
    severity: "positive",
    title: "Supplier Reply Review received a search click",
    detail: "A Search Console click was observed for the Supplier Reply Review page.",
    payload: { url: reviewRow?.url || reviewRow?.page || "/supplier-reply-review/", clicks: rowClicks ?? currentClicks },
    normalized_key: "content.reply_review.first_click",
    source: "gsc",
    source_status: sourceStatus(source),
    observed_at: at,
    supporting_metric: { clicks: rowClicks ?? currentClicks, previous_clicks: previousClicks },
    evidence: [{ source: "gsc", source_status: sourceStatus(source), observed_at: at, supporting_metric: { clicks: rowClicks ?? currentClicks, previous_clicks: previousClicks } }],
    ...buildLifecycleFields({ observedAt: at, now: now.toISOString() })
  }];
}
