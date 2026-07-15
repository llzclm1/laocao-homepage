import assert from "node:assert/strict";

import {
  RESULT_TYPES,
  draftPlatformContent,
  evaluatePlatformSignal,
  learnFromPlatformResult,
  platformAdapters,
  reviewPlatformContent
} from "../index.mjs";

assert.deepEqual(Object.keys(platformAdapters), ["linkedin", "reddit", "quora", "medium", "x", "substack"]);
assert.equal(Object.values(platformAdapters).every((adapter) => adapter.automation.publish === false), true);
assert.equal(Object.values(platformAdapters).every((adapter) => adapter.automation.dm === false), true);
assert.equal(RESULT_TYPES.includes("submission"), true);
assert.equal(RESULT_TYPES.includes("removed"), true);

const linkedinSignal = evaluatePlatformSignal({
  platform: "linkedin",
  author: "Amazon brand owner",
  company: "DTC brand",
  topic: "Received a quotation from a Chinese supplier before paying a deposit"
});
assert.equal(linkedinSignal.intent_score >= 70, true);
assert.equal(linkedinSignal.recommended_action, "comment");

const redditDraft = draftPlatformContent({ platform: "reddit", topic: "Alibaba supplier asks for a 50% deposit" });
assert.equal(/gewuji|https?:\/\/|dm me/i.test(redditDraft), false);
assert.match(redditDraft, /Before paying/);
assert.equal(reviewPlatformContent({ platform: "reddit", source_url: "https://reddit.com/r/test/comments/abc/post", topic: "deposit", community_checked: true }, redditDraft).decision, "revise");
assert.equal(reviewPlatformContent({ platform: "reddit", source_url: "https://reddit.com/r/test/comments/abc/post", topic: "deposit", community_checked: true }, `${redditDraft} Visit https://gewuji.dev`).decision, "reject");

const quoraSignal = evaluatePlatformSignal({ platform: "quora", topic: "What should I ask a Chinese supplier before paying a deposit?" });
assert.equal(quoraSignal.intent_score >= 70, true);
assert.equal(quoraSignal.recommended_action, "long_answer");
assert.match(draftPlatformContent({ platform: "quora", topic: "paying a supplier deposit" }), /Direct answer/);

assert.equal(evaluatePlatformSignal({ platform: "medium", topic: "supplier replies", question_count: 0 }).recommended_action, "hold");
assert.equal(evaluatePlatformSignal({ platform: "medium", topic: "supplier replies", question_count: 2 }).recommended_action, "article_candidate");
assert.equal(draftPlatformContent({ platform: "x", topic: "supplier reply clarity", is_project_update: true }).length <= 280, true);
assert.equal(evaluatePlatformSignal({ platform: "substack", topic: "weekly note", has_weekly_learning: false }).recommended_action, "hold");

assert.equal(learnFromPlatformResult("reddit", "removed").decision, "tighten_rules_and_promotion_filter");
assert.equal(learnFromPlatformResult("linkedin", "submission").signal, "qualified_submission");
assert.equal(learnFromPlatformResult("quora", "lead").decision, "consider_buyer_guide_or_faq");

console.log("platform strategy tests ok");
