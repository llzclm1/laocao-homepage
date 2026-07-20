import assert from "node:assert/strict";
import test from "node:test";

import { BRIEF_MODES, buildMorningBrief } from "../morning-brief.mjs";

const run = (sources, completedAt = "2026-07-20T08:00:00.000Z") => ({
  task_id: "GROWTH-004",
  completed_at: completedAt,
  sources
});

const source = (key, state, metrics, updatedAt = "2026-07-20T07:00:00.000Z", extra = {}) => ({
  key,
  label: key,
  state,
  status: state,
  source: `fixture:${key}`,
  updated_at: updatedAt,
  metrics,
  ...extra
});

test("uses comparison mode when current and previous live metrics are comparable", () => {
  const brief = buildMorningBrief(
    run([source("gsc", "live", { web_search_clicks: 3 })]),
    { previous: run([source("gsc", "live", { web_search_clicks: 1 }, "2026-07-19T07:00:00.000Z")], "2026-07-19T08:00:00.000Z") }
  );

  assert.equal(brief.brief_mode, BRIEF_MODES.COMPARISON);
  assert.equal(brief.title, "昨天发生了什么");
  assert.equal(brief.yesterday[0].supporting_metric.delta, 2);
  assert.equal(brief.yesterday[0].comparison_available, true);
});

test("partial source failure still produces a supported comparison", () => {
  const brief = buildMorningBrief(
    run([source("gsc", "live", { web_search_clicks: 2 }), source("cloudflare", "unavailable", {})]),
    { previous: run([source("gsc", "live", { web_search_clicks: 1 }), source("cloudflare", "live", { visits: 20 })], "2026-07-19T08:00:00.000Z") }
  );

  assert.equal(brief.brief_mode, BRIEF_MODES.COMPARISON);
  assert.equal(brief.evidence.comparison_sources.includes("gsc"), true);
  assert.equal(brief.yesterday.every((item) => item.source && item.source_status && item.observed_at && item.supporting_metric), true);
});

test("cached and manual records use the honest insufficient-data title", () => {
  const brief = buildMorningBrief(run([
    source("geo", "cached", { queries: 2, mentions: 0, citations: 0 }, "2026-07-11T02:29:32.972Z"),
    source("conversion", "manual", { recorded_rows: 0, material_submitted: 0 }, "2026-07-15T13:57:02.989Z")
  ]));

  assert.equal(brief.brief_mode, BRIEF_MODES.INSUFFICIENT_DATA);
  assert.equal(brief.title, "目前可以确认的情况");
  assert.match(brief.yesterday.map((item) => item.headline).join("\n"), /缓存|人工记录/);
});

test("all unavailable sources still yield a truthful brief without inventing a trend", () => {
  const brief = buildMorningBrief(run([
    source("cloudflare", "unavailable", {}),
    source("gsc", "unavailable", {}),
    source("clarity", "unavailable", {}),
    source("semrush", "unavailable", {}),
    source("social", "unavailable", {})
  ]));

  assert.equal(brief.brief_mode, BRIEF_MODES.INSUFFICIENT_DATA);
  assert.match(brief.yesterday[0].headline, /搜索、流量、社交平台/);
  assert.match(brief.yesterday[0].detail, /没有足够证据/);
});

test("old cached data is never labeled as yesterday", () => {
  const brief = buildMorningBrief(run([
    source("geo", "cached", { queries: 2, mentions: 0, citations: 0 }, "2026-07-11T02:29:32.972Z")
  ], "2026-07-20T08:00:00.000Z"));

  assert.notEqual(brief.title, "昨天发生了什么");
  assert.equal(brief.yesterday.every((item) => item.comparison_available === false), true);
  assert.match(brief.yesterday[0].detail, /缓存记录/);
});

test("games signals are not classified as Factory Bridge", () => {
  const brief = buildMorningBrief(run([
    source("gsc", "live", { web_search_clicks: 3, query: "repo extraction", url: "https://games.gewuji.dev/repo-extraction-loop-explained/" })
  ]));

  assert.equal(brief.brief_mode, BRIEF_MODES.LATEST_OBSERVATION);
  assert.equal(brief.yesterday[0].area, "games");
  assert.notEqual(brief.yesterday[0].area, "factory");
});

