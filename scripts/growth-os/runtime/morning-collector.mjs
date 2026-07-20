import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runSocialCollector } from "./social-collector.mjs";
import {
  BROWSER_ADAPTERS,
  createChromeAdapter,
  createSafariAdapter,
  isBrowserFallbackError
} from "./browser-adapter.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runtimeDir = path.join(root, "data/growth-os/runtime");
const latestFile = path.join(runtimeDir, "morning-collector-latest.json");
const CLARITY_TOTAL_TIMEOUT_MS = 15_000;
const CLARITY_CLOSE_TIMEOUT_MS = 2_000;
const CLARITY_WORK_TIMEOUT_MS = CLARITY_TOTAL_TIMEOUT_MS - CLARITY_CLOSE_TIMEOUT_MS;
const CLARITY_URL = "https://clarity.microsoft.com/projects";
const BROWSER_SOURCE_KEYS = new Set(["cloudflare", "gsc", "clarity", "semrush"]);
export const SOURCE_STATES = Object.freeze({
  LIVE: "live",
  CACHED: "cached",
  MANUAL: "manual",
  UNAVAILABLE: "unavailable",
  PERMISSION_REQUIRED: "permission_required"
});

const BROWSER_SOURCE_CONFIG = [
  ["cloudflare", "Cloudflare", "https://dash.cloudflare.com/", parseCloudflare],
  ["gsc", "Google Search Console", "https://search.google.com/search-console?resource_id=https://gewuji.dev/", parseGsc],
  ["clarity", "Microsoft Clarity", CLARITY_URL, null],
  ["semrush", "Semrush", "https://www.semrush.com/projects/", parseSemrush]
];

