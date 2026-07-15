import { clean, humanReview, normalizeSignal } from "../core.mjs";

export const x = {
  key: "x",
  role: "Build in Public / Founder Brand",
  success_signals: ["published", "liked", "replied"],
  automation: { collect: false, publish: false, comment: false, dm: false },
  evaluate(input) { const signal = normalizeSignal(input, this.key); return { ...signal, recommended_action: input.is_project_update || input.is_industry_observation ? "short_post" : "hold" }; },
  write(input) { return clean(`Building Gewuji around one question: ${input.topic || "what does a supplier reply actually confirm?"} The useful signal is not reach. It is whether a buyer trusts us with a real supplier communication problem.`).slice(0, 280); },
  review(input, draft) { return humanReview(this.evaluate(input), { unverified_claim:/guaranteed|best|proven/i.test(clean(draft)) }); },
  learn(result) { return result === "replied" ? { decision:"save_language_not_lead", signal:"founder_feedback" } : { decision:"keep_low_frequency", signal:result }; }
};
