import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const file = path.join(root, "data/growth-os/opportunities.jsonl");
const required = ["id", "question", "source", "intent", "score", "status", "url"];
const allowedStatuses = new Set([
  "captured",
  "scored",
  "approved",
  "brief_ready",
  "draft_ready",
  "review_ready",
  "published_candidate",
  "published",
  "distributed",
  "monitoring",
  "needs_revision",
  "improve_or_stop",
  "rejected"
]);

const lines = fs.existsSync(file)
  ? fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
  : [];

const errors = [];

lines.forEach((line, index) => {
  let item;
  try {
    item = JSON.parse(line);
  } catch (error) {
    errors.push(`line ${index + 1}: invalid JSON (${error.message})`);
    return;
  }

  for (const key of required) {
    if (item[key] === undefined || item[key] === "") errors.push(`${item.id || `line ${index + 1}`}: missing ${key}`);
  }
  if (typeof item.score !== "number" || item.score < 0 || item.score > 100) {
    errors.push(`${item.id}: score must be 0-100`);
  }
  if (!allowedStatuses.has(item.status)) errors.push(`${item.id}: invalid status ${item.status}`);
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`validated ${lines.length} opportunities`);
