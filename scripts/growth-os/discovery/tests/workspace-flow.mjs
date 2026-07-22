import assert from "node:assert/strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { candidateWorkflowState, createDiscoveredCandidate, discoveryOutcomeStatsForActions, duplicateReplyAction, duplicateWorkflowAction, isXProjectRelevant, replyUrlIssue, selectedPlatformTodayCount, selectedTodayCount, transitionForDiscoveryAction } from "../social-discovery-engine.mjs";
import { auditSocialWorkspace } from "../audit-social-workspace.mjs";
import { buildPlatformOperations, fitXText, readPlatformPolicy, xCharacterCount, X_CHARACTER_LIMIT } from "../platform-policy.mjs";
import { renderXThread } from "../../distribution/social-content-generator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const history = [
  { action: "select_today", date: "2026-07-11T01:00:00.000Z" },
  { action: "viewed", date: "2026-07-11T01:01:00.000Z" },
  { action: "draft_prepared", date: "2026-07-11T01:02:00.000Z" },
  { action: "replied", date: "2026-07-11T01:03:00.000Z" }
];

assert.equal(candidateWorkflowState([]), "inbox");
assert.equal(candidateWorkflowState(history), "outcome_pending");
assert.equal(transitionForDiscoveryAction("inbox", "select_today"), "today");
assert.equal(transitionForDiscoveryAction("today", "viewed"), "viewed");
assert.equal(transitionForDiscoveryAction("viewed", "draft_prepared"), "draft_prepared");
assert.equal(transitionForDiscoveryAction("draft_prepared", "replied"), "outcome_pending");
assert.equal(transitionForDiscoveryAction("outcome_pending", "removed"), "removed");
assert.equal(transitionForDiscoveryAction("today", "replied"), "outcome_pending");
assert.equal(transitionForDiscoveryAction("inbox", "replied"), "outcome_pending");
assert.equal(transitionForDiscoveryAction("ignored", "select_today"), null);
assert.equal(transitionForDiscoveryAction("later", "select_today"), "today");
assert.equal(transitionForDiscoveryAction("closed", "select_today"), null);

assert.equal(isXProjectRelevant({ title: "Vibe coding with an AI agent", snippet: "A build-in-public coding workflow" }), false);
assert.equal(isXProjectRelevant({ title: "AI supplier workflow", snippet: "China supplier quotation" }), false);
assert.equal(isXProjectRelevant({ title: "How should I compare a Chinese supplier quotation?", snippet: "I need to confirm MOQ and payment terms before a sample order." }), true);
assert.equal(createDiscoveredCandidate({ platform: "x", url: "https://x.com/example/status/123", title: "Vibe coding with an AI agent", snippet: "A build-in-public coding workflow" }), null);
assert.ok(createDiscoveredCandidate({ platform: "x", url: "https://x.com/example/status/124", title: "How should I compare a Chinese supplier quotation?", snippet: "I need to confirm MOQ and payment terms before a sample order." }));

assert.equal(duplicateWorkflowAction([
  { id: "DISC-a", action: "select_today", to_state: "today", date: "2026-07-11T01:00:00.000Z" }
], "DISC-a", "select_today", "today")?.action, "select_today");
assert.equal(duplicateWorkflowAction([
  { id: "DISC-a", action: "viewed", to_state: "viewed", date: "2026-07-11T01:00:00.000Z" }
], "DISC-a", "viewed", "viewed")?.action, "viewed");
assert.equal(duplicateWorkflowAction([
  { id: "DISC-a", action: "draft_prepared", to_state: "draft_prepared", date: "2026-07-11T01:00:00.000Z" }
], "DISC-a", "draft_prepared", "draft_prepared")?.action, "draft_prepared");

assert.equal(selectedTodayCount([
  { id: "DISC-a", action: "select_today", date: "2026-07-11T01:00:00.000Z" },
  { id: "DISC-b", action: "select_today", date: "2026-07-11T01:00:00.000Z" },
  { id: "DISC-c", action: "select_today", date: "2026-07-11T01:00:00.000Z" }
]), 3);

const signals = discoveryOutcomeStatsForActions([
  { id: "DISC-a", action: "received_reply" },
  { id: "DISC-a", action: "buyer_signal" },
  { id: "DISC-b", action: "partner_signal" },
  { id: "DISC-c", action: "review_request" },
  { id: "DISC-d", action: "paid_opportunity" }
]);
assert.deepEqual(signals, {
  qualified_interactions: 2,
  buyer_replies: 1,
  partner_leads: 1,
  review_requests: 1,
  paid_opportunities: 1
});

const redditCandidate = {
  platform: "reddit",
  url: "https://reddit.com/r/procurement/comments/abc123/example_post"
};
assert.equal(replyUrlIssue(redditCandidate, "https://reddit.com/r/procurement/comments/abc123/example_post/def456"), "");
assert.match(replyUrlIssue(redditCandidate, redditCandidate.url), /original candidate URL/);
assert.match(replyUrlIssue(redditCandidate, "http://reddit.com/r/procurement/comments/abc123/example_post/def456"), /HTTPS/);
assert.match(replyUrlIssue(redditCandidate, "https://example.com/reply"), /local or example URL/);
assert.match(replyUrlIssue(redditCandidate, "https://x.com/example/status/123"), /same platform/);
assert.equal(duplicateReplyAction([
  { id: "DISC-a", action: "replied", reply_url: "https://reddit.com/r/procurement/comments/abc123/example_post/def456" }
], "DISC-a", "https://www.reddit.com/r/procurement/comments/abc123/example_post/def456/")?.id, "DISC-a");