test("a failed platform does not create a platform-specific action", () => {
  const brief = buildMorningBrief(
    run([source("social", "unavailable", {}), source("gsc", "unavailable", {})]),
    { dashboardView: { opportunities: [], today_actions: [], today_plan: [] } }
  );

  assert.equal(brief.today_actions.some((item) => /修复|Social|GSC|平台失败/.test(`${item.title} ${item.reason}`)), false);
  assert.ok(brief.needs_review.length <= 1);
});

test("brief never exposes Unknown", () => {
  const brief = buildMorningBrief(run([
    source("geo", "cached", { queries: 2, mentions: 0, citations: 0 })
  ]));

  assert.equal(JSON.stringify(brief).includes("Unknown"), false);
});

test("today actions are limited to three and prefer business work", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      opportunities: [
        { id: "GO-001", title: "业务机会，不是待审核内容", business_score: 98 },
        { id: "GO-006", title: "另一个业务机会", business_score: 80 }
      ],
      today_actions: [],
      today_plan: [
        { id: "experiment-1", title: "记录买家问题", status: "pending" },
        { id: "experiment-2", title: "继续发布", status: "pending" },
        { id: "experiment-3", title: "不应显示", status: "pending" }
      ]
    },
    socialView: {
      opportunities: [{ id: "GO-002", title: "审核供应商回复", business_score: 96, status: "pending_review", review_status: "pending_review" }]
    }
  });

  assert.equal(brief.today_actions.length, 3);
  assert.equal(brief.today_actions[0].id, "GO-002");
});

test("review queue empty does not create a review action from dashboard opportunities", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      opportunities: [{ id: "GO-001", title: "业务机会，不是待审核内容", business_score: 98 }],
      today_actions: [],
      today_plan: []
    },
    socialView: { opportunities: [], drafts: [] }
  });

  assert.equal(brief.today_actions.length, 0);
  assert.equal(brief.today_actions.some((item) => /审核/.test(`${item.action} ${item.title}`)), false);
});

test("URL-less discovery tasks do not become Today Actions", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      opportunities: [],
      today_actions: [],
      today_plan: [
        { id: "DISCOVERY-LINKEDIN", object_type: "discovery_task", title: "LinkedIn Discovery Task", status: "manual_review_required" },
        { id: "DISCOVERY-QUORA", object_type: "discovery_task", title: "Quora Discovery Task", status: "manual_review_required" }
      ]
    },
    socialView: { opportunities: [], drafts: [] }
  });

  assert.equal(brief.today_actions.length, 0);
  assert.equal(brief.today_actions.some((item) => /Discovery Task/.test(item.title)), false);
});

test("stale review wording in dashboard tasks is ignored when the queue is empty", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      opportunities: [],
      today_actions: [{ id: "STALE-REVIEW", action: "审核：旧机会项", title: "审核旧机会项", status: "pending" }],
      today_plan: []
    },
    socialView: { opportunities: [], drafts: [] }
  });

  assert.equal(brief.today_actions.some((item) => /审核/.test(`${item.action} ${item.title}`)), false);
});

test("review queue item creates a real review action", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: { opportunities: [], today_actions: [], today_plan: [] },
    socialView: {
      opportunities: [{ id: "SOC-001", title: "供应商回复讨论", business_score: 91, status: "pending_review", review_status: "pending_review" }],
      drafts: []
    }
  });

  assert.equal(brief.today_actions[0].id, "SOC-001");
  assert.equal(brief.today_actions[0].action, "审核：供应商回复讨论");
  assert.equal(brief.today_actions[0].detail, "review");
  assert.equal(brief.today_actions[0].source, "data/social-agent/view.json");
});

test("original post review items require review before publishing", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: { opportunities: [], today_actions: [], today_plan: [] },
    socialView: {
      opportunities: [{
        id: "POST-001",
        type: "original_post",
        platform: "LinkedIn",
        title: "Before paying a China supplier",
        draft: "Confirm the payment scope before moving forward.",
        status: "pending_review",
        review_status: "pending_review",
        reason: "来自真实买家讨论。"
      }],
      drafts: []
    }
  });

  assert.equal(brief.today_actions[0].id, "POST-001");
  assert.equal(brief.today_actions[0].action, "审核：LinkedIn：Before paying a China supplier");
});

