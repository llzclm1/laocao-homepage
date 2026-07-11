import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lifecycleFile, loadLifecycleState } from "../state/state-manager.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dashboardFile = path.join(root, "docs/growth-os/dashboard.md");
const dashboardDataDir = path.join(root, "data/growth-os/dashboard");
const dashboardJsonFile = path.join(dashboardDataDir, "dashboard.json");
const dashboardPriorityFile = path.join(dashboardDataDir, "dashboard-priority.json");
const dashboardViewFile = path.join(root, "data/growth-os/viewer/dashboard-view.json");
const reviewViewFile = path.join(root, "data/growth-os/viewer/review-view.json");
const opportunitiesFile = path.join(root, "data/growth-os/opportunities.jsonl");
const publishedLinksFile = path.join(root, "data/growth-os/social/published-links.json");
const publishedContentFile = path.join(root, "data/growth-os/social/published-content.json");
const socialMetricsFile = path.join(root, "data/growth-os/social/social-metrics.json");
const reviewHistoryFile = path.join(root, "data/growth-os/review-history.jsonl");
const socialOutreachLogFile = path.join(root, "data/marketing/social-outreach-log.csv");
const cloudflareObservationFile = path.join(root, "data/growth-os/imports/cloudflare/cloudflare-traffic-overview-2026-07-10.json");

export function writeDashboard(summary, context) {
  const business = summary.business_opportunities || [];
  const socialQueue = buildSocialQueue(summary.social_content?.items || []);
  const socialPublishing = buildSocialPublishing(socialQueue);
  const contentLifecycle = buildContentLifecycle(business, socialQueue, socialPublishing);
  const statusById = new Map(contentLifecycle.items.map((item) => [item.id, item.status]));
  const businessWithLifecycle = business.map((item) => ({
    ...item,
    status: statusById.get(item.id) || item.status
  }));
  const highestConversion = businessWithLifecycle.find((item) => isActionableStatus(item.status)) || businessWithLifecycle[0] || null;
  const markdown = `# Growth OS Today

Generated at: ${summary.date}
Mode: ${context.dryRun ? "dry-run" : "live"}

## Today's Opportunities

- New Opportunities: ${summary.new_opportunities}
- High Priority: ${summary.high_priority.length}
- Medium Priority: ${summary.medium_priority.length}
- Archived: ${summary.archived.length}

## Today's Business Opportunities

${highestConversion ? renderTopBusinessOpportunity(highestConversion) : "- Highest Conversion Potential: none"}

Business queue:

${businessWithLifecycle.length ? businessWithLifecycle.slice(0, 5).map(renderBusinessRow).join("\n") : "- No business-ranked opportunities."}

## Pending Review

- Need Review: ${summary.need_review}
- Review Queue: ${summary.review_queue}

## Content Lifecycle Summary

- Draft: ${contentLifecycle.summary.draft_ready}
- Review: ${contentLifecycle.summary.review_pending}
- Publish Ready: ${contentLifecycle.summary.publish_ready}
- Published: ${contentLifecycle.summary.published}
- Monitoring: ${contentLifecycle.summary.monitoring}
- Learning: ${contentLifecycle.summary.learning}

## Customer Signals

- Buyer questions: ${summary.customer_signals?.buyerSignals?.length || 0}
- Factory signals: ${summary.customer_signals?.factorySignals?.length || 0}
- Content feedback: ${summary.customer_signals?.contentFeedback?.length || 0}
- Total memory records: ${summary.customer_signals?.total || 0}

## Content Quality

- Reports: ${summary.content_quality?.count || 0}
- Average score: ${summary.content_quality?.average || 0}
- Output: ${summary.content_quality?.output || "not generated"}

${renderQualityRows(summary.content_quality?.items || [])}

## Internal Link Suggestions

- Pages checked: ${summary.internal_links?.pages || 0}
- Suggestions: ${summary.internal_links?.count || 0}
- Output: ${summary.internal_links?.output || "not generated"}

## Social Distribution

- Generated: ${summary.social_content?.posts || 0} posts
- Content packs: ${summary.social_content?.packages || 0}
- Status: ${summary.social_content?.status || "not generated"}
- Publishing records: ${socialPublishing.total}
- Published: ${socialPublishing.published}
- Measuring: ${socialPublishing.measured}
- Need URL: ${socialPublishing.need_url}
- Platform compliance passed: ${summary.platform_compliance?.compliance_passed || 0}
- Platform compliance needs revision: ${summary.platform_compliance?.need_revision || 0}
- Published records: ${summary.social_performance?.records || 0}
- Platforms measured: ${summary.social_performance?.platforms || 0}
- Best performing content: ${summary.social_performance?.best_content || "none"}
- Performance report: ${summary.social_performance?.output || "not generated"}
- Recommendation: ${summary.social_performance?.recommendation || "No social performance data yet."}

## Today's Social Opportunities

${renderSocialDiscovery(summary.social_discovery?.items || [])}

## Publishing Queue

Ready:

${renderPublishingQueue(socialPublishing.ready)}

Published:

${renderPublishingQueue(socialPublishing.published_items)}

Waiting Metrics:

${renderPublishingQueue(socialPublishing.waiting_metrics)}

## Assets

- Field material assets indexed: ${summary.assets?.count || 0}
- Metadata: ${summary.assets?.output || "not loaded"}

## Experiments

- Running: ${summary.experiments?.running || 0}
- Source: ${summary.experiments?.output || "not loaded"}

## Published Content

- Performance Report: ${summary.performance_report}

## Traffic Intelligence

${renderTrafficIntelligence(summary.cloudflare_traffic)}

## SEO Signals

- See performance report for GSC/import signals.

## GEO Signals

- GEO Queries: ${summary.geo_queries}
- GEO Tasks: ${summary.geo_tasks}
- GEO Report: ${summary.geo_report}

## Conversion Signals

- See performance report for CTA and conversion import signals.

## Recommended Actions

${summary.recommended_actions.length ? summary.recommended_actions.map((item, index) => `${index + 1}. ${item}`).join("\n") : "1. No action."}

## State Machine

- Checked: ${summary.state_validation.checked}
- Errors: ${summary.state_validation.errors.length}
- Warnings: ${summary.state_validation.warnings.length}
`;

  writeDashboardData(summary, context, businessWithLifecycle, highestConversion, socialQueue, socialPublishing, contentLifecycle);
  fs.writeFileSync(dashboardFile, markdown, "utf8");
  return path.relative(root, dashboardFile);
}

