import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDiscoveredCandidate, dedupeCandidates, discoverSocialOpportunities, normalizeUrl, outreachCandidateUrls, supportedPlatforms } from "./social-discovery-engine.mjs";
import { writeDiscoveryHealth } from "./discovery-health.mjs";
import { createSearchProvider } from "./providers/search-provider.mjs";
import { collectRedditRssSource } from "./sources/reddit-rss-source.mjs";
import { collectSearchSource } from "./sources/search-source.mjs";
import { refreshDashboardDiscovery } from "../runtime/dashboard-generator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const discoveryDir = path.join(root, "data/growth-os/social-discovery");
const keywordsFile = path.join(discoveryDir, "discovery-keywords.json");
const sourcesFile = path.join(discoveryDir, "sources.json");
const discoveredPostsFile = path.join(discoveryDir, "discovered-posts.json");
const errorsFile = path.join(discoveryDir, "discovery-errors.json");
const sourceStatusFile = path.join(discoveryDir, "source-status.json");
const collectionRunsFile = path.join(discoveryDir, "collection-runs.json");

export async function collectSocialOpportunities(options = {}) {
  const now = options.now || new Date();
  const keywordsConfig = readJson(keywordsFile, { platform_queries: {} });
  const sourcesConfig = readJson(sourcesFile, {});
  const platforms = normalizePlatforms(options.platforms?.length ? options.platforms : Object.keys(keywordsConfig.platform_queries || {}));
  const sourceTypes = normalizeSourceTypes(options.sources);
  const configuredDailyLimit = Number(sourcesConfig.reddit?.daily_limit) || 30;
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), configuredDailyLimit, 30);
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);
  const existing = readJsonArray(discoveredPostsFile);
  const existingErrors = readJsonArray(errorsFile);
  const sourceStatus = readJson(sourceStatusFile, { updated_at: null, sources: {} });
  const previousRuns = readJsonArray(collectionRunsFile);
  const seenUrls = new Set([...existing.map((item) => normalizeUrl(item.url)), ...outreachCandidateUrls(), ...readTodayUrls()]);
  const sourceResults = [];
  const provider = createSearchProvider();

  for (const platform of platforms) {
    if (platform === "reddit" && sourceTypes.has("rss") && sourcesConfig.reddit?.enabled) {
      for (const subreddit of sourcesConfig.reddit.subreddits || []) {
        const sourceName = `reddit_rss:${subreddit}`;
        if (sourceInCooldown(sourceStatus.sources?.[sourceName], now, force)) {
          sourceResults.push(skippedSourceResult("reddit", sourceName, "reddit_rss", now));
          continue;
        }
        sourceResults.push(await collectRedditRssSource({
          subreddit,
          now,
          perSourceLimit: Math.min(limit, Number(sourcesConfig.reddit.per_source_limit) || 10),
          cooldownHours: Number(sourcesConfig.reddit.cooldown_hours) || 12
        }));
      }
    }

    if (platform !== "reddit" && sourceTypes.has("search") && sourcesConfig.search?.enabled && sourcesConfig.search.platforms?.includes(platform)) {
      const sourceName = `search:${provider.name}:${platform}`;
      if (sourceInCooldown(sourceStatus.sources?.[sourceName], now, force)) {
        sourceResults.push(skippedSourceResult(platform, sourceName, "search", now));
        continue;
      }
      sourceResults.push(await collectSearchSource({
        platform,
        queries: keywordsConfig.platform_queries?.[platform] || [],
        provider,
        now,
        perSourceLimit: Math.min(limit, Number(sourcesConfig.search.per_source_limit) || 10),
        cooldownHours: Number(sourcesConfig.search.cooldown_hours) || 12
      }));
    }
  }

  const keywords = configuredKeywords(keywordsConfig);
  const additions = [];
  let duplicateItems = 0;
  let rejectedItems = 0;
  for (const item of dedupeSourceItems(sourceResults.flatMap((result) => result.items || []))) {
    const candidate = createDiscoveredCandidate({ ...item, keywords, source_method: item.source_method }, now);
    if (!candidate || candidate.expected_value === "Ignore") {
      rejectedItems += 1;
      continue;
    }
    if (seenUrls.has(candidate.url)) {
      duplicateItems += 1;
      continue;
    }
    seenUrls.add(candidate.url);
    additions.push(candidate);
    if (additions.length >= limit) break;
  }

  const errors = sourceResults.flatMap((result) => result.errors || []);
  const nextStatus = updateSourceStatus(sourceStatus, sourceResults, now);
  const run = buildRun({ now, sourceResults, additions, duplicateItems, rejectedItems, errors });
  const merged = dedupeCandidates([...existing, ...additions], now);
  let discovery = null;
  let health = null;

  if (!dryRun) {
    fs.mkdirSync(discoveryDir, { recursive: true });
    fs.writeFileSync(discoveredPostsFile, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    fs.writeFileSync(sourceStatusFile, `${JSON.stringify(nextStatus, null, 2)}\n`, "utf8");
    fs.writeFileSync(errorsFile, `${JSON.stringify([...existingErrors, ...errors].slice(-100), null, 2)}\n`, "utf8");
    fs.writeFileSync(collectionRunsFile, `${JSON.stringify([...previousRuns, run].slice(-90), null, 2)}\n`, "utf8");
    health = writeDiscoveryHealth({ now, sourceStatus: nextStatus, runs: [...previousRuns, run].slice(-90) });
    discovery = discoverSocialOpportunities(now);
    refreshDashboardDiscovery(discovery, now);
  }

  return {
    dry_run: dryRun,
    platforms,
    source_results: sourceResults,
    added: additions,
    errors,
    run,
    health,
    discovery
  };
}

