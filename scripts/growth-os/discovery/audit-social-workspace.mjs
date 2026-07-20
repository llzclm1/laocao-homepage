import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  candidateWorkflowState,
  discoverSocialOpportunities,
  discoveryOutcomeStatsForActions,
  inspectSocialDiscoveryCandidates,
  normalizeUrl,
  replyUrlIssue,
  transitionForDiscoveryAction
} from "./social-discovery-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const actionsFile = path.join(root, "data/growth-os/social-discovery/candidate-actions.jsonl");
const opportunitiesFile = path.join(root, "data/growth-os/social-discovery/today-opportunities.json");
const viewerFile = path.join(root, "data/growth-os/viewer/dashboard-view.json");

export function auditSocialWorkspace(options = {}) {
  const now = options.now || new Date();
  const parsed = readJsonlWithErrors(actionsFile);
  const actions = parsed.items;
  const discovery = discoverSocialOpportunities(now, { dryRun: true });
  const sourceCandidates = inspectSocialDiscoveryCandidates(now, actions);
  const viewer = readJson(viewerFile, {});
  const persisted = readJson(opportunitiesFile, {});
  const activeCandidates = [...discovery.workspace.inbox, ...discovery.workspace.today, ...discovery.workspace.results];
  const candidateById = new Map(sourceCandidates.map((item) => [item.id, item]));
  const errors = parsed.errors.map((item) => finding("INVALID_JSON", item.message, [], "Remove or repair the invalid JSONL line."));
  const warnings = [];

  const duplicateEvents = findDuplicateEvents(actions);
  if (duplicateEvents.length) errors.push(finding("DUPLICATE_EVENT", "Duplicate workflow events found.", duplicateEvents.map((item) => item.id), "Keep one canonical event per repeated action."));

  const conflicts = findConflicts(actions);
  if (conflicts.length) errors.push(finding("CONFLICTING_EVENT", "Events violate the workflow transition rules.", conflicts.map((item) => item.id), "Remove invalid transitions and regenerate the Viewer."));

  const unknownIds = [...new Set(actions.map((item) => item.id).filter((id) => id && !candidateById.has(id)))];
  if (unknownIds.length) errors.push(finding("UNKNOWN_CANDIDATE", "Events reference unknown candidate IDs.", unknownIds, "Restore the candidate source or remove the orphan events."));

  if (discovery.workspace.today.length > 3) errors.push(finding("TODAY_LIMIT", "Today contains more than three candidates.", discovery.workspace.today.map((item) => item.id), "Move excess candidates back to Later."));

  const invalidReplyUrls = actions.filter((item) => {
    if (item.action !== "replied") return false;
    const candidate = candidateById.get(item.id);
    return !candidate || Boolean(replyUrlIssue(candidate, item.reply_url));
  });
  if (invalidReplyUrls.length) errors.push(finding("INVALID_REPLY_URL", "Replied events contain invalid reply URLs.", invalidReplyUrls.map((item) => item.id), "Replace with a public HTTPS reply URL on the same platform."));

  const repliedIds = new Set(actions.filter((item) => item.action === "replied" && item.reply_url).map((item) => item.id));
  const resultsWithoutReply = discovery.workspace.results.filter((item) => !repliedIds.has(item.id));
  if (resultsWithoutReply.length) errors.push(finding("RESULT_WITHOUT_REPLY", "Results contain candidates without a valid Replied event.", resultsWithoutReply.map((item) => item.id), "Restore the Replied event or remove the invalid outcome events."));

  const memberships = new Map();
  for (const [name, items] of Object.entries(discovery.workspace)) {
    for (const item of items) memberships.set(item.id, [...(memberships.get(item.id) || []), name]);
  }
  const overlapping = [...memberships.entries()].filter(([, names]) => names.length > 1);
  if (overlapping.length) errors.push(finding("MULTIPLE_WORKSPACES", "Candidates appear in multiple workspaces.", overlapping.map(([id]) => id), "Regenerate all workspace views from the canonical event stream."));

  const persistedActiveIds = new Set([
    ...(persisted.workspace?.inbox || []),
    ...(persisted.workspace?.today || []),
    ...(persisted.workspace?.results || [])
  ].map((item) => item.id));
  const stalePersisted = activeCandidates.filter((item) => !persistedActiveIds.has(item.id));
  if (stalePersisted.length) warnings.push(finding("PERSISTED_VIEW_STALE", "today-opportunities.json differs from the current event-derived workspace.", stalePersisted.map((item) => item.id), "Run the discovery engine to refresh persisted workspace data."));

  const viewerConsistent = sameIds(viewer.workspace?.inbox, discovery.workspace.inbox)
    && sameIds(viewer.workspace?.today, discovery.workspace.today)
    && sameIds(viewer.workspace?.results, discovery.workspace.results);
  if (!viewerConsistent) errors.push(finding("VIEWER_MISMATCH", "dashboard-view.json does not match the event-derived workspace.", activeCandidates.map((item) => item.id), "Regenerate dashboard-view.json from the canonical event stream."));

  const persistedTodayItems = persisted.items || [];
  const inboxIds = new Set(discovery.workspace.inbox.map((item) => item.id));
  const invalidTodayItems = persistedTodayItems.filter((item) => !inboxIds.has(item.id));
  if (invalidTodayItems.length) errors.push(finding("INVALID_TODAY_OPPORTUNITY", "today-opportunities.json items contain candidates that are no longer in Inbox.", invalidTodayItems.map((item) => item.id), "Regenerate today-opportunities.json from the canonical event stream."));

  const expectedSignals = discoveryOutcomeStatsForActions(actions);
  const viewerSignals = Object.fromEntries((viewer.business_signals || []).map((item) => [item.label, Number(item.value) || 0]));
  const businessSignalsConsistent = viewerSignals["Qualified Interactions"] === expectedSignals.qualified_interactions
    && viewerSignals["Buyer Replies"] === expectedSignals.buyer_replies
    && viewerSignals["Partner Leads"] === expectedSignals.partner_leads
    && viewerSignals["Review Requests"] === expectedSignals.review_requests
    && viewerSignals["Paid Opportunities"] === expectedSignals.paid_opportunities;
  if (!businessSignalsConsistent) errors.push(finding("BUSINESS_SIGNAL_MISMATCH", "Business Signals do not match unique Results events.", [], "Regenerate dashboard-view.json from candidate-actions.jsonl."));

  const finalStates = [...new Set([...sourceCandidates.map((item) => item.id), ...actions.map((item) => item.id).filter(Boolean)])]
    .map((id) => ({ id, state: candidateWorkflowState(actions.filter((item) => item.id === id)) }));

  return {
    generated_at: now.toISOString(),
    last_viewer_generated_at: viewer.generated_at || null,
    counts: {
      candidates: sourceCandidates.length,
      inbox: discovery.workspace.inbox.length,
      today: discovery.workspace.today.length,
      results: discovery.workspace.results.length,
      events: actions.length
    },
    errors,
    warnings,
    duplicate_events: duplicateEvents,
    conflicting_events: conflicts,
    invalid_reply_urls: invalidReplyUrls.map((item) => ({ id: item.id, reply_url: item.reply_url || null })),
    orphan_candidate_ids: unknownIds,
    recent_events: actions.slice(-20).reverse(),
    final_states: finalStates,
    viewer_consistent: viewerConsistent,
    business_signals_consistent: businessSignalsConsistent
  };
}