export function refreshDashboardDiscovery(discovery, now = new Date()) {
  const view = readJsonFile(dashboardViewFile);
  if (!view || !view.title) return false;
  const items = (discovery?.items || []).slice(0, 5).map((item) => ({
    ...item,
    platform: discoveryPlatformLabel(item.platform)
  }));
  view.generated_at = now.toISOString();
  view.today_opportunities = items;
  view.discovery_summary = buildDiscoverySummaryView(discovery?.discovery_summary);
  view.today_actions = buildTodayActions(view.today_action, view.platform_execution || [], items);
  if (items[0]) {
    view.decision_summary = {
      ...(view.decision_summary || {}),
      next_best_action: `优先回复 ${items[0].platform}：${items[0].topic}。${items[0].risk_note}`
    };
  }
  fs.writeFileSync(dashboardViewFile, `${JSON.stringify(view, null, 2)}\n`, "utf8");
  return true;
}

function writeDashboardData(summary, context, business, todayAction, socialQueue, socialPublishing, contentLifecycle) {
  fs.mkdirSync(dashboardDataDir, { recursive: true });
  const opportunityById = new Map(readJsonl(opportunitiesFile).map((item) => [item.id, item]));
  const lifecycleById = new Map(contentLifecycle.items.map((item) => [item.id, item]));

  const priority = {
    generated_at: summary.date,
    mode: context.dryRun ? "dry-run" : "live",
    today_action: todayAction ? {
      id: todayAction.id,
      title: todayAction.title,
      reason: todayAction.reason || "Highest conversion potential",
      reason_bullets: reasonBullets(todayAction),
      score: todayAction.final_priority || todayAction.score || 0,
      action: actionFromStatus(todayAction.status),
      status: todayAction.status,
      status_cn: chineseLifecycleStatus(todayAction.status),
      scores: {
        seo: todayAction.seo_score || 0,
        geo: todayAction.geo_score || 0,
        business: todayAction.business_intent_score || todayAction.final_priority || 0
      },
      content_package: reviewWorkspaceUrl(todayAction.id),
      review_url: reviewWorkspaceUrl(todayAction.id)
    } : null,
    tasks: todayAction ? tasksForStatus(todayAction) : ["Review opportunity queue"]
  };

  const dashboard = {
    generated_at: summary.date,
    mode: context.dryRun ? "dry-run" : "live",
    opportunities: business.map((item) => ({
      id: item.id,
      title: item.title,
      tags: [item.priority, item.buyer_stage].filter(Boolean),
      seo_score: item.seo_score || 0,
      geo_score: item.geo_score || 0,
      business_score: item.business_intent_score || item.final_priority || 0,
      status: readableStatus(lifecycleById.get(item.id)?.status || item.status),
      priority: item.priority || "UNKNOWN",
      source: item.source && item.source !== "Growth OS" ? item.source : opportunityById.get(item.id)?.source || sourceFromPackage(item.id),
      intent: item.intent || "",
      buyer_stage: item.buyer_stage || "",
      question: item.question || opportunityById.get(item.id)?.question || item.title,
      url: reviewWorkspaceUrl(item.id)
    })),
    content_packages: buildContentPackages(summary, business),
    content_lifecycle: contentLifecycle,
    traffic_intelligence: summary.cloudflare_traffic || null,
    social_queue: socialQueue,
    social_publishing: socialPublishing,
    social_discovery: summary.social_discovery || { items: [] },
    platform_compliance: {
      social_ready: summary.platform_compliance?.social_ready || 0,
      compliance_passed: summary.platform_compliance?.compliance_passed || 0,
      need_revision: summary.platform_compliance?.need_revision || 0,
      reports_dir: summary.platform_compliance?.reports_dir || "",
      items: (summary.platform_compliance?.items || []).slice(0, 8)
    },
    learning: buildLearning(summary),
    reports: {
      dashboard: "dashboard.md",
      review_queue: "review-queue/review-queue.md",
      geo: summary.geo_report || "",
      performance: summary.performance_report || "",
      social: summary.social_performance?.output || ""
    }
  };

  fs.writeFileSync(dashboardPriorityFile, `${JSON.stringify(priority, null, 2)}\n`, "utf8");
  fs.writeFileSync(dashboardJsonFile, `${JSON.stringify(dashboard, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(dashboardViewFile), { recursive: true });
  fs.writeFileSync(dashboardViewFile, `${JSON.stringify(buildDashboardView(summary, priority, dashboard), null, 2)}\n`, "utf8");
  fs.writeFileSync(reviewViewFile, `${JSON.stringify(buildReviewView(summary, dashboard), null, 2)}\n`, "utf8");
}

function buildDashboardView(summary, priority, dashboard) {
  const action = priority.today_action;
  const lifecycle = dashboard.content_lifecycle;
  const platformExecution = buildPlatformExecution(summary, lifecycle);
  const businessSignals = buildBusinessSignals(summary);
  const decisionSummary = buildDecisionSummary(action, summary, platformExecution);
  const todayActions = buildTodayActions(action, platformExecution, summary.social_discovery?.items || []);
  return {
    generated_at: summary.date,
    title: "Growth OS 增长运营中心",
    decision_summary: decisionSummary,
    today_actions: todayActions,
    today_opportunities: (summary.social_discovery?.items || []).slice(0, 5).map((item) => ({
      ...item,
      platform: discoveryPlatformLabel(item.platform)
    })),
    discovery_summary: buildDiscoverySummaryView(summary.social_discovery?.discovery_summary),
    business_signals: businessSignals,
    platform_execution: platformExecution,
    today_action: action ? {
      id: action.id,
      title: chineseTitle(action.id, action.title),
      status: action.status_cn || chineseActionStatus(action.action),
      status_key: action.status || action.action,
      score: action.score,
      scores: action.scores,
      reason: [
        "买家处于付款或采购决策阶段",
        "与 Supplier Reply Review 高匹配",
        "最近出现多个类似问题",
        "GEO 存在机会"
      ],
      next_step: nextStepForStatus(action.status),
      content_package: action.content_package,
      review_url: action.review_url
    } : null,
    tasks: (priority.tasks || []).map(chineseTask).slice(0, 3),
    opportunities: dashboard.opportunities.map((item) => ({
      ...item,
      title: chineseTitle(item.id, item.title),
      tags_cn: chineseTags(item),
      status_cn: chineseLifecycleStatus(statusKey(item.status)),
      source_cn: sourceLabel(item.source),
      stage_cn: stageLabel(item.buyer_stage || item.intent),
      priority_cn: item.priority === "HIGH" ? "高商业价值" : "低优先级"
    })),
    lifecycle: {
      summary: lifecycle.summary,
      stages: ["发现机会", "生成内容", "审核", "待发布", "已发布", "监测", "复盘学习"],
      items: lifecycle.items.map((item) => ({
        ...item,
        title: chineseTitle(item.id, item.title),
        status_cn: chineseLifecycleStatus(item.status),
        timeline: buildTimeline(item)
      })),
      review_queue: lifecycle.review_queue.map((item) => item.id),
      publishing_queue: lifecycle.publishing_queue.map((item) => item.id),
      published: lifecycle.published.map((item) => item.id),
      learning: lifecycle.learning.map((item) => item.id),
      review_history: readJsonl(reviewHistoryFile).slice(-20)
    },
    reuse_chains: lifecycle.items.map((item) => ({
      id: item.id,
      title: chineseTitle(item.id, item.title),
      assets: ["Buyer Guide", ...item.platforms.map((platform) => platform.name), "FAQ", "GEO任务"]
    })),
    published: lifecycle.items.flatMap((item) => item.platforms
      .filter((platform) => platform.url || ["published", "monitoring", "learning"].includes(item.status))
      .map((platform) => ({
        id: item.id,
        title: chineseTitle(item.id, item.title),
        platform: platform.name,
        url: platform.url,
        published_date: platform.published_date,
      metrics: platform.metrics,
        next_check_date: nextCheckDate(platform.published_date),
        status: platform.metrics.views || platform.metrics.clicks || platform.metrics.leads ? "learning" : "monitoring",
        status_cn: platform.metrics.views || platform.metrics.clicks || platform.metrics.leads ? "学习反馈" : "监测中"
      }))),
    learning: {
      recent_pattern: "“供应商信任”是最高频买家问题。",
      evidence: [
        `${summary.customer_signals?.buyerSignals?.length || 0} 个客户信号`,
        `${(summary.business_opportunities || []).filter((item) => item.priority === "HIGH").length} 个高价值机会`
      ],
      recommendation: "继续创建 Supplier Trust 内容集群，并优先连接 Supplier Reply Review。"
    },
    archived: (summary.archived || []).map((item) => ({
      id: item.id,
      title: chineseTitle(item.id, item.title),
      reasons: ["搜索需求低", "商业价值不足", "内容重复"].filter((_, index) => index === 0 || item.decision === "archive")
    })),
    input_options: {
      platforms: ["LinkedIn", "Reddit", "Quora", "X", "Medium", "Substack", "Facebook"],
      stages: ["pre_payment", "sample_order", "quote_review", "research", "factory_materials"]
    },
    traffic_intelligence: summary.cloudflare_traffic ? {
      crawler_traffic: summary.cloudflare_traffic.levels.crawler_traffic,
      legacy_traffic: summary.cloudflare_traffic.levels.legacy_traffic,
      buyer_intent_traffic: summary.cloudflare_traffic.levels.buyer_intent_traffic,
      site_health: summary.cloudflare_traffic.levels.site_health,
      action: summary.cloudflare_traffic.action,
      conclusion: summary.cloudflare_traffic.conclusion,
      report: summary.cloudflare_traffic.report
    } : null
  };
}

function buildReviewView(summary, dashboard) {
  const opportunities = new Map(dashboard.opportunities.map((item) => [item.id, item]));
  return {
    generated_at: summary.date,
    packages: dashboard.content_lifecycle.items.map((item) => {
      const opportunity = opportunities.get(item.id) || {};
      return {
        id: item.id,
        title: chineseTitle(item.id, item.title),
        status: item.status,
        status_cn: chineseLifecycleStatus(item.status),
        score: {
          seo: opportunity.seo_score || 0,
          geo: opportunity.geo_score || 0,
          business: opportunity.business_score || 0
        },
        sections: contentSections(item.id),
        social: socialSections(item.id),
        social_images: socialImages(item.id)
      };
    })
  };
}

function buildDecisionSummary(action, summary, platformExecution) {
  const reddit = platformExecution.find((item) => item.platform === "Reddit");
  const traffic = summary.cloudflare_traffic;
  const topDiscovery = summary.social_discovery?.items?.[0];
  return {
    current_stage: "Authority Building",
    main_signal: traffic?.levels?.buyer_intent_traffic === "low / not clear yet"
      ? "搜索引擎、AI crawler 和社媒 crawler 已开始访问，但真实买家信号还不明显。"
      : "外部内容正在形成搜索和平台可见性，需要继续观察真实买家互动。",
    main_risk: reddit?.risk_status === "High"
      ? `Reddit removal rate ${reddit.removal_rate}% 偏高，继续发帖会损耗账号信任。`
      : "当前买家互动数据不足，不能用发帖量替代商业信号。",
    next_best_action: topDiscovery
      ? `优先回复 ${discoveryPlatformLabel(topDiscovery.platform)}：${topDiscovery.topic}。${topDiscovery.risk_note}`
      : reddit?.risk_status === "High"
      ? "发布 3 条无链接、无项目提及、经验型 Reddit comments，并暂停独立推广帖。"
      : nextStepForStatus(action?.status),
    growth_job: action ? {
      id: action.id,
      title: chineseTitle(action.id, action.title),
      status: chineseLifecycleStatus(action.status),
      score: action.score || 0
    } : null
  };
}

function buildTodayActions(action, platformExecution, discoveryItems) {
  if (discoveryItems.length) {
    return discoveryItems.slice(0, 3).map((item) => ({
      platform: discoveryPlatformLabel(item.platform),
      action: `回复：${item.topic}`,
      priority: item.intent_score,
      status: "待执行",
      reason: item.why_relevant,
      done: false
    }));
  }
  const byPlatform = new Map(platformExecution.map((item) => [item.platform, item]));
  const reddit = byPlatform.get("Reddit");
  const linkedIn = byPlatform.get("LinkedIn");
  const quora = byPlatform.get("Quora");
  const items = [
    {
      platform: "Reddit",
      action: reddit?.risk_status === "High"
        ? "发布 3 条 comment-first 回复，不放链接，不提项目。"
        : "发布 1-3 条真实问题回复，不放链接。",
      priority: "High",
      status: "待执行",
      reason: reddit?.risk_status === "High"
        ? "Removal rate 偏高，必须从发帖切换到低风险评论。"
        : "Reddit 是真实买家问题来源，但需要保守互动。",
      done: false
    },
    {
      platform: "Quora",
      action: quora?.today_action || "回答 2 个高意图 sourcing 问题。",
      priority: "Medium",
      status: "待执行",
      reason: "Quora 更适合沉淀长尾问题和权威回答。",
      done: false
    },
    {
      platform: "LinkedIn",
      action: linkedIn?.today_action || "回复 5 条行业相关帖子，优先经验分享。",
      priority: action?.status === "publish_ready" ? "High" : "Medium",
      status: "待执行",
      reason: action?.id ? `${action.id} 已进入发布/分发阶段。` : "LinkedIn 适合建立行业可信度。",
      done: false
    }
  ];
  return items.slice(0, 3);
}

function buildBusinessSignals(summary) {
  const cloudflare = readJsonFile(cloudflareObservationFile);
  const publishedLinks = readPublishedLinks();
  const metrics = publishedLinks.map((item) => item.metrics || {});
  const reviewRequests = metrics.reduce((sum, item) => sum + (Number(item.leads) || 0), 0);
  return [
    signalItem("Qualified Interactions", 0, "只统计对方回复评论、私信、明确问题、合作意向或采购相关互动；当前未追踪到。"),
    signalItem("Buyer Replies", 0, "未追踪到明确买家回复。"),
    signalItem("Partner Leads", 0, "未追踪到合作意向。"),
    signalItem("Supplier Leads", 0, "Not tracked"),
    signalItem("Audience Interactions", "Not tracked", "普通点赞不计入 Qualified Interaction。"),
    signalItem("Website Visits", Number(cloudflare?.total_visits) || 0, cloudflare?.date ? `Cloudflare ${cloudflare.date} / ${cloudflare.window || "24h"}` : "No Cloudflare observation"),
    signalItem("Review Requests", reviewRequests, "来自发布记录 metrics.leads。"),
    signalItem("Paid Opportunities", 0, "未追踪到付费机会。")
  ];
}

function signalItem(label, value, note) {
  return { label, value, note };
}

function buildPlatformExecution(summary, lifecycle) {
  const redditRisk = readRedditRisk();
  const publishedByPlatform = countPublishedByPlatform(lifecycle.items || []);
  const definitions = [
    {
      platform: "LinkedIn",
      role: "行业可信度",
      current_strategy: "经验分享 + 行业评论，不硬广。",
      today_action: "回复 5 条行业相关帖子，发布时只讲经验判断。",
      progress: "0 / 5",
      risk_status: "Low",
      risk_reason: "未发现明确访问错误或异常重复行为。",
      recommended_action: "保持低频、经验型互动，补录直达链接。",
      latest_result: `${publishedByPlatform.LinkedIn || 0} 条 Growth OS 发布记录`
    },
    {
      platform: "Reddit",
      role: "社区信任",
      current_strategy: "Comment-first，只回答具体问题，不放链接。",
      today_action: "发布 3 条无链接经验型 comments，暂停独立推广帖。",
      progress: "0 / 3",
      risk_status: redditRisk.status,
      risk_reason: redditRisk.reason,
      recommended_action: redditRisk.recommended_action,
      latest_result: `${redditRisk.removed} of ${redditRisk.total_actions} removed`,
      total_actions: redditRisk.total_actions,
      removed: redditRisk.removed,
      removal_rate: redditRisk.removal_rate
    },
    {
      platform: "Quora",
      role: "问题型权威",
      current_strategy: "回答高意图 sourcing 问题，少链接，重过程。",
      today_action: "回答 2 个高意图问题。",
      progress: "0 / 2",
      risk_status: "Medium",
      risk_reason: "平台数据不完整，需要人工回访确认保留和互动。",
      recommended_action: "优先回答采购付款、供应商判断、报价问题。",
      latest_result: "已有回答与内容浏览，但未接入完整指标。"
    },
    {
      platform: "X",
      role: "轻量传播",
      current_strategy: "短观点 + 图片卡片，避免长文堆叠。",
      today_action: "发布 1 条图片卡片或短 thread。",
      progress: "0 / 1",
      risk_status: "Medium",
      risk_reason: "历史出现文本截断，长文需要转图片或 thread。",
      recommended_action: "X 长内容优先做 image card。",
      latest_result: `${publishedByPlatform.X || 0} 条 Growth OS 发布记录`
    },
    {
      platform: "Medium",
      role: "长文沉淀",
      current_strategy: "经验总结型文章，不堆 SEO 关键词。",
      today_action: "暂不新增，优先复用已发布长文。",
      progress: "0 / 0",
      risk_status: "Low",
      risk_reason: "当前未发现移除或访问异常。",
      recommended_action: "有完整案例后再发布。",
      latest_result: `${publishedByPlatform.Medium || 0} 条 Growth OS 发布记录`
    },
    {
      platform: "Substack",
      role: "深度复盘",
      current_strategy: "沉淀长文和判断框架。",
      today_action: "暂不新增，复查已发布文章。 ",
      progress: "0 / 0",
      risk_status: "Low",
      risk_reason: "当前未发现移除或访问异常。",
      recommended_action: "只发布完整主题，不追求频率。",
      latest_result: `${publishedByPlatform.Substack || 0} 条 Growth OS 发布记录`
    },
    {
      platform: "Facebook",
      role: "低频群组验证",
      current_strategy: "谨慎评论，等待审核结果。",
      today_action: "回访 pending review，不新增大量评论。",
      progress: "0 / 1",
      risk_status: "Medium",
      risk_reason: "群组审核和可见性不稳定。",
      recommended_action: "只记录真实通过的评论和互动。",
      latest_result: "历史多条 group comment 处于 pending review。"
    }
  ];
  return definitions;
}

function countPublishedByPlatform(items) {
  const counts = {};
  for (const item of items) {
    for (const platform of item.platforms || []) {
      if (!platform.url) continue;
      counts[platform.name] = (counts[platform.name] || 0) + 1;
    }
  }
  return counts;
}

function readRedditRisk() {
  const fallback = {
    total_actions: 0,
    removed: 0,
    removal_rate: 0,
    status: "Medium",
    reason: "Reddit removal data not tracked.",
    recommended_action: "Keep comment-first and record removals manually."
  };
  if (!fs.existsSync(socialOutreachLogFile)) return fallback;
  const rows = parseCsv(fs.readFileSync(socialOutreachLogFile, "utf8"));
  const audit = rows.find((row) => row.platform === "Reddit" && /Browser audit total/i.test(row.topic || ""));
  const text = audit ? Object.values(audit).join(" ") : "";
  const match = text.match(/(\d+)\s+Reddit comments:\s+(\d+)\s+visible\s+and\s+(\d+)\s+removed/i);
  const total = Number(match?.[1]) || 0;
  const removed = Number(match?.[3]) || 0;
  const rate = total ? Math.round((removed / total) * 100) : 0;
  const status = rate > 20 ? "High" : rate > 10 ? "Medium" : "Low";
  return {
    total_actions: total,
    removed,
    removal_rate: rate,
    status,
    reason: status === "High" ? "High removal rate" : "Removal rate within current guardrail",
    recommended_action: status === "High"
      ? "Stop promotional posts and switch to comment-first."
      : "Continue low-frequency comment-first replies."
  };
}

function parseCsv(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function readJsonFile(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function socialImages(id) {
  const dir = `/docs/social/content-pack/${String(id).toLowerCase()}`;
  return {
    linkedin: `${dir}/social-image.png`,
    reddit: `${dir}/reddit-image.png`,
    x: `${dir}/x-thread.png`,
    substack: `${dir}/substack-image.png`,
    medium: `${dir}/medium-image.png`
  };
}

function contentSections(id) {
  const dir = path.join(root, "docs/content-pipeline", String(id).toLowerCase());
  const draft = readText(path.join(dir, "draft.md"));
  return {
    opportunity: readText(path.join(dir, "opportunity.md")),
    brief: readText(path.join(dir, "brief.md")),
    draft,
    faq: readSection(draft, "FAQ"),
    schema: readText(path.join(dir, "schema-plan.md")),
    geo: readText(path.join(dir, "geo-monitoring.md"))
  };
}

function socialSections(id) {
  const dir = path.join(root, "docs/social/content-pack", String(id).toLowerCase());
  return {
    linkedin: readText(path.join(dir, "linkedin.md")),
    reddit: readText(path.join(dir, "reddit.md")),
    x: readText(path.join(dir, "x-thread.md")),
    substack: readText(path.join(dir, "substack.md")),
    medium: readText(path.join(dir, "medium.md"))
  };
}

function chineseTitle(id, title) {
  const titles = {
    "GO-001": "下样品单前需要问中国供应商什么问题",
    "GO-002": "付款前需要确认哪些中国供应商信息",
    "GO-004": "工厂视频能证明什么、不能证明什么",
    "GO-006": "如何比较阿里巴巴供应商报价而不只看价格"
  };
  return titles[id] || title;
}

function chineseTask(task) {
  return String(task)
    .replace(/^Review (GO-\d+) content$/, "审核 $1")
    .replace(/^Publish LinkedIn post for (GO-\d+)$/, "发布 $1 的 LinkedIn 内容")
    .replace(/^Record published URL for (GO-\d+)$/, "记录 $1 的发布链接")
    .replace(/^Check social metrics for (GO-\d+)$/, "检查 $1 的社媒效果")
    .replace(/^Record clicks and leads for (GO-\d+)$/, "录入 $1 的点击和询盘")
    .replace(/^Review learning signals for (GO-\d+)$/, "复盘 $1 的学习信号")
    .replace(/^Check GEO gap for (GO-\d+)$/, "检查 $1 的 GEO 优化建议");
}

function chineseTags(item) {
  return [
    item.priority === "HIGH" ? "高商业价值" : "低优先级",
    /trust|payment|deposit|supplier/i.test(`${item.title} ${(item.tags || []).join(" ")}`) ? "买家信任" : "采购信息"
  ];
}

function sourceLabel(source) {
  const text = String(source || "").toLowerCase();
  if (text.includes("reddit")) return "Reddit buyer question";
  if (text.includes("customer-memory")) return "Customer signal";
  if (text.includes("geo")) return "GEO opportunity";
  return source || "Growth OS";
}

function sourceFromPackage(id) {
  const text = readText(path.join(root, "docs/content-pipeline", String(id).toLowerCase(), "opportunity.md"));
  return text.match(/^##\s+Source\s*\n+(.+)$/im)?.[1]?.trim() || "Growth OS";
}

function stageLabel(stage) {
  return {
    pre_payment: "Pre-payment",
    sample_order: "Sample order",
    quote_review: "Quote review",
    research: "Research",
    factory_materials: "Factory materials"
  }[stage] || stage || "Research";
}

function statusKey(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("draft")) return "review_pending";
  if (text.includes("published")) return "published";
  return text.replace(/\s+/g, "_");
}

function nextCheckDate(date) {
  const base = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + 6);
  return base.toISOString().slice(0, 10);
}

function chineseActionStatus(action) {
  if (action === "review") return "待审核";
  if (action === "publish") return "待发布";
  if (action === "monitor") return "监测中";
  return "待处理";
}

function nextStepForStatus(status) {
  if (status === "review_pending") return "进入审核工作台完成人工审核";
  if (["approved", "publish_ready"].includes(status)) return "打开发布内容，人工发布后记录链接";
  if (["published", "monitoring"].includes(status)) return "查看发布效果并补录数据";
  if (status === "revision_required") return "按审核意见修改内容";
  return "查看内容包并处理下一步";
}

function isActionableStatus(status) {
  return !["published", "monitoring", "learning", "rejected"].includes(status);
}

function chineseLifecycleStatus(status) {
  return {
    draft_ready: "草稿完成",
    review_pending: "待审核",
    approved: "已批准",
    publish_ready: "待发布",
    rejected: "已拒绝",
    revision_required: "需要修改",
    published: "已发布",
    monitoring: "监测中",
    learning: "学习反馈"
  }[status] || status;
}

function buildTimeline(item) {
  const today = new Date().toISOString().slice(5, 10);
  const rows = [
    ["发现机会", today],
    ["生成内容", today]
  ];
  if (["review_pending", "approved", "publish_ready", "published", "monitoring", "learning"].includes(item.status)) rows.push(["进入审核", today]);
  if (["publish_ready", "published", "monitoring", "learning"].includes(item.status)) rows.push(["准备发布", today]);
  if (["published", "monitoring", "learning"].includes(item.status)) rows.push(["发布/监测", today]);
  if (item.status === "learning") rows.push(["效果复盘", today]);
  return rows.map(([event, date]) => ({ date, event }));
}

function reviewWorkspaceUrl(id) {
  return `/growth-os/review/${String(id || "").toLowerCase()}/`;
}

function buildContentPackages(summary, business) {
  const qualityById = new Map((summary.content_quality?.items || []).map((item) => [item.id, item]));
  const packageIds = new Set([
    ...business.map((item) => item.id),
    ...(summary.generated_packages || []).map((item) => item.id)
  ]);

  return [...packageIds].map((id) => {
    const quality = qualityById.get(id);
    const item = business.find((entry) => entry.id === id) || {};
    const completed = ["Opportunity", "Brief", "Draft", "Review", "Social Pack"];
    if (quality && !quality.issues?.includes("Missing FAQ")) completed.push("FAQ");
    return {
      id,
      title: item.title || id,
      progress: item.status === "published_candidate" ? 100 : Math.min(95, 60 + completed.length * 6),
      completed,
      missing: item.status === "published_candidate" ? ["Monitor"] : ["Publish"],
      status: readableStatus(item.status),
      url: reviewWorkspaceUrl(id)
    };
  });
}

function buildSocialQueue(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.content_id)) groups.set(item.content_id, []);
    groups.get(item.content_id).push({
      platform: readablePlatform(item.platform),
      platform_key: readablePlatform(item.platform),
      file: `/${item.file}`,
      image: item.platform === "x-thread" ? `/${item.file.replace(/\.md$/, ".png")}` : ""
    });
  }

  return [...groups.entries()].map(([id, platforms]) => ({
    id,
    ready: platforms.map((item) => item.platform),
    platforms,
    pack_url: `/docs/social/content-pack/${String(id).toLowerCase()}/`
  }));
}

function renderTrafficIntelligence(traffic) {
  if (!traffic) return "- No Cloudflare traffic observation imported.";
  return `- Crawler traffic: ${traffic.levels.crawler_traffic}
- Legacy traffic: ${traffic.levels.legacy_traffic}
- Buyer-intent traffic: ${traffic.levels.buyer_intent_traffic}
- Security/scanner traffic: ${traffic.levels.security_scanner_traffic}
- Healthy static traffic: ${traffic.levels.healthy_static_traffic}
- Site health: ${traffic.levels.site_health}
- Action: ${traffic.action}
- Report: ${traffic.report}`;
}

function buildSocialPublishing(socialQueue) {
  const records = readPublishedLinks();
  const recordsByKey = new Map(records.map((item) => [publishingKey(item), item]));
  const entries = socialQueue.flatMap((pack) => pack.platforms.map((platform) => {
    const record = recordsByKey.get(publishingKey({
      content_id: pack.id,
      platform: platform.platform_key || platform.platform
    })) || {};
    const metrics = normalizeMetrics(record.metrics || {});
    const status = publishingStatus(record, metrics);
    return {
      content_id: pack.id,
      platform: platform.platform,
      status,
      status_label: publishingStatusLabel(status),
      draft_file: platform.file,
      draft_image: platform.image,
      url: record.url || "",
      published_date: record.published_date || "",
      metrics
    };
  }));

  const ready = entries.filter((item) => item.status === "draft_ready");
  const published = entries.filter((item) => item.url);
  const waitingMetrics = entries.filter((item) => item.url && !hasMetrics(item.metrics));
  const measured = entries.filter((item) => hasMetrics(item.metrics));

  return {
    source: path.relative(root, publishedLinksFile),
    total: entries.length,
    published: published.length,
    measured: measured.length,
    need_url: ready.length,
    ready: ready.slice(0, 8).map(toPublishingQueueItem),
    published_items: published.slice(0, 8).map(toPublishingQueueItem),
    waiting_metrics: waitingMetrics.slice(0, 8).map(toPublishingQueueItem),
    entries
  };
}

function buildContentLifecycle(business, socialQueue, socialPublishing) {
  const lifecycleRows = loadLifecycleState();
  const publishedRows = readJsonArray(publishedContentFile);
  const metricRows = readJsonArray(socialMetricsFile);
  const lifecycleById = new Map(lifecycleRows.map((item) => [String(item.id || "").toUpperCase(), item]));
  const publishedByKey = new Map(publishedRows.map((item) => [contentPlatformKey(item.id, item.platform), item]));
  const metricsByKey = new Map(metricRows.map((item) => [contentPlatformKey(item.id, item.platform), item]));
  const titles = new Map(business.map((item) => [item.id, item.title]));
  const ids = new Set([
    ...business.map((item) => item.id),
    ...socialQueue.map((item) => item.id),
    ...lifecycleById.keys()
  ]);

  const items = [...ids].sort().map((id) => {
    const lifecycle = lifecycleById.get(id) || {};
    const platforms = (lifecycle.platforms?.length ? lifecycle.platforms : socialQueue.find((item) => item.id === id)?.platforms?.map((item) => ({
      name: item.platform,
      status: "ready"
    })) || []).map((platform) => {
      const name = readablePlatform(platform.name);
      const published = publishedByKey.get(contentPlatformKey(id, name));
      const socialEntry = socialPublishing.entries.find((item) => item.content_id === id && item.platform === name);
      const metrics = normalizeLifecycleMetrics(metricsByKey.get(contentPlatformKey(id, name)) || socialEntry?.metrics || {});
      return {
        content_id: id,
        name,
        status: platform.status || (published || socialEntry?.url ? "published" : "ready"),
        draft_file: socialEntry?.draft_file || `/docs/social/content-pack/${String(id).toLowerCase()}/${platformFile(name)}`,
        url: published?.url || socialEntry?.url || "",
        published_date: published?.published_date || socialEntry?.published_date || "",
        metrics
      };
    });
    const itemStatus = lifecycle.status || statusToLifecycle(business.find((item) => item.id === id)?.status);
    const publishedPlatforms = platforms.filter((platform) => platform.url);
    const status = itemStatus;
    return {
      id,
      title: lifecycle.title || titles.get(id) || id,
      status,
      lifecycle_stage: lifecycle.lifecycle_stage,
      review_status: lifecycle.review_status,
      publish_status: lifecycle.publish_status,
      monitor_status: lifecycle.monitor_status,
      learning_status: lifecycle.learning_status,
      content_url: reviewWorkspaceUrl(id),
      completion: completionFor(id, platforms, publishedPlatforms.length > 0),
      platforms
    };
  });

  return {
    source: {
      lifecycle: path.relative(root, lifecycleFile),
      published: path.relative(root, publishedContentFile),
      metrics: path.relative(root, socialMetricsFile)
    },
    allowed_transitions: [
      "draft_ready",
      "review_pending",
      "approved",
      "publish_ready",
      "rejected",
      "revision_required",
      "published",
      "monitoring",
      "learning"
    ],
    summary: summarizeLifecycle(items),
    review_queue: items.filter((item) => item.status === "review_pending"),
    publishing_queue: items.filter((item) => ["approved", "publish_ready"].includes(item.status)),
    published: items.filter((item) => ["published", "monitoring", "learning"].includes(item.status)),
    learning: items.filter((item) => item.status === "learning" || item.platforms.some((platform) => platform.metrics.views || platform.metrics.clicks || platform.metrics.leads)),
    items
  };
}

function completionFor(id, platforms, published) {
  const dir = path.join(root, "docs/content-pipeline", String(id).toLowerCase());
  const draft = readText(path.join(dir, "draft.md"));
  const checks = [
    ["Opportunity", fs.existsSync(path.join(dir, "opportunity.md"))],
    ["Brief", fs.existsSync(path.join(dir, "brief.md"))],
    ["Draft", Boolean(draft)],
    ["FAQ", /^##\s+FAQ/im.test(draft)],
    ["Schema", fs.existsSync(path.join(dir, "schema-plan.md"))],
    ["LinkedIn", platforms.some((item) => item.name === "LinkedIn")],
    ["Reddit", platforms.some((item) => item.name === "Reddit")]
  ];
  const completed = checks.filter(([, done]) => done).map(([label]) => label);
  const missing = checks.filter(([, done]) => !done).map(([label]) => label);
  if (!published) missing.push("Published");
  return {
    progress: Math.round((completed.length / Math.max(1, completed.length + missing.length)) * 100),
    completed,
    missing
  };
}

function readJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
}

function readSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^##\\s+|\\s*$)`, "im"));
  return match ? match[1].trim() : "";
}