export function updateSourceStatus(current, results, now) {
  const sources = { ...(current.sources || {}) };
  for (const result of results) {
    if (result.collection_status === "skipped") continue;
    const previous = sources[result.source_name] || {};
    const failed = ["blocked", "failed"].includes(result.collection_status);
    const successful = ["success", "no_verified_results"].includes(result.collection_status);
    const cooldownHours = Number(result.rate_limit?.cooldown_hours) || 12;
    sources[result.source_name] = {
      platform: result.platform,
      source_name: result.source_name,
      source_method: result.source_method,
      status: result.collection_status,
      last_attempt_at: result.collected_at,
      last_success_at: successful ? result.collected_at : previous.last_success_at || null,
      cooldown_until: failed ? new Date(now.getTime() + cooldownHours * 3600000).toISOString() : null,
      consecutive_failures: failed ? (Number(previous.consecutive_failures) || 0) + 1 : 0,
      last_error: result.errors?.[0]?.message || null,
      last_raw_items: (result.items || []).length
    };
  }
  return { updated_at: now.toISOString(), sources };
}

function buildRun({ now, sourceResults, additions, duplicateItems, rejectedItems, errors }) {
  const attempted = sourceResults.filter((result) => result.collection_status !== "skipped");
  const succeeded = attempted.filter((result) => ["success", "no_verified_results"].includes(result.collection_status));
  const failed = attempted.filter((result) => ["blocked", "failed"].includes(result.collection_status));
  return {
    run_id: `DISC-RUN-${crypto.randomUUID()}`,
    started_at: now.toISOString(),
    completed_at: now.toISOString(),
    status: attempted.length ? (failed.length ? "completed_with_errors" : "completed") : "skipped",
    sources_attempted: attempted.length,
    sources_succeeded: succeeded.length,
    sources_failed: failed.length,
    raw_items: sourceResults.reduce((total, result) => total + (result.items || []).length, 0),
    verified_items: additions.length + duplicateItems,
    new_items: additions.length,
    duplicate_items: duplicateItems,
    rejected_items: rejectedItems,
    error_count: errors.length
  };
}

export function sourceInCooldown(record, now, force) {
  if (force || !record?.cooldown_until) return false;
  const cooldown = Date.parse(record.cooldown_until);
  return Number.isFinite(cooldown) && cooldown > now.getTime();
}

function skippedSourceResult(platform, sourceName, sourceMethod, now) {
  return {
    platform,
    source_name: sourceName,
    source_method: sourceMethod,
    collection_status: "skipped",
    collected_at: now.toISOString(),
    items: [],
    errors: [],
    rate_limit: { cooldown_hours: 12 }
  };
}

function dedupeSourceItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const url = normalizeUrl(item.canonical_url || item.url);
    if (!url || !matchesPlatform(url, item.platform) || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function matchesPlatform(url, platform) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    if (platform === "reddit") return /(^|\.)reddit\.com$/.test(host) && /\/comments\//.test(pathname);
    if (platform === "quora") return /(^|\.)quora\.com$/.test(host) && pathname.length > 2 && !/\/(profile|topic|about)\//.test(pathname);
    if (platform === "linkedin") return /(^|\.)linkedin\.com$/.test(host) && /\/(posts|feed\/update)\//.test(pathname);
    return /(^|\.)(x\.com|twitter\.com)$/.test(host) && /\/status\//.test(pathname);
  } catch {
    return false;
  }
}

function configuredKeywords(config) {
  return Object.entries(config)
    .filter(([key]) => key !== "platform_queries" && key !== "reddit_rss_subreddits" && key !== "negative_keywords")
    .flatMap(([, value]) => Array.isArray(value) ? value : []);
}

function normalizePlatforms(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => String(item).toLowerCase()).filter((item) => supportedPlatforms.has(item));
}

function normalizeSourceTypes(value) {
  const items = Array.isArray(value) ? (value.length ? value : ["rss", "search"]) : value ? [value] : ["rss", "search"];
  return new Set(items.map((item) => String(item).toLowerCase()).filter((item) => ["rss", "search"].includes(item)));
}

function readTodayUrls() {
  return readJson(path.join(discoveryDir, "today-opportunities.json"), { items: [] }).items.map((item) => normalizeUrl(item.url || item.thread_url));
}

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; }
}

function readJsonArray(file) {
  const value = readJson(file, []);
  return Array.isArray(value) ? value : [];
}

function parseArgs(argv) {
  const options = { platforms: [], sources: [] };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--platform") options.platforms.push(argv[++index]);
    else if (argv[index] === "--source") options.sources.push(argv[++index]);
    else if (argv[index] === "--limit") options.limit = argv[++index];
    else if (argv[index] === "--force") options.force = true;
    else if (argv[index] === "--dry-run") options.dryRun = true;
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await collectSocialOpportunities(parseArgs(process.argv));
  console.log(`Social collection: ${result.added.length} new candidate(s), ${result.errors.length} error(s)`);
  console.log(`Sources: attempted=${result.run.sources_attempted}, succeeded=${result.run.sources_succeeded}, failed=${result.run.sources_failed}`);
}
