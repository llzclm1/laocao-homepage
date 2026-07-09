import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyReviewActionToState, loadLifecycleState, lifecycleFile } from "../state/state-manager.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const actionsFile = path.join(root, "data/growth-os/actions/review-actions.jsonl");

export function processReviewActions({ now = new Date() } = {}) {
  const latestActions = new Map(readJsonl(actionsFile).map((item) => [String(item.id || "").toUpperCase(), item]));
  for (const action of latestActions.values()) {
    try {
      applyReviewActionToState(action, { now, writeHistory: false });
    } catch {
      // Invalid or stale actions are ignored; state-consistency-check reports them.
    }
  }

  const output = loadLifecycleState();

  return {
    output: path.relative(root, lifecycleFile),
    items: output
  };
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function selfCheck() {
  console.assert(Array.isArray(loadLifecycleState()));
}

if (process.argv.includes("--self-check")) {
  selfCheck();
  console.log("review-action-processor self-check ok");
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = processReviewActions();
  console.log(`Review state: ${result.output}`);
  console.log(`Items: ${result.items.length}`);
}