function summarizeLifecycle(items) {
  const summary = {
    draft_ready: 0,
    review_pending: 0,
    approved: 0,
    publish_ready: 0,
    rejected: 0,
    revision_required: 0,
    published: 0,
    monitoring: 0,
    learning: 0
  };
  for (const item of items) {
    if (summary[item.status] !== undefined) summary[item.status] += 1;
  }
  return summary;
}

function normalizeLifecycleMetrics(metrics) {
  return {
    views: Number(metrics.views) || 0,
    likes: Number(metrics.likes) || 0,
    comments: Number(metrics.comments) || 0,
    clicks: Number(metrics.clicks) || 0,
    leads: Number(metrics.leads) || 0
  };
}

function statusToLifecycle(status) {
  if (status === "published_candidate" || status === "published") return "published";
  if (status === "draft_ready") return "review_pending";
  return "draft_ready";
}

function contentPlatformKey(id, platform) {
  return `${String(id || "").toUpperCase()}:${readablePlatform(platform)}`;
}

function platformFile(platform) {
  const name = readablePlatform(platform);
  if (name === "LinkedIn") return "linkedin.md";
  if (name === "Reddit") return "reddit.md";
  if (name === "X") return "x-thread.md";
  if (name === "Substack") return "substack.md";
  return "medium.md";
}