export async function runMorningCollector(now = new Date()) {
  const startedAt = now.toISOString();
  const sources = [];
  const browserRun = await collectBrowserSourcesWithFallback();
  sources.push(...browserRun.sources);
  const browserId = browserRun.chromeBrowserId;

  normalizeCommonRootCause(sources);
  sources.push(collectGeo());
  sources.push(await collectSocial(browserId));
  sources.push(collectConversion());
  sources.push(collectBrandMonitoring(sources));

  const result = {
    task_id: "GROWTH-004",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    mode: "manual_click_playwright_browser",
    realtime: false,
    browser: browserRun.context,
    source_order: ["cloudflare", "gsc", "clarity", "semrush", "geo", "social", "conversion", "brand_monitoring"],
    sources,
    top_tasks: buildTopTasks(sources),
    summary: summarize(sources, browserRun.context)
  };

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(latestFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(runtimeDir, `morning-collector-${startedAt.slice(0, 10)}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

export async function collectBrowserSourcesWithFallback({
  findChrome = findChromeDirectBrowser,
  chromeAdapterFactory = (browserId) => createChromeAdapter({ browserId, browserCommand, closeSession: closeBrowserSession }),
  safariAdapterFactory = () => createSafariAdapter(),
  runGroup = collectBrowserSourceGroup
} = {}) {
  let chromeBrowserId = null;
  let chromeRun = null;
  let chromeError = null;
  try {
    chromeBrowserId = await findChrome();
    if (!chromeBrowserId) throw new Error("No running chrome-direct browser is available. Open Chrome first.");
    chromeRun = await runGroup(chromeAdapterFactory(chromeBrowserId));
    if (!shouldFallbackToSafari(chromeRun)) {
      return {
        sources: chromeRun.sources,
        chromeBrowserId,
        context: { primary: BROWSER_ADAPTERS.CHROME, used: BROWSER_ADAPTERS.CHROME, fallback: false }
      };
    }
  } catch (error) {
    chromeError = error;
  }

  const safariAdapter = safariAdapterFactory();
  let safariRun = null;
  try {
    safariRun = await runGroup(safariAdapter);
  } catch (error) {
    safariRun = { sources: [], error, adapter: safariAdapter };
  }
  if (safariRun.sources.length && !safariRun.error && !shouldFallbackToSafari(safariRun)) {
    return {
      sources: safariRun.sources,
      chromeBrowserId: null,
      context: {
        primary: BROWSER_ADAPTERS.CHROME,
        used: BROWSER_ADAPTERS.SAFARI,
        fallback: true,
        public_note: "Chrome 不可用，本轮已自动切换 Safari。"
      }
    };
  }

  const chromeSources = chromeRun?.sources?.length
    ? chromeRun.sources
    : BROWSER_SOURCE_CONFIG.map(([key, label, url]) => blockedSource(key, label, chromeError?.message || "Chrome 不可用。", url, BROWSER_ADAPTERS.CHROME));
  return {
    sources: chromeSources,
    chromeBrowserId,
    context: {
      primary: BROWSER_ADAPTERS.CHROME,
      used: BROWSER_ADAPTERS.CHROME,
      fallback: false,
      fallback_attempted: true,
      fallback_available: false,
      public_note: "Chrome 与 Safari 均不可用，本轮实时采集未完成。"
    }
  };
}

async function collectBrowserSourceGroup(adapter) {
  const session = `growth_morning_${adapter.kind}_${Date.now()}`;
  const sources = [];
  let error = null;
  try {
    await adapter.open(session, BROWSER_SOURCE_CONFIG[0][2]);
    for (const [key, label, url, parser] of BROWSER_SOURCE_CONFIG) {
      if (key === "clarity") {
        const clarityAdapter = adapter.kind === BROWSER_ADAPTERS.SAFARI
          ? createSafariAdapter()
          : createChromeAdapter({ browserId: adapter.browserId, browserCommand, closeSession: closeBrowserSession });
        sources.push(await collectClarityIsolated(clarityAdapter));
      } else {
        sources.push(await collectBrowserSource(adapter, session, key, label, url, parser));
      }
    }
  } catch (caught) {
    error = caught;
    for (const [key, label, url] of BROWSER_SOURCE_CONFIG) {
      if (!sources.some((source) => source.key === key)) sources.push(blockedSource(key, label, caught.message, url, adapter.kind));
    }
  } finally {
    await adapter.close(session);
  }
  return { sources, error, adapter };
}

function shouldFallbackToSafari(browserRun) {
  if (isBrowserFallbackError(browserRun?.error)) return true;
  return (browserRun?.sources || []).some((source) => isBrowserFallbackError(
    source.diagnostics?.technical_error || source.diagnostics?.failure_reason || source.note
  ));
}

export async function runClarityCollector(now = new Date()) {
  const resultWithAdapter = await collectStandaloneClarityWithFallback();

  const result = {
    task_id: "GROWTH-004-CLARITY",
    started_at: now.toISOString(),
    completed_at: new Date().toISOString(),
    realtime: false,
    browser: resultWithAdapter.context,
    source: resultWithAdapter.source
  };
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, "clarity-collector-latest.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

async function collectStandaloneClarityWithFallback() {
  let chromeBrowserId = null;
  let chromeSource = null;
  try {
    chromeBrowserId = await findChromeDirectBrowser();
    if (chromeBrowserId) {
      chromeSource = await collectClarityIsolated(createChromeAdapter({ browserId: chromeBrowserId, browserCommand, closeSession: closeBrowserSession }));
      if (!isBrowserFallbackError(chromeSource.diagnostics?.technical_error || chromeSource.diagnostics?.failure_reason || chromeSource.note)) {
        return { source: chromeSource, context: { primary: BROWSER_ADAPTERS.CHROME, used: BROWSER_ADAPTERS.CHROME, fallback: false } };
      }
    }
  } catch (error) {
    chromeSource = blockedSource("clarity", "Microsoft Clarity", error.message, CLARITY_URL, BROWSER_ADAPTERS.CHROME);
  }
  try {
    const safariSource = await collectClarityIsolated(createSafariAdapter());
    return {
      source: safariSource,
      context: { primary: BROWSER_ADAPTERS.CHROME, used: BROWSER_ADAPTERS.SAFARI, fallback: true, public_note: "Chrome 不可用，本轮已自动切换 Safari。" }
    };
  } catch (error) {
    return {
      source: chromeSource || blockedSource("clarity", "Microsoft Clarity", error.message, CLARITY_URL, BROWSER_ADAPTERS.SAFARI),
      context: { primary: BROWSER_ADAPTERS.CHROME, used: BROWSER_ADAPTERS.CHROME, fallback: false, fallback_attempted: true, fallback_available: false, public_note: "Chrome 与 Safari 均不可用，本轮实时采集未完成。" }
    };
  }
}

export function readLatestMorningCollector() {
  if (!fs.existsSync(latestFile)) return null;
  try { return JSON.parse(fs.readFileSync(latestFile, "utf8")); } catch { return null; }
}

async function findChromeDirectBrowser() {
  const result = await runBrowserAct(["--format", "json", "browser", "list"]);
  return result.browsers?.find((browser) => browser.type === "chrome-direct" && browser.state === "running")?.id
    || result.browsers?.find((browser) => browser.type === "chrome-direct")?.id
    || null;
}

async function collectBrowserSource(adapter, session, key, label, url, parser) {
  try {
    await adapter.navigate(session, url);
    await adapter.waitStable(session);
    const state = await adapter.state(session);
    const metrics = parser(state.text || "");
    return {
      key,
      label,
      status: Object.keys(metrics).length ? SOURCE_STATES.LIVE : SOURCE_STATES.UNAVAILABLE,
      state: Object.keys(metrics).length ? SOURCE_STATES.LIVE : SOURCE_STATES.UNAVAILABLE,
      source: state.url || url,
      updated_at: new Date().toISOString(),
      realtime: Boolean(Object.keys(metrics).length),
      adapter: adapter.kind,
      note: Object.keys(metrics).length ? "本轮从实时网页只读采集。" : "本轮页面已打开，但未找到可用指标。",
      metrics
    };
  } catch (error) {
    return blockedSource(key, label, error.message, url, adapter.kind);
  }
}

async function collectClarityIsolated(adapter) {
  const session = `growth_clarity_${adapter.kind}_${Date.now()}`;
  const startedAt = Date.now();
  const stageLog = [];
  const markStage = (stage) => stageLog.push({ stage, at: new Date().toISOString(), elapsed_ms: Date.now() - startedAt });
  let pageOpened = false;
  let source;
  try {
    await adapter.open(session, CLARITY_URL);
    pageOpened = true;
    markStage("clarity_opened");
    source = await collectClarity(adapter, session, {
      deadline: startedAt + CLARITY_WORK_TIMEOUT_MS,
      onStage: markStage
    });
  } catch (error) {
    const timedOut = isClarityTimeout(error) || Date.now() >= startedAt + CLARITY_WORK_TIMEOUT_MS;
    if (timedOut) markStage("clarity_timeout");
      source = {
      key: "clarity",
      label: "Microsoft Clarity",
      extraction_status: pageOpened ? "extraction_failed" : "blocked",
      source: CLARITY_URL,
      updated_at: new Date().toISOString(),
      realtime: false,
      note: "Clarity 数据暂未提取，不影响其他数据。",
      metrics: withUnavailableClarityMetrics({}),
      diagnostics: {
        final_url: CLARITY_URL,
        wait_ms: Date.now() - startedAt,
        failure_reason: error.message,
        technical_error: error.message,
        found_labels: [],
        missing_metrics: clarityMissingMetrics({}),
        scrolled: false,
        extraction_method: "visible text + aria-label + role-adjacent values",
        stage_log: stageLog
      }
    };
  } finally {
    markStage("clarity_closed");
    await adapter.close(session);
  }
  if (source) {
    const extractionStatus = source.extraction_status || source.status || "unavailable";
    const permissionRequired = isBrowserPermissionError(source.diagnostics?.failure_reason || source.diagnostics?.technical_error);
    source.extraction_status = extractionStatus;
    delete source.status;
    source.state = permissionRequired
      ? SOURCE_STATES.PERMISSION_REQUIRED
      : ["collected", "partial"].includes(extractionStatus) ? SOURCE_STATES.LIVE : SOURCE_STATES.UNAVAILABLE;
    source.status = source.state;
    source.realtime = source.state === SOURCE_STATES.LIVE;
    source.adapter = adapter.kind;
    source.diagnostics = { ...(source.diagnostics || {}), stage_log: stageLog };
    source.note = source.state === SOURCE_STATES.PERMISSION_REQUIRED
      ? "本轮未采集，原因是 Chrome 权限未通过。"
      : source.state === SOURCE_STATES.LIVE
        ? "本轮从实时网页只读采集。"
        : "本轮没有可用 Clarity 数据，不影响其他来源。";
  }
  return source;
}

async function collectClarity(adapter, session, { deadline, onStage = () => {} } = {}) {
  const key = "clarity";
  const label = "Microsoft Clarity";
  let lastUrl = CLARITY_URL;
  try {
    const boundedCommand = (args) => clarityCommand(adapter, session, args, deadline);
    let state = await boundedCommand(["state"]);
    lastUrl = state.url || lastUrl;
    if (!/\/projects\/view\//.test(state.url || "")) {
      const match = (state.text || "").match(/\[(\d+)\]<div role=link \/>[\s\S]{0,220}?格物集[\s\S]{0,160}?https:\/\/gewuji\.dev\/?/);
      if (!match) throw new Error("Clarity project for gewuji.dev was not found or a consent/login screen is blocking it.");
      await boundedCommand(["click", match[1]]);
      state = await boundedCommand(["state"]);
      lastUrl = state.url || lastUrl;
    }
    onStage("clarity_waiting");
    const extraction = await waitForClarityMetrics({
      maxAttempts: 20,
      maxWaitMs: Math.max(0, deadline - Date.now()),
      pollMs: 700,
      readState: () => boundedCommand(["state"]),
      scroll: () => boundedCommand(["scroll", "down", "--amount", "600"]),
      sleep: (ms) => delay(Math.min(ms, Math.max(0, deadline - Date.now()))),
      initialState: state,
      onStage
    });
    return {
      key,
      label,
      extraction_status: extraction.status,
      source: extraction.final_url || state.url || "https://clarity.microsoft.com/projects",
      updated_at: new Date().toISOString(),
      realtime: false,
      note: extraction.status === "collected" ? "本轮从实时网页只读采集。" : "本轮没有可用 Clarity 数据，不影响其他来源。",
      metrics: withUnavailableClarityMetrics(extraction.metrics),
      diagnostics: { ...extraction.diagnostics, final_url: extraction.final_url || state.url || CLARITY_URL }
    };
  } catch (error) {
    if (isClarityTimeout(error)) throw error;
    const blocked = /not found|consent\/login|登录/.test(error.message || "");
    return {
      key,
      label,
      extraction_status: blocked ? "blocked" : "extraction_failed",
      source: lastUrl,
      updated_at: new Date().toISOString(),
      realtime: false,
      note: "Clarity 数据暂未提取，不影响其他数据。",
      metrics: withUnavailableClarityMetrics({}),
      diagnostics: { final_url: lastUrl, wait_ms: 0, failure_reason: error.message, technical_error: error.message, stage_log: [] }
    };
  }
}

function collectGeo() {
  const file = latestFileIn("data/growth-os/geo/analysis", ".json");
  const data = readJson(file, []);
  const rows = Array.isArray(data) ? data : data?.items || [];
  return localSource("geo", "GEO", file, SOURCE_STATES.CACHED, {
    queries: rows.length,
    mentions: rows.filter((row) => row.mentioned).length,
    citations: rows.filter((row) => row.citation).length
  });
}

async function collectSocial(browserId = null) {
  try {
    const report = await runSocialCollector(new Date(), { browserId });
    const platforms = report.platforms || {};
    const statuses = Object.values(platforms).map((platform) => platform.status);
    const live = report.browser_id !== "Unknown" && statuses.some((value) => value !== "blocked");
    const state = live ? SOURCE_STATES.LIVE : SOURCE_STATES.UNAVAILABLE;
    return {
      key: "social",
      label: "Social platforms",
      status: state,
      state,
      source: "data/growth-os/runtime/social-collector-latest.json",
      updated_at: report.collected_at,
      realtime: live,
      note: live ? "本轮从 LinkedIn、Quora 实时网页只读采集。" : "本轮未采集社交网页，数据暂不可用。",
      metrics: {
        linkedin_state: platforms.linkedin?.status === "collected" ? SOURCE_STATES.LIVE : SOURCE_STATES.UNAVAILABLE,
        quora_state: platforms.quora?.status === "collected" ? SOURCE_STATES.LIVE : SOURCE_STATES.UNAVAILABLE,
        new_interactions: report.summary?.new_interactions ?? null,
        best_content: report.summary?.best_content?.title || "Unknown"
      },
      diagnostics: { duration_ms: report.duration_ms, failed_platforms: report.summary?.failed_platforms || [] }
    };
  } catch (error) {
    return blockedSource("social", "Social platforms", error.message, "data/growth-os/runtime/social-collector-latest.json");
  }
}

function collectConversion() {
  const file = path.join(root, "data/product/supplier-reply-review-business-results.csv");
  const rows = readCsv(file);
  return localSource("conversion", "Website conversion", file, SOURCE_STATES.MANUAL, {
    recorded_rows: rows.length,
    material_submitted: rows.filter((row) => truthy(row.material_submitted)).length
  });
}

function collectBrandMonitoring(sources) {
  const semrush = sources.find((source) => source.key === "semrush");
  if (sourceState(semrush) !== SOURCE_STATES.LIVE) return blockedSource("brand_monitoring", "Brand monitoring", "Semrush AI visibility data was unavailable.");
  return {
    key: "brand_monitoring",
    label: "Brand monitoring",
    status: SOURCE_STATES.LIVE,
    state: SOURCE_STATES.LIVE,
    source: semrush.source,
    updated_at: semrush.updated_at,
    realtime: true,
    note: "基于本轮 Semrush 实时采集结果生成。",
    metrics: { mentions: semrush.metrics.mentions ?? null, ai_visibility: semrush.metrics.ai_visibility ?? null }
  };
}

function parseCloudflare(text) {
  return compactMetrics({
    web_traffic_24h: capture(text, /Web 流量[\s\S]{0,120}?\n\s*([\d.,]+[KkMm]?)/),
    cache_rate: capture(text, /缓存率[\s\S]{0,100}?\n\s*([\d.]+%)/),
    security_insights: capture(text, /安全洞察[\s\S]{0,100}?\n\s*(\d+)/)
  });
}

function parseGsc(text) {
  return compactMetrics({ web_search_clicks: numberValue(capture(text, /共有\s*([\d,]+)\s*次网页搜索点击/)) });
}

export function parseClarityMetrics(text) {
  const normalized = String(text || "");
  const deadBlock = metricBlock(normalized, ["无效点击", "Dead clicks"]);
  const rageBlock = metricBlock(normalized, ["强烈点击", "过度点击", "Rage clicks"]);
  return compactMetrics({
    sessions: numberValue(capture(normalized, /(?:^|\n)\s*(?:会话|Sessions)\s*\n(?:[^\n]*\n){0,4}?\s*([\d,]+)\s*\n\s*[\d,]+\s*(?:排除机器人会话|excluding bot sessions)/im)),
    sessions_excluding_bots: numberValue(capture(normalized, /\n\s*([\d,]+)\s*(?:排除机器人会话|excluding bot sessions)/i)),
    unique_users: numberValue(capture(normalized, /(?:唯一用户数|唯一用户|Unique users?)[\s\S]{0,220}?\n\s*([\d,]+)(?:\s|$)/i)),
    pages_per_session: numberValue(capture(normalized, /(?:每个会话的页面数|Pages per session)\s*\n\s*([\d.]+)/i)),
    scroll_depth: capture(normalized, /(?:滚动深度|Scroll depth)\s*\n\s*([\d.]+%)/i),
    active_time: capture(normalized, /(?:所用的活动时间|Active time|Engagement time)[\s\S]{0,240}?\n\s*([\d.]+\s*(?:秒|s|分钟|min))/i),
    dead_clicks: capture(deadBlock, /([\d.]+%)/),
    dead_click_sessions: numberValue(capture(deadBlock, /([\d,]+)\s*(?:个会话|sessions?)/i)),
    rage_clicks: capture(rageBlock, /([\d.]+%)/),
    rage_click_sessions: numberValue(capture(rageBlock, /([\d,]+)\s*(?:个会话|sessions?)/i))
  });
}

export async function waitForClarityMetrics({ maxAttempts = 25, maxWaitMs = 30000, pollMs = 1000, readState, scroll, sleep, initialState = null, onStage = () => {} }) {
  const startedAt = Date.now();
  const deadline = startedAt + maxWaitMs;
  const metrics = {};
  let finalUrl = initialState?.url || null;
  let scrolled = false;
  let attempts = 0;

  onStage("clarity_waiting");
  for (let index = 0; index < maxAttempts; index += 1) {
    if (index > 0 && Date.now() >= deadline) break;
    const state = index === 0 && initialState ? initialState : await readState();
    attempts += 1;
    finalUrl = state?.url || finalUrl;
    Object.assign(metrics, parseClarityMetrics(state?.text || ""));
    if (hasClarityCoreMetric(metrics)) break;
    if (Date.now() >= deadline) break;
    if (index === maxAttempts - 1) break;
    onStage("clarity_scrolling");
    await scroll();
    scrolled = true;
    await sleep(pollMs);
  }

  const timedOut = Date.now() >= deadline || !hasClarityCoreMetric(metrics) && attempts >= maxAttempts;
  if (timedOut && !hasClarityCoreMetric(metrics)) onStage("clarity_timeout");
  const classification = classifyClarityExtraction(metrics, { pageOpened: true, timedOut });
  if (classification.status === "collected" || classification.status === "partial") onStage("clarity_extracted");
  return {
    status: classification.status,
    metrics,
    final_url: finalUrl,
    diagnostics: {
      wait_ms: Math.min(Date.now() - startedAt, maxWaitMs),
      attempts,
      found_labels: classification.found_labels,
      missing_metrics: classification.missing_metrics,
      scrolled,
      extraction_method: "visible text + aria-label + role-adjacent values"
    }
  };
}

export function classifyClarityExtraction(metrics, { pageOpened, timedOut }) {
  if (!pageOpened) return { status: "blocked", found_labels: [], missing_metrics: clarityMissingMetrics({}) };
  const foundLabels = Object.keys(metrics).filter((key) => metrics[key] !== null && metrics[key] !== undefined && metrics[key] !== "");
  const coreFound = ["sessions", "unique_users", "pages_per_session", "scroll_depth", "active_time"]
    .filter((key) => metrics[key] !== undefined && metrics[key] !== null && metrics[key] !== "");
  return {
    status: !foundLabels.length ? timedOut ? "extraction_failed" : "partial" : coreFound.length >= 2 ? "collected" : "partial",
    found_labels: foundLabels,
    missing_metrics: clarityMissingMetrics(metrics)
  };
}

function hasClarityCoreMetric(metrics) {
  return ["sessions", "unique_users", "pages_per_session", "scroll_depth", "active_time", "dead_clicks", "rage_clicks"]
    .some((key) => metrics[key] !== undefined);
}

function clarityMissingMetrics(metrics) {
  const missing = [];
  if (metrics.sessions === undefined) missing.push("sessions");
  if (metrics.unique_users === undefined) missing.push("unique_users");
  if (metrics.pages_per_session === undefined && metrics.scroll_depth === undefined) missing.push("pages_per_session_or_scroll_depth");
  if (metrics.active_time === undefined) missing.push("active_time");
  if (metrics.dead_clicks === undefined) missing.push("dead_clicks");
  if (metrics.rage_clicks === undefined) missing.push("rage_clicks");
  return missing;
}

function withUnavailableClarityMetrics(metrics) {
  return {
    sessions: metrics.sessions ?? "unavailable",
    unique_users: metrics.unique_users ?? "unavailable",
    pages_per_session: metrics.pages_per_session ?? "unavailable",
    scroll_depth: metrics.scroll_depth ?? "unavailable",
    active_time: metrics.active_time ?? "unavailable",
    dead_clicks: metrics.dead_clicks ?? "unavailable",
    dead_click_sessions: metrics.dead_click_sessions ?? "unavailable",
    rage_clicks: metrics.rage_clicks ?? "unavailable",
    rage_click_sessions: metrics.rage_click_sessions ?? "unavailable",
    sessions_excluding_bots: metrics.sessions_excluding_bots ?? "unavailable"
  };
}

function metricBlock(text, labels) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return text.match(new RegExp(`(?:${escaped})[\\s\\S]{0,260}`, "i"))?.[0] || "";
}

function parseSemrush(text) {
  return compactMetrics({
    mentions: numberValue(capture(text, /提及[\s\S]{0,80}?\n\s*\[?\d*\]?[^\n]*\n\s*(\d+)/)),
    site_health: capture(text, /Site Health[\s\S]{0,100}?\n\s*([\d.]+%)/),
    visibility: capture(text, /可见度[\s\S]{0,100}?\n\s*([\d.]+%)/),
    organic_traffic: numberValue(capture(text, /自然流量[\s\S]{0,100}?\n\s*\[?\d*\]?[^\n]*\n\s*(\d+)/)),
    ai_visibility: capture(text, /AI 可见度[\s\S]{0,160}?\n\s*([\d.]+%)/)
  });
}

export function buildTopTasks(sources) {
  const tasks = [];
  const rootCause = detectCommonRootCause(sources);
  const semrush = sources.find((source) => source.key === "semrush");
  const gsc = sources.find((source) => source.key === "gsc");
  const clarity = sources.find((source) => source.key === "clarity");
  if (rootCause?.code === "chrome_permission") {
    tasks.push({ priority: 1, title: "重新授权 Chrome 后再次采集", reason: "Chrome 权限未授权，浏览器数据源本轮未采集。", detail: "data" });
  }
  if (semrush?.metrics?.site_health) tasks.push({ priority: 1, title: "查看 Semrush Site Health", reason: `当前 Site Health ${semrush.metrics.site_health}，先确认异常项是否影响核心业务页。`, detail: "data" });
  if (gsc?.metrics?.web_search_clicks === 0) tasks.push({ priority: 2, title: "查看 GSC 查询与页面", reason: "本次页面采集显示网页搜索点击为 0，需要继续等待并核对曝光查询。", detail: "data" });
  if (clarity?.metrics?.core_business_page_sessions !== null && clarity?.metrics?.core_business_page_sessions !== undefined) tasks.push({ priority: 3, title: "查看核心业务页行为", reason: `Clarity 记录核心业务页 ${clarity.metrics.core_business_page_sessions} 个会话。`, detail: "data" });
  const unavailable = sources.filter((source) => sourceState(source) === SOURCE_STATES.UNAVAILABLE && !["clarity", "social"].includes(source.key));
  if (tasks.length < 3 && unavailable.length && !rootCause) tasks.push({ priority: tasks.length + 1, title: "处理采集阻塞", reason: unavailable.map((source) => source.label).join("、"), detail: "data" });
  const social = sources.find((source) => source.key === "social");
  if (tasks.length < 3 && social?.metrics?.unpublished) tasks.push({ priority: tasks.length + 1, title: "处理待发布内容", reason: `本地记录有 ${social.metrics.unpublished} 条内容尚未记录发布。`, detail: "publishing" });
  const conversion = sources.find((source) => source.key === "conversion");
  if (tasks.length < 3) tasks.push({ priority: tasks.length + 1, title: "查看网站转化记录", reason: `当前记录材料提交 ${conversion?.metrics?.material_submitted ?? "Unknown"} 条。`, detail: "data" });
  return tasks.slice(0, 3);
}

export function summarize(sources, browserContext = null) {
  const counts = countSourceStates(sources);
  const rootCause = detectCommonRootCause(sources);
  const clarityUnavailable = sources.some((source) => source.key === "clarity" && sourceState(source) !== SOURCE_STATES.LIVE);
  const socialUnavailable = sources.some((source) => source.key === "social" && sourceState(source) !== SOURCE_STATES.LIVE);
  const baseConclusion = rootCause?.code === "chrome_permission"
    ? `Chrome 权限未授权，${rootCause.affected_sources.map((key) => sourceLabel(key, sources)).join("、")} 本轮未实时采集。`
    : `本轮实时采集 ${counts.live} 个；缓存数据 ${counts.cached} 个；人工记录 ${counts.manual} 个；未采集 ${counts.uncollected} 个。`;
  const conclusion = `${baseConclusion}${!rootCause && clarityUnavailable ? " Clarity 数据暂未提取，不影响其他数据。" : ""}${!rootCause && socialUnavailable ? " 社交采集部分不可用，不影响其他来源。" : ""}`;
  return {
    counts,
    root_cause: rootCause,
    clarity_unavailable: clarityUnavailable,
    social_unavailable: socialUnavailable,
    browser: browserContext,
    total: sources.length,
    conclusion
  };
}

function localSource(key, label, file, state, metrics) {
  const exists = Boolean(file && fs.existsSync(file));
  const actualState = exists ? state : SOURCE_STATES.UNAVAILABLE;
  return {
    key,
    label,
    status: actualState,
    state: actualState,
    source: exists ? path.relative(root, file) : "Unknown",
    updated_at: exists ? fs.statSync(file).mtime.toISOString() : null,
    realtime: false,
    note: exists ? `${actualState === SOURCE_STATES.MANUAL ? "人工记录" : "缓存数据"}；本轮未访问实时页面。` : "本轮没有可用本地记录。",
    metrics: exists ? metrics : {}
  };
}

function blockedSource(key, label, message, source = "Unknown", adapter = null) {
  const permissionRequired = isBrowserPermissionError(message);
  return {
    key,
    label,
    status: permissionRequired ? SOURCE_STATES.PERMISSION_REQUIRED : SOURCE_STATES.UNAVAILABLE,
    state: permissionRequired ? SOURCE_STATES.PERMISSION_REQUIRED : SOURCE_STATES.UNAVAILABLE,
    source,
    updated_at: null,
    realtime: false,
    ...(adapter ? { adapter } : {}),
    note: permissionRequired ? "本轮未采集，原因是 Chrome 权限未通过。" : "本轮没有可用数据。",
    metrics: {},
    diagnostics: { technical_error: message }
  };
}

export function sourceState(source = {}) {
  if (Object.values(SOURCE_STATES).includes(source.state)) return source.state;
  if (source.status === "permission_required") return SOURCE_STATES.PERMISSION_REQUIRED;
  if (source.status === "collected") {
    if (source.realtime) return SOURCE_STATES.LIVE;
    const note = String(source.note || "").toLowerCase();
    if (note.includes("import")) return SOURCE_STATES.CACHED;
    if (note.includes("manual")) return SOURCE_STATES.MANUAL;
    return SOURCE_STATES.LIVE;
  }
  return SOURCE_STATES.UNAVAILABLE;
}

export function countSourceStates(sources = []) {
  const counts = {
    live: 0,
    cached: 0,
    manual: 0,
    unavailable: 0,
    permission_required: 0,
    uncollected: 0
  };
  for (const source of sources) {
    const state = sourceState(source);
    if (Object.hasOwn(counts, state)) counts[state] += 1;
    else counts.unavailable += 1;
  }
  counts.uncollected = counts.unavailable + counts.permission_required;
  return counts;
}

export function isBrowserPermissionError(message = "") {
  return /230404|operation not permitted|browser.?act.{0,80}permission|permission.{0,80}(?:chrome|browser)/i.test(String(message));
}

export function detectCommonRootCause(sources = []) {
  const affectedSources = sources
    .filter((source) => BROWSER_SOURCE_KEYS.has(source.key))
    .filter((source) => source.adapter !== BROWSER_ADAPTERS.SAFARI)
    .filter((source) => isBrowserPermissionError(source.diagnostics?.technical_error || source.diagnostics?.failure_reason || source.note))
    .map((source) => source.key);
  if (affectedSources.length < 2) return null;
  return {
    code: "chrome_permission",
    label: "Chrome 权限未授权",
    affected_sources: affectedSources
  };
}

function normalizeCommonRootCause(sources) {
  const rootCause = detectCommonRootCause(sources);
  if (!rootCause) return null;
  for (const source of sources) {
    if (!rootCause.affected_sources.includes(source.key)) continue;
    source.status = SOURCE_STATES.PERMISSION_REQUIRED;
    source.state = SOURCE_STATES.PERMISSION_REQUIRED;
    source.realtime = false;
    source.note = "本轮未采集，原因是 Chrome 权限未通过。";
    source.diagnostics = {
      ...(source.diagnostics || {}),
      public_reason: "Chrome 权限未授权",
      affected_by_common_root_cause: true
    };
  }
  return rootCause;
}

function sourceLabel(key, sources) {
  return sources.find((source) => source.key === key)?.label || key;
}

async function browserCommand(session, args, { timeoutMs = 90_000 } = {}) {
  return runBrowserAct(["--format", "json", "--session", session, ...args], { timeoutMs });
}

async function closeBrowserSession(session, { timeoutMs = 90_000 } = {}) {
  try { await runBrowserAct(["--format", "json", "session", "close", session], { timeoutMs }); } catch {}
}

async function clarityCommand(adapter, session, args, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new ClarityTimeoutError("Clarity work budget expired.");
  if (args[0] === "state") return adapter.state(session);
  if (args[0] === "click") return adapter.click(session, args[1]);
  if (args[0] === "scroll") return adapter.scroll(session, args[1], args[3]);
  throw new Error(`Unsupported clarity adapter command: ${args[0]}`);
}

class ClarityTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "ClarityTimeoutError";
  }
}

function isClarityTimeout(error) {
  return error instanceof ClarityTimeoutError || error?.name === "TimeoutError" || error?.code === "ETIMEDOUT";
}

async function runBrowserAct(args, { timeoutMs = 90_000 } = {}) {
  const executable = resolveBrowserActExecutable();
  const { stdout } = await execFileAsync(executable, args, { cwd: root, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 });
  const result = JSON.parse(stdout.trim());
  if (!result.ok) throw new Error(result.error || "browser-act command failed");
  return result;
}

export function resolveBrowserActExecutable({ env = process.env, home = os.homedir(), exists = fs.existsSync } = {}) {
  const candidates = [
    env.BROWSER_ACT_BIN,
    ...String(env.PATH || "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "browser-act")),
    path.join(home, ".local/bin/browser-act")
  ].filter(Boolean);
  return candidates.find((file) => exists(file)) || "browser-act";
}

function latestFileIn(relativeDir, extension) {
  const dir = path.join(root, relativeDir);
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).filter((name) => name.endsWith(extension)).sort().map((name) => path.join(dir, name)).at(-1) || null;
}

function readJson(file, fallback) {
  if (!file || !fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(",")[index] || ""])));
}

function capture(text, pattern) { return text.match(pattern)?.[1] ?? null; }
function numberValue(value) { return value === null ? null : Number(String(value).replaceAll(",", "")); }
function compactMetrics(metrics) { return Object.fromEntries(Object.entries(metrics).filter(([, value]) => value !== null && value !== undefined && value !== "")); }
function truthy(value) { return ["1", "true", "yes", "是"].includes(String(value || "").toLowerCase()); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runner = process.argv.includes("--clarity-only") ? runClarityCollector : runMorningCollector;
  runner().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
