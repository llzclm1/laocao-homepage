import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNTIME_DIR = path.join(ROOT, "data/growth-os/runtime");
const SOURCE_LABELS = {
  cloudflare: "Cloudflare",
  gsc: "Google Search Console",
  clarity: "Microsoft Clarity",
  semrush: "Semrush",
  geo: "GEO",
  social: "Social platforms",
  conversion: "Website conversion",
  brand_monitoring: "Brand monitoring"
};
const LIVE_STATES = new Set(["live", "collected", "partial"]);
const LOCAL_STATES = new Set(["cached", "manual"]);
const SEO_ACTION_LIMIT = 2;
const BRIEF_TITLES = Object.freeze({
  comparison: "昨天发生了什么",
  latest_observation: "最近观察到的情况",
  insufficient_data: "目前可以确认的情况"
});

export const BRIEF_MODES = Object.freeze({
  COMPARISON: "comparison",
  LATEST_OBSERVATION: "latest_observation",
  INSUFFICIENT_DATA: "insufficient_data"
});

export function buildMorningBrief(current, {
  previous = null,
  dashboardView = null,
  socialView = null,
  growthSignals = null,
  now = new Date(),
  generatedAt = now.toISOString()
} = {}) {
  const currentRun = current || {};
  const currentSources = currentRun.sources || [];
  const previousSources = previous?.sources || [];
  const comparisons = buildComparisons(currentSources, previousSources);
  const currentLive = currentSources.filter((source) => isLive(source) && hasMetrics(source)).length;
  const briefMode = comparisons.length
    ? BRIEF_MODES.COMPARISON
    : currentLive
      ? BRIEF_MODES.LATEST_OBSERVATION
      : BRIEF_MODES.INSUFFICIENT_DATA;
  const summaryItems = briefMode === BRIEF_MODES.COMPARISON
    ? comparisons.slice(0, 5)
    : buildLatestItems(currentSources, currentRun, briefMode);
  const todayActions = buildTodayActions({ dashboardView, socialView, currentSources, growthSignals });
  const needsReview = buildNeedsReview(currentSources, currentRun, todayActions);
  const counts = currentRun.summary?.counts || countStates(currentSources);

  return {
    task_id: "GROWTH-004-BRIEF",
    generated_at: generatedAt,
    source_run_completed_at: currentRun.completed_at || null,
    brief_mode: briefMode,
    title: BRIEF_TITLES[briefMode],
    confidence: confidenceFor({ briefMode, comparisons, currentLive, counts }),
    yesterday: summaryItems,
    observed: summaryItems,
    today_actions: todayActions.slice(0, 3),
    needs_review: needsReview.slice(0, 1),
    growth_signals: (growthSignals?.signals || []).filter((signal) => signal.status !== "archived").slice(0, 10),
    evidence: {
      available_sources: currentSources.filter((source) => isLive(source)).map((source) => source.key),
      cached_sources: currentSources.filter((source) => sourceState(source) === "cached").map((source) => source.key),
      manual_sources: currentSources.filter((source) => sourceState(source) === "manual").map((source) => source.key),
      unavailable_sources: currentSources.filter((source) => !isLive(source) && !LOCAL_STATES.has(sourceState(source))).map((source) => source.key),
      comparison_sources: comparisons.map((item) => item.source_key || item.source),
      counts
    }
  };
}

