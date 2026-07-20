const FACTORY_TERMS = /supplier|factory|buyer|sample|payment|quotation|reply|manufacturer|moq|communication|checklist/i;
const GAME_TERMS = /repo|roblox|world cup|block blast|game|forest|steam|kpi monster/i;

export function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname}`.replace(/\/$/, "") || url.origin;
  } catch {
    return String(value || "").trim().replace(/\/$/, "");
  }
}

export function classifyBusinessLine({ query = "", url = "" } = {}) {
  const value = `${query} ${url}`.toLowerCase();
  if (GAME_TERMS.test(value) || /games\.gewuji\.dev/.test(value)) return "games";
  if (FACTORY_TERMS.test(value) || /factory\.gewuji\.dev/.test(value)) return "factory_bridge";
  if (/gewuji\.dev/.test(value)) return "brand";
  return "unknown";
}

export function isFactoryQuery(value) {
  return FACTORY_TERMS.test(String(value || "")) && !GAME_TERMS.test(String(value || ""));
}

export function isHighIntentQuery(value) {
  return /supplier|factory|manufacturer|moq|sample|payment|deposit|quotation|quote|reply|communication|checklist/i.test(String(value || ""));
}

export function isBuyerGuideUrl(value) {
  return /\/buyer-guides\//i.test(String(value || "")) || /\/field-materials\//i.test(String(value || ""));
}

export function isReplyReviewUrl(value) {
  return /\/supplier-reply-review\//i.test(String(value || ""));
}

export function observedAt(source, fallback = null) {
  return source?.updated_at || source?.observed_at || fallback || null;
}

export function sourceStatus(source) {
  return source?.state || source?.status || "unavailable";
}

export function metricNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}
