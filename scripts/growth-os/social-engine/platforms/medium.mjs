import { clean, humanReview, normalizeSignal } from "../core.mjs";

export const medium = {
  key: "medium",
  role: "Authority / GEO Asset",
  success_signals: ["published", "replied", "lead"],
  automation: { collect: false, publish: false, comment: false, dm: false },
  evaluate(input) { const signal = normalizeSignal(input, this.key); const evidence = Number(input.question_count || 0) + Number(input.qualified_signal_count || 0); return { ...signal, evidence_count: evidence, recommended_action: evidence > 0 ? "article_candidate" : "hold" }; },
  write(input) { const topic = clean(input.topic) || "supplier communication"; return `Working title: What buyers should clarify about ${topic}\n\nUse only verified buyer questions, explain the decision context, show what information is present or missing, and end with practical follow-up questions. Do not turn an unvalidated short post into a long article.`; },
  review(input, draft) { return humanReview(this.evaluate(input), { identity_claim:/our client|case study/i.test(clean(draft)), unverified_claim:/guaranteed|always|proven/i.test(clean(draft)) }); },
  learn(result) { return result === "lead" ? { decision:"retain_authority_topic", signal:"commercial_assist" } : { decision:"do_not_expand_without_search_or_reference_signal", signal:result }; }
};
