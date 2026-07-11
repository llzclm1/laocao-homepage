import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const discoveryDir = path.join(root, "data/growth-os/social-discovery");
const healthFile = path.join(discoveryDir, "discovery-health.json");

export function writeDiscoveryHealth({ now = new Date(), sourceStatus = { sources: {} }, runs = [] }) {
  const sources = Object.values(sourceStatus.sources || {});
  const recentRuns = [...runs].filter((run) => run.status !== "skipped").sort((left, right) => Date.parse(right.completed_at) - Date.parse(left.completed_at));
  const automaticSources = sources.filter((source) => ["reddit_rss", "search"].includes(source.source_method) && !String(source.source_name || "").includes("legacy"));
  const blockedSources = automaticSources.filter((source) => ["blocked", "failed"].includes(source.status));
  const healthySources = automaticSources.filter((source) => ["success", "no_verified_results"].includes(source.status));
  const lastSuccessfulRun = recentRuns.find((run) => run.sources_succeeded > 0) || null;
  const lastNewCandidate = recentRuns.find((run) => run.new_items > 0) || null;
  const zeroResultDays = consecutiveZeroResultDays(recentRuns);
  const consecutiveFailures = automaticSources.reduce((total, source) => total + (Number(source.consecutive_failures) || 0), 0);
  const status = healthStatus({ automaticSources, blockedSources, healthySources, recentRuns, zeroResultDays });
  const health = {
    status,
    last_successful_run: lastSuccessfulRun?.completed_at || null,
    last_new_candidate: lastNewCandidate?.completed_at || null,
    sources_healthy: healthySources.length,
    sources_blocked: blockedSources.length,
    error_count: blockedSources.length,
    consecutive_zero_result_days: zeroResultDays,
    consecutive_source_failures: consecutiveFailures,
    message: healthMessage(status)
  };
  fs.mkdirSync(discoveryDir, { recursive: true });
  fs.writeFileSync(healthFile, `${JSON.stringify(health, null, 2)}\n`, "utf8");
  return health;
}

function healthStatus({ automaticSources, blockedSources, healthySources, recentRuns, zeroResultDays }) {
  if (!automaticSources.length || (!healthySources.length && !recentRuns.length)) return "Manual Mode";
  if (blockedSources.length && !healthySources.length) return "Blocked";
  if (recentRuns.slice(0, 3).length === 3 && recentRuns.slice(0, 3).every((run) => run.new_items > 0)) return "Healthy";
  if (zeroResultDays >= 3 || blockedSources.length) return "Degraded";
  return "Manual Mode";
}

function consecutiveZeroResultDays(runs) {
  const days = new Map();
  for (const run of runs) {
    const day = String(run.completed_at || "").slice(0, 10);
    if (!day || days.has(day)) continue;
    days.set(day, Number(run.new_items) || 0);
  }
  let count = 0;
  for (const value of days.values()) {
    if (value > 0) break;
    count += 1;
  }
  return count;
}

function healthMessage(status) {
  if (status === "Healthy") return "Recent scheduled runs produced verified public candidates.";
  if (status === "Degraded") return "Automatic discovery is responding but has not produced enough verified candidates.";
  if (status === "Blocked") return "Primary automatic sources are blocked or failing; do not treat discovery as healthy.";
  return "Automatic public discovery is currently unavailable. The system is running in backlog, manual inbox and import mode.";
}
