import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runtimeDir = path.join(root, "data/growth-os/runtime");
const latestFile = path.join(runtimeDir, "social-collector-latest.json");
export const SOCIAL_PLATFORM_TIMEOUT_MS = 15_000;
export const SOCIAL_CLOSE_TIMEOUT_MS = 2_000;
const SOCIAL_WORK_TIMEOUT_MS = SOCIAL_PLATFORM_TIMEOUT_MS - SOCIAL_CLOSE_TIMEOUT_MS;
export const SOCIAL_TOTAL_TIMEOUT_MS = 35_000;

const PLATFORM_CONFIG = {
  linkedin: {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/gewuji/recent-activity/all/",
    parser: parseLinkedInState,
    itemsKey: "latest_posts"
  },
  quora: {
    label: "Quora",
    url: "https://www.quora.com/profile/%E9%9B%B7%E9%B8%A3-%E6%9B%B9",
    parser: parseQuoraState,
    itemsKey: "latest_answers"
  }
};

export async function runSocialCollector(now = new Date(), { browserId = null, browserResolver = findChromeDirectBrowser } = {}) {
  const startedAt = Date.now();
  const collectedAt = now.toISOString();
  const resolvedBrowserId = browserId || await browserResolver().catch(() => null);
  const platforms = resolvedBrowserId
    ? await collectPlatformsSequentially(resolvedBrowserId)
    : Object.keys(PLATFORM_CONFIG).map((key) => blockedPlatform(key, PLATFORM_CONFIG[key], "No running chrome-direct browser is available. Open the Growth OS Chrome first."));
  const report = {
    collected_at: collectedAt,
    browser_id: resolvedBrowserId || "Unknown",
    duration_ms: 0,
    platforms: Object.fromEntries(platforms.map((platform) => [platform.key, stripInternalFields(platform)]),),
    summary: summarizeSocialPlatforms(Object.fromEntries(platforms.map((platform) => [platform.key, platform])))
  };
  report.duration_ms = Date.now() - startedAt;
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(latestFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function collectPlatformsSequentially(browserId) {
  const platforms = [];
  for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
    platforms.push(await collectPlatform(key, config, browserId));
  }
  return platforms;
}

export function readLatestSocialCollector() {
  if (!fs.existsSync(latestFile)) return null;
  try { return JSON.parse(fs.readFileSync(latestFile, "utf8")); } catch { return null; }
}

export function parseLinkedInState(text, sourceUrl = "") {
  const normalized = String(text || "");
  const notifications = numberValue(capture(normalized, /(\d[\d,]*)\s*(?:条新通知|new notifications?)/i));
  const followerCount = numberValue(capture(normalized, /(\d[\d,]*)\s*(?:followers?|关注者)/i));
  const profileViews = numberValue(capture(normalized, /(\d[\d,]*)\s*(?:profile views?|个人资料浏览量)/i));
  const markers = normalized.split(/动态编号\s*\d+/).slice(1);
  const segments = markers.length ? markers : [normalized];
  const latestPosts = segments.map((segment) => {
    const publishedAt = matchLinkedInTime(segment);
    if (!publishedAt) return null;
    return {
      published_at: publishedAt,
      title: firstContentLine(segment),
      views: numberValue(capture(segment, /(\d[\d,]*)\s*次展示/i)),
      reactions: numberValue(capture(segment, /(\d[\d,]*)\s*(?:次回应|reactions?|likes?)/i)),
      comments: numberValue(capture(segment, /(\d[\d,]*)\s*(?:条评论|comments?)/i)),
      reposts: numberValue(capture(segment, /(\d[\d,]*)\s*(?:次转发|reposts?)/i))
    };
  }).filter(Boolean).slice(0, 10);
  const metrics = compactMetrics({
    posts: latestPosts.length || numberValue(capture(normalized, /动态编号\s*(\d+)/)),
    notifications,
    follower_count: followerCount,
    profile_views: profileViews,
    views: sumMetric(latestPosts, "views"),
    reactions: sumMetric(latestPosts, "reactions"),
    comments: sumMetric(latestPosts, "comments"),
    reposts: sumMetric(latestPosts, "reposts")
  });
  const interactionTotal = Number.isFinite(metrics.notifications)
    ? metrics.notifications
    : [metrics.reactions, metrics.comments, metrics.reposts].filter((value) => Number.isFinite(value)).reduce((sum, value) => sum + value, 0);
  return {
    status: latestPosts.length ? "collected" : "partial",
    latest_posts: latestPosts,
    new_interactions: interactionTotal,
    metrics,
    source_url: sourceUrl
  };
}

export function parseQuoraState(text, sourceUrl = "") {
  const normalized = String(text || "");
  const answers = numberValue(capture(normalized, /(\d[\d,]*)\s*Answers\b/i));
  const followers = numberValue(capture(normalized, /(\d[\d,]*)\s*followers?\b/i));
  const notifications = numberValue(capture(normalized, /(\d[\d,]*)\s*unread notifications?/i));
  const answerTimes = [...normalized.matchAll(/(?:^|\n)\s*(\d+)\s*\n\s*(h|d|w|m)\s*(?:\n|$)/gi)].map((match) => `${match[1]}${match[2].toLowerCase()}`);
  const questions = [...normalized.matchAll(/(?:^|\n)\s*((?:How|What|Why|Which|Can|Does|Are|Is)\b[^\n?]{8,180}\?)\s*(?:\n|$)/g)].map((match) => match[1].trim());
  const latestAnswers = answerTimes.map((publishedAt, index) => ({
    published_at: publishedAt,
    question: questions[index] || "Unknown",
    views: null,
    upvotes: numberValue(capture(normalized, /(\d[\d,]*)\s*upvotes?/i)),
    comments: numberValue(capture(normalized, /(\d[\d,]*)\s*comments?/i))
  })).slice(0, 10);
  const metrics = compactMetrics({
    answers,
    followers,
    notifications,
    views: numberValue(capture(normalized, /(\d[\d,]*)\s*views?/i)),
    upvotes: sumMetric(latestAnswers, "upvotes"),
    comments: sumMetric(latestAnswers, "comments"),
    restricted_content: /folded|collapsed|deleted|removed|restricted|被折叠|删除|限制/i.test(normalized) ? true : undefined
  });
  const interactionTotal = [metrics.notifications, metrics.upvotes, metrics.comments]
    .filter((value) => Number.isFinite(value)).reduce((sum, value) => sum + value, 0);
  return {
    status: latestAnswers.length || Number.isFinite(answers) ? "collected" : "partial",
    latest_answers: latestAnswers,
    new_interactions: interactionTotal,
    metrics,
    source_url: sourceUrl
  };
}

export function classifySocialPlatform({ pageOpened, items = [], metrics = {} }) {
  if (!pageOpened) return { status: "blocked" };
  return { status: items.length ? "collected" : "partial" };
}

export function summarizeSocialPlatforms(platforms) {
  const values = Object.values(platforms || {});
  const statuses = values.map((platform) => platform.status);
  const status = statuses.every((value) => value === "blocked") ? "blocked" : statuses.every((value) => value === "collected") ? "collected" : "partial";
  const newInteractions = values.reduce((sum, platform) => sum + (Number(platform.new_interactions) || 0), 0);
  const candidates = Object.entries(platforms || {}).flatMap(([platformKey, platform]) => {
    const items = [...(platform.latest_posts || []), ...(platform.latest_answers || [])];
    return items.map((item) => ({ platform: platformLabel(platformKey), title: item.title || item.question || "Unknown", views: Number(item.views) || 0, published_at: item.published_at || "Unknown" }));
  }).sort((a, b) => b.views - a.views);
  return {
    status,
    new_interactions: newInteractions,
    has_new_interactions: newInteractions > 0,
    best_content: candidates[0] || null,
    failed_platforms: Object.entries(platforms || {}).filter(([, platform]) => ["blocked", "extraction_failed"].includes(platform.status)).map(([key]) => key)
  };
}

async function collectPlatform(key, config, browserId) {
  const session = `growth_social_${key}_${Date.now()}`;
  const startedAt = Date.now();
  const deadline = startedAt + SOCIAL_WORK_TIMEOUT_MS;
  let pageOpened = false;
  let finalUrl = config.url;
  let scrolled = false;
  let result;
  try {
    await browserCommand(session, ["browser", "open", browserId, config.url], { timeoutMs: SOCIAL_WORK_TIMEOUT_MS });
    pageOpened = true;
    let state = await boundedCommand(session, ["state"], deadline);
    finalUrl = state.url || finalUrl;
    result = config.parser(state.text || "", finalUrl);
    const items = result[config.itemsKey] || [];
    if (!items.length && Date.now() < deadline - 700) {
      await boundedCommand(session, ["scroll", "down", "--amount", "700"], deadline);
      scrolled = true;
      state = await boundedCommand(session, ["state"], deadline);
      finalUrl = state.url || finalUrl;
      result = mergeParsedResults(result, config.parser(state.text || "", finalUrl));
    }
    result = { ...result, ...classifySocialPlatform({ pageOpened, items: result[config.itemsKey], metrics: result.metrics }) };
  } catch (error) {
    result = {
      status: pageOpened ? "extraction_failed" : "blocked",
      latest_posts: [],
      latest_answers: [],
      new_interactions: 0,
      metrics: {},
      source_url: finalUrl,
      diagnostics: { failure_reason: error.message }
    };
  } finally {
    await closeBrowserSession(session, { timeoutMs: SOCIAL_CLOSE_TIMEOUT_MS });
  }
  return {
    key,
    ...result,
    source_url: result.source_url || finalUrl,
    duration_ms: Date.now() - startedAt,
    diagnostics: {
      ...(result.diagnostics || {}),
      final_url: result.source_url || finalUrl,
      scrolled,
      extraction_method: "visible text + aria-label + role-adjacent values",
      no_snapshot_saved: true
    }
  };
}

function blockedPlatform(key, config, reason) {
  return {
    key,
    status: "blocked",
    latest_posts: [],
    latest_answers: [],
    new_interactions: 0,
    metrics: {},
    source_url: config.url,
    duration_ms: 0,
    diagnostics: { failure_reason: reason, final_url: config.url, scrolled: false, no_snapshot_saved: true }
  };
}

function stripInternalFields(platform) {
  const { key, ...result } = platform;
  return result;
}

async function boundedCommand(session, args, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Social platform work budget expired.");
  return browserCommand(session, args, { timeoutMs: remaining });
}

async function browserCommand(session, args, { timeoutMs = 90_000 } = {}) {
  return runBrowserAct(["--format", "json", "--session", session, ...args], { timeoutMs });
}

async function closeBrowserSession(session, { timeoutMs = 90_000 } = {}) {
  try { await runBrowserAct(["--format", "json", "session", "close", session], { timeoutMs }); } catch {}
}

async function findChromeDirectBrowser() {
  const result = await runBrowserAct(["--format", "json", "browser", "list"], { timeoutMs: 5_000 });
  return result.browsers?.find((browser) => browser.type === "chrome-direct" && browser.state === "running")?.id
    || result.browsers?.find((browser) => browser.type === "chrome-direct")?.id
    || null;
}

async function runBrowserAct(args, { timeoutMs = 90_000 } = {}) {
  const executable = resolveBrowserActExecutable();
  const { stdout } = await execFileAsync(executable, args, { cwd: root, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 });
  const result = JSON.parse(stdout.trim());
  if (!result.ok) throw new Error(result.error || "browser-act command failed");
  return result;
}

function resolveBrowserActExecutable({ env = process.env, home = os.homedir(), exists = fs.existsSync } = {}) {
  const candidates = [
    env.BROWSER_ACT_BIN,
    ...String(env.PATH || "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "browser-act")),
    path.join(home, ".local/bin/browser-act")
  ].filter(Boolean);
  return candidates.find((file) => exists(file)) || "browser-act";
}

function mergeParsedResults(previous, next) {
  const itemsKey = next.latest_posts ? "latest_posts" : "latest_answers";
  return {
    ...previous,
    ...next,
    [itemsKey]: [...(previous[itemsKey] || []), ...(next[itemsKey] || [])].filter((item, index, items) => index === items.findIndex((candidate) => candidate.question === item.question && candidate.published_at === item.published_at)).slice(0, 10),
    metrics: { ...(previous.metrics || {}), ...(next.metrics || {}) },
    new_interactions: Math.max(previous.new_interactions || 0, next.new_interactions || 0)
  };
}

function matchLinkedInTime(text) {
  return capture(text, /(?:^|\n)\s*(\d+\s*(?:秒前|分钟前|小时前|天前|周前|m|h|d|w))\s*•?/i) || null;
}

function firstContentLine(text) {
  const commentary = String(text || "").match(/update-components-update-v2__commentary\s*\/?>\s*\n\s*([^\n]+)/i)?.[1];
  if (commentary) return commentary.trim();
  return String(text || "").split(/\n/).map((line) => line.trim()).find((line) => line && !/^\[\d+\]<|^\|SCROLL\||^<html|^<body|^老曹$|^您$|^动态编号|次展示|条评论|显示译文|展开/.test(line)) || "Unknown";
}

function capture(text, pattern) { return String(text || "").match(pattern)?.[1] ?? null; }
function numberValue(value) { return value === null ? null : Number(String(value).replaceAll(",", "")); }
function compactMetrics(metrics) { return Object.fromEntries(Object.entries(metrics).filter(([, value]) => value !== null && value !== undefined && value !== "")); }
function sumMetric(items, key) { const values = items.map((item) => item[key]).filter((value) => Number.isFinite(value)); return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined; }
function platformLabel(key) { return key === "linkedin" ? "LinkedIn" : key === "quora" ? "Quora" : key; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSocialCollector().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
