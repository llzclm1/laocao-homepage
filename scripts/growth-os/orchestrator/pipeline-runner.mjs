import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { run as runOpportunityAgent } from "../agents/opportunity-agent/interface.mjs";
import { run as runResearchAgent } from "../agents/research-agent/interface.mjs";
import { run as runContentAgent } from "../agents/content-agent/interface.mjs";
import { run as runReviewAgent } from "../agents/review-agent/interface.mjs";
import { run as runMonitorAgent } from "../agents/monitor-agent/interface.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const stateFile = path.join(root, "scripts/growth-os/orchestrator/run-state.json");
const opportunityFile = path.join(root, "data/growth-os/opportunities.jsonl");
const contentStatusFile = path.join(root, "data/growth-os/content-status.json");

export function runDailyPipeline(now = new Date()) {
  const errors = [];
  const failedAgents = [];
  const generatedDrafts = [];
  const pendingReview = [];
  const monitoringState = [];
  const opportunities = readJsonl(opportunityFile);
  const contentStatus = readJson(contentStatusFile, { items: [] });

  for (const opportunity of opportunities) {
    try {
      runOpportunityAgent();
      runResearchAgent(opportunity.id);
      runContentAgent(opportunity.id);
      const review = runReviewAgent(opportunity.id);
      const monitor = runMonitorAgent(opportunity.id);

      const packageState = getPackageState(opportunity.id);
      const reviewDecision = getReviewDecision(opportunity.id, review);
      const statusItem = contentStatus.items.find((item) => item.id === opportunity.id || item.url === opportunity.url) || null;

      if (packageState.ready) generatedDrafts.push(opportunity.id);
      if (reviewDecision !== "approved") pendingReview.push(opportunity.id);

      monitoringState.push({
        id: opportunity.id,
        url: opportunity.url,
        content_status: statusItem?.status || null,
        monitor_status: monitor.status
      });
    } catch (error) {
      failedAgents.push(opportunity.id);
      errors.push(`${opportunity.id}: ${error.message}`);
    }
  }

  const state = {
    last_run: now.toISOString(),
    processed_items: opportunities.map((item) => item.id),
    failed_agents: failedAgents,
    pending_review: pendingReview,
    generated_drafts: generatedDrafts,
    monitoring_state: monitoringState,
    errors
  };

  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  return {
    date: state.last_run,
    processedOpportunities: state.processed_items.length,
    generatedDrafts: state.generated_drafts.length,
    needReview: state.pending_review.length,
    errors: state.errors,
    state
  };
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path.relative(root, file)} line ${index + 1}: ${error.message}`);
      }
    });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getPackageState(opportunityId) {
  const dir = path.join(root, "docs/content-pipeline", opportunityId.toLowerCase());
  const required = ["opportunity.md", "brief.md", "draft.md", "schema-plan.md", "distribution.md", "geo-monitoring.md", "review.md"];
  const missing = required.filter((file) => !fs.existsSync(path.join(dir, file)));
  return { ready: missing.length === 0, missing };
}

function getReviewDecision(opportunityId, fallback) {
  const reviewFile = path.join(root, "docs/content-pipeline", opportunityId.toLowerCase(), "review.md");
  if (!fs.existsSync(reviewFile)) return fallback.decision || "needs_revision";

  const review = fs.readFileSync(reviewFile, "utf8").toLowerCase();
  if (review.includes("ready for page implementation: yes") || review.includes("status: approved")) return "approved";
  return "needs_revision";
}