function findDuplicateEvents(actions) {
  const seen = new Map();
  const duplicates = [];
  for (const item of actions) {
    const key = [item.id, item.action, item.from_state, item.to_state, normalizeUrl(item.reply_url)].join("|");
    if (seen.has(key)) duplicates.push(item);
    else seen.set(key, item);
  }
  return duplicates;
}

function findConflicts(actions) {
  const states = new Map();
  const conflicts = [];
  for (const item of actions.slice().sort((left, right) => Date.parse(left.date || "") - Date.parse(right.date || ""))) {
    if (!item.id || !item.action) {
      conflicts.push(item);
      continue;
    }
    const from = states.get(item.id) || "inbox";
    const to = transitionForDiscoveryAction(from, item.action, true);
    if (!to || (item.from_state && item.from_state !== from) || (item.to_state && item.to_state !== to)) conflicts.push(item);
    else states.set(item.id, to);
  }
  return conflicts;
}

function sameIds(left = [], right = []) {
  return JSON.stringify(left.map((item) => item.id).sort()) === JSON.stringify(right.map((item) => item.id).sort());
}

function finding(code, message, ids, suggestedFix) {
  return { code, message, suggested_fix: suggestedFix, affected_candidate_ids: [...new Set(ids.filter(Boolean))] };
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readJsonlWithErrors(file) {
  if (!fs.existsSync(file)) return { items: [], errors: [] };
  const items = [];
  const errors = [];
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      items.push(JSON.parse(line));
    } catch (error) {
      errors.push({ line: index + 1, message: `Line ${index + 1}: ${error.message}` });
    }
  });
  return { items, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditSocialWorkspace();
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Candidates: ${result.counts.candidates}`);
  console.log(`Inbox: ${result.counts.inbox}`);
  console.log(`Today: ${result.counts.today}`);
  console.log(`Results: ${result.counts.results}`);
  for (const item of [...result.errors, ...result.warnings]) {
    console.log(`- ${item.code}: ${item.message}`);
    if (item.affected_candidate_ids.length) console.log(`  Affected: ${item.affected_candidate_ids.join(", ")}`);
    console.log(`  Suggested Fix: ${item.suggested_fix}`);
  }
  if (result.errors.length) process.exitCode = 1;
}
