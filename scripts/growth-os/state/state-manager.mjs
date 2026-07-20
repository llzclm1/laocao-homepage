import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const lifecycleFile = path.join(root, "data/growth-os/state/content-lifecycle.json");
export const historyFile = path.join(root, "data/growth-os/review-history.jsonl");

const allowedStatus = new Set([
  "discovered",
  "scored",
  "research_ready",
  "draft_ready",
  "review_pending",
  "approved",
  "publish_ready",
  "rejected",
  "revision_required",
  "published",
  "monitoring",
  "learning"
]);

const reviewActions = {
  approve: "approved",
  reject: "rejected",
  revision: "revision_required"
};

export function loadLifecycleState() {
  return readJsonArray(lifecycleFile).map(normalizeLifecycleRecord).sort((a, b) => a.id.localeCompare(b.id));
}

export function saveLifecycleState(rows) {
  const output = rows.map(normalizeLifecycleRecord).sort((a, b) => a.id.localeCompare(b.id));
  fs.mkdirSync(path.dirname(lifecycleFile), { recursive: true });
  fs.writeFileSync(lifecycleFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return output;
}

export function applyReviewActionToState(action, { now = new Date(), writeHistory = true } = {}) {
  const id = normalizeId(action.id);
  const rows = loadLifecycleState();
  const index = rows.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(`Unknown content id: ${id}`);

  const from = rows[index].status;
  const to = nextReviewStatus(from, action.action);
  const date = action.date || now.toISOString().slice(0, 10);
  rows[index] = normalizeLifecycleRecord({
    ...rows[index],
    previous_status: from,
    status: to,
    lifecycle_stage: stageFor(to),
    review_status: reviewStatusFor(to),
    publish_status: publishStatusFor(to),
    monitor_status: monitorStatusFor(to),
    learning_status: learningStatusFor(to),
    updated: date,
    last_action: action.action
  });
  saveLifecycleState(rows);

  const transition = {
    id,
    action: action.action,
    from,
    to,
    date,
    note: String(action.note || "").trim()
  };
  if (writeHistory && from !== to) appendJsonl(historyFile, transition);
  return transition;
}

export function markContentPublished(id, { now = new Date(), note = "" } = {}) {
  const normalizedId = normalizeId(id);
  const rows = loadLifecycleState();
  const index = rows.findIndex((item) => item.id === normalizedId);
  if (index === -1) throw new Error(`Unknown content id: ${normalizedId}`);

  const from = rows[index].status;
  if (!["approved", "publish_ready", "published", "monitoring", "learning"].includes(from)) {
    throw new Error(`${normalizedId} must be approved before it can be marked published`);
  }

  const to = ["approved", "publish_ready"].includes(from) ? "published" : from;
  const date = now.toISOString().slice(0, 10);
  rows[index] = normalizeLifecycleRecord({
    ...rows[index],
    previous_status: from,
    status: to,
    lifecycle_stage: stageFor(to),
    review_status: reviewStatusFor(to),
    publish_status: publishStatusFor(to),
    monitor_status: monitorStatusFor(to),
    learning_status: learningStatusFor(to),
    updated: date,
    last_action: "published"
  });
  saveLifecycleState(rows);

  const transition = { id: normalizedId, action: "published", from, to, date, note: String(note).trim() };
  if (from !== to) appendJsonl(historyFile, transition);
  return transition;
}

export function nextReviewStatus(status, action) {
  if (status !== "review_pending") return status;
  return reviewActions[action] || status;
}

export function validateLifecycleState(rows = loadLifecycleState()) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const item of rows) {
    if (!item.id) errors.push("item missing id");
    if (seen.has(item.id)) errors.push(`${item.id}: duplicate lifecycle record`);
    seen.add(item.id);
    if (!allowedStatus.has(item.status)) errors.push(`${item.id}: invalid status ${item.status}`);
    if (item.status === "review_pending" && item.review_status !== "pending") warnings.push(`${item.id}: review_pending but review_status is ${item.review_status}`);
    if (["approved", "publish_ready"].includes(item.status) && item.review_status !== "approved") warnings.push(`${item.id}: publish queue item without approved review_status`);
    if (["published", "monitoring", "learning"].includes(item.status) && item.publish_status !== "published") warnings.push(`${item.id}: published flow item without published publish_status`);
  }

  return { checked: rows.length, errors, warnings };
}

export function normalizeLifecycleRecord(item) {
  const id = normalizeId(item.id);
  const status = normalizeStatus(item.status || item.lifecycle_stage || "draft_ready");
  return {
    ...item,
    id,
    status,
    lifecycle_stage: stageFor(status),
    review_status: item.review_status || reviewStatusFor(status),
    publish_status: item.publish_status || publishStatusFor(status),
    monitor_status: item.monitor_status || monitorStatusFor(status),
    learning_status: item.learning_status || learningStatusFor(status)
  };
}

function normalizeStatus(status) {
  if (status === "published_candidate") return "monitoring";
  if (status === "review") return "review_pending";
  if (status === "needs_revision") return "revision_required";
  return status;
}

function stageFor(status) {
  if (["discovered", "scored", "research_ready", "draft_ready"].includes(status)) return status;
  if (["review_pending", "approved", "rejected", "revision_required"].includes(status)) return "review";
  if (["publish_ready", "published"].includes(status)) return "publish";
  if (status === "monitoring") return "monitoring";
  if (status === "learning") return "learning";
  return "draft_ready";
}

function reviewStatusFor(status) {
  if (status === "review_pending") return "pending";
  if (["approved", "publish_ready", "published", "monitoring", "learning"].includes(status)) return "approved";
  if (status === "rejected") return "rejected";
  if (status === "revision_required") return "revision_required";
  return "not_started";
}

function publishStatusFor(status) {
  if (status === "publish_ready" || status === "approved") return "ready";
  if (["published", "monitoring", "learning"].includes(status)) return "published";
  return "not_ready";
}

function monitorStatusFor(status) {
  if (status === "monitoring" || status === "learning") return "monitoring";
  return "not_started";
}

function learningStatusFor(status) {
  return status === "learning" ? "learning" : "not_started";
}

function normalizeId(id) {
  return String(id || "").trim().toUpperCase();
}

function readJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(value) ? value : [value];
}

function appendJsonl(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}