test("ready-to-publish items outrank new discovery and content suggestions", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      content_plan: [{ id: "seo-1", type: "content_plan", title: "新的 Buyer Guide" }]
    },
    socialView: {
      opportunities: [
        { id: "ready-linkedin", type: "original_post", platform: "LinkedIn", title: "Before paying a China supplier", status: "ready_to_publish", reason: "已审核" },
        { id: "pending-quora", type: "reply_opportunity", platform: "Quora", title: "Supplier payment question", status: "pending_review" }
      ]
    }
  });

  assert.equal(brief.today_actions[0].id, "ready-linkedin");
  assert.equal(brief.today_actions[0].detail, "publishing");
});

test("explicit content plan becomes a creation suggestion, not a review action", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      opportunities: [{
        id: "GO-003",
        title: "供应商交期问题",
        content_plan: { id: "PLAN-003", object_type: "content_plan", title: "供应商交期问题指南", status: "pending" }
      }],
      today_actions: [],
      today_plan: []
    },
    socialView: { opportunities: [], drafts: [] }
  });

  assert.equal(brief.today_actions[0].action, "建议创作");
  assert.equal(brief.today_actions[0].title, "建议创作：供应商交期问题指南");
  assert.equal(brief.today_actions.some((item) => /审核/.test(`${item.action} ${item.title}`)), false);
});

test("published, monitoring, and revision statuses are not review queue items", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: { opportunities: [], today_actions: [], today_plan: [] },
    socialView: {
      opportunities: [
        { id: "PUBLISHED", title: "已发布", status: "Published" },
        { id: "MONITORING", title: "监测中", status: "Monitoring" },
        { id: "REVISION", title: "需要修改", status: "Revision Required" },
        { id: "APPROVED", title: "已批准", review_status: "approved" }
      ],
      drafts: []
    }
  });

  assert.equal(brief.today_actions.some((item) => item.detail === "review"), false);
});

test("system review is capped at one item", () => {
  const brief = buildMorningBrief(run([
    source("cloudflare", "unavailable", {}),
    source("gsc", "unavailable", {}),
    source("semrush", "unavailable", {}),
    source("social", "unavailable", {})
  ]), { dashboardView: { opportunities: [], today_actions: [], today_plan: [] } });

  assert.ok(brief.needs_review.length <= 1);
});

test("today actions prioritize SEO, LinkedIn, and Quora above Reddit", () => {
  const current = run([]);
  const brief = buildMorningBrief(current, {
    dashboardView: {
      content_plan: [{ id:"seo-1", type:"content_plan", title:"扩写报价比较 Buyer Guide", reason:"新的 GSC 查询显示报价比较需求。" }]
    },
    socialView: {
      opportunities: [
        { id:"reddit-1", type:"reply_opportunity", platform:"Reddit", title:"Reddit supplier payment", status:"pending_review", why_relevant:"低优先级讨论" },
        { id:"quora-1", type:"reply_opportunity", platform:"Quora", title:"Quora supplier payment", status:"pending_review", why_relevant:"高意图问题" },
        { id:"linkedin-1", type:"reply_opportunity", platform:"LinkedIn", title:"LinkedIn procurement post", status:"pending_review", why_relevant:"公开采购讨论" }
      ]
    }
  });

  assert.deepEqual(brief.today_actions.map((item) => item.id), ["content-plan:seo-1", "linkedin-1", "quora-1"]);
});

test("SEO and GEO recommendations use at most two of the three Today Action slots", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      content_plan: [
        { id: "seo-1", type: "content_plan", title: "Buyer Guide one" },
        { id: "seo-2", type: "content_plan", title: "Buyer Guide two" },
        { id: "seo-3", type: "content_plan", title: "Buyer Guide three" }
      ]
    },
    socialView: {
      opportunities: [{ id: "linkedin-1", type: "reply_opportunity", platform: "LinkedIn", title: "LinkedIn procurement post", status: "pending_review" }]
    }
  });

  assert.deepEqual(brief.today_actions.map((item) => item.id), ["content-plan:seo-1", "content-plan:seo-2", "linkedin-1"]);
});

