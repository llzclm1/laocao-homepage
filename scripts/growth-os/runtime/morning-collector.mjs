import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runtimeDir = path.join(root, "data/growth-os/runtime");
const latestFile = path.join(runtimeDir, "morning-collector-latest.json");
const CLARITY_TOTAL_TIMEOUT_MS = 15_000;
const CLARITY_CLOSE_TIMEOUT_MS = 2_000;
const CLARITY_WORK_TIMEOUT_MS = CLARITY_TOTAL_TIMEOUT_MS - CLARITY_CLOSE_TIMEOUT_MS;
const CLARITY_URL = "https://clarity.microsoft.com/projects";

export async function runMorningCollector(now = new Date()) {
  const startedAt = now.toISOString();
  const session = `growth_morning_${Date.now()}`;
  const sources = [];
  let browserId = null;

  try {
    browserId = await findChromeDirectBrowser();
    if (!browserId) throw new Error("No running chrome-direct browser is available. Open Chrome first.");

    await browserCommand(session, ["browser", "open", browserId, "https://dash.cloudflare.com/"]);
    sources.push(await collectBrowserSource(session, "cloudflare", "Cloudflare", "https://dash.cloudflare.com/", parseCloudflare));
    sources.push(await collectBrowserSource(session, "gsc", "Google Search Console", "https://search.google.com/search-console?resource_id=https://gewuji.dev/", parseGsc));
    sources.push(await collectClarityIsolated(browserId));
    sources.push(await collectBrowserSource(session, "semrush", "Semrush", "https://www.semrush.com/projects/", parseSemrush));
  } catch (error) {
    for (const [key, label] of [["cloudflare", "Cloudflare"], ["gsc", "Google Search Console"], ["clarity", "Microsoft Clarity"], ["semrush", "Semrush"]]) {
      if (!sources.some((source) => source.key === key)) sources.push(blockedSource(key, label, error.message));
    }
  } finally {
    if (browserId) await closeBrowserSession(session);
  }

  sources.push(collectGeo());
  sources.push(collectSocial());
  sources.push(collectConversion());
  sources.push(collectBrandMonitoring(sources));

  const result = {
    task_id: "GROWTH-004",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    mode: "manual_click_playwright_browser",
    realtime: false,
    source_order: ["cloudflare", "gsc", "clarity", "semrush", "geo", "social", "conversion", "brand_monitoring"],
    sources,
    top_tasks: buildTopTasks(sources),
    summary: summarize(sources)
  };

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(latestFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(runtimeDir, `morning-collector-${startedAt.slice(0, 10)}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

export async function runClarityCollector(now = new Date()) {
  const browserId = await findChromeDirectBrowser().catch(() => null);
  const source = browserId
    ? await collectClarityIsolated(browserId)
    : blockedSource("clarity", "Microsoft Clarity", "No running chrome-direct browser is available. Open Chrome first.", CLARITY_URL);

  const result = {
    task_id: "GROWTH-004-CLARITY",
    started_at: now.toISOString(),
    completed_at: new Date().toISOString(),
    realtime: false,
    source
  };
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, "clarity-collector-latest.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
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

async function collectBrowserSource(session, key, label, url, parser) {
  try {
    await browserCommand(session, ["navigate", url]);
    await browserCommand(session, ["wait", "stable"]);
    const state = await browserCommand(session, ["state"]);
    const metrics = parser(state.text || "");
    return {
      key,
      label,
      status: Object.keys(metrics).length ? "collected" : "blocked",
      source: state.url || url,
      updated_at: new Date().toISOString(),
      realtime: false,
      note: Object.keys(metrics).length ? "Read-only browser collection at button click time." : "Page loaded, but expected metric labels were not found.",
      metrics
    };
  } catch (error) {
    return blockedSource(key, label, error.message, url);
  }
}

async function collectClarityIsolated(browserId) {
  const session = `growth_clarity_${Date.now()}`;
  const startedAt = Date.now();
  const stageLog = [];
  const markStage = (stage) => stageLog.push({ stage, at: new Date().toISOString(), elapsed_ms: Date.now() - startedAt });
  let pageOpened = false;
  let source;
  try {
    await browserCommand(session, ["browser", "open", browserId, CLARITY_URL], { timeoutMs: CLARITY_WORK_TIMEOUT_MS });
    pageOpened = true;
    markStage("clarity_opened");
    source = await collectClarity(session, {
      deadline: startedAt + CLARITY_WORK_TIMEOUT_MS,
      onStage: markStage
    });
  } catch (error) {
    const timedOut = isClarityTimeout(error) || Date.now() >= startedAt + CLARITY_WORK_TIMEOUT_MS;
    if (timedOut) markStage("clarity_timeout");
    source = {
      key: "clarity",
      label: "Microsoft Clarity",
      status: pageOpened ? "extraction_failed" : "blocked",
      source: CLARITY_URL,
      updated_at: new Date().toISOString(),
      realtime: false,
      note: "Clarity 数据暂未提取，不影响其他数据。",
      metrics: withUnavailableClarityMetrics({}),
      diagnostics: {
        final_url: CLARITY_URL,
        wait_ms: Date.now() - startedAt,
        failure_reason: error.message,
        found_labels: [],
        missing_metrics: clarityMissingMetrics({}),
        scrolled: false,
        extraction_method: "visible text + aria-label + role-adjacent values",
        stage_log: stageLog
      }
    };
  } finally {
    markStage("clarity_closed");
    await closeBrowserSession(session, { timeoutMs: CLARITY_CLOSE_TIMEOUT_MS });
  }
  if (source) {
    source.diagnostics = { ...(source.diagnostics || {}), stage_log: stageLog };
    if (source.status !== "collected") source.note = "Clarity 数据暂未提取，不影响其他数据。";
  }
  return source;
}

async function collectClarity(session, { deadline, onStage = () => {} } = {}) {
  const key = "clarity";
  const label = "Microsoft Clarity";
  let lastUrl = CLARITY_URL;
  try {
    const boundedCommand = (args) => clarityCommand(session, args, deadline);
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
      status: extraction.status,
      source: extraction.final_url || state.url || "https://clarity.microsoft.com/projects",
      updated_at: new Date().toISOString(),
      realtime: false,
      note: extraction.status === "collected" ? "Read-only browser collection at button click time." : "Clarity 数据暂未提取，不影响其他数据。",
      metrics: withUnavailableClarityMetrics(extraction.metrics),
      diagnostics: { ...extraction.diagnostics, final_url: extraction.final_url || state.url || CLARITY_URL }
    };
  } catch (error) {
    if (isClarityTimeout(error)) throw error;
    const blocked = /not found|consent\/login|登录/.test(error.message || "");
    return {
      key,
      label,
      status: blocked ? "blocked" : "extraction_failed",
      source: lastUrl,
      updated_at: new Date().toISOString(),
      realtime: false,
      note: "Clarity 数据暂未提取，不影响其他数据。",
      metrics: withUnavailableClarityMetrics({}),
      diagnostics: { final_url: lastUrl, wait_ms: 0, failure_reason: error.message, stage_log: [] }
    };
  }
}

function collectGeo() {
  const file = latestFileIn("data/growth-os/geo/analysis", ".json");
  const data = readJson(file, []);
  const rows = Array.isArray(data) ? data : data?.items || [];
  return localSource("geo", "GEO", file, {
    queries: rows.length,
    mentions: rows.filter((row) => row.mentioned).length,
    citations: rows.filter((row) => row.citation).length
  });
}

function collectSocial() {
  const file = path.join(root, "data/social-agent/view.json");
  const data = readJson(file, {});
  return localSource("social", "Social platforms", file, {
    opportunities: data.opportunities?.length ?? null,
    drafts: data.drafts?.length ?? null,
    unpublished: data.drafts?.filter((item) => !item.published).length ?? null
  });
}

function collectConversion() {
  const file = path.join(root, "data/product/supplier-reply-review-business-results.csv");
  const rows = readCsv(file);
  return localSource("conversion", "Website conversion", file, {
    recorded_rows: rows.length,
    material_submitted: rows.filter((row) => truthy(row.material_submitted)).length
  });
}

function collectBrandMonitoring(sources) {
  const semrush = sources.find((source) => source.key === "semrush");
  if (semrush?.status !== "collected") return blockedSource("brand_monitoring", "Brand monitoring", "Semrush AI visibility data was unavailable.");
  return {
    key: "brand_monitoring",
    label: "Brand monitoring",
    status: "collected",
    source: semrush.source,
    updated_at: semrush.updated_at,
    realtime: false,
    note: "Reused Semrush AI visibility and mention values from this collection run.",
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
  const semrush = sources.find((source) => source.key === "semrush");
  const gsc = sources.find((source) => source.key === "gsc");
  const clarity = sources.find((source) => source.key === "clarity");
  if (semrush?.metrics?.site_health) tasks.push({ priority: 1, title: "查看 Semrush Site Health", reason: `当前 Site Health ${semrush.metrics.site_health}，先确认异常项是否影响核心业务页。`, detail: "data" });
  if (gsc?.metrics?.web_search_clicks === 0) tasks.push({ priority: 2, title: "查看 GSC 查询与页面", reason: "本次页面采集显示网页搜索点击为 0，需要继续等待并核对曝光查询。", detail: "data" });
  if (clarity?.metrics?.core_business_page_sessions !== null && clarity?.metrics?.core_business_page_sessions !== undefined) tasks.push({ priority: 3, title: "查看核心业务页行为", reason: `Clarity 记录核心业务页 ${clarity.metrics.core_business_page_sessions} 个会话。`, detail: "data" });
  const blocked = sources.filter((source) => source.status === "blocked" && source.key !== "clarity");
  if (tasks.length < 3 && blocked.length) tasks.push({ priority: tasks.length + 1, title: "处理采集阻塞", reason: blocked.map((source) => source.label).join("、"), detail: "data" });
  const social = sources.find((source) => source.key === "social");
  if (tasks.length < 3 && social?.metrics?.unpublished) tasks.push({ priority: tasks.length + 1, title: "处理待发布内容", reason: `本地记录有 ${social.metrics.unpublished} 条内容尚未记录发布。`, detail: "publishing" });
  const conversion = sources.find((source) => source.key === "conversion");
  if (tasks.length < 3) tasks.push({ priority: tasks.length + 1, title: "查看网站转化记录", reason: `当前记录材料提交 ${conversion?.metrics?.material_submitted ?? "Unknown"} 条。`, detail: "data" });
  return tasks.slice(0, 3);
}

export function summarize(sources) {
  const collected = sources.filter((source) => source.status === "collected").length;
  const blocked = sources.filter((source) => source.status === "blocked" && source.key !== "clarity").length;
  const clarityUnavailable = sources.some((source) => source.key === "clarity" && source.status !== "collected");
  const conclusion = blocked
    ? `${collected}/${sources.length} 个来源完成，${blocked} 个非 Clarity 来源需要人工处理。${clarityUnavailable ? "Clarity 数据暂未提取，不影响其他数据。" : ""}`
    : `${collected}/${sources.length} 个来源完成。${clarityUnavailable ? "Clarity 数据暂未提取，不影响其他数据。" : ""}`;
  return { collected, blocked, clarity_unavailable: clarityUnavailable, total: sources.length, conclusion };
}

function localSource(key, label, file, metrics) {
  const exists = Boolean(file && fs.existsSync(file));
  return {
    key,
    label,
    status: exists ? "collected" : "blocked",
    source: exists ? path.relative(root, file) : "Unknown",
    updated_at: exists ? fs.statSync(file).mtime.toISOString() : null,
    realtime: false,
    note: exists ? "Existing local manual/import record; not collected from a live page in this run." : "No existing local record was found.",
    metrics: exists ? metrics : {}
  };
}

function blockedSource(key, label, message, source = "Unknown") {
  return { key, label, status: "blocked", source, updated_at: null, realtime: false, note: message, metrics: {} };
}

async function browserCommand(session, args, { timeoutMs = 90_000 } = {}) {
  return runBrowserAct(["--format", "json", "--session", session, ...args], { timeoutMs });
}

async function closeBrowserSession(session, { timeoutMs = 90_000 } = {}) {
  try { await runBrowserAct(["--format", "json", "session", "close", session], { timeoutMs }); } catch {}
}

async function clarityCommand(session, args, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new ClarityTimeoutError("Clarity work budget expired.");
  return browserCommand(session, args, { timeoutMs: remaining });
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
