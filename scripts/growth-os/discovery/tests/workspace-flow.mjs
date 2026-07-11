import assert from "node:assert/strict";

import { candidateWorkflowState, discoveryOutcomeStatsForActions, duplicateReplyAction, replyUrlIssue, transitionForDiscoveryAction } from "../social-discovery-engine.mjs";

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
assert.equal(transitionForDiscoveryAction("today", "replied"), null);

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

console.log("Social Discovery workspace flow tests passed");
