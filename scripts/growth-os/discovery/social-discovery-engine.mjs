import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPlatformOperations, fitXText, platformDailyReplyCap, xCharacterCount, X_CHARACTER_LIMIT } from "./platform-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const discoveryDir = path.join(root, "data/growth-os/social-discovery");
const outreachLogFile = path.join(root, "data/marketing/social-outreach-log.csv");
const discoveredPostsFile = path.join(discoveryDir, "discovered-posts.json");
const manualInboxFile = path.join(discoveryDir, "manual-inbox.json");
const collectionStateFile = path.join(discoveryDir, "collection-state.json");
const sourceStatusFile = path.join(discoveryDir, "source-status.json");
const healthFile = path.join(discoveryDir, "discovery-health.json");
const actionsFile = path.join(discoveryDir, "candidate-actions.jsonl");
const outputFile = path.join(discoveryDir, "today-opportunities.json");
export const supportedPlatforms = new Set(["reddit", "quora", "linkedin", "x", "facebook_groups", "indie_hackers"]);
const X_EXCLUDED_TOPIC_RE = /\b(?:ai|artificial\s+intelligence|codex|vibe\s+coding|machine\s+learning|llm|gpt|ai\s+agent(?:s)?|automation|workflow)\b/i;
const X_PROJECT_SIGNAL_RE = /(?:china\s+sourcing|chinese\s+supplier|supplier|sourcing|procurement|factory|manufacturer|alibaba|quotation|quote|sample(?:\s+order)?|moq|payment|deposit|refund|bank\s+account|lead\s+time|delivery|packaging|trading\s+company|overseas\s+buyer|export|import|supplier\s+communication|buyer\s+(?:inquiry|question)|supplier\s+reply|factory\s+bridge|gewuji)/i;
const sourceMethods = new Set(["search", "public_api", "reddit_rss", "outreach_log", "manual", "search_import"]);
const inboxStates = new Set(["inbox", "later"]);
const todayStates = new Set(["today", "viewed", "draft_prepared"]);
const resultStates = new Set(["outcome_pending", "received_reply", "removed", "no_response", "buyer_signal", "partner_signal", "review_request", "paid_opportunity", "closed"]);

