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

export function writeDashboard(summary, context) {
  const business = summary.business_opportunities || [];
  const highestConversion = business.find((item) => !["published", "published_candidate", "monitoring"].includes(item.status)) || business[0] || null;
  const socialQueue = buildSocialQueue(summary.social_content?.items || []);
  const socialPublishing = buildSocialPublishing(socialQueue);
  const contentLifecycle = buildContentLifecycle(business, socialQueue, socialPublishing);
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

${business.length ? business.slice(0, 5).map(renderBusinessRow).join("\n") : "- No business-ranked opportunities."}

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

  writeDashboardData(summary, context, business, highestConversion, socialQueue, socialPublishing, contentLifecycle);
  fs.writeFileSync(dashboardFile, markdown, "utf8");
  return path.relative(root, dashboardFile);
}

function writeDashboardData(summary, context, business, todayAction, socialQueue, socialPublishing, contentLifecycle) {
  fs.mkdirSync(dashboardDataDir, { recursive: true });
  const opportunityById = new Map(readJsonl(opportunitiesFile).map((item) => [item.id, item]));

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
      scores: {
        seo: todayAction.seo_score || 0,
        geo: todayAction.geo_score || 0,
        business: todayAction.business_intent_score || todayAction.final_priority || 0
      },
      content_package: reviewWorkspaceUrl(todayAction.id),
      review_url: reviewWorkspaceUrl(todayAction.id)
    } : null,
    tasks: todayAction ? [
      `Review ${todayAction.id} content`,
      `Publish LinkedIn post for ${todayAction.id}`,
      `Check GEO gap for ${todayAction.id}`
    ] : ["Review opportunity queue"]
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
      status: readableStatus(item.status),
      priority: item.priority || "UNKNOWN",
      source: item.source && item.source !== "Growth OS" ? item.source : opportunityById.get(item.id)?.source || sourceFromPackage(item.id),
      intent: item.intent || "",
      buyer_stage: item.buyer_stage || "",
      question: item.question || opportunityById.get(item.id)?.question || item.title,
      url: reviewWorkspaceUrl(item.id)
    })),
    content_packages: buildContentPackages(summary, business),
    content_lifecycle: contentLifecycle,
    social_queue: socialQueue,
    social_publishing: socialPublishing,
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
  return {
    generated_at: summary.date,
    title: "Growth OS 增长运营中心",
    today_action: action ? {
      id: action.id,
      title: chineseTitle(action.id, action.title),
      status: chineseActionStatus(action.action),
      score: action.score,
      scores: action.scores,
      reason: [
        "买家处于付款或采购决策阶段",
        "与 Supplier Reply Review 高匹配",
        "最近出现多个类似问题",
        "GEO 存在机会"
      ],
      next_step: "进入审核工作台完成人工审核",
      content_package: action.content_package,
      review_url: action.review_url
    } : null,
    tasks: (priority.tasks || []).map(chineseTask),
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
      platforms: ["LinkedIn", "Reddit", "X", "Substack", "Medium"],
      stages: ["pre_payment", "sample_order", "quote_review", "research", "factory_materials"]
    }
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
        social: socialSections(item.id)
      };
    })
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
  if (action === "monitor") return "监测中";
  return "待处理";
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
    const metricTotal = platforms.reduce((total, platform) => total + platform.metrics.views + platform.metrics.clicks + platform.metrics.leads, 0);
    const status = metricTotal ? "learning" : publishedPlatforms.length ? "monitoring" : itemStatus;
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
  if (status === "draft_ready") return "review";
  return "review";
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

function renderQualityRows(items) {
  if (!items.length) return "- No quality reports.";
  return items
    .slice(0, 5)
    .map((item) => `- ${item.id}: quality ${item.overall} / SEO ${item.seo} / GEO ${item.geo} / Business ${item.business}`)
    .join("\n");
}