const duplicateSignals = discoveryOutcomeStatsForActions([
  { id: "DISC-a", action: "received_reply" },
  { id: "DISC-a", action: "received_reply" },
  { id: "DISC-a", action: "buyer_signal" },
  { id: "DISC-a", action: "buyer_signal" }
]);
assert.equal(duplicateSignals.qualified_interactions, 1);
assert.equal(duplicateSignals.buyer_replies, 1);

assert.equal(candidateWorkflowState([
  { action: "select_today", date: "2026-07-11T01:00:00.000Z" },
  { action: "unknown_action", to_state: "paid_opportunity", date: "2026-07-11T01:01:00.000Z" }
]), "today");

const audit = auditSocialWorkspace({ now: new Date("2026-07-11T07:00:00.000Z") });
assert.equal(audit.errors.length, 0);
assert.equal(audit.counts.today <= 3, true);
assert.equal(audit.viewer_consistent, true);

const dashboardHtml = fs.readFileSync(path.join(root, "docs/growth-os/dashboard.html"), "utf8");
assert.match(dashboardHtml, /\/__v2\/unified-view/);
assert.match(dashboardHtml, /Growth OS v2/);
assert.doesNotMatch(dashboardHtml, /Local Growth OS server is not available\. Changes cannot be saved\./);

const policy = readPlatformPolicy();
assert.equal(policy.platforms.length, 10);
assert.equal(policy.retired_platforms.includes("Product Hunt"), true);
assert.equal(policy.platforms.some((item) => item.name === "Product Hunt"), false);
assert.deepEqual(policy.platforms.find((item) => item.key === "medium")?.object_types, ["publish_task"]);
assert.deepEqual(policy.platforms.find((item) => item.key === "substack")?.object_types, ["publish_task"]);

const operations = buildPlatformOperations({
  inbox: [{ id: "DISC-r", platform: "reddit", url: "https://reddit.com/r/a/comments/abc/post" }],
  today: [{ id: "DISC-r", platform: "reddit", topic: "Real thread", workflow_state: "today", url: "https://reddit.com/r/a/comments/abc/post" }],
  results: []
}, { search_provider_status: "not_configured" });
assert.equal(operations.today_plan.length, 1);
assert.deepEqual(operations.today_plan.map((item) => item.platform), ["Reddit"]);
assert.equal(operations.discovery_tasks.every((item) => item.url === null), true);
assert.equal(operations.discovery_tasks.every((item) => item.verified_input_count === 0), true);
assert.equal(operations.discovery_tasks.every((item) => item.generated_output_status === "waiting_for_verified_url"), true);
assert.equal(operations.discovery_tasks.every((item) => Boolean(item.expected_output)), true);
assert.equal(operations.platform_coverage.find((item) => item.platform === "Reddit")?.daily_reply_cap, 1);
assert.equal(operations.platform_coverage.find((item) => item.platform === "Quora")?.search_provider_status, "not_configured");
assert.equal(operations.today_plan[0].url.startsWith("https://reddit.com/"), true);

const defaultPlan = buildPlatformOperations({
  inbox: [{ id: "DISC-r", platform: "reddit", topic: "Real thread", url: "https://reddit.com/r/a/comments/abc/post" }],
  today: [],
  results: []
}, { search_provider_status: "not_configured" }, { now: new Date("2026-07-11T09:00:00.000Z") });
// Reddit is P4: an Inbox candidate is never promoted into Today without an explicit selection.
assert.deepEqual(defaultPlan.today_plan.map((item) => item.platform), []);

assert.equal(selectedPlatformTodayCount([
  { id: "DISC-5bca34d29d2d", action: "select_today", date: "2026-07-11T01:00:00.000Z" },
  { id: "DISC-5bca34d29d2d", action: "replied", date: "2026-07-11T02:00:00.000Z" }
], "reddit", new Date("2026-07-11T09:00:00.000Z")), 1);

const usedRedditCap = buildPlatformOperations({
  inbox: [{ id: "DISC-next", platform: "reddit", topic: "Next thread", url: "https://reddit.com/r/a/comments/def/post" }],
  today: [],
  results: [{ id: "DISC-done", platform: "reddit", selected_for_today_at: "2026-07-11T01:00:00.000Z" }]
}, { search_provider_status: "not_configured" }, { now: new Date("2026-07-11T09:00:00.000Z") });
assert.deepEqual(usedRedditCap.today_plan.map((item) => item.platform), []);
assert.equal(usedRedditCap.platform_coverage.find((item) => item.platform === "Reddit")?.daily_reply_used, 1);

const realSupplement = buildPlatformOperations({
  inbox: [{ id: "DISC-x", platform: "x", topic: "Codex build", url: "https://x.com/example/status/123", suggested_comment: "Relevant reply" }],
  today: [],
  results: [{ id: "DISC-done", platform: "reddit", selected_for_today_at: "2026-07-11T01:00:00.000Z" }]
}, { search_provider_status: "not_configured" }, { now: new Date("2026-07-11T09:00:00.000Z") });
assert.deepEqual(realSupplement.today_plan.map((item) => item.platform), []);

const longXText = "word ".repeat(100);
assert.equal(xCharacterCount(fitXText(longXText)) <= X_CHARACTER_LIMIT, true);
const xThread = renderXThread({ id: "GO-TEST" }, {
  xHook: longXText,
  points: [longXText, longXText, longXText]
});
for (const line of xThread.split(/\r?\n/).filter((item) => /^\d\/\d\s/.test(item))) {
  assert.equal(xCharacterCount(line.replace(/^\d\/\d\s+/, "")) <= X_CHARACTER_LIMIT, true);
}

console.log("Social Discovery workspace flow tests passed");
