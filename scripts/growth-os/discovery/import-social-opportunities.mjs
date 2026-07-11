import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverSocialOpportunities, importSocialOpportunities } from "./social-discovery-engine.mjs";
import { refreshDashboardDiscovery } from "../runtime/dashboard-generator.mjs";

export function importSocialOpportunityFile(file, options = {}) {
  const records = readRecords(file);
  const result = importSocialOpportunities(records, options);
  if (!options.dryRun) refreshDashboardDiscovery(discoverSocialOpportunities(options.now || new Date()), options.now || new Date());
  return result;
}

function readRecords(file) {
  const text = fs.readFileSync(file, "utf8");
  if (path.extname(file).toLowerCase() === ".csv") return parseCsv(text);
  const value = JSON.parse(text);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.items)) return value.items;
  throw new Error("JSON import must be an array or an object with an items array");
}

function parseCsv(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] || ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
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

function parseArgs(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--file") options.file = argv[++index];
    else if (argv[index] === "--platform") options.platform = argv[++index];
    else if (argv[index] === "--dry-run") options.dryRun = true;
  }
  if (!options.file) throw new Error("Usage: --file <path> [--platform <platform>] [--dry-run]");
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv);
    const result = importSocialOpportunityFile(path.resolve(options.file), options);
    console.log(`Social import: ${result.added.length} added, ${result.duplicates.length} duplicate(s), ${result.rejected.length} rejected`);
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}