test("legacy plans do not displace a queued original post when they duplicate review candidates", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: {
      today_actions: [],
      today_plan: [
        { id: "linkedin-1", object_type: "reply_opportunity", platform: "LinkedIn", title: "LinkedIn procurement post", status: "needs_selection" },
        { id: "quora-1", object_type: "reply_opportunity", platform: "Quora", title: "Quora supplier payment", status: "needs_selection" },
        { id: "reddit-1", object_type: "reply_opportunity", platform: "Reddit", title: "Reddit supplier payment", status: "needs_selection" }
      ]
    },
    socialView: {
      opportunities: [
        { id: "reddit-1", type: "reply_opportunity", platform: "Reddit", title: "Reddit supplier payment", status: "pending_review" },
        { id: "linkedin-post-1", type: "original_post", platform: "LinkedIn", title: "LinkedIn original post", status: "pending_review" },
        { id: "quora-1", type: "reply_opportunity", platform: "Quora", title: "Quora supplier payment", status: "pending_review" },
        { id: "linkedin-1", type: "reply_opportunity", platform: "LinkedIn", title: "LinkedIn procurement post", status: "pending_review" }
      ]
    }
  });

  assert.deepEqual(brief.today_actions.map((item) => item.id), ["linkedin-1", "quora-1", "linkedin-post-1"]);
});

test("email opportunities rank between LinkedIn originals and Reddit replies", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: { today_actions: [], today_plan: [] },
    socialView: {
      opportunities: [
        { id: "reddit-1", type: "reply_opportunity", platform: "Reddit", title: "Reddit supplier payment", status: "pending_review" },
        { id: "linkedin-post-1", type: "original_post", platform: "LinkedIn", title: "LinkedIn original post", status: "pending_review" },
        { id: "email-1", type: "email_opportunity", platform: "Email", title: "Buyer Guide email follow-up", status: "pending_review" }
      ]
    }
  });

  assert.deepEqual(brief.today_actions.map((item) => item.id), ["email-1", "linkedin-post-1", "reddit-1"]);
});

test("Today Actions show at most one email opportunity", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: { today_actions: [], today_plan: [] },
    socialView: {
      opportunities: [
        { id: "email-1", type: "email_opportunity", platform: "Email", title: "Buyer Guide email follow-up", status: "pending_review" },
        { id: "email-2", type: "email_opportunity", platform: "Email", title: "PDF refresh email follow-up", status: "pending_review" },
        { id: "linkedin-post-1", type: "original_post", platform: "LinkedIn", title: "LinkedIn original post", status: "pending_review" },
        { id: "reddit-1", type: "reply_opportunity", platform: "Reddit", title: "Reddit supplier payment", status: "pending_review" }
      ]
    }
  });

  assert.deepEqual(brief.today_actions.map((item) => item.id), ["email-1", "linkedin-post-1", "reddit-1"]);
});

test("Morning Brief consumes active Factory Bridge signals without creating technical tasks", () => {
  const brief = buildMorningBrief(run([]), {
    dashboardView: { opportunities: [], today_actions: [], today_plan: [] },
    growthSignals: {
      signals: [{
        id: "search-query-first-seen:factory_bridge:supplier-comments",
        event: "search.query.first_seen",
        business_line: "factory_bridge",
        status: "detected",
        title: "A new search query appeared",
        detail: "A supplier query was observed.",
        source: "gsc",
        source_status: "live",
        observed_at: "2026-07-20T07:00:00.000Z",
        payload: { query: "supplier comments" }
      }]
    }
  });

  assert.equal(brief.growth_signals.length, 1);
  assert.equal(brief.today_actions[0].id.startsWith("signal:"), true);
  assert.equal(brief.today_actions.some((item) => /修复|Cloudflare|GSC|Clarity|Semrush/.test(`${item.title} ${item.reason}`)), false);
});