function readPublishedLinks() {
  if (!fs.existsSync(publishedLinksFile)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(publishedLinksFile, "utf8"));
    return Array.isArray(value) ? value.map((item) => ({
      ...item,
      content_id: String(item.content_id || "").toUpperCase(),
      platform: readablePlatform(item.platform),
      metrics: normalizeMetrics(item.metrics || {})
    })) : [];
  } catch {
    return [];
  }
}

function publishingStatus(record, metrics) {
  if (hasMetrics(metrics) || record.status === "measuring") return "measuring";
  if (record.url || record.status === "published") return "published";
  return "draft_ready";
}

function publishingStatusLabel(status) {
  if (status === "measuring") return "Measuring";
  if (status === "published") return "Published";
  return "Draft Ready";
}

function hasMetrics(metrics) {
  return ["views", "likes", "comments", "clicks", "leads"].some((field) => Number(metrics[field]) > 0);
}

function normalizeMetrics(metrics) {
  return {
    views: Number(metrics.views) || 0,
    likes: Number(metrics.likes) || 0,
    comments: Number(metrics.comments) || 0,
    clicks: Number(metrics.clicks) || 0,
    leads: Number(metrics.leads) || 0
  };
}

function toPublishingQueueItem(item) {
  return {
    content_id: item.content_id,
    platform: item.platform,
    status: item.status,
    url: item.url,
    draft_file: item.draft_file
  };
}

