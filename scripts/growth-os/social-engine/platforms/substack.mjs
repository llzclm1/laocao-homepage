import { clean, humanReview, normalizeSignal } from "../core.mjs";

export const substack = {
  key: "substack",
  role: "Long-term Audience Asset",
  success_signals: ["published", "replied", "lead"],
  automation: { collect: false, publish: false, comment: false, dm: false },
  evaluate(input) { const signal = normalizeSignal(input, this.key); return { ...signal, recommended_action: input.has_weekly_learning ? "weekly_note" : "hold" }; },
  write(input) { return `Buyer Note\n\n${clean(input.topic) || "This week's supplier communication question"}\n\nSignal: ${clean(input.signal) || "No verified signal recorded."}\nMeaning: ${clean(input.meaning) || "Pending validation."}\nDecision: ${clean(input.decision) || "Do not expand without evidence."}`; },
  review(input, draft) { return humanReview(this.evaluate(input), { identity_claim:/customer|client/i.test(clean(draft)), unverified_claim:/guaranteed|always|proven/i.test(clean(draft)) }); },
  learn(result) { return result === "replied" ? { decision:"record_subscriber_question", signal:"audience_feedback" } : { decision:"keep_weekly_or_lower", signal:result }; }
};
