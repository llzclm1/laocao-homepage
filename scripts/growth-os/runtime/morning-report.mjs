import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const reportsDir = path.join(root, "docs/growth-os/reports");
const runtimeDir = path.join(root, "data/growth-os/runtime");

export function writeMorningReport(summary, context) {
  const markdownFile = path.join(reportsDir, `growth-report-${context.day}.md`);
  const markdown = renderMarkdown(summary, context);

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(markdownFile, markdown, "utf8");

  if (!context.dryRun) {
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(path.join(runtimeDir, "daily-report.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }

  return path.relative(root, markdownFile);
}

function renderMarkdown(summary, context) {
  return `# Growth OS Daily Report

Date: ${context.day}
Mode: ${context.dryRun ? "dry-run" : "live"}

## Summary

- New opportunities: ${summary.new_opportunities}
- High priority: ${summary.high_priority.length}
- Medium priority: ${summary.medium_priority.length}
- GEO queries: ${summary.geo_queries}
- GEO tasks: ${summary.geo_tasks}
- Need review: ${summary.need_review}
- Archived: ${summary.archived.length}
- GO packages: ${summary.generated_packages.length}
- State errors: ${summary.state_validation.errors.length}

## High Priority

${renderItems(summary.high_priority)}

## Medium Priority

${renderItems(summary.medium_priority)}

## Recommended Actions

${renderList(summary.recommended_actions)}

## GO Packages

${summary.generated_packages.length ? summary.generated_packages.map((item) => `- ${item.id}: ${item.status} (${item.folder})`).join("\n") : "- None"}

## Reports

- Review queue: ${summary.review_queue}
- GEO report: ${summary.geo_report}
- Performance report: ${summary.performance_report}
- Dashboard: docs/growth-os/dashboard.md
`;
}

function renderItems(items) {
  if (!items.length) return "- None";
  return items.map((item) => `- ${item.id}: ${item.title} (score ${item.score})`).join("\n");
}

function renderList(items) {
  if (!items.length) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}