export function buildMorningBriefFromDisk(current, {
  rootDir = ROOT,
  growthSignals = null,
  now = new Date(),
  generatedAt = now.toISOString()
} = {}) {
  const previous = findPreviousRun(current, rootDir);
  const dashboardView = readJson(path.join(rootDir, "data/growth-os/viewer/dashboard-view.json"), null);
  const socialView = readJson(path.join(rootDir, "data/social-agent/view.json"), null);
  const signals = growthSignals || readJson(path.join(rootDir, "data/growth-os/runtime/signals-latest.json"), null);
  const brief = buildMorningBrief(current, { previous, dashboardView, socialView, growthSignals: signals, now, generatedAt });
  consumeBriefSignals(signals, brief, path.join(rootDir, "data/growth-os/runtime/signals-latest.json"), generatedAt);
  fs.mkdirSync(path.dirname(path.join(rootDir, "data/growth-os/runtime/morning-brief-latest.json")), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "data/growth-os/runtime/morning-brief-latest.json"), `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  return brief;
}

function consumeBriefSignals(snapshot, brief, file, consumedAt) {
  if (!snapshot?.signals?.length || !file) return;
  const consumedIds = new Set((brief.growth_signals || []).map((signal) => signal.id));
  if (!consumedIds.size) return;
  const next = {
    ...snapshot,
    signals: snapshot.signals.map((signal) => consumedIds.has(signal.id) && signal.status !== "archived"
      ? { ...signal, status: "consumed", consumed_at: signal.consumed_at || consumedAt }
      : signal)
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  brief.growth_signals = next.signals.filter((signal) => signal.status !== "archived").slice(0, 10);
}

export function readLatestMorningBrief(rootDir = ROOT) {
  return readJson(path.join(rootDir, "data/growth-os/runtime/morning-brief-latest.json"), null);
}

export function findPreviousRun(current, rootDir = ROOT) {
  const directory = path.join(rootDir, "data/growth-os/runtime");
  if (!fs.existsSync(directory)) return null;
  const currentCompleted = Date.parse(current?.completed_at || "") || 0;
  const files = fs.readdirSync(directory)
    .filter((name) => /^morning-collector-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .reverse();
  for (const name of files) {
    const candidate = readJson(path.join(directory, name), null);
    if (!candidate || candidate.task_id !== "GROWTH-004") continue;
    const completed = Date.parse(candidate.completed_at || "") || 0;
    if (completed && completed < currentCompleted) return candidate;
  }
  return null;
}

function buildComparisons(currentSources, previousSources) {
  const previousByKey = new Map(previousSources.map((source) => [source.key, source]));
  const items = [];
  for (const current of currentSources) {
    const previous = previousByKey.get(current.key);
    if (!previous || !isLive(current) || !isLive(previous)) continue;
    const metric = comparableMetric(current.metrics, previous.metrics);
    if (!metric) continue;
    const currentValue = numericValue(metric.current);
    const previousValue = numericValue(metric.previous);
    if (currentValue === null || previousValue === null) continue;
    const delta = currentValue - previousValue;
    const status = delta > 0 ? "positive" : delta < 0 ? "warning" : "stable";
    const label = metricLabel(current.key, metric.key);
    items.push({
      area: areaFor(current.key, current),
      status,
      headline: `${SOURCE_LABELS[current.key] || current.label || current.key}${label ? ` ${label}` : ""}：${formatNumber(previousValue)} → ${formatNumber(currentValue)}。`,
      detail: delta === 0 ? "当前期与上一期相同。" : `${delta > 0 ? "较上一期增加" : "较上一期减少"} ${formatNumber(Math.abs(delta))}。`,
      source: current.source || current.key,
      source_key: current.key,
      source_status: sourceState(current),
      observed_at: current.updated_at || currentRunDate(current),
      supporting_metric: { key: metric.key, previous: previousValue, current: currentValue, delta },
      comparison_available: true
    });
  }
  return items;
}

function buildLatestItems(sources, currentRun, briefMode) {
  const liveItems = sources.filter((source) => isLive(source) && hasMetrics(source)).map((source) => latestLiveItem(source));
  if (briefMode === BRIEF_MODES.LATEST_OBSERVATION) return liveItems.slice(0, 5);

  const items = [];
  const unavailable = sources.filter((source) => !isLive(source) && !LOCAL_STATES.has(sourceState(source)));
  if (unavailable.length) {
    const topics = [];
    if (unavailable.some((source) => source.key === "gsc")) topics.push("搜索");
    if (unavailable.some((source) => source.key === "cloudflare")) topics.push("流量");
    if (unavailable.some((source) => source.key === "social")) topics.push("社交平台");
    if (unavailable.some((source) => ["clarity", "semrush", "brand_monitoring"].includes(source.key))) topics.push("部分数据来源");
    items.push(evidenceItem({
      area: "system",
      status: "unavailable",
      headline: `本轮没有获取到${topics.join("、") || "部分"}的实时数据，暂无法判断访问、搜索或社交变化。`,
      detail: "当前没有足够证据判断昨日表现是否变化。",
      source: "morning-collector",
      source_status: "unavailable",
      observed_at: currentRun.completed_at || null,
      supporting_metric: { unavailable_sources: unavailable.map((source) => source.key) },
      supporting_reason: "本轮来源状态为 unavailable 或 permission_required。"
    }));
  }
  for (const source of sources.filter((item) => LOCAL_STATES.has(sourceState(item)))) {
    const state = sourceState(source);
    const metrics = source.metrics || {};
    if (source.key === "geo") {
      items.push(evidenceItem({
        area: "geo",
        status: "stable",
        headline: `GEO 最近一次有效记录：AI 提及 ${displayMetric(metrics.mentions)}，AI 引用 ${displayMetric(metrics.citations)}。`,
        detail: "这是缓存记录，本轮未访问实时页面。",
        source: source.source || source.key,
        source_status: state,
        observed_at: source.updated_at || null,
        supporting_metric: { queries: metrics.queries ?? null, mentions: metrics.mentions ?? null, citations: metrics.citations ?? null },
        supporting_reason: "来源文件存在，但状态为 cached。"
      }));
    } else if (source.key === "conversion") {
      items.push(evidenceItem({
        area: "conversion",
        status: "stable",
        headline: `Supplier Reply Review 最近一次人工记录：暂无提交记录。`,
        detail: `记录行数 ${displayMetric(metrics.recorded_rows)}，材料提交 ${displayMetric(metrics.material_submitted)}。`,
        source: source.source || source.key,
        source_status: state,
        observed_at: source.updated_at || null,
        supporting_metric: { recorded_rows: metrics.recorded_rows ?? null, material_submitted: metrics.material_submitted ?? null },
        supporting_reason: "来源文件存在，但状态为 manual；本轮未访问实时页面。"
      }));
    }
  }
  return items.length ? items : [evidenceItem({
    area: "system",
    status: "unavailable",
    headline: "本轮暂无实时数据。",
    detail: "暂无可比较记录，当前无法判断趋势。",
    source: "morning-collector",
    source_status: "unavailable",
    observed_at: currentRun.completed_at || null,
    supporting_metric: {},
    supporting_reason: "当前运行没有可用实时、缓存或人工来源。"
  })];
}

function latestLiveItem(source) {
  const metrics = source.metrics || {};
  const metricKey = ["web_search_impressions", "impressions", "web_search_clicks", "clicks", "web_traffic_24h", "visits", "new_interactions", "mentions", "citations", "site_health", "visibility"]
    .find((key) => numericValue(metrics[key]) !== null) || Object.keys(metrics).find((key) => metrics[key] !== null && metrics[key] !== undefined && metrics[key] !== "");
  const value = metricKey ? metrics[metricKey] : null;
  return evidenceItem({
    area: areaFor(source.key, source),
    status: "stable",
    headline: `${SOURCE_LABELS[source.key] || source.label || source.key} 最近一次有效数据：${metricKey ? `${metricLabel(source.key, metricKey)} ${displayMetric(value)}` : "已获得部分指标"}。`,
    detail: "只有最近一次有效数据，暂无连续可比较记录。",
    source: source.source || source.key,
    source_status: sourceState(source),
    observed_at: source.updated_at || null,
    supporting_metric: metricKey ? { [metricKey]: value } : {},
    supporting_reason: "当前来源为 live，但没有上一期可比较快照。"
  });
}

function buildTodayActions({ dashboardView, socialView, currentSources, growthSignals = null }) {
  const actions = [];
  let seoActionCount = 0;
  const view = dashboardView || {};
  const reviewQueue = pendingReviewQueue(socialView);
  const readyToPublish = readyToPublishQueue(socialView);
  const social = currentSources.find((source) => source.key === "social");
  for (const item of readyToPublish) {
    if (actions.length >= 3) break;
    actions.push(publishingQueueAction(item, actions.length + 1));
  }
  for (const item of explicitCreationPlans(view)) {
    if (actions.length >= 3 || seoActionCount >= SEO_ACTION_LIMIT) break;
    actions.push(actionItem({
      id: `content-plan:${item.id || item.opportunity_id || item.title}`,
      priority: actions.length + 1,
      action: "建议创作",
      title: `建议创作：${item.title || item.action || "新的买家问题内容"}`,
      reason: item.reason || "已有明确但尚未完成的内容计划；不是待审核项。",
      detail: "content",
      source: "data/growth-os/viewer/dashboard-view.json",
      source_status: "manual"
    }));
    seoActionCount += 1;
  }
  for (const signal of growthSignals?.signals || []) {
    if (actions.length >= 3 || seoActionCount >= SEO_ACTION_LIMIT || signal.status === "archived" || signal.status === "consumed") break;
    if (signal.business_line !== "factory_bridge" || !["search.query.first_seen", "content.buyer_guide.first_impression", "content.reply_review.first_click"].includes(signal.event)) continue;
    actions.push(actionItem({
      id: `signal:${signal.id}`,
      priority: actions.length + 1,
      action: "查看增长信号",
      title: signal.title || "查看新的 Factory Bridge 信号",
      reason: signal.detail || "发现新的 Factory Bridge 业务信号，需要人工判断下一步。",
      detail: "signals",
      source: signal.source || "signals-latest.json",
      source_status: signal.source_status || "unavailable",
      observed_at: signal.observed_at || signal.last_seen || null
    }));
    seoActionCount += 1;
  }
  const factoryQuery = findFactoryQuery(view);
  if (actions.length < 3 && seoActionCount < SEO_ACTION_LIMIT && factoryQuery) {
    actions.push(actionItem({
      id: "factory-query",
      priority: actions.length + 1,
      action: "查看 Factory Bridge 查询",
      title: "查看新的 Factory Bridge 查询",
      reason: `发现高相关词：${factoryQuery}`,
      detail: "data",
      source: "Google Search Console",
      source_status: "live"
    }));
    seoActionCount += 1;
  }
  const conversion = currentSources.find((source) => source.key === "conversion");
  const todayPlan = (view.today_actions || [])
    .filter((item) => !item.done && !isReviewAction(item) && !isDiscoveryPlaceholder(item))
    .concat((view.today_plan || []).filter((item) => item.status !== "completed" && !isContentPlan(item) && !isReviewAction(item) && !isDiscoveryPlaceholder(item)))
    // A discovery candidate can remain in the legacy plan after it has been
    // projected into the real review queue. The queue owns that action.
    .filter((item) => !reviewQueue.some((reviewItem) => reviewItem.id === item.id))
    .sort(compareOpportunityPriority);
  const rankedActions = [
    ...reviewQueue.map((item) => ({ kind: "review", item, priority: opportunityPriority(item) })),
    ...todayPlan.map((item) => ({ kind: "plan", item, priority: opportunityPriority(item) })),
    ...(Number(conversion?.metrics?.material_submitted) > 0 ? [{ kind: "conversion", priority: 80 }] : []),
    ...(isLive(social) && Number(social.metrics?.new_interactions) > 0 ? [{ kind: "social", priority: 0 }] : [])
  ].sort((left, right) => right.priority - left.priority || scoreOf(right.item) - scoreOf(left.item));
  let emailActionCount = 0;
  for (const candidate of rankedActions) {
    if (actions.length >= 3) break;
    if (candidate.priority === 80 && emailActionCount >= 1) continue;
    if (candidate.kind === "review") {
      actions.push(reviewQueueAction(candidate.item, actions.length + 1));
    } else if (candidate.kind === "conversion") {
      actions.push(actionItem({
        id: "conversion-follow-up",
        priority: actions.length + 1,
        action: "跟进 Supplier Reply Review 提交",
        title: "跟进新的 Supplier Reply Review 提交",
        reason: "已有材料提交记录，需要人工确认下一步。",
        detail: "signals",
        source: conversion.source || "Website conversion",
        source_status: sourceState(conversion)
      }));
    } else if (candidate.kind === "social") {
      actions.push(actionItem({
        id: "social-interactions",
        priority: actions.length + 1,
        action: "处理新互动",
        title: "处理新的买家或平台互动",
        reason: `本轮记录 ${social.metrics.new_interactions} 条新互动，先人工确认是否需要回复。`,
        detail: "signals",
        source: social.source || "Social platforms",
        source_status: sourceState(social),
        observed_at: social.updated_at || null
      }));
    } else {
      const item = candidate.item;
      actions.push(actionItem({
        id: item.id,
        priority: actions.length + 1,
        action: item.action || item.title || "处理今日任务",
        title: item.title || item.action || "处理今日任务",
        reason: item.reason || item.instruction || "已有今日任务或增长实验。",
        detail: "signals",
        source: "data/growth-os/viewer/dashboard-view.json"
      }));
    }
    if (candidate.priority === 80) emailActionCount += 1;
  }
  return dedupeActions(actions).slice(0, 3);
}

function pendingReviewQueue(socialView) {
  return (socialView?.opportunities || [])
    .filter((item) => String(item.status || item.review_status || "").trim().toLowerCase() === "pending_review")
    .slice()
    .sort(compareOpportunityPriority);
}

function readyToPublishQueue(socialView) {
  return (socialView?.opportunities || [])
    .filter((item) => String(item.status || "").trim().toLowerCase() === "ready_to_publish")
    .slice()
    .sort(compareOpportunityPriority);
}

function reviewQueueAction(item, priority) {
  const platformLabel = item.platform ? `${item.platform}：` : "";
  return actionItem({
    id: item.id,
    priority,
    action: `审核：${platformLabel}${item.title}`,
    title: `审核 ${platformLabel}${item.title}`,
    reason: scoreOf(item) ? `Business Intent ${scoreOf(item)}，优先确认是否进入回复。` : (item.why_relevant || item.reason || "Review Queue 中有待审核候选。"),
    detail: "review",
    source: item.source || "data/social-agent/view.json",
    source_status: item.source_status || "projected",
    observed_at: item.published_at || item.captured_at || item.evidence?.observed_at || item.created_at || null
  });
}

function publishingQueueAction(item, priority) {
  return actionItem({
    id: item.id,
    priority,
    action: `发布：${item.platform || "内容"}`,
    title: `发布 ${item.platform || "内容"}：${item.title || "已准备内容"}`,
    reason: item.reason || "已审核并准备发布；系统不会自动执行外部发布。",
    detail: "publishing",
    source: item.source || "data/social-agent/view.json",
    source_status: item.source_status || "projected",
    observed_at: item.lifecycle?.updated_at || item.created_at || item.captured_at || null
  });
}

function explicitCreationPlans(view) {
  const plans = [
    ...(Array.isArray(view.content_plan) ? view.content_plan : []),
    ...(Array.isArray(view.content_plans) ? view.content_plans : []),
    ...(view.opportunities || []).map((item) => item.content_plan && typeof item.content_plan === "object" ? { ...item.content_plan, opportunity_id: item.id } : null),
    ...(view.today_plan || [])
  ];
  const seen = new Set();
  return plans.filter((item) => {
    if (!item || !isContentPlan(item) || String(item.status || "").toLowerCase() === "completed") return false;
    const key = item.id || item.opportunity_id || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isContentPlan(item = {}) {
  const type = String(item.object_type || item.type || item.kind || item.plan_type || "").toLowerCase();
  return ["content_plan", "content_task", "content"].includes(type) || item.content_plan === true;
}

function isReviewAction(item = {}) {
  return /审核|\breview\b/i.test(String(item.action || item.title || ""));
}

function isDiscoveryPlaceholder(item = {}) {
  const type = String(item.object_type || item.type || item.kind || "").toLowerCase();
  const title = String(item.action || item.title || "");
  return type === "discovery_task" || (!item.url && /\b(?:linkedin|quora|reddit|x|facebook)\s+discovery\s+task\b/i.test(title));
}

function buildNeedsReview(sources, currentRun, actions) {
  if (actions.length >= 3) return [];
  const unavailable = sources.filter((source) => ["cloudflare", "gsc", "social", "semrush"].includes(source.key) && !isLive(source));
  if (!unavailable.length) return [];
  return [actionItem({
    id: "system-source-check",
    priority: 99,
    action: "需要时手动核查数据来源",
    title: "本轮部分实时来源未采集",
    reason: "只有在需要判断流量或搜索异常时，才手动打开后台核查。",
    detail: "data",
    source: "morning-collector",
    source_status: "unavailable",
    observed_at: currentRun.completed_at || null
  })];
}

function evidenceItem(item) {
  return {
    area: item.area || "system",
    status: item.status || "stable",
    headline: item.headline || "暂无可确认结论。",
    detail: item.detail || "暂无可比较记录。",
    source: item.source || "Unknown",
    source_status: item.source_status || "unavailable",
    observed_at: item.observed_at || null,
    supporting_metric: item.supporting_metric || {},
    supporting_reason: item.supporting_reason || item.detail || "暂无可比较记录。",
    comparison_available: Boolean(item.comparison_available)
  };
}

function actionItem(item) {
  return {
    id: item.id || `action-${item.priority || 1}`,
    priority: item.priority || 1,
    action: item.action || item.title || "处理今日任务",
    title: item.title || item.action || "处理今日任务",
    reason: item.reason || "已有业务任务。",
    detail: item.detail || "signals",
    source: item.source || "dashboard-view.json",
    source_status: item.source_status || "manual",
    observed_at: item.observed_at || null
  };
}

function currentRunDate(source) { return source.updated_at || null; }
function areaFor(key, source = {}) {
  const signal = JSON.stringify({ source: source.source, metrics: source.metrics }).toLowerCase();
  if (key === "gsc" && /games\.|repo extraction|roblox|world cup|block blast/.test(signal)) return "games";
  if (key === "gsc" && /supplier|factory|buyer|sample|payment|quotation|reply/.test(signal)) return "factory";
  return ({ cloudflare: "traffic", gsc: "search", semrush: "search", social: "social", geo: "geo", conversion: "conversion" })[key] || "system";
}
function sourceState(source = {}) { return source.state || (source.status === "collected" ? (source.realtime ? "live" : "cached") : source.status || "unavailable"); }
function isLive(source = {}) { return LIVE_STATES.has(sourceState(source)); }
function hasMetrics(source = {}) { return Object.values(source.metrics || {}).some((value) => numericValue(value) !== null || (typeof value === "string" && value.trim() !== "")); }
function numericValue(value) { if (value === null || value === undefined || value === "" || value === "unavailable") return null; const match = String(value).replaceAll(",", "").match(/-?\d+(?:\.\d+)?/); return match ? Number(match[0]) : null; }
function displayMetric(value) { return value === null || value === undefined || value === "" || value === "unavailable" ? "暂无数据" : value; }
function formatNumber(value) { return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString(); }
function scoreOf(item = {}) { return Number(item.business_intent_score || item.business_score || item.conversion_score || 0); }
function compareOpportunityPriority(left, right) { return opportunityPriority(right) - opportunityPriority(left) || scoreOf(right) - scoreOf(left); }
function opportunityPriority(item = {}) {
  const platform = String(item.platform || item.platform_key || "").trim().toLowerCase();
  const type = String(item.type || item.object_type || "").trim().toLowerCase();
  if (["seo_opportunity", "geo_opportunity", "content_plan", "content_task"].includes(type)) return 100;
  if (platform === "linkedin" && type !== "original_post") return 90;
  if (platform === "quora") return 85;
  if (platform === "email" || type === "email_opportunity") return 80;
  if (platform === "linkedin" && type === "original_post") return 75;
  if (platform === "reddit") return 60;
  return 0;
}
function metricLabel(sourceKey, metricKey) { return ({ web_traffic_24h: "访问", visits: "访问", web_search_clicks: "搜索点击", web_search_impressions: "搜索展示", impressions: "展示", clicks: "点击", new_interactions: "新互动", mentions: "提及", citations: "引用", site_health: "站点健康", visibility: "可见度" })[metricKey] || metricKey; }
function comparableMetric(current = {}, previous = {}) {
  const priority = ["web_search_impressions", "impressions", "web_search_clicks", "clicks", "web_traffic_24h", "visits", "new_interactions", "mentions", "citations", "site_health", "visibility"];
  for (const key of priority) if (numericValue(current[key]) !== null && numericValue(previous[key]) !== null) return { key, current: current[key], previous: previous[key] };
  return null;
}
function findFactoryQuery(view = {}) { return (view.traffic_intelligence?.queries || []).find?.((query) => /supplier|factory|buyer|sample|payment|quotation|reply/i.test(String(query))) || null; }
function dedupeActions(items) { const seen = new Set(); return items.filter((item) => { const key = item.id || item.title; if (seen.has(key)) return false; seen.add(key); return true; }); }
function countStates(sources = []) { return sources.reduce((counts, source) => { const state = sourceState(source); if (Object.hasOwn(counts, state)) counts[state] += 1; else counts.unavailable += 1; return counts; }, { live: 0, cached: 0, manual: 0, unavailable: 0, permission_required: 0 }); }
function confidenceFor({ briefMode, comparisons, currentLive, counts }) { if (briefMode === BRIEF_MODES.COMPARISON && comparisons.length >= 2) return "high"; if (currentLive || comparisons.length) return "medium"; if (counts.cached || counts.manual) return "low"; return "low"; }
function readJson(file, fallback) { if (!file || !fs.existsSync(file)) return fallback; try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = readJson(path.join(RUNTIME_DIR, "morning-collector-latest.json"), null);
  if (!current) process.exitCode = 1;
  else console.log(JSON.stringify(buildMorningBriefFromDisk(current), null, 2));
}
