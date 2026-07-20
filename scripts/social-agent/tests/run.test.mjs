import assert from "node:assert/strict";
import test from "node:test";

import { applyOpportunityLifecycle, buildOriginalPostIdeas, buildSocialAgentView, projectDiscoveryCandidates, transitionForOpportunityAction } from "../run.mjs";

const now = new Date("2026-07-20T08:00:00.000Z");

test("projects only real pending Factory Bridge discovery candidates", () => {
  const opportunities = projectDiscoveryCandidates([
    {
      id: "DISC-REDDIT-1",
      platform: "reddit",
      url: "https://reddit.com/r/supplychain/comments/example/payment_question",
      title: "Is this supplier deposit normal?",
      snippet: "A Chinese supplier wants a deposit before a sample order.",
      workflow_state: "inbox",
      suggested_comment: "I would first separate what the payment covers from what remains open."
    },
    {
      id: "DISC-REDDIT-1",
      platform: "reddit",
      url: "https://reddit.com/r/supplychain/comments/example/payment_question",
      title: "Is this supplier deposit normal?",
      snippet: "A Chinese supplier wants a deposit before a sample order.",
      workflow_state: "inbox",
      suggested_comment: "I would first separate what the payment covers from what remains open."
    },
    {
      id: "DISC-NO-URL",
      platform: "linkedin",
      title: "LinkedIn Discovery Task",
      workflow_state: "inbox"
    },
    {
      id: "DISC-AI",
      platform: "x",
      url: "https://x.com/example/status/123",
      title: "Vibe coding with Codex",
      snippet: "AI agents and automation",
      workflow_state: "inbox",
      suggested_comment: "Interesting."
    },
    {
      id: "DISC-REPLIED",
      platform: "reddit",
      url: "https://reddit.com/r/supplychain/comments/example/replied",
      title: "Supplier quote comparison",
      snippet: "How should I compare two supplier quotations?",
      workflow_state: "replied",
      suggested_comment: "Compare the same scope before comparing the price."
    },
    {
      id: "DISC-CONFLICTING-PUBLISHED",
      platform: "reddit",
      url: "https://reddit.com/r/supplychain/comments/example/published",
      title: "Supplier quote comparison",
      snippet: "How should I compare two supplier quotations?",
      workflow_state: "inbox",
      status: "published",
      suggested_comment: "Compare the same scope before comparing the price."
    }
  ], now);

  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].id, "DISC-REDDIT-1");
  assert.equal(opportunities[0].status, "pending_review");
  assert.equal(opportunities[0].review_status, "pending_review");
  assert.equal(opportunities[0].business_line, "factory_bridge");
  assert.equal(opportunities[0].link_allowed, false);
});

test("current discovery data produces a real Reddit review item, not a placeholder", () => {
  const view = buildSocialAgentView(now);
  assert.ok(view.opportunities.length >= 1);
  const replies = view.opportunities.filter((item) => item.type === "reply_opportunity");
  const originals = view.opportunities.filter((item) => item.type === "original_post");
  assert.equal(replies.every((item) => item.url && item.title && item.status === "pending_review"), true);
  assert.equal(originals.every((item) => item.title && item.draft && item.status === "pending_review"), true);
  assert.equal(view.opportunities.some((item) => /discovery task/i.test(item.title)), false);
  assert.equal(view.opportunities.every((item) => item.business_line === "factory_bridge"), true);
});

test("original post ideas require real evidence and stay within the daily cap", () => {
  assert.equal(buildOriginalPostIdeas({ now, opportunities: [], signals: { signals: [] } }).length, 0);
  const ideas = buildOriginalPostIdeas({
    now,
    opportunities: [{
      id: "DISC-REAL",
      type: "reply_opportunity",
      business_line: "factory_bridge",
      title: "Supplier payment scope",
      summary: "A buyer is comparing advance payment and installation costs.",
      url: "https://www.quora.com/What-should-I-confirm-before-paying-a-Chinese-supplier",
      source: "data/growth-os/social-discovery/today-opportunities.json",
      source_status: "public_discovery",
      captured_at: now.toISOString()
    }],
    signals: { signals: [] }
  });

  assert.equal(ideas.length, 1);
  assert.equal(ideas[0].type, "original_post");
  assert.equal(ideas[0].status, "pending_review");
  assert.equal(ideas[0].business_line, "factory_bridge");
  assert.equal(ideas[0].link_allowed, false);
  assert.equal(ideas[0].evidence.source_status, "public_discovery");
  assert.equal(ideas[0].evidence.source_url, "https://www.quora.com/What-should-I-confirm-before-paying-a-Chinese-supplier");
});

test("signal-only original drafts remain within the LinkedIn daily limit", () => {
  const ideas = buildOriginalPostIdeas({
    now,
    opportunities: [],
    signals: {
      signals: [{
        id: "search-query-first-seen:factory_bridge:supplier-payment",
        business_line: "factory_bridge",
        status: "detected",
        title: "Supplier payment query",
        detail: "A Factory Bridge payment query appeared.",
        source: "gsc",
        source_status: "live",
        observed_at: now.toISOString(),
        payload: { query: "supplier payment" }
      }]
    }
  });

  assert.equal(ideas.length, 1);
  assert.equal(ideas[0].platform, "LinkedIn");
});

