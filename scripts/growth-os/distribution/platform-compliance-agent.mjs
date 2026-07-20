import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rulesFile = path.join(root, "data/growth-os/platform-intelligence/platform-rules.json");
const socialDir = path.join(root, "docs/social/content-pack");
const outputDir = path.join(root, "docs/growth-os/social-compliance");
const summaryFile = path.join(root, "data/growth-os/platform-intelligence/compliance-summary.json");

const platformFiles = [
  ["LinkedIn", "linkedin.md"],
  ["Reddit", "reddit.md"],
  ["X", "x-thread.md"],
  ["Substack", "substack.md"],
  ["Medium", "medium.md"]
];

export function runPlatformCompliance(now = new Date()) {
  const rules = new Map(readRules().map((item) => [item.platform, item]));
  const packages = fs.existsSync(socialDir)
    ? fs.readdirSync(socialDir).filter((dir) => /^go-\d+$/i.test(dir)).sort()
    : [];
  const items = [];

  fs.mkdirSync(outputDir, { recursive: true });
  for (const dir of packages) {
    const id = dir.toUpperCase();
    const reviews = [];
    for (const [platform, fileName] of platformFiles) {
      const file = path.join(socialDir, dir, fileName);
      if (!fs.existsSync(file)) continue;

      const review = reviewPlatform(platform, fs.readFileSync(file, "utf8"), rules.get(platform));
      reviews.push(review);
      items.push({
        id,
        platform,
        risk: review.risk,
        status: review.status,
        issues: review.issues,
        recommendation: review.recommendation
      });
    }

    fs.writeFileSync(path.join(outputDir, `${id}-review.md`), renderReport(id, reviews), "utf8");
  }

  const passed = items.filter((item) => item.status === "passed").length;
  const needsRevision = items.filter((item) => item.status === "needs_revision").length;
  const summary = {
    generated_at: now.toISOString(),
    social_ready: items.length,
    compliance_passed: passed,
    need_revision: needsRevision,
    reports_dir: path.relative(root, outputDir),
    items
  };

  fs.mkdirSync(path.dirname(summaryFile), { recursive: true });
  fs.writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return summary;
}

function reviewPlatform(platform, text, rule = {}) {
  const issues = [];
  const lower = text.toLowerCase();

  for (const phrase of rule.avoid || []) {
    if (lower.includes(phrase.toLowerCase())) issues.push(`Avoid phrase or pattern: ${phrase}`);
  }

  if (/(we|gewuji).{0,24}(verify|audit|inspect|guarantee|protect)|supplier reliability guarantee|payment safety guarantee/i.test(text)) {
    issues.push("Boundary risk: avoid verification, audit, inspection, payment protection, or guarantee claims.");
  }

  if (platform === "Reddit") {
    if (/gewuji/i.test(text)) issues.push("Brand mention detected; only keep if the thread context clearly asks for this kind of service.");
    if (/https?:\/\//i.test(text)) issues.push("External link detected; Reddit should avoid unnecessary links.");
    if (/if relevant, mention/i.test(text)) issues.push("Draft contains internal instruction language; rewrite before posting.");
    if (/no hard sell|do not post|not for publication/i.test(text)) issues.push("Draft contains internal instruction language; rewrite before posting.");
    const isComment = text.includes("## 评论正文");
    const answer = text.split(/## (?:回答|评论正文)/)[1] || "";
    const tooShort = isComment ? answer.length < 280 : answer.length < 500;
    const missingSteps = !isComment && (answer.match(/^[-*]\s+/gm) || []).length < 3;
    if (tooShort || missingSteps) {
      issues.push("Low-effort risk: add a direct answer plus concrete steps or examples.");
    }
  }

  if (platform === "X" && !fs.existsSync(path.join(socialDir, findCurrentPackage(text), "x-image-plan.md"))) {
    const bodyChars = text.replace(/^#.+$/gm, "").length;
    if (bodyChars > 500) issues.push("Long X text detected; use thread or image card.");
  }

  if (platform === "LinkedIn" && (text.match(/(^|\s)#[\w-]+/g) || []).length > 5) {
    issues.push("Too many hashtags for LinkedIn.");
  }

  if (platform === "Medium" && /keyword stuffing|seo keyword/i.test(text)) {
    issues.push("Medium should avoid SEO-first wording.");
  }

  return {
    platform,
    risk: rule.risk_level?.toUpperCase() || "MEDIUM",
    status: issues.length ? "needs_revision" : "passed",
    issues,
    recommendation: issues.length ? recommendationFor(platform) : "Ready for human review."
  };
}

function findCurrentPackage(text) {
  return String(text.match(/^#\s+(GO-\d+)/m)?.[1] || "").toLowerCase();
}

function recommendationFor(platform) {
  if (platform === "Reddit") return "Rewrite as answer-first community advice; remove brand-first or internal instruction language.";
  if (platform === "X") return "Use a short thread or image card instead of long paragraphs.";
  if (platform === "LinkedIn") return "Reduce promotion and keep the post as professional experience sharing.";
  if (platform === "Medium") return "Add practical examples and keep a human perspective.";
  return "Review before publishing.";
}

function renderReport(id, reviews) {
  return `# ${id} Platform Compliance Review

${reviews.map((review) => `## ${review.platform}

Risk: ${review.risk}

Status: ${review.status}

Issues:
${review.issues.length ? review.issues.map((item) => `- ${item}`).join("\n") : "- None"}

Recommendation:
${review.recommendation}
`).join("\n")}
`;
}

function readRules() {
  if (!fs.existsSync(rulesFile)) return [];
  return JSON.parse(fs.readFileSync(rulesFile, "utf8")).platforms || [];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runPlatformCompliance();
  console.log("Growth OS Platform Compliance Agent");
  console.log(`Social ready: ${result.social_ready}`);
  console.log(`Compliance passed: ${result.compliance_passed}`);
  console.log(`Need revision: ${result.need_revision}`);
  console.log(`Reports: ${result.reports_dir}`);
}
