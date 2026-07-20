import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { mergeSignalHistory } from "./core/lifecycle.mjs";
import { classifyBusinessLine, normalizeQuery, normalizeUrl, observedAt, sourceStatus } from "./core/normalize.mjs";
import { detectFirstPageImpression } from "./search/first-page-impression.mjs";
import { detectFirstQuery } from "./search/first-query.mjs";
import { detectHighIntentQuery } from "./search/high-intent-query.mjs";
import { detectReplyReviewFirstClick } from "./content/reply-review-first-click.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SIGNAL_FILE = path.join(ROOT, "data/growth-os/runtime/signals-latest.json");

export function buildSignalSnapshot(current, {
  previous = null,
  previousSignals = [],
  now = new Date(),
  generatedAt = now.toISOString()
} = {}) {
  const candidates = [
    ...detectFirstQuery({ current, previous, now }),
    ...detectHighIntentQuery({ current, now }),
    ...detectFirstPageImpression({ current, previous, now }),
    ...detectReplyReviewFirstClick({ current, previous, now }),
    ...refreshRecurringSignals(current, previousSignals, now)
  ];
  const signals = mergeSignalHistory(dedupeCandidates(candidates), previousSignals, now);
  const previousKeys = new Set(previousSignals.map((signal) => signal.normalized_key || signal.id));
  return {
    task_id: "GROWTH-005-SIGNALS",
    generated_at: generatedAt,
    source_run_completed_at: current?.completed_at || null,
    signals,
    summary: {
      active: signals.filter((signal) => signal.status !== "archived").length,
      new: candidates.filter((signal) => !previousKeys.has(signal.normalized_key || signal.id)).length,
      factory_bridge: signals.filter((signal) => signal.business_line === "factory_bridge" && signal.status !== "archived").length,
      games: signals.filter((signal) => signal.business_line === "games" && signal.status !== "archived").length,
      brand: signals.filter((signal) => signal.business_line === "brand" && signal.status !== "archived").length
    }
  };
}

function refreshRecurringSignals(current, previousSignals, now) {
  const source = current?.sources?.find((item) => item.key === "gsc");
  if (!source || !["live", "collected", "partial"].includes(sourceStatus(source))) return [];
  const rows = source.metrics?.query_rows || current?.gsc_queries || [];
  const pages = source.metrics?.page_rows || current?.gsc_pages || [];
  const queryKeys = new Set(rows.map((row) => {
    const query = String(row.query || row.term || "").trim();
    const line = classifyBusinessLine({ query, url: row.url || row.page || "" });
    return `search.query:${line}:${normalizeQuery(query)}`;
  }));
  const pageKeys = new Set(pages.map((row) => {
    const url = normalizeUrl(row.url || row.page || "");
    const line = classifyBusinessLine({ url });
    return `search.page.first_impression:${line}:${url}`;
  }));
  const at = observedAt(source, current.completed_at || now.toISOString());
  return (previousSignals || []).filter((signal) => {
    if (signal.status === "archived") return false;
    if (signal.event === "search.query.first_seen" || signal.event === "search.query.high_intent") return queryKeys.has(signal.normalized_key);
    if (["search.page.first_impression", "content.buyer_guide.first_impression", "content.reply_review.first_impression"].includes(signal.event)) return pageKeys.has(signal.normalized_key);
    return false;
  }).map((signal) => ({
    ...signal,
    observed_at: at,
    last_seen: at,
    source_status: sourceStatus(source),
    evidence: [{ source: "gsc", source_status: sourceStatus(source), observed_at: at, supporting_metric: signal.payload || {} }]
  }));
}

export function buildSignalsFromDisk(current, { rootDir = ROOT, previous = null, now = new Date(), generatedAt = now.toISOString() } = {}) {
  const previousSignals = readJson(path.join(rootDir, "data/growth-os/runtime/signals-latest.json"), {})?.signals || [];
  const snapshot = buildSignalSnapshot(current, { previous, previousSignals, now, generatedAt });
  fs.mkdirSync(path.dirname(path.join(rootDir, "data/growth-os/runtime/signals-latest.json")), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "data/growth-os/runtime/signals-latest.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

export function readLatestSignals(rootDir = ROOT) {
  return readJson(path.join(rootDir, "data/growth-os/runtime/signals-latest.json"), null);
}

function dedupeCandidates(candidates) {
  const merged = new Map();
  for (const candidate of candidates) {
    const key = candidate.normalized_key || candidate.id;
    if (!merged.has(key)) merged.set(key, candidate);
    else merged.set(key, mergeCandidate(merged.get(key), candidate));
  }
  return [...merged.values()];
}

function mergeCandidate(first, second) {
  return {
    ...first,
    evidence: [...(first.evidence || []), ...(second.evidence || [])],
    supporting_metric: { ...(first.supporting_metric || {}), ...(second.supporting_metric || {}) }
  };
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = readJson(path.join(ROOT, "data/growth-os/runtime/morning-collector-latest.json"), null);
  if (!current) process.exitCode = 1;
  else console.log(JSON.stringify(buildSignalsFromDisk(current), null, 2));
}
