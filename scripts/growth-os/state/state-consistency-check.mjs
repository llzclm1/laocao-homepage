import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lifecycleFile, loadLifecycleState, validateLifecycleState } from "./state-manager.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const retiredSources = [
  "data/growth-os/content-status.json",
  "data/growth-os/social/content-lifecycle.json",
  "data/growth-os/social/social-content-status.json"
];
const legacyArchiveFiles = [
  path.join(root, "data/growth-os/legacy/archive/content-status.json"),
  path.join(root, "data/growth-os/legacy/archive/social-content-lifecycle.json"),
  path.join(root, "data/growth-os/legacy/archive/social-content-status.json")
];

export function checkStateConsistency() {
  const rows = loadLifecycleState();
  const validation = validateLifecycleState(rows);
  const warnings = [];
  const archived = legacyArchiveFiles.filter((file) => fs.existsSync(file)).map(relative);
  const retiredReferences = findRetiredSourceReferences();

  if (archived.length !== legacyArchiveFiles.length) {
    warnings.push("One or more retired state sources are missing from data/growth-os/legacy/archive/");
  }
  for (const item of retiredReferences) {
    warnings.push(`New module references retired state source: ${item.file} -> ${item.source}`);
  }

  return {
    source: relative(lifecycleFile),
    checked: rows.length,
    errors: validation.errors,
    warnings: [...validation.warnings, ...warnings],
    conflicts: [],
    archived,
    retiredReferences
  };
}

function findRetiredSourceReferences() {
  const scriptsRoot = path.join(root, "scripts/growth-os");
  const checkerFile = path.resolve(fileURLToPath(import.meta.url));
  const results = [];

  for (const file of walk(scriptsRoot)) {
    if (file === checkerFile || !file.endsWith(".mjs")) continue;
    const contents = fs.readFileSync(file, "utf8");
    for (const source of retiredSources) {
      if (contents.includes(source)) results.push({ file: relative(file), source });
    }
  }
  return results;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function relative(file) {
  return path.relative(root, file);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkStateConsistency();
  console.log(`Canonical lifecycle: ${result.source}`);
  console.log(`Records checked: ${result.checked}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Legacy conflicts: ${result.conflicts.length}`);
  console.log(`Archived legacy files: ${result.archived.length}`);
  for (const item of result.errors) console.log(`ERROR ${item}`);
  for (const item of result.warnings) console.log(`WARN ${item}`);
  for (const item of result.conflicts) console.log(`CONFLICT ${item}`);
  if (result.errors.length) process.exit(1);
}
