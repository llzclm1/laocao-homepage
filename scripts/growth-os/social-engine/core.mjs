export const RESULT_TYPES = Object.freeze([
  "ignored",
  "published",
  "removed",
  "liked",
  "replied",
  "dm",
  "lead",
  "submission"
]);

export const REVIEW_DECISIONS = Object.freeze(["approve", "revise", "reject"]);

export function normalizeSignal(input, platform) {
  return {
    platform,
    source_url: clean(input.source_url),
    author: clean(input.author),
    company: clean(input.company),
    topic: clean(input.topic),
    source_text: clean(input.source_text),
    intent: clean(input.intent) || "unknown",
    buyer_stage: clean(input.buyer_stage) || "unknown",
    risk: Number.isFinite(Number(input.risk)) ? Number(input.risk) : 0,
    generated_content: clean(input.generated_content),
    published_url: clean(input.published_url),
    result: RESULT_TYPES.includes(input.result) ? input.result : "ignored"
  };
}

export function humanReview(signal, checks = {}) {
  const reasons = [];
  if (!signal.source_url) reasons.push("source_url_required");
  if (!signal.topic && !signal.source_text) reasons.push("source_context_required");
  if (checks.policy_risk) reasons.push("platform_policy_risk");
  if (checks.identity_claim) reasons.push("identity_claim_requires_review");
  if (checks.external_link) reasons.push("external_link_requires_review");
  if (checks.direct_message) reasons.push("direct_message_requires_review");
  if (checks.unverified_claim) reasons.push("unverified_claim");
  return {
    required: true,
    decision: reasons.some((reason) => ["platform_policy_risk", "unverified_claim"].includes(reason)) ? "reject" : "revise",
    reasons
  };
}

export function scoreFromRules(text, rules) {
  const normalized = clean(text).toLowerCase();
  return rules.reduce((score, rule) => score + (rule.pattern.test(normalized) ? rule.points : 0), 0);
}

export function capScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function containsPromotion(value) {
  return /\b(gewuji|check my|visit my|dm me|message me|click here|free review|our service)\b|https?:\/\//i.test(clean(value));
}
