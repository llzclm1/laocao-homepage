import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDiscoveredCandidate, dedupeCandidates, discoverSocialOpportunities, normalizeUrl, outreachCandidateUrls, supportedPlatforms } from "./social-discovery-engine.mjs";
import { refreshDashboardDiscovery } from "../runtime/dashboard-generator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const discoveryDir = path.join(root, "data/growth-os/social-discovery");
const keywordsFile = path.join(discoveryDir, "discovery-keywords.json");
const discoveredPostsFile = path.join(discoveryDir, "discovered-posts.json");
const errorsFile = path.join(discoveryDir, "discovery-errors.json");
const stateFile = path.join(discoveryDir, "collection-state.json");

export async function collectSocialOpportunities(options = {}) {
  const now = options.now || new Date();
  const config = readJson(keywordsFile, { buyer_intent: [], factory_intent: [], platform_queries: {} });
  const platforms = normalizePlatforms(options.platforms?.length ? options.platforms : Object.keys(config.platform_queries || {}));
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 10);
  const dryRun = Boolean(options.dryRun);
  const state = readJson(stateFile, { platforms: {} });
  const existing = readJsonArray(discoveredPostsFile);
  const existingErrors = readJsonArray(errorsFile);
  const seenUrls = new Set([...existing.map((item) => normalizeUrl(item.url)), ...outreachCandidateUrls(), ...readTodayUrls()]);
  const errors = [];
  const additions = [];
  const keywords = [...(config.buyer_intent || []), ...(config.factory_intent || [])];

  for (const platform of platforms) {
    if (collectedToday(state.platforms?.[platform], now)) continue;
    const results = [];
    const platformErrors = [];
    if (platform === "reddit") {
      for (const subreddit of config.reddit_rss_subreddits || []) {
        try {
          results.push(...await searchRedditRss(subreddit));
        } catch (error) {
          const entry = {
            platform,
            timestamp: now.toISOString(),
            source: `reddit_rss:${subreddit}`,
            error_type: "public_rss_failed",
            message: String(error.message || error).slice(0, 240),
            retry_recommendation: "Retry during the next daily collection window; do not bypass access controls."
          };
          errors.push(entry);
          platformErrors.push(entry);
        }
      }
    } else {
      for (const query of config.platform_queries?.[platform] || []) {
        try {
          results.push(...await searchPublicRss(query));
        } catch (error) {
          const entry = {
            platform,
            timestamp: now.toISOString(),
            source: "public_search_rss",
            error_type: "public_search_failed",
            message: String(error.message || error).slice(0, 240),
            retry_recommendation: "Retry during the next daily collection window; do not bypass access controls."
          };
          errors.push(entry);
          platformErrors.push(entry);
          if (/\b(401|403)\b/.test(String(error.message || error))) break;
        }
      }
    }
    const candidates = dedupeSearchResults(results, platform)
      .map((item) => createDiscoveredCandidate({ ...item, platform, keywords, source_method: platform === "reddit" ? "reddit_rss" : "search" }, now))
      .filter(Boolean)
      .filter((item) => item.expected_value !== "Ignore")
      .filter((item) => !seenUrls.has(item.url))
      .slice(0, limit);
    candidates.forEach((item) => seenUrls.add(item.url));
    additions.push(...candidates);
    state.platforms = {
      ...(state.platforms || {}),
      [platform]: collectionStateFor(platform, candidates, platformErrors, now)
    };
  }

  const merged = dedupeCandidates([...existing, ...additions]);
  if (!dryRun) {
    fs.mkdirSync(discoveryDir, { recursive: true });
    fs.writeFileSync(discoveredPostsFile, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.writeFileSync(errorsFile, `${JSON.stringify([...existingErrors, ...errors].slice(-100), null, 2)}\n`, "utf8");
  }

  const discovery = dryRun ? null : discoverSocialOpportunities(now);
  if (discovery) refreshDashboardDiscovery(discovery, now);
  return { dry_run: dryRun, platforms, added: additions, errors, discovery };
}

function normalizePlatforms(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => String(item).toLowerCase()).filter((item) => supportedPlatforms.has(item));
}