test("public Quora and LinkedIn search results use the same reply projection", () => {
  const opportunities = projectDiscoveryCandidates([
    {
      id: "DISC-QUORA-1",
      platform: "quora",
      url: "https://quora.com/What-should-I-confirm-before-paying-a-Chinese-supplier",
      title: "What should I confirm before paying a Chinese supplier?",
      snippet: "A buyer wants to compare payment terms and quotation scope.",
      workflow_state: "inbox",
      suggested_comment: "Ask the supplier to confirm the scope and payment milestone in writing."
    },
    {
      id: "DISC-LINKEDIN-1",
      platform: "linkedin",
      url: "https://linkedin.com/posts/example_supplier-quotation-activity-1234567890",
      title: "How do you compare a China supplier quotation?",
      snippet: "A procurement team is clarifying MOQ, samples, and delivery terms.",
      workflow_state: "inbox",
      suggested_comment: "Compare the same product scope, MOQ, sample terms, and delivery basis."
    }
  ], now);

  assert.deepEqual(opportunities.map((item) => item.platform).sort(), ["LinkedIn", "Quora"]);
  assert.equal(opportunities.every((item) => item.status === "pending_review" && item.link_allowed === false), true);
});

test("orders reply opportunities by the current platform priority", () => {
  const opportunities = projectDiscoveryCandidates([
    { id:"DISC-R", platform:"reddit", url:"https://reddit.com/r/supplychain/comments/example/payment", title:"Supplier payment", snippet:"Supplier payment details", workflow_state:"inbox", suggested_comment:"Draft" },
    { id:"DISC-Q", platform:"quora", url:"https://quora.com/Payment-terms-with-a-Chinese-supplier", title:"Supplier payment", snippet:"Supplier payment details", workflow_state:"inbox", suggested_comment:"Draft" },
    { id:"DISC-L", platform:"linkedin", url:"https://linkedin.com/posts/example-supplier-payment-activity-123", title:"Supplier payment", snippet:"Supplier payment details", workflow_state:"inbox", suggested_comment:"Draft" }
  ], now);

  assert.deepEqual(opportunities.map((item) => item.platform), ["LinkedIn", "Quora", "Reddit"]);
});

test("keeps at most twenty highest-priority reply opportunities in the review queue", () => {
  const opportunities = projectDiscoveryCandidates(Array.from({ length: 25 }, (_, index) => ({
    id: `DISC-L-${index}`,
    platform: "linkedin",
    url: `https://linkedin.com/posts/supplier-payment-${index}-activity-1234567890`,
    title: `Chinese supplier payment question ${index}`,
    snippet: "A buyer is comparing supplier payment terms before ordering.",
    workflow_state: "inbox",
    suggested_comment: "Ask for the payment scope and order terms in writing."
  })), now);

  assert.equal(opportunities.length, 20);
  assert.equal(opportunities.every((item) => item.type === "reply_opportunity"), true);
});

test("reply and original opportunities share the publishing lifecycle", () => {
  const items = [
    { id: "DISC-REPLY", type: "reply_opportunity", title: "Supplier payment", status: "pending_review", suggested_reply: "Reply draft" },
    { id: "POST-ORIGINAL", type: "original_post", title: "Payment scope", status: "pending_review", draft: "Post draft" }
  ];
  const actions = [
    { id: "DISC-REPLY", to_status: "approved", at: "2026-07-20T08:00:00.000Z" },
    { id: "DISC-REPLY", to_status: "ready_to_publish", at: "2026-07-20T08:01:00.000Z" },
    { id: "DISC-REPLY", to_status: "published", at: "2026-07-20T08:02:00.000Z", published_at: "2026-07-20T08:02:00.000Z" },
    { id: "POST-ORIGINAL", to_status: "approved", at: "2026-07-20T08:03:00.000Z" }
  ];
  const projected = applyOpportunityLifecycle(items, actions);

  assert.equal(projected.find((item) => item.id === "DISC-REPLY").status, "published");
  assert.equal(projected.find((item) => item.id === "DISC-REPLY").published_at, "2026-07-20T08:02:00.000Z");
  assert.deepEqual(projected.find((item) => item.id === "DISC-REPLY").performance, { views: null, clicks: null, comments: null, likes: null, ctr: null });
  assert.equal(projected.find((item) => item.id === "POST-ORIGINAL").status, "approved");
  assert.equal(transitionForOpportunityAction("pending_review", "approve"), "approved");
  assert.equal(transitionForOpportunityAction("approved", "ready_to_publish"), "ready_to_publish");
  assert.equal(transitionForOpportunityAction("ready_to_publish", "published"), "published");
  assert.equal(transitionForOpportunityAction("pending_review", "published"), null);
});
