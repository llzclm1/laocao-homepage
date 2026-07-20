import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const policyFile = path.join(root, "data/growth-os/social-discovery/platform-policy.json");
const targetAccountsFile = path.join(root, "data/growth-os/social-discovery/target-accounts.json");
export const X_CHARACTER_LIMIT = 280;

export function xCharacterCount(value) {
  return Array.from(String(value || "")).length;
}

export function fitXText(value, limit = X_CHARACTER_LIMIT) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (xCharacterCount(text) <= limit) return text;
  const clipped = Array.from(text).slice(0, Math.max(0, limit - 3)).join("");
  const wordBoundary = clipped.lastIndexOf(" ");
  return `${wordBoundary > limit * 0.7 ? clipped.slice(0, wordBoundary) : clipped}...`;
}

export function readPlatformPolicy() {
  return readJson(policyFile, { retained_platforms: [], retired_platforms: [], platforms: [] });
}

export function readTargetAccounts() {
  const value = readJson(targetAccountsFile, []);
  return Array.isArray(value) ? value : [];
}

export function buildPlatformOperations(workspace = {}, discoverySummary = {}, options = {}) {
  const policy = readPlatformPolicy();
  const targetAccounts = readTargetAccounts();
  const inbox = workspace.inbox || [];
  const today = workspace.today || [];
  const results = workspace.results || [];
  const todayKey = (options.now || new Date()).toISOString().slice(0, 10);
  const redditDailyCapUsed = [...today, ...results].some((item) => normalizeKey(item.platform) === "reddit" && String(item.selected_for_today_at || "").slice(0, 10) === todayKey);
  const discoveryTasks = policy.platforms
    .filter((platform) => platform.object_types.includes("discovery_task"))
    .filter((platform) => countPlatform(inbox, platform.key) === 0)
    .filter((platform) => platform.key !== "reddit" || !redditDailyCapUsed)
    .map((platform) => ({
      id: `DISCOVERY-${platform.key.toUpperCase()}`,
      object_type: "discovery_task",
      platform: platform.name,
      platform_key: platform.key,
      title: `${platform.name} Discovery Task`,
      instruction: platform.discovery_instruction,
      verified_input_count: 0,
      expected_output: platform.expected_output,
      generated_output_status: "waiting_for_verified_url",
      status: "manual_review_required",
      priority: discoveryPriority(platform.key),
      url: null
    }));

  const coverage = policy.platforms.map((platform) => ({
    platform: platform.name,
    platform_key: platform.key,
    role: platform.role,
    object_types: platform.object_types,
    post_types: platform.post_types,
    reply_types: platform.reply_types,
    frequency: platform.frequency,
    risk: platform.risk,
    post_character_limit: platform.post_character_limit || null,
    reply_character_limit: platform.reply_character_limit || null,
    opportunity_count: countPlatform(inbox, platform.key),
    active_reply_count: countPlatform(today, platform.key),
    results_count: countPlatform(results, platform.key),
    publish_task_count: 0,
    discovery_task_count: discoveryTasks.filter((item) => item.platform_key === platform.key).length,
    target_account_count: targetAccounts.filter((item) => normalizeKey(item.platform) === platform.key).length,
    search_provider_status: platform.key === "quora" ? discoverySummary.search_provider_status || "not_configured" : null,
    daily_reply_cap: platform.daily_reply_cap || null,
    daily_reply_used: platform.key === "reddit" && redditDailyCapUsed ? 1 : 0,
    next_action: platform.next_action
  }));

  const replyTasks = today.map((item) => ({
    id: item.id,
    object_type: "reply_opportunity",
    platform: platformName(item.platform),
    platform_key: normalizeKey(item.platform),
    title: item.topic,
    status: item.workflow_state,
    priority: discoveryPriority(normalizeKey(item.platform)),
    url: item.url
  }));
  const taskFor = (key) => replyTasks.find((item) => item.platform_key === key)
    || (key === "reddit" && redditDailyCapUsed ? null : replyRecommendation(inbox, key));
  const selectedReplies = replyTasks.slice().sort((left, right) => left.priority - right.priority);
  const preferred = [taskFor("linkedin"), taskFor("quora")]
    .filter(Boolean)
    .filter((item) => !selectedReplies.some((selected) => selected.id === item.id));
  const todayPlan = [...selectedReplies, ...preferred].slice(0, 3);

  return { policy, target_accounts: targetAccounts, platform_coverage: coverage, discovery_tasks: discoveryTasks, today_plan: todayPlan };
}

function replyRecommendation(inbox, key) {
  const item = inbox.find((candidate) => normalizeKey(candidate.platform) === key);
  if (!item) return null;
  return {
    id: item.id,
    object_type: "reply_opportunity",
    platform: platformName(item.platform),
    platform_key: key,
    title: item.topic,
    status: "needs_selection",
    priority: discoveryPriority(key),
    url: item.url,
    verified_input_count: 1,
    expected_output: "Review the generated reply draft against the original context",
    generated_output_status: item.suggested_comment ? "draft_available" : "manual_draft_required",
    why_relevant: item.why_relevant || null,
    suggested_comment: item.suggested_comment || null
  };
}

export function platformDailyReplyCap(platform) {
  const key = normalizeKey(platform);
  return readPlatformPolicy().platforms.find((item) => item.key === key)?.daily_reply_cap || null;
}

function countPlatform(items, key) {
  return items.filter((item) => normalizeKey(item.platform) === key).length;
}

function discoveryPriority(key) {
  return { linkedin: 1, quora: 2, reddit: 3, x: 4, facebook_groups: 5, indie_hackers: 6 }[key] || 20;
}

function normalizeKey(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[\s/-]+/g, "_");
  if (text === "twitter") return "x";
  if (text === "facebook" || text === "facebook_group") return "facebook_groups";
  if (text === "indiehackers") return "indie_hackers";
  return text;
}

function platformName(value) {
  const key = normalizeKey(value);
  return readPlatformPolicy().platforms.find((item) => item.key === key)?.name || String(value || "");
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
