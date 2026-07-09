import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLifecycleState, validateLifecycleState } from "../state/state-manager.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rulesFile = path.join(root, "data/growth-os/state-machine/state-rules.json");

export function validateGrowthState(extraItems = []) {
  const rules = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
  const byId = new Map(loadLifecycleState().map((item) => [item.id, item]));
  for (const item of extraItems.map(normalizeExtraItem)) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  const items = [...byId.values()];
  const base = validateLifecycleState(items);
  const errors = [];
  const warnings = [];

  for (const item of items) {
    const status = normalizeStatus(item.status, rules);
    if (status !== item.status) warnings.push(`${item.id}: legacy status ${item.status} mapped to ${status}`);
    if (!rules.states.includes(status)) errors.push(`${item.id}: invalid status ${item.status}`);
    if (item.previous_status) {
      const from = normalizeStatus(item.previous_status, rules);
      const allowed = rules.transitions[from] || [];
      if (from !== status && !allowed.includes(status)) errors.push(`${item.id}: illegal transition ${from} -> ${status}`);
    }
    if (rules.manual_required.includes(status) && !item.approved_by) {
      warnings.push(`${item.id}: ${status} requires manual approval evidence`);
    }
  }

  return {
    errors: [...base.errors, ...errors],
    warnings: [...base.warnings, ...warnings],
    checked: items.length
  };
}

function normalizeStatus(status, rules) {
  return rules.legacy_status_map?.[status] || status;
}

function normalizeExtraItem(item) {
  const mapped = {
    published_candidate: "monitoring",
    review: "review_pending",
    needs_revision: "revision_required"
  };
  return {
    ...item,
    status: mapped[item.status] || item.status
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateGrowthState();
  console.log(`State records checked: ${result.checked}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  for (const item of [...result.errors, ...result.warnings]) console.log(`- ${item}`);
}
