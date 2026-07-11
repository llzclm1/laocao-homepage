import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
export const supportedPlatforms = new Set(["reddit", "quora", "linkedin", "x"]);
const sourceMethods = new Set(["search", "public_api", "reddit_rss", "outreach_log", "manual", "search_import"]);
const inboxStates = new Set(["inbox", "later"]);
const todayStates = new Set(["today", "viewed", "draft_prepared"]);
const resultStates = new Set(["outcome_pending", "received_reply", "removed", "no_response", "buyer_signal", "partner_signal", "review_request", "paid_opportunity", "closed"]);

export function discoverSocialOpportunities(now = new Date()) {
  const actions = readJsonl(actionsFile);
  const candidates = readDiscoveryCandidates(now).map((item) => applyActions(item, actions));

  const eligibleCandidates = candidates
    .filter(isDashboardCandidate)
    .sort(compareCandidates);
  const workspace = buildWorkspace(eligibleCandidates);
  const collectionSnapshot = readCollectionSnapshot();
  const result = {
    generated_at: now.toISOString(),
    sources: ["reddit_rss", "search", "outreach_log", "manual", "search_import"],
    supported_platforms: [...supportedPlatforms],
    // Kept for existing Markdown/report consumers. The operating workspace uses inbox/today/results.
    items: workspace.inbox.slice(0, 5),
    workspace,
    discovery_summary: buildDiscoverySummary(eligibleCandidates, workspace, collectionSnapshot.platforms, now, collectionSnapshot.last_verified_rss_result, collectionSnapshot.health)
  };

  fs.mkdirSync(discoveryDir, { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
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
  if (action === "replied") {
    const issue = replyUrlIssue(candidate, replyUrl);
    if (issue) throw new Error(issue);
    const duplicate = duplicateReplyAction(history, id, replyUrl);
    if (duplicate) return { ...duplicate, duplicate: true };
  }
  const fromState = candidateWorkflowState(history.filter((item) => item.id === id));
  const toState = transitionForDiscoveryAction(fromState, action);
  if (!toState) throw new Error(`Action ${action} is not available from ${fromState}`);
  if (action === "select_today" && selectedTodayCount(history) >= 3) throw new Error("Today can contain at most three opportunities");
  const entry = {
    id,
    action,
    from_state: fromState,
    to_state: toState,
    reply_url: replyUrl || undefined,
    reply_url_verification: action === "replied" ? "manual" : undefined,
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

  const text = `${title} ${snippet}`.toLowerCase();
  const matchedKeywords = (input.keywords || []).filter((keyword) => text.includes(String(keyword).toLowerCase()));
  const score = scoreCandidate({ platform, title, snippet, matched_keywords: matchedKeywords });
  const risk = riskForPlatform(platform, input.published_at);
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
    intent_score: score.label,
    intent_rank: score.rank,
    expected_value: score.expected_value,
    risk_status: risk.status,
    risk_note: risk.note,
    dedupe_key: dedupeKey(platform, url, title),
    reason: score.reason,
    why_relevant: score.reason,
    suggested_comment: enoughContext ? suggestedComment({ title, snippet, platform }) : "",
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
        risk_status: risk.status,
        risk_note: risk.note,
        dedupe_key: dedupeKey(platform, url, row.topic),
        reason: row.notes || score.reason,
        why_relevant: row.notes || score.reason,
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
  const score = scoreCandidate({ platform, title, snippet: value.snippet, matched_keywords: value.matched_keywords || [] });
  const risk = riskForPlatform(platform, value.published_at);
  const firstSeenAt = normalizeDate(value.first_seen_at || value.discovered_at) || now.toISOString();
  return withFreshness({
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
    intent_score: ["High", "Medium", "Low"].includes(value.intent_score) ? value.intent_score : score.label,
    intent_rank: Number(value.intent_rank) || score.rank,
    expected_value: ["Buyer", "Partner", "Supplier", "Audience", "Ignore"].includes(value.expected_value) ? value.expected_value : score.expected_value,
    risk_status: ["Low", "Medium", "High"].includes(value.risk_status) ? value.risk_status : risk.status,
    risk_note: cleanText(value.risk_note || risk.note),
    dedupe_key: cleanText(value.dedupe_key || dedupeKey(platform, url, title)),
    reason: cleanText(value.reason || score.reason),
    why_relevant: cleanText(value.why_relevant || value.reason || score.reason),
    suggested_comment: cleanText(value.suggested_comment || ""),
    needs_manual_review: value.needs_manual_review !== false
  }, now);
}

function applyActions(item, actions) {
  const history = actions
    .filter((action) => action?.id === item.id && action?.action)
    .sort((left, right) => Date.parse(left.date || "") - Date.parse(right.date || ""));
  let workflowState = "inbox";
  let replyUrl = "";
  let replyUrlVerification = null;
  let lastActionAt = null;
  for (const action of history) {
    const next = transitionForDiscoveryAction(workflowState, action.action, true) || action.to_state;
    if (!next) continue;
    workflowState = next;
    if (action.reply_url) {
      replyUrl = normalizeUrl(action.reply_url);
      replyUrlVerification = action.reply_url_verification || "manual";
    }
    lastActionAt = normalizeDate(action.date) || lastActionAt;
  }
  return {
    ...item,
    workflow_state: workflowState,
    reply_url: replyUrl || null,
    reply_url_verification: replyUrlVerification,
    last_action_at: lastActionAt,
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
    .reduce((state, item) => transitionForDiscoveryAction(state, item.action, true) || item.to_state || state, "inbox");
}

function selectedTodayCount(actions) {
  const histories = new Map();
  for (const item of actions.filter((item) => item?.id && item?.action)) {
    histories.set(item.id, [...(histories.get(item.id) || []), item]);
  }
  return [...histories.values()].filter((history) => todayStates.has(candidateWorkflowState(history))).length;
}

export function transitionForDiscoveryAction(fromState, action, replay = false) {
  const aliases = { add_today: "select_today", view: "viewed" };
  const normalizedAction = aliases[action] || action;
  const allowed = {
    inbox: { select_today: "today", later: "later", ignore: "ignored" },
    later: { select_today: "today", ignore: "ignored" },
    today: { viewed: "viewed", later: "later", ignore: "ignored" },
    viewed: { draft_prepared: "draft_prepared", later: "later", ignore: "ignored" },
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
    && Boolean(item.url);
}

function scoreCandidate({ title, snippet, matched_keywords }) {
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
        : "近期 Reddit removed rate 为 33%；只回复原问题，不放链接、不提项目。"
    };
  }
  if (["linkedin", "x"].includes(platform)) return { status: "Medium", note: "仅人工确认公开可访问后参与，不做自动互动。" };
  return { status: "Medium", note: "先确认问题上下文与页面公开可访问性。" };
}

function suggestedComment({ title, snippet, platform }) {
  const text = `${title || ""} ${snippet || ""}`.toLowerCase();
  if (platform === "reddit" && /deleted|removed|locked/.test(text)) return "";
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
  return /(^|\.)(x\.com|twitter\.com)$/.test(host) && /\/status\//.test(pathname);
}

function normalizePlatform(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "twitter") return "x";
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
