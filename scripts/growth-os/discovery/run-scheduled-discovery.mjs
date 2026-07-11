import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectSocialOpportunities } from "./collect-social-opportunities.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const stateFile = path.join(root, "data/growth-os/social-discovery/scheduled-discovery-state.json");

export async function runScheduledDiscovery(options = {}) {
  const now = options.now || new Date();
  const state = readJson(stateFile, {});
  if (!options.force && scheduledRecently(state.last_scheduled_run, now)) {
    return {
      status: "skipped",
      reason: "A scheduled discovery run already completed within the daily or six-hour guard.",
      collection: null
    };
  }

  const collection = await collectSocialOpportunities({
    now,
    platforms: options.platforms || [],
    sources: options.sources || [],
    limit: options.limit,
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force)
  });
  const result = {
    status: collection.run.status,
    reason: "",
    collection
  };
  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, `${JSON.stringify({
      last_scheduled_run: now.toISOString(),
      last_run_id: collection.run.run_id,
      last_status: collection.run.status
    }, null, 2)}\n`, "utf8");
  }
  return result;
}

function scheduledRecently(value, now) {
  const previous = Date.parse(value || "");
  if (!Number.isFinite(previous)) return false;
  const elapsed = now.getTime() - previous;
  return elapsed < 6 * 60 * 60 * 1000 || new Date(previous).toDateString() === now.toDateString();
}

function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; }
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
  const result = await runScheduledDiscovery(parseArgs(process.argv));
  console.log(`Scheduled discovery: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
  if (result.collection) console.log(`Sources: attempted=${result.collection.run.sources_attempted}, new=${result.collection.run.new_items}`);
}
