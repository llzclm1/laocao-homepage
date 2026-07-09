import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const file = path.join(root, "data/growth-os/content-status.json");
const allowedStatuses = new Set(["draft", "review", "published_candidate", "published", "distributed", "monitoring", "improve_or_stop"]);

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];

if (!Array.isArray(data.items)) errors.push("items must be an array");

for (const item of data.items || []) {
  if (!item.id) errors.push("item missing id");
  if (!item.url) errors.push(`${item.id}: missing url`);
  if (!item.publish_date) errors.push(`${item.id}: missing publish_date`);
  if (!allowedStatuses.has(item.status)) errors.push(`${item.id}: invalid status ${item.status}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`checked ${data.items.length} content status records`);