async function searchPublicRss(query) {
  const url = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "GrowthOS-PublicDiscovery/2.0 (+local candidate ranking; no login)" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Search returned ${response.status}`);
  return parseRss(await response.text());
}

async function searchRedditRss(subreddit) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new/.rss?limit=25`;
  const response = await fetch(url, {
    headers: { "User-Agent": "GrowthOS-PublicDiscovery/2.0 (+local candidate ranking; no login)" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Reddit RSS returned ${response.status}`);
  return parseAtom(await response.text());
}

function dedupeSearchResults(results, platform) {
  const seen = new Set();
  return results.filter((item) => {
    const url = normalizeUrl(item.url);
    if (!url || seen.has(url) || !matchesPlatform(url, platform)) return false;
    seen.add(url);
    return true;
  });
}

function matchesPlatform(url, platform) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  if (platform === "reddit") return /(^|\.)reddit\.com$/.test(host) && /\/comments\//.test(pathname);
  if (platform === "quora") return /(^|\.)quora\.com$/.test(host) && pathname.length > 2 && !/\/(profile|topic|about)\//.test(pathname);
  if (platform === "linkedin") return /(^|\.)linkedin\.com$/.test(host) && /\/(posts|feed\/update)\//.test(pathname);
  return /(^|\.)(x\.com|twitter\.com)$/.test(host) && /\/status\//.test(pathname);
}

function parseRss(xml) {
  return [...String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    return {
      title: decodeXml(readTag(item, "title")),
      url: decodeXml(readTag(item, "link")),
      snippet: stripHtml(decodeXml(readTag(item, "description"))),
      published_at: decodeXml(readTag(item, "pubDate")) || null,
      author: null
    };
  }).filter((item) => item.title && item.url);
}

function parseAtom(xml) {
  return [...String(xml || "").matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => {
    const entry = match[1];
    const link = entry.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    const author = decodeXml(readTag(entry, "name"));
    return {
      title: decodeXml(readTag(entry, "title")),
      url: decodeXml(link),
      snippet: stripHtml(decodeXml(readTag(entry, "content") || readTag(entry, "summary"))),
      published_at: decodeXml(readTag(entry, "updated") || readTag(entry, "published")) || null,
      author: author || null
    };
  }).filter((item) => item.title && item.url);
}

function readTag(text, name) {
  return text.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() || "";
}

function decodeXml(value) {
  return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'"
  }[entity]));
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function collectedToday(value, now) {
  const previous = Date.parse(typeof value === "string" ? value : value?.last_attempt_at || "");
  if (!Number.isFinite(previous)) return false;
  const elapsed = now.getTime() - previous;
  return elapsed < 60 * 60 * 1000 || new Date(previous).toDateString() === now.toDateString();
}

function collectionStateFor(platform, candidates, errors, now) {
  if (candidates.length) {
    return {
      last_attempt_at: now.toISOString(),
      status: "success",
      added: candidates.length,
      message: `${candidates.length} verified public candidate(s) added`
    };
  }
  const blocked = errors.find((item) => /\b(401|403)\b/.test(item.message || ""));
  if (blocked) {
    return {
      last_attempt_at: now.toISOString(),
      status: "blocked",
      added: 0,
      message: blocked.message
    };
  }
  if (errors.length) {
    return {
      last_attempt_at: now.toISOString(),
      status: "failed",
      added: 0,
      message: errors[0].message
    };
  }
  return {
    last_attempt_at: now.toISOString(),
    status: "no_verified_results",
    added: 0,
    message: `${platform} returned no verified public candidates`
  };
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
  const options = { platforms: [] };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--platform") options.platforms.push(argv[++index]);
    else if (argv[index] === "--limit") options.limit = argv[++index];
    else if (argv[index] === "--dry-run") options.dryRun = true;
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await collectSocialOpportunities(parseArgs(process.argv));
  console.log(`Social collection: ${result.added.length} new candidate(s), ${result.errors.length} error(s)`);
  for (const item of result.added) console.log(`- ${item.platform} ${item.intent_score}: ${item.title}`);
}