function publishingKey(item) {
  return `${String(item.content_id || "").toUpperCase()}:${readablePlatform(item.platform)}`;
}

function buildLearning(summary) {
  const buyerSignals = summary.customer_signals?.buyerSignals || [];
  const trustSignals = buyerSignals.filter((item) => /trust|deposit|supplier/i.test(`${item.pain} ${item.question}`));
  return {
    recent_pattern: trustSignals.length
      ? `"Supplier trust" appears in ${trustSignals.length} buyer question${trustSignals.length === 1 ? "" : "s"}.`
      : "No strong repeated buyer pattern yet.",
    recommendation: trustSignals.length
      ? "Create more supplier trust content tied to Supplier Reply Review."
      : "Keep collecting buyer questions before expanding topics.",
    source_count: summary.customer_signals?.total || 0
  };
}

function actionFromStatus(status) {
  if (status === "published_candidate" || status === "published") return "monitor";
  if (["approved", "publish_ready"].includes(status)) return "publish";
  if (status === "draft_ready") return "review";
  return "review";
}

function tasksForStatus(item) {
  if (["approved", "publish_ready"].includes(item.status)) return [
    `Publish LinkedIn post for ${item.id}`,
    `Record published URL for ${item.id}`,
    `Check GEO gap for ${item.id}`
  ];
  if (["published", "monitoring"].includes(item.status)) return [
    `Check social metrics for ${item.id}`,
    `Record clicks and leads for ${item.id}`,
    `Review learning signals for ${item.id}`
  ];
  return [
    `Review ${item.id} content`,
    `Publish LinkedIn post for ${item.id}`,
    `Check GEO gap for ${item.id}`
  ];
}