export function discoverSocialOpportunities(now = new Date(), options = {}) {
  const actions = readJsonl(actionsFile);
  const candidates = inspectSocialDiscoveryCandidates(now, actions);

  const eligibleCandidates = candidates
    .filter(isDashboardCandidate)
    .sort(compareCandidates);
  const workspace = buildWorkspace(eligibleCandidates);
  const collectionSnapshot = readCollectionSnapshot();
  const discoverySummary = buildDiscoverySummary(eligibleCandidates, workspace, collectionSnapshot.platforms, now, collectionSnapshot.last_verified_rss_result, collectionSnapshot.health);
  const platformOperations = buildPlatformOperations(workspace, discoverySummary, { now });
  const result = {
    generated_at: now.toISOString(),
    sources: ["reddit_rss", "search", "outreach_log", "manual", "search_import"],
    supported_platforms: [...supportedPlatforms],
    // Kept for existing Markdown/report consumers. The operating workspace uses inbox/today/results.
    items: workspace.inbox.slice(0, 5),
    workspace,
    discovery_summary: discoverySummary,
    platform_coverage: platformOperations.platform_coverage,
    discovery_tasks: platformOperations.discovery_tasks,
    today_plan: platformOperations.today_plan
  };

  if (!options.dryRun) {
    fs.mkdirSync(discoveryDir, { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  return result;
}

export function inspectSocialDiscoveryCandidates(now = new Date(), actions = readJsonl(actionsFile)) {
  return readDiscoveryCandidates(now).map((item) => applyActions(item, actions));
}

export function outreachCandidateUrls() {
  if (!fs.existsSync(outreachLogFile)) return [];
  return parseCsv(fs.readFileSync(outreachLogFile, "utf8"))
    .filter(isOutreachCandidate)
    .map((row) => normalizeUrl(row.url))
    .filter(Boolean);
}

export function recordDiscoveryAction(value, now = new Date()) {
  const id = String(value.id || "").trim();
  const action = String(value.action || "").trim();
  if (!/^DISC-[a-f0-9]{12}$/i.test(id)) throw new Error("Invalid discovery candidate id");
  const history = readJsonl(actionsFile);
  const candidate = readDiscoveryCandidates(now).find((item) => item.id === id);
  if (!candidate) throw new Error("Discovery candidate was not found");
  const replyUrl = action === "replied" ? normalizeUrl(value.reply_url) : "";
  if (action === "replied" && replyUrl) {
    const issue = replyUrlIssue(candidate, replyUrl);
    if (issue) throw new Error(issue);
    const duplicate = duplicateReplyAction(history, id, replyUrl);
    if (duplicate) return { ...duplicate, duplicate: true };
  }
  if (action === "draft_prepared" && candidate.platform === "x" && xCharacterCount(candidate.suggested_comment) > X_CHARACTER_LIMIT) {
    throw new Error(`X reply draft must not exceed ${X_CHARACTER_LIMIT} characters`);
  }
  const fromState = candidateWorkflowState(history.filter((item) => item.id === id));
  const duplicate = duplicateWorkflowAction(history, id, action, fromState);
  if (duplicate) return { ...duplicate, duplicate: true };
  const toState = transitionForDiscoveryAction(fromState, action);
  if (!toState) throw new Error(`Action ${action} is not available from ${fromState}`);
  if (action === "select_today" && selectedTodayCount(history) >= 3) throw new Error("Today can contain at most three opportunities");
  const platformCap = platformDailyReplyCap(candidate.platform);
  if (action === "select_today" && platformCap && selectedPlatformTodayCount(history, candidate.platform, now) >= platformCap) {
    throw new Error(`${candidate.platform} can contain at most ${platformCap} reply task per day`);
  }
  const entry = {
    id,
    action,
    from_state: fromState,
    to_state: toState,
    reply_url: replyUrl || undefined,
    reply_url_verification: action === "replied" ? (replyUrl ? "manual" : "not_recorded") : undefined,
    note: cleanText(value.note || ""),
    date: now.toISOString(),
    user: "local"
  };
  fs.mkdirSync(discoveryDir, { recursive: true });
  fs.appendFileSync(actionsFile, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export function duplicateReplyAction(history, id, replyUrl) {
  const normalized = normalizeUrl(replyUrl);
  return history.find((item) => item.id === id && item.action === "replied" && normalizeUrl(item.reply_url) === normalized) || null;
}

export function duplicateWorkflowAction(history, id, action, currentState) {
  const candidateHistory = history
    .filter((item) => item.id === id && item.action)
    .sort((left, right) => Date.parse(left.date || "") - Date.parse(right.date || ""));
  const last = candidateHistory[candidateHistory.length - 1];
  return last?.action === action && last?.to_state === currentState ? last : null;
}

export function replyUrlIssue(candidate, replyUrl) {
  const normalized = normalizeUrl(replyUrl);
  if (!/^https:\/\//i.test(normalized)) return "A public HTTPS reply URL is required before marking Replied";
  const parsed = new URL(normalized);
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "example.com" || host.endsWith(".example.com") || host === "127.0.0.1" || host === "::1") {
    return "Reply URL must be a public platform URL, not a local or example URL";
  }
  if (normalized === normalizeUrl(candidate.url)) return "Reply URL cannot be the original candidate URL";
  if (!matchesPlatformUrl(candidate.platform, normalized)) return "Reply URL must belong to the same platform as the candidate";
  return "";
}

export function readDiscoveryOutcomeStats() {
  return discoveryOutcomeStatsForActions(readJsonl(actionsFile));
}

export function discoveryOutcomeStatsForActions(actions) {
  const idsFor = (names) => new Set(actions.filter((item) => names.has(item.action)).map((item) => item.id));
  const replied = idsFor(new Set(["received_reply", "buyer_signal"]));
  const partners = idsFor(new Set(["partner_signal"]));
  const qualified = new Set([...replied, ...partners]);
  return {
    qualified_interactions: qualified.size,
    buyer_replies: replied.size,
    partner_leads: partners.size,
    review_requests: idsFor(new Set(["review_request"])).size,
    paid_opportunities: idsFor(new Set(["paid_opportunity"])).size
  };
}

export function addManualSocialOpportunity(value, now = new Date()) {
  const candidate = createDiscoveredCandidate({
    platform: value.platform || platformForUrl(value.url),
    url: value.url,
    title: value.topic || value.title,
    snippet: value.note || value.snippet || "",
    author: value.author || null,
    discovered_at: now.toISOString(),
    source_method: "manual"
  }, now);
  if (!candidate) throw new Error("A public platform URL and topic are required");

  const result = appendCandidates([candidate], now);
  if (result.added.length) {
    const inbox = readJsonArray(manualInboxFile);
    inbox.push({
      url: candidate.url,
      platform: candidate.platform,
      topic: candidate.topic,
      author: candidate.author,
      note: candidate.snippet,
      received_at: now.toISOString(),
      candidate_id: candidate.id
    });
    fs.mkdirSync(discoveryDir, { recursive: true });
    fs.writeFileSync(manualInboxFile, `${JSON.stringify(inbox, null, 2)}\n`, "utf8");
  }
  return { candidate, added: result.added.length === 1, duplicate: result.duplicates.length === 1 };
}

export function importSocialOpportunities(records, options = {}) {
  const now = options.now || new Date();
  const platformOverride = normalizePlatform(options.platform);
  const candidates = [];
  const rejected = [];
  for (const record of records || []) {
    const candidate = createDiscoveredCandidate({
      platform: platformOverride || record.platform || platformForUrl(record.url),
      url: record.url,
      title: record.title || record.topic,
      snippet: record.snippet || record.note || "",
      author: record.author || null,
      discovered_at: record.discovered_at || now.toISOString(),
      first_seen_at: record.first_seen_at || record.discovered_at || now.toISOString(),
      source_method: "search_import"
    }, now);
    if (candidate) candidates.push(candidate);
    else rejected.push({ url: String(record.url || ""), reason: "A public platform URL and title are required" });
  }
  const result = appendCandidates(candidates, now, { dryRun: Boolean(options.dryRun) });
  return { ...result, rejected };
}

export function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|ref|trk|tracking|source|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return "";
  }
}

export function createDiscoveredCandidate(input, now = new Date()) {
  const platform = normalizePlatform(input.platform);
  const url = normalizeUrl(input.url);
  const title = cleanText(input.title);
  const snippet = cleanText(input.snippet);
  if (!supportedPlatforms.has(platform) || !url || !title || !matchesPlatformUrl(platform, url)) return null;
  if (platform === "x" && !isXProjectRelevant({ title, snippet })) return null;

  const text = `${title} ${snippet}`.toLowerCase();
  const matchedKeywords = (input.keywords || []).filter((keyword) => text.includes(String(keyword).toLowerCase()));
  const score = scoreCandidate({ platform, title, snippet, matched_keywords: matchedKeywords });
  const redditTrust = platform === "reddit" ? redditTrustProfile({ url, title, snippet }) : null;
  const risk = riskForPlatform(platform, input.published_at);
  const opportunityRisk = opportunityRiskForCandidate(input.published_at, snippet);
  const enoughContext = snippet.length >= 40 && !/\b(deleted|removed|locked)\b/i.test(text);
  const firstSeenAt = normalizeDate(input.first_seen_at || input.discovered_at) || now.toISOString();
  const candidate = withFreshness({
    id: candidateId(platform, url),
    platform,
    url,
    title,
    author: input.author || null,
    topic: title,
    snippet,
    published_at: normalizeDate(input.published_at),
    discovered_at: firstSeenAt,
    first_seen_at: firstSeenAt,
    last_seen_at: normalizeDate(input.last_seen_at) || now.toISOString(),
    source_method: sourceMethods.has(input.source_method) ? input.source_method : "search",
    matched_keywords: matchedKeywords,
    intent_score: redditTrust?.intent_score || score.label,
    intent_rank: redditTrust?.intent_rank || score.rank,
    expected_value: redditTrust?.expected_value || score.expected_value,
    opportunity_quality: redditTrust?.opportunity_quality || score.label,
    risk_status: risk.status,
    risk_note: risk.note,
    opportunity_risk_status: opportunityRisk.status,
    opportunity_risk_note: opportunityRisk.note,
    dedupe_key: dedupeKey(platform, url, title),
    reason: redditTrust?.reason || score.reason,
    why_relevant: redditTrust?.why_relevant || whyRelevantForCandidate({ title, snippet, expectedValue: score.expected_value }),
    suggested_angle: redditTrust?.suggested_angle || suggestedAngleForCandidate({ title, snippet }),
    suggested_comment: enoughContext && (!redditTrust || redditTrust.eligible) ? suggestedComment({ title, snippet, platform }) : "",
    reddit_trust: redditTrust,
    needs_manual_review: true
  }, now);
  return candidate;
}

export function dedupeCandidates(items, now = new Date()) {
  const unique = new Map();
  for (const source of items) {
    const item = normalizeCandidate(source, now);
    if (!item) continue;
    const keys = [item.url, postIdentity(item.platform, item.url), item.dedupe_key].filter(Boolean);
    const matches = [...new Set(keys.map((key) => unique.get(key)).filter(Boolean))];
    const selected = matches.reduce((current, existing) => mergeDuplicateCandidates(current, existing, now), item);
    const mergedKeys = new Set([...keys, ...matches.flatMap(keysFor), ...keysFor(selected)]);
    for (const [key, value] of unique) {
      if (matches.includes(value)) unique.delete(key);
    }
    for (const key of mergedKeys) unique.set(key, selected);
  }
  return [...new Set(unique.values())];
}

function appendCandidates(candidates, now, options = {}) {
  const existing = dedupeCandidates(readJsonArray(discoveredPostsFile), now);
  const existingKeys = new Set(existing.flatMap(keysFor));
  const outreachUrls = new Set(outreachCandidateUrls());
  const added = [];
  const duplicates = [];
  const updates = [];
  for (const candidate of dedupeCandidates(candidates, now)) {
    if (keysFor(candidate).some((key) => existingKeys.has(key))) {
      duplicates.push(candidate);
      updates.push(candidate);
      continue;
    }
    if (outreachUrls.has(candidate.url)) {
      duplicates.push(candidate);
      continue;
    }
    keysFor(candidate).forEach((key) => existingKeys.add(key));
    added.push(candidate);
  }
  const merged = dedupeCandidates([...existing, ...added, ...updates], now);
  if (!options.dryRun) {
    fs.mkdirSync(discoveryDir, { recursive: true });
    fs.writeFileSync(discoveredPostsFile, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  }
  return { added, duplicates, total: merged.length };
}

function buildDiscoverySummary(candidates, workspace, collectionStatus, now, lastVerifiedRssResult, health) {
  const active = candidates.filter(isDashboardCandidate);
  const currentDate = dateKey(now);
  const automatedSources = new Set(["reddit_rss", "search", "public_api"]);
  const failures = collectionStatus.filter((item) => ["blocked", "failed"].includes(item.status));
  const attempts = collectionStatus.map((item) => item.last_collection_at).filter(Boolean).sort();
  const successes = collectionStatus.filter((item) => item.status === "success").map((item) => item.last_collection_at).filter(Boolean).sort();
  const newlyDiscoveredToday = active.filter((item) => automatedSources.has(item.source_method) && dateKey(item.first_seen_at) === currentDate);
  const manualAddedToday = active.filter((item) => item.source_method === "manual" && dateKey(item.first_seen_at) === currentDate);
  const importedToday = active.filter((item) => item.source_method === "search_import" && dateKey(item.first_seen_at) === currentDate);
  const existingLog = active.filter((item) => item.source_method === "outreach_log");
  const persistentAutomaticCandidates = active.filter((item) => automatedSources.has(item.source_method));
  return {
    newly_discovered_today: newlyDiscoveredToday.length,
    manual_added_today: manualAddedToday.length,
    imported_today: importedToday.length,
    existing_log_opportunities: existingLog.length,
    fresh_opportunities: active.filter((item) => item.freshness_status === "Fresh").length,
    aging_opportunities: active.filter((item) => item.freshness_status === "Aging").length,
    inbox_opportunities: workspace.inbox.length,
    today_selected: workspace.today.length,
    results_pending: workspace.results.filter((item) => item.workflow_state === "outcome_pending").length,
    platform_failures: failures.length,
    persistent_automatic_candidates: persistentAutomaticCandidates.length,
    current_mode: persistentAutomaticCandidates.length ? "public_discovery" : "existing_log_manual_inbox_import",
    search_provider_status: process.env.SOCIAL_DISCOVERY_SEARCH_PROVIDER ? "configured" : "not_configured",
    rss_adapter_works_in_dry_run: Boolean(lastVerifiedRssResult?.url_count),
    last_verified_rss_result: lastVerifiedRssResult || null,
    last_collection_time: attempts.at(-1) || null,
    last_successful_discovery: successes.at(-1) || null,
    health: health || null,
    collection_status: collectionStatus,
    collection_message: newlyDiscoveredToday.length
      ? `${newlyDiscoveredToday.length} 条新公开候选已进入人工审核。`
      : manualAddedToday.length || importedToday.length
      ? `今天没有新的自动公开发现；${manualAddedToday.length + importedToday.length} 条人工收集或导入候选已进入人工审核。`
      : "今天没有发现新的已验证自动公开机会；系统当前处于旧日志筛选与人工导入模式。"
  };
}

function readCollectionSnapshot() {
  const legacyState = readJson(collectionStateFile, { platforms: {} });
  const sourceState = readJson(sourceStatusFile, { sources: {} });
  const health = readJson(healthFile, null);
  const platforms = [...supportedPlatforms].map((platform) => {
    const current = Object.values(sourceState.sources || {})
      .filter((item) => item.platform === platform)
      .sort((left, right) => Date.parse(right.last_attempt_at || "") - Date.parse(left.last_attempt_at || ""))[0];
    const value = current || legacyState.platforms?.[platform];
    if (!value) return { platform, status: "not_run", added: 0, last_collection_at: null, message: "No verified results recorded" };
    if (typeof value === "string") return { platform, status: "unknown", added: 0, last_collection_at: normalizeDate(value), message: "Collection outcome was not recorded" };
    return {
      platform,
      status: value.status || "unknown",
      added: Number(value.added) || 0,
      last_collection_at: normalizeDate(value.last_attempt_at || value.last_collection_at),
      message: cleanText(value.message || value.last_error || ""),
      source_name: value.source_name || ""
    };
  });
  const latestRss = Object.values(sourceState.sources || {})
    .filter((item) => item.source_method === "reddit_rss" && Number(item.last_raw_items) > 0)
    .sort((left, right) => Date.parse(right.last_attempt_at || "") - Date.parse(left.last_attempt_at || ""))[0];
  const lastVerifiedRssResult = latestRss ? {
    platform: "reddit",
    url_count: Number(latestRss.last_raw_items),
    mode: "scheduled",
    persisted_candidates: Number(latestRss.added) || 0,
    note: "Public Reddit RSS returned items during the last scheduled collection."
  } : legacyState.last_verified_rss_result || null;
  return { platforms, last_verified_rss_result: lastVerifiedRssResult, health };
}

function mergeDuplicateCandidates(left, right, now) {
  const preferred = preferCandidate(left, right);
  const firstSeenAt = [left.first_seen_at, right.first_seen_at].filter(Boolean).sort()[0] || preferred.first_seen_at;
  const lastSeenAt = [left.last_seen_at, right.last_seen_at].filter(Boolean).sort().at(-1) || preferred.last_seen_at;
  return withFreshness({
    ...preferred,
    discovered_at: firstSeenAt,
    first_seen_at: firstSeenAt,
    last_seen_at: lastSeenAt
  }, now);
}

function withFreshness(candidate, now) {
  const firstSeenAt = normalizeDate(candidate.first_seen_at || candidate.discovered_at) || now.toISOString();
  const ageDays = Math.max(0, Math.floor((now.getTime() - Date.parse(firstSeenAt)) / 86400000));
  const freshnessStatus = ageDays <= 3 ? "Fresh" : ageDays <= 7 ? "Recent" : ageDays <= 14 ? "Aging" : "Archive";
  return {
    ...candidate,
    discovered_at: firstSeenAt,
    first_seen_at: firstSeenAt,
    last_seen_at: normalizeDate(candidate.last_seen_at) || firstSeenAt,
    age_days: ageDays,
    freshness_status: freshnessStatus
  };
}

function platformForUrl(value) {
  try {
    const host = new URL(String(value || "")).hostname.toLowerCase();
    if (/(^|\.)reddit\.com$/.test(host)) return "reddit";
    if (/(^|\.)quora\.com$/.test(host)) return "quora";
    if (/(^|\.)linkedin\.com$/.test(host)) return "linkedin";
    if (/(^|\.)(x\.com|twitter\.com)$/.test(host)) return "x";
    if (/(^|\.)(facebook\.com|fb\.com)$/.test(host)) return "facebook_groups";
    if (/(^|\.)indiehackers\.com$/.test(host)) return "indie_hackers";
  } catch {
    return "";
  }
  return "";
}

function dateKey(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

function readOutreachCandidates(now) {
  if (!fs.existsSync(outreachLogFile)) return [];
  return parseCsv(fs.readFileSync(outreachLogFile, "utf8"))
    .filter((row) => isOutreachCandidate(row))
    .map((row) => {
      const platform = normalizePlatform(row.platform);
      const url = normalizeUrl(row.url);
      const score = scoreCandidate({ platform, title: row.topic, snippet: row.notes, matched_keywords: [] });
      const risk = riskForPlatform(platform, null);
      const opportunityRisk = opportunityRiskForCandidate(null, row.notes);
      return {
        id: candidateId(platform, url),
        platform,
        url,
        title: row.topic,
        author: null,
        topic: row.topic,
        snippet: row.notes || "",
        published_at: null,
        discovered_at: `${row.date || now.toISOString().slice(0, 10)}T00:00:00.000Z`,
        first_seen_at: `${row.date || now.toISOString().slice(0, 10)}T00:00:00.000Z`,
        last_seen_at: `${row.date || now.toISOString().slice(0, 10)}T00:00:00.000Z`,
        source_method: "outreach_log",
        matched_keywords: [],
        intent_score: score.label,
        intent_rank: score.rank,
        expected_value: expectedValueForProfile(row.target_profile, score.expected_value),
        opportunity_quality: score.label,
        risk_status: risk.status,
        risk_note: risk.note,
        opportunity_risk_status: opportunityRisk.status,
        opportunity_risk_note: opportunityRisk.note,
        dedupe_key: dedupeKey(platform, url, row.topic),
        reason: row.notes || score.reason,
        why_relevant: whyRelevantForCandidate({ title: row.topic, snippet: row.notes, expectedValue: expectedValueForProfile(row.target_profile, score.expected_value) }),
        suggested_angle: suggestedAngleForCandidate({ title: row.topic, snippet: row.notes }),
        suggested_comment: suggestedComment({ title: row.topic, snippet: row.notes, platform }),
        needs_manual_review: true
      };
    });
}

function isOutreachCandidate(row) {
  const platform = normalizePlatform(row.platform);
  return supportedPlatforms.has(platform)
    && Boolean(normalizeUrl(row.url))
    && /question identified|discussion identified|reply candidate/i.test(row.content_type || "")
    && /not_replied|identified/i.test(row.response || "")
    && !/removed|published|no_retry/i.test(`${row.response} ${row.lead_status} ${row.follow_up}`);
}

function normalizeCandidate(value, now) {
  const platform = normalizePlatform(value.platform);
  const url = normalizeUrl(value.url || value.thread_url);
  const title = cleanText(value.title || value.topic);
  if (!supportedPlatforms.has(platform) || !url || !title || !matchesPlatformUrl(platform, url)) return null;
  const excludedX = platform === "x" && !isXProjectRelevant({ title, snippet: value.snippet });
  const score = scoreCandidate({ platform, title, snippet: value.snippet, matched_keywords: value.matched_keywords || [] });
  const redditTrust = platform === "reddit" ? redditTrustProfile({ url, title, snippet: value.snippet }) : null;
  const risk = riskForPlatform(platform, value.published_at);
  const opportunityRisk = opportunityRiskForCandidate(value.published_at, value.snippet);
  const firstSeenAt = normalizeDate(value.first_seen_at || value.discovered_at) || now.toISOString();
  const candidate = withFreshness({
    id: /^DISC-[a-f0-9]{12}$/i.test(value.id || "") ? value.id : candidateId(platform, url),
    platform,
    url,
    title,
    author: value.author || null,
    topic: cleanText(value.topic || title),
    snippet: cleanText(value.snippet),
    published_at: normalizeDate(value.published_at),
    discovered_at: firstSeenAt,
    first_seen_at: firstSeenAt,
    last_seen_at: normalizeDate(value.last_seen_at) || firstSeenAt,
    source_method: sourceMethods.has(value.source_method) ? value.source_method : "manual",
    matched_keywords: Array.isArray(value.matched_keywords) ? value.matched_keywords : [],
    intent_score: redditTrust?.intent_score || (["High", "Medium", "Low"].includes(value.intent_score) ? value.intent_score : score.label),
    intent_rank: redditTrust?.intent_rank || Number(value.intent_rank) || score.rank,
    expected_value: redditTrust?.expected_value || (["Buyer", "Partner", "Supplier", "Audience", "Ignore"].includes(value.expected_value) ? value.expected_value : score.expected_value),
    opportunity_quality: redditTrust?.opportunity_quality || (["High", "Medium", "Low"].includes(value.opportunity_quality) ? value.opportunity_quality : (["High", "Medium", "Low"].includes(value.intent_score) ? value.intent_score : score.label)),
    risk_status: ["Low", "Medium", "High"].includes(value.risk_status) ? value.risk_status : risk.status,
    risk_note: cleanText(value.risk_note || risk.note),
    opportunity_risk_status: ["Low", "Medium", "High"].includes(value.opportunity_risk_status) ? value.opportunity_risk_status : opportunityRisk.status,
    opportunity_risk_note: cleanText(value.opportunity_risk_note || opportunityRisk.note),
    dedupe_key: cleanText(value.dedupe_key || dedupeKey(platform, url, title)),
    reason: cleanText(redditTrust?.reason || value.reason || score.reason),
    why_relevant: cleanText(redditTrust?.why_relevant || value.why_relevant || whyRelevantForCandidate({ title, snippet: value.snippet, expectedValue: value.expected_value || score.expected_value })),
    suggested_angle: cleanText(redditTrust?.suggested_angle || value.suggested_angle || suggestedAngleForCandidate({ title, snippet: value.snippet })),
    suggested_comment: platform === "reddit" && !redditTrust?.eligible ? "" : (platform === "x" ? fitXText(value.suggested_comment || "") : cleanText(value.suggested_comment || suggestedComment({ title, snippet: value.snippet, platform }))),
    reddit_trust: redditTrust,
    needs_manual_review: value.needs_manual_review !== false
  }, now);
  return excludedX ? { ...candidate, excluded_reason: "X 内容与 Factory Bridge 无关" } : candidate;
}

function applyActions(item, actions) {
  const history = actions
    .filter((action) => action?.id === item.id && action?.action)
    .sort((left, right) => Date.parse(left.date || "") - Date.parse(right.date || ""));
  let workflowState = "inbox";
  let replyUrl = "";
  let replyUrlVerification = null;
  let lastActionAt = null;
  let selectedForTodayAt = null;
  for (const action of history) {
    const next = transitionForDiscoveryAction(workflowState, action.action, true);
    if (!next) continue;
    workflowState = next;
    if (action.reply_url) {
      replyUrl = normalizeUrl(action.reply_url);
      replyUrlVerification = action.reply_url_verification || "manual";
    }
    if (action.action === "select_today") selectedForTodayAt = normalizeDate(action.date) || selectedForTodayAt;
    lastActionAt = normalizeDate(action.date) || lastActionAt;
  }
  if (item.platform === "x" && !isXProjectRelevant(item)) workflowState = "ignored";
  return {
    ...item,
    workflow_state: workflowState,
    reply_url: replyUrl || null,
    reply_url_verification: replyUrlVerification,
    last_action_at: lastActionAt,
    selected_for_today_at: selectedForTodayAt,
    needs_manual_review: inboxStates.has(workflowState)
  };
}

function readDiscoveryCandidates(now) {
  return dedupeCandidates([
    ...readJsonArray(discoveredPostsFile),
    ...readOutreachCandidates(now)
  ], now);
}

function buildWorkspace(candidates) {
  const bySelectedTime = (left, right) => Date.parse(left.last_action_at || "") - Date.parse(right.last_action_at || "");
  return {
    inbox: candidates.filter((item) => inboxStates.has(item.workflow_state)).sort(compareCandidates),
    today: candidates.filter((item) => todayStates.has(item.workflow_state)).sort(bySelectedTime),
    results: candidates.filter((item) => resultStates.has(item.workflow_state)).sort((left, right) => Date.parse(right.last_action_at || "") - Date.parse(left.last_action_at || ""))
  };
}

export function candidateWorkflowState(history) {
  return history
    .slice()
    .sort((left, right) => Date.parse(left.date || "") - Date.parse(right.date || ""))
    .reduce((state, item) => transitionForDiscoveryAction(state, item.action, true) || state, "inbox");
}

export function selectedTodayCount(actions) {
  const histories = new Map();
  for (const item of actions.filter((item) => item?.id && item?.action)) {
    histories.set(item.id, [...(histories.get(item.id) || []), item]);
  }
  return [...histories.values()].filter((history) => todayStates.has(candidateWorkflowState(history))).length;
}

export function selectedPlatformTodayCount(actions, platform, now = new Date()) {
  const selectedIds = new Set(actions
    .filter((item) => item?.id && item.action === "select_today" && String(item.date || "").slice(0, 10) === now.toISOString().slice(0, 10))
    .map((item) => item.id));
  if (!selectedIds.size) return 0;
  const candidates = readDiscoveryCandidates(now);
  return candidates.filter((item) => selectedIds.has(item.id) && normalizePlatform(item.platform) === normalizePlatform(platform)).length;
}

export function transitionForDiscoveryAction(fromState, action, replay = false) {
  const aliases = { add_today: "select_today", view: "viewed" };
  const normalizedAction = aliases[action] || action;
  const allowed = {
    inbox: { select_today: "today", later: "later", ignore: "ignored", replied: "outcome_pending" },
    later: { select_today: "today", ignore: "ignored", replied: "outcome_pending" },
    today: { viewed: "viewed", later: "later", ignore: "ignored", replied: "outcome_pending" },
    viewed: { draft_prepared: "draft_prepared", later: "later", ignore: "ignored", replied: "outcome_pending" },
    draft_prepared: { replied: "outcome_pending", viewed: "viewed" },
    outcome_pending: {
      received_reply: "received_reply",
      removed: "removed",
      no_response: "no_response",
      buyer_signal: "buyer_signal",
      partner_signal: "partner_signal",
      review_request: "review_request",
      paid_opportunity: "paid_opportunity",
      closed: "closed"
    },
    received_reply: { buyer_signal: "buyer_signal", partner_signal: "partner_signal", review_request: "review_request", paid_opportunity: "paid_opportunity", closed: "closed" },
    buyer_signal: { paid_opportunity: "paid_opportunity", closed: "closed" },
    partner_signal: { paid_opportunity: "paid_opportunity", closed: "closed" },
    review_request: { paid_opportunity: "paid_opportunity", closed: "closed" },
    paid_opportunity: { closed: "closed" }
  };
  const next = allowed[fromState]?.[normalizedAction] || null;
  if (replay && !next && action === "ignore") return "ignored";
  return next;
}

function isDashboardCandidate(item) {
  return item.workflow_state !== "ignored"
    && item.freshness_status !== "Archive"
    && item.expected_value !== "Ignore"
    && (item.platform !== "x" || isXProjectRelevant(item))
    && (item.platform !== "reddit" || item.reddit_trust?.eligible)
    && Boolean(item.url);
}

export function isXProjectRelevant({ title = "", snippet = "" } = {}) {
  const text = `${title} ${snippet}`;
  return !X_EXCLUDED_TOPIC_RE.test(text) && X_PROJECT_SIGNAL_RE.test(text);
}

export function redditTrustProfile({ url, title, snippet }) {
  const text = `${title || ""} ${snippet || ""}`.toLowerCase();
  const subreddit = new URL(url).pathname.match(/^\/r\/([^/]+)/i)?.[1]?.toLowerCase() || "";
  const communityFit = new Set(["manufacturing", "engineering", "industrialdesign", "productdesign", "3dprinting", "supplychain", "logistics", "operations"]).has(subreddit);
  const commercialIntent = /find\s+(?:a\s+)?(?:china\s+)?supplier|need\s+(?:a\s+)?manufacturer|looking\s+for\s+(?:a\s+)?factory|best\s+supplier|alibaba\s+(?:deposit|refund)|pay\s+(?:an\s+)?supplier|supplier\s+(?:verification|risk)/.test(text);
  const knowledgeContribution = /manufactur|production|engineering|design|tolerance|material|process|quality|logistics|operations|supply chain|cost|lead time/.test(text);
  const lowPromotionRisk = communityFit && !commercialIntent;
  const score = (communityFit ? 2 : 0) + (knowledgeContribution ? 2 : 0) + (lowPromotionRisk ? 2 : 0) - (commercialIntent ? 4 : 0);
  const eligible = communityFit && knowledgeContribution && lowPromotionRisk;
  return {
    community_fit: communityFit ? "High" : "Low",
    knowledge_contribution: knowledgeContribution ? "High" : "Low",
    low_promotion_risk: lowPromotionRisk ? "High" : "Low",
    commercial_intent: commercialIntent ? "High" : "Low",
    opportunity_score: score,
    eligible,
    intent_score: eligible ? "Medium" : "Low",
    intent_rank: eligible ? 2 : 1,
    expected_value: "Audience",
    opportunity_quality: eligible ? "Medium" : "Low",
    reason: eligible ? "社区匹配、可贡献行业细节且推广风险低。" : "当前不适合 Trust Building Mode：优先跳过商业采购请求或非目标社区。",
    why_relevant: eligible ? "该讨论适合补充一个制造、工程或供应链细节，而不是寻找买家。" : "不作为当前 Reddit 信誉建设候选。",
    suggested_angle: eligible ? "只补充一个具体行业细节，不总结、不自我介绍、不引导下一步。" : "跳过，不生成评论草稿。"
  };
}

function scoreCandidate({ platform, title, snippet, matched_keywords }) {
  const text = `${title || ""} ${snippet || ""} ${(matched_keywords || []).join(" ")}`.toLowerCase();
  const procurementSignals = ["supplier", "sourcing", "procurement", "alibaba", "factory", "manufacturer", "deposit", "payment", "quotation", "quote", "sample", "moq", "bank account"];
  const questionSignals = ["how", "what", "should i", "help", "problem", "risk", "refund", "changed", "reliable"];
  const factorySignals = ["find overseas buyers", "export marketing", "product presentation", "foreign trade email", "industrial marketing"];
  const matches = (words) => words.filter((word) => text.includes(word)).length;
  const buyerMatches = matches(procurementSignals);
  const questionMatches = matches(questionSignals);
  const factoryMatches = matches(factorySignals);
  if (buyerMatches >= 2 && questionMatches >= 1) return { label: "High", rank: 3, expected_value: "Buyer", reason: "包含明确采购场景与求助信号。" };
  if (factoryMatches >= 2) return { label: "High", rank: 3, expected_value: "Supplier", reason: "包含工厂获客或对外资料需求。" };
  if (buyerMatches >= 1 || factoryMatches >= 1) return { label: "Medium", rank: 2, expected_value: buyerMatches ? "Buyer" : "Audience", reason: "与采购或工厂沟通主题相关。" };
  return { label: "Low", rank: 1, expected_value: "Ignore", reason: "与当前服务定位关联较弱。" };
}

function expectedValueForProfile(profile, fallback) {
  const text = String(profile || "").toLowerCase();
  if (/buyer|seller|importer|fba|ecommerce|small business|entrepreneur|founder/.test(text)) return "Buyer";
  if (/partner|agency|consultant/.test(text)) return "Partner";
  if (/factory|manufacturer|exporter/.test(text)) return "Supplier";
  return fallback;
}

function riskForPlatform(platform, publishedAt) {
  if (platform === "reddit") {
    const old = publishedAt && Date.now() - Date.parse(publishedAt) > 30 * 24 * 60 * 60 * 1000;
    return {
      status: "High",
      note: old
        ? "帖子可能过旧，先确认未锁定、未删除且仍适合评论；不放链接、不提项目。"
        : "当前 Reddit 已有 7/10 条评论被移除；仅参与低推广风险讨论，不放链接、不提项目。"
    };
  }
  if (["linkedin", "x"].includes(platform)) return { status: "Medium", note: "仅人工确认公开可访问后参与，不做自动互动。" };
  return { status: "Medium", note: "先确认问题上下文与页面公开可访问性。" };
}

function opportunityRiskForCandidate(publishedAt, snippet) {
  if (publishedAt && Date.now() - Date.parse(publishedAt) > 30 * 24 * 60 * 60 * 1000) {
    return { status: "Medium", note: "帖子较旧，加入 Today 前确认仍可评论。" };
  }
  if (/\b(deleted|removed|locked)\b/i.test(String(snippet || ""))) {
    return { status: "High", note: "页面可能已删除或锁定，需要人工确认。" };
  }
  return { status: "Medium", note: "URL 和可评论状态尚未验证。" };
}

function whyRelevantForCandidate({ title, snippet, expectedValue }) {
  const text = `${title || ""} ${snippet || ""}`.toLowerCase();
  if (/codex|ai agent|solo founder|one person|operating system|workflow|automation/.test(text)) return "讨论与 Codex、AI 工作流或一人项目建设直接相关。";
  if (expectedValue === "Partner") return "可能涉及合作意向，需要人工确认上下文。";
  if (/refund|deposit/.test(text)) return "对方正在处理付款、定金或退款问题，属于高意图采购场景。";
  if (/pay|payment|bank account|beneficiary/.test(text)) return "对方正在确认供应商付款方式或收款信息。";
  if (/reliable|verify|verification/.test(text)) return "对方明确寻找供应商核验建议。";
  if (/sample|moq|shipping|supplier|manufacturer|alibaba/.test(text)) return "问题与供应商沟通或采购决策直接相关。";
  return "Needs manual review";
}

function suggestedAngleForCandidate({ title, snippet }) {
  const text = `${title || ""} ${snippet || ""}`.toLowerCase();
  if (/ai agent|ai agents|workflow|supervision/.test(text)) return "补充从能力建设转向可见性、审核和状态管理的实际经验。";
  if (/codex|one person|solo founder|operating system/.test(text)) return "回应一人借助 Codex 构建复杂系统时，问题定义和运营闭环比代码量更关键。";
  if (/refund|deposit/.test(text)) return "检查 PI、定金覆盖范围和退款条款，并要求书面确认。";
  if (/bank account|beneficiary/.test(text)) return "核对收款账户、受益人名称和当前 PI。";
  if (/sample|shipping/.test(text)) return "拆分样品费、运费、定制范围和大货标准。";
  if (/moq/.test(text)) return "确认 MOQ 适用于成品、材料变体还是包装。";
  if (/reliable|verify|verification/.test(text)) return "避免保证式判断，聚焦可核对的书面信息。";
  if (/pay|payment/.test(text)) return "用一份书面摘要确认价格、条款、交期和付款节点。";
  return "先阅读原帖，再围绕已确认与仍不清楚的信息回复。";
}

function suggestedComment(input) {
  if (input.platform === "reddit") return redditTrustComment(input);
  const draft = suggestedCommentDraft(input);
  return input.platform === "x" ? fitXText(draft) : draft;
}

function redditTrustComment({ title, snippet }) {
  const text = `${title || ""} ${snippet || ""}`.toLowerCase();
  if (/cost|price|cheap/.test(text)) return "One detail that often gets lost in cost comparisons is repetition. A production line making the same part every week can spread setup time, tooling knowledge, and scrap control across far more units than a small workshop. The unit cost difference is often less about a single cheap input and more about how predictable the work is for that factory.";
  if (/design|tolerance|material/.test(text)) return "A useful detail here is that design intent and production intent are not always the same thing. A dimension may look straightforward in CAD but create a very different inspection or fixturing problem on the shop floor. Asking which feature controls fit, function, or assembly usually gets a more useful engineering discussion than debating a single number in isolation.";
  if (/logistics|lead time|shipping/.test(text)) return "Lead time is often treated as one number, but it is usually several queues added together: material availability, production scheduling, inspection, packing, and pickup. A small change that moves one of those queues can matter more than a faster machine cycle. Looking at where the order waits is often more useful than asking for a shorter headline lead time.";
  return "One thing that is easy to miss is how much context sits behind a simple production decision. The same process can behave very differently depending on batch size, material condition, tooling, and how often the team makes that part. A specific detail about the process usually adds more to the discussion than a broad conclusion about the whole industry.";
}

function suggestedCommentDraft({ title, snippet, platform }) {
  const text = `${title || ""} ${snippet || ""}`.toLowerCase();
  if (platform === "reddit" && /deleted|removed|locked/.test(text)) return "";
  if (["x", "indie_hackers"].includes(platform) && /ai agent|ai agents|workflow|supervision/.test(text)) {
    return "This shift feels real. Once agents can complete tasks, the harder problem is knowing what is running, what needs human review, and whether polished output is actually correct. The useful layer is visible state, evidence, failures, and next actions, not simply another agent.";
  }
  if (["x", "indie_hackers"].includes(platform) && /codex|one person|solo founder|operating system/.test(text)) {
    return "Codex gives a one-person builder remarkable leverage, but code is only part of it. The hard part is defining system boundaries, deciding what stays human-reviewed, and keeping one source of truth as the project grows. AI compresses implementation time; the builder still owns the operating model.";
  }
  if (/bank account|beneficiary/.test(text)) {
    return "I would first ask the supplier to restate the beneficiary name, payment details, and the full order scope on the current quotation or pro forma invoice. Then compare the product specification, quantity, currency, trade term, deposit coverage, and balance timing in one place. I would also confirm who authorized the change and whether the same detail appears in the agreed payment record. A mismatch does not prove intent by itself, but it is a useful signal to pause and clarify before money moves.";
  }
  if (/deposit|payment|refund|pay supplier|pay manufacturer/.test(text)) {
    return "Before paying, I would ask for one clean written summary rather than relying on a long chat history. It should cover the product specification, quantity, price, currency, trade term, what the deposit covers, when the balance is due, and what could change cost or lead time. I would also ask what counts as approval for the sample or specification, and which changes need written confirmation before production begins. The goal is not to promise a safe supplier; it is to make sure both sides are describing the same order before payment.";
  }
  if (/sample|moq|shipping/.test(text)) {
    return "I would separate the sample fee, shipping, tooling or printing costs, and the exact purpose of the sample before deciding what it proves. A stock sample, a custom sample, and a pre-production sample can represent very different stages. Ask the supplier to state what differs from the eventual bulk order, including material, finish, packaging, quantity, and timing. I would also confirm whether the quoted MOQ applies to the finished order, a material variation, or packaging, so the sample is not mistaken for a confirmed production specification.";
  }
  return "I would start by separating what the supplier has confirmed from what is still unclear. Ask for the product scope, quantity, price, trade term, lead time, packaging expectations, and any assumptions to be written in one place. I would also ask which point could still change before production starts, and whether the quotation, sample, and payment details match the same order version. That does not guarantee an outcome, but it makes the next question more specific and helps both sides notice where they may be working from different information.";
}

function compareCandidates(left, right) {
  const valueRank = { Buyer: 4, Partner: 3, Supplier: 2, Audience: 1, Ignore: 0 };
  const discoveryRank = (item) => item.source_method !== "outreach_log" && item.freshness_status === "Fresh" ? 1 : 0;
  return discoveryRank(right) - discoveryRank(left)
    || right.intent_rank - left.intent_rank
    || valueRank[right.expected_value] - valueRank[left.expected_value]
    || Date.parse(right.discovered_at) - Date.parse(left.discovered_at)
    || left.title.localeCompare(right.title);
}

function preferCandidate(left, right) {
  if (left.source_method === "outreach_log") return left;
  if (right.source_method === "outreach_log") return right;
  return Date.parse(right.discovered_at) > Date.parse(left.discovered_at) ? right : left;
}

function keysFor(item) {
  return [item.url, postIdentity(item.platform, item.url), item.dedupe_key].filter(Boolean);
}

function dedupeKey(platform, url, title) {
  return crypto.createHash("sha256").update(`${platform}:${normalizeUrl(url)}:${String(title || "").toLowerCase()}`).digest("hex").slice(0, 16);
}

function candidateId(platform, url) {
  return `DISC-${crypto.createHash("sha256").update(`${platform}:${normalizeUrl(url)}`).digest("hex").slice(0, 12)}`;
}

function postIdentity(platform, url) {
  const pathname = new URL(url).pathname;
  const reddit = pathname.match(/\/comments\/([a-z0-9]+)/i)?.[1];
  const x = pathname.match(/\/status\/(\d+)/i)?.[1];
  const linkedIn = pathname.match(/(?:posts|feed\/update)\/([^/?]+)/i)?.[1];
  if (platform === "reddit" && reddit) return `reddit:${reddit}`;
  if (platform === "x" && x) return `x:${x}`;
  if (platform === "linkedin" && linkedIn) return `linkedin:${linkedIn}`;
  return "";
}

function matchesPlatformUrl(platform, url) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  if (platform === "reddit") return /(^|\.)reddit\.com$/.test(host) && /\/comments\//.test(pathname);
  if (platform === "quora") return /(^|\.)quora\.com$/.test(host) && pathname.length > 2 && !/\/(profile|topic|about)\//.test(pathname);
  if (platform === "linkedin") return /(^|\.)linkedin\.com$/.test(host) && /\/(posts|feed\/update)\//.test(pathname);
  if (platform === "facebook_groups") return /(^|\.)(facebook\.com|fb\.com)$/.test(host) && /\/groups\//.test(pathname);
  if (platform === "indie_hackers") return /(^|\.)indiehackers\.com$/.test(host) && pathname.length > 2;
  return /(^|\.)(x\.com|twitter\.com)$/.test(host) && /\/status\//.test(pathname);
}

function normalizePlatform(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "twitter") return "x";
  if (text === "facebook" || text === "facebook group" || text === "facebook groups") return "facebook_groups";
  if (text === "indie hackers" || text === "indiehackers") return "indie_hackers";
  return text;
}

function normalizeDate(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = discoverSocialOpportunities();
  console.log(`Social discovery opportunities: ${result.items.length}`);
  for (const item of result.items) console.log(`- ${item.intent_score} ${item.platform}: ${item.topic}`);
}
