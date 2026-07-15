import { capScore, clean, humanReview, normalizeSignal, scoreFromRules } from "../core.mjs";

export const quora = {
  key: "quora",
  role: "Search Intent Content Engine",
  success_signals: ["published", "liked", "replied", "lead", "submission"],
  automation: { collect: false, publish: false, comment: false, dm: false },

  evaluate(input) {
    const signal = normalizeSignal(input, this.key);
    const text = `${signal.topic} ${signal.source_text}`;
    const score = capScore(scoreFromRules(text, [
      { pattern: /how do i|how can i|what should i|best way|before i/, points: 20 },
      { pattern: /chinese supplier|china factory|alibaba|manufacturer|trading company/, points: 20 },
      { pattern: /payment|deposit|sample|moq|quotation|quote|customization|lead time/, points: 30 },
      { pattern: /compare|check|clarify|ask|changed|refuses|missing/, points: 20 },
      { pattern: /china economy|semiconductor|court|chipotle/, points: -60 }
    ]));
    return { ...signal, intent_score: score, recommended_action: score >= 70 ? "long_answer" : score >= 50 ? "monitor" : "ignore" };
  },

  write(input) {
    const signal = this.evaluate(input);
    const question = signal.topic || "the supplier question";
    return `Direct answer: before deciding on ${question}, separate what the supplier confirmed from what remains unclear.\n\nCheck five areas:\n1. Product specification and materials\n2. MOQ and quotation scope\n3. Sample or customization requirements\n4. Production and delivery timing\n5. Payment recipient and terms\n\nThe goal is not to label the supplier reliable or unreliable. It is to obtain enough specific information to decide the next step.`;
  },

  review(input, draft) {
    return humanReview(this.evaluate(input), {
      external_link: /https?:\/\//i.test(clean(draft)),
      identity_claim: /in my experience|i work with|we work with/i.test(clean(draft)),
      unverified_claim: /legitimate|scam|safe supplier|verified factory|guaranteed/i.test(clean(draft))
    });
  },

  learn(result) {
    if (["lead", "submission"].includes(result)) return { decision: "consider_buyer_guide_or_faq", signal: "qualified_search_action" };
    if (result === "replied") return { decision: "capture_follow_up_question", signal: "content_gap" };
    return { decision: "review_after_30_days", signal: result };
  }
};