function reasonBullets(item) {
  const bullets = [];
  if ((item.business_intent_score || 0) >= 90) bullets.push("High business intent");
  if (item.buyer_stage === "pre_payment") bullets.push("Buyer close to payment decision");
  if ((item.service_alignment || 0) >= 90) bullets.push("Matches Supplier Reply Review");
  if (!bullets.length && item.reason) bullets.push(item.reason);
  return bullets;
}

function readableStatus(status) {
  return String(status || "unknown").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function readablePlatform(platform) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "x-thread") return "X";
  return String(platform || "").replace(/\b\w/g, (char) => char.toUpperCase());
}

function discoveryPlatformLabel(platform) {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "reddit") return "Reddit";
  if (platform === "quora") return "Quora";
  if (platform === "x") return "X";
  return String(platform || "");
}

function buildDiscoverySummaryView(summary = {}) {
  return {
    newly_discovered_today: Number(summary.newly_discovered_today) || 0,
    manual_added_today: Number(summary.manual_added_today) || 0,
    imported_today: Number(summary.imported_today) || 0,
    existing_log_opportunities: Number(summary.existing_log_opportunities) || 0,
    fresh_opportunities: Number(summary.fresh_opportunities) || 0,
    aging_opportunities: Number(summary.aging_opportunities) || 0,
    platform_failures: Number(summary.platform_failures) || 0,
    persistent_automatic_candidates: Number(summary.persistent_automatic_candidates) || 0,
    current_mode: summary.current_mode || "existing_log_manual_inbox_import",
    rss_adapter_works_in_dry_run: Boolean(summary.rss_adapter_works_in_dry_run),
    last_verified_rss_result: summary.last_verified_rss_result || null,
    last_collection_time: summary.last_collection_time || null,
    last_successful_discovery: summary.last_successful_discovery || null,
    collection_message: summary.collection_message || "No verified public opportunities were discovered today.",
    collection_status: (summary.collection_status || []).map((item) => ({
      ...item,
      platform: discoveryPlatformLabel(item.platform),
      status_label: discoveryCollectionStatusLabel(item.status, item.message)
    }))
  };
}

