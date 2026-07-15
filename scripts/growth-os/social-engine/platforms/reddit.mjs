import { capScore, clean, containsPromotion, humanReview, normalizeSignal, scoreFromRules } from "../core.mjs";

export const reddit = {
  key: "reddit",
  role: "Buyer Language Mining + Trust Building",
  success_signals: ["published", "replied"],
  automation: { collect: false, publish: false, comment: false, dm: false },

  evaluate(input) {
    const signal = normalizeSignal(input, this.key);
    const text = `${signal.topic} ${signal.source_text}`;
    const intent = capScore(scoreFromRules(text, [
      { pattern: /alibaba|china supplier|factory|manufacturer/, points: 20 },
      { pattern: /moq|deposit|payment|sample|quotation|quote|quality|lead time/, points: 30 },
      { pattern: /what should|how do|is this normal|not sure|changed bank|refund/, points: 25 }
    ]));
    let risk = Number(input.rule_risk || 0);
    if (containsPromotion(input.generated_content)) risk += 60;
    if (input.community_allows_links === false) risk += 20;
    if (input.community_checked !== true) risk += 20;
    risk = capScore(risk);
    return { ...signal, intent_score: intent, risk, recommended_action: risk > 39 ? "observe" : intent >= 50 ? "reply_candidate" : "language_only" };
  },

  write(input) {
    const text = clean(`${input.topic} ${input.source_text}`).toLowerCase();
    if (/deposit|payment|bank account/.test(text)) return "Before paying, I would clarify three things: whether the account name matches the company you are dealing with, exactly what the payment covers, and what written terms apply if the sample or order cannot proceed.";
    if (/sample/.test(text)) return "I would separate sample production time from shipping time, then confirm the specification, customization, packaging, and what happens if the sample needs another revision.";
    return "I would first list what the supplier confirmed, what is still missing, and the next two or three questions needed before making the decision. A short answer can be genuine and still be incomplete.";
  },

  review(input, draft) {
    const signal = this.evaluate({ ...input, generated_content: draft });
    return humanReview(signal, {
      policy_risk: signal.risk > 39,
      external_link: /https?:\/\//i.test(clean(draft)),
      direct_message: /dm me|message me/i.test(clean(draft)),
      identity_claim: /my client|our service|we review/i.test(clean(draft)),
      unverified_claim: /scam|fraud|safe|verified|guaranteed/i.test(clean(draft))
    });
  },

  learn(result) {
    if (result === "removed") return { decision: "tighten_rules_and_promotion_filter", signal: "policy_risk" };
    if (result === "replied") return { decision: "save_buyer_language", signal: "meaningful_discussion" };
    return { decision: "observe_without_promotion", signal: result };
  }
};
