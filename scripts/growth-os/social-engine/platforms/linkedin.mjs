import { capScore, clean, humanReview, normalizeSignal, scoreFromRules } from "../core.mjs";

export const linkedin = {
  key: "linkedin",
  role: "Buyer Relationship Engine",
  success_signals: ["replied", "dm", "lead", "submission"],
  automation: { collect: false, publish: false, comment: false, dm: false },

  evaluate(input) {
    const signal = normalizeSignal(input, this.key);
    const text = `${signal.author} ${signal.company} ${signal.topic} ${signal.source_text}`;
    const score = capScore(scoreFromRules(text, [
      { pattern: /amazon|shopify|dtc|brand owner|importer|procurement|sourcing manager|product developer/, points: 20 },
      { pattern: /china|chinese supplier|alibaba|factory/, points: 15 },
      { pattern: /quotation|quote|sample|deposit|payment|moq|lead time|customization/, points: 25 },
      { pattern: /received|asked|before paying|before ordering|not sure|unclear|compare/, points: 25 },
      { pattern: /hiring|job|freight service|supplier promotion/, points: -35 }
    ]));
    return { ...signal, intent_score: score, recommended_action: score >= 70 ? "comment" : score >= 50 ? "monitor" : "ignore" };
  },

  write(input) {
    const signal = this.evaluate(input);
    const topic = signal.topic || "the supplier response";
    return `One point I would clarify in ${topic}: what did the supplier actually confirm in writing, and which details are still assumptions? Before moving forward, I would ask for the exact specification, commercial terms, and timeline that apply to this order.`;
  },

  review(input, draft) {
    return humanReview(this.evaluate(input), {
      direct_message: Boolean(input.direct_message),
      identity_claim: /in my experience|i work with|we work with/i.test(clean(draft)),
      external_link: /https?:\/\//i.test(clean(draft)),
      unverified_claim: /scam|safe supplier|verified factory|guaranteed/i.test(clean(draft))
    });
  },

  learn(result) {
    if (result === "submission") return { decision: "increase_similar_buyer_stage", signal: "qualified_submission" };
    if (["replied", "dm", "lead"].includes(result)) return { decision: "retain_topic", signal: "relationship_progress" };
    return { decision: "no_scale", signal: result };
  }
};
