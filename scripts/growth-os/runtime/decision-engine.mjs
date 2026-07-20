import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rulesFile = path.join(root, "scripts/growth-os/runtime/rules.json");

export function scoreAndDecide(signals, existingOpportunities) {
  const rules = JSON.parse(fs.readFileSync(rulesFile, "utf8"));
  const existingQuestions = new Set(existingOpportunities.map((item) => normalize(item.question || item.title)));

  return signals.map((signal, index) => {
    const duplicate = existingQuestions.has(normalize(signal.question || signal.title));
    const score = scoreSignal(signal);
    const id = signal.id || `GO-${String(existingOpportunities.length + index + 1).padStart(3, "0")}`;
    const decision = decide(signal, score, duplicate, rules);

    return {
      ...signal,
      id,
      score,
      decision,
      duplicate,
      content_folder: `docs/content-pipeline/${id.toLowerCase()}/`,
      recommended_action: actionFor(decision, id, signal)
    };
  });
}

function scoreSignal(signal) {
  return Math.round(
    (signal.buyer_intent || 0) * 0.4 +
    (signal.commercial_value || 0) * 0.3 +
    (signal.content_gap ? 100 : 0) * 0.2 +
    (signal.service_alignment ? 100 : 0) * 0.1
  );
}

function decide(signal, score, duplicate, rules) {
  if (duplicate) return "archive";
  if (!signal.boundary_fit || !signal.service_alignment) return "archive";
  if (score >= rules.high_priority.min_score && signal.content_gap) return "high_priority";
  if (score >= rules.medium_priority.min_score && signal.content_gap) return "medium_priority";
  return "archive";
}

function actionFor(decision, id, signal) {
  if (decision === "high_priority") return `${id} create buyer guide brief for "${signal.title}"`;
  if (decision === "medium_priority") return `${id} prepare research notes before drafting`;
  return `${id} archive or revisit only if buyer demand becomes clearer`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