function discoveryCollectionStatusLabel(status, message) {
  if (status === "success") return "Success";
  if (status === "blocked") return /\b403\b/.test(String(message || "")) ? "Blocked (403)" : "Blocked";
  if (status === "failed") return "Failed";
  if (status === "no_verified_results") return "No verified results";
  if (status === "not_run") return "Not run";
  return "Outcome not recorded";
}

function renderTopBusinessOpportunity(item) {
  return `- Highest Conversion Potential: ${item.id}
- Title: ${item.title}
- Final Priority: ${item.final_priority}
- Business Intent: ${item.business_intent_score}
- Conversion Potential: ${item.conversion_probability}
- Reason: ${item.reason}
- Recommended: ${item.recommended_action}`;
}

function renderBusinessRow(item) {
  return `- ${item.id}: ${item.priority} / final ${item.final_priority} / conversion ${item.conversion_probability} / ${item.title}`;
}

function renderPublishingQueue(items) {
  if (!items.length) return "- none";
  return items
    .slice(0, 8)
    .map((item) => `- ${item.content_id} ${item.platform}${item.url ? `: ${item.url}` : ""}`)
    .join("\n");
}

function renderSocialDiscovery(items) {
  if (!items.length) return "- No verified reply opportunities yet.";
  return items.map((item) => `- ${item.intent_score} ${item.platform}: ${item.topic} (${item.expected_value})`).join("\n");
}

function renderQualityRows(items) {
  if (!items.length) return "- No quality reports.";
  return items
    .slice(0, 5)
    .map((item) => `- ${item.id}: quality ${item.overall} / SEO ${item.seo} / GEO ${item.geo} / Business ${item.business}`)
    .join("\n");
}
