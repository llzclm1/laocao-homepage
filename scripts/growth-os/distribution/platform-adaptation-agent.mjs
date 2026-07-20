import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateSocialContent } from "./social-content-generator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const rulesFile = path.join(root, "data/growth-os/platform-intelligence/platform-rules.json");
const socialDir = path.join(root, "docs/social/content-pack");

export function adaptPlatformContent(now = new Date()) {
  const rules = readRules();
  const result = generateSocialContent(now);
  const xRule = rules.find((item) => item.platform === "X");
  const packages = fs.existsSync(socialDir)
    ? fs.readdirSync(socialDir).filter((dir) => /^go-\d+$/i.test(dir)).sort()
    : [];

  const xImagePlans = [];
  for (const dir of packages) {
    const xThread = path.join(socialDir, dir, "x-thread.md");
    if (!fs.existsSync(xThread)) continue;

    const text = fs.readFileSync(xThread, "utf8");
    const plan = buildXImagePlan(dir.toUpperCase(), text, xRule);
    const output = path.join(socialDir, dir, "x-image-plan.md");
    fs.writeFileSync(output, plan.markdown, "utf8");
    xImagePlans.push({
      id: dir.toUpperCase(),
      output: path.relative(root, output),
      recommendation: plan.recommendation,
      estimated_cards: plan.estimated_cards
    });
  }

  return {
    ...result,
    rules: path.relative(root, rulesFile),
    x_image_plans: xImagePlans
  };
}

function buildXImagePlan(id, text, rule) {
  const points = text.match(/^\d+\.\s+.+$/gm) || [];
  const totalChars = points.join("\n").length;
  const estimatedCards = totalChars > 500 ? Math.ceil(points.length / 2) : 1;
  const recommendation = totalChars > 500 ? "image_cards" : "thread";
  const markdown = `# ${id} X 图片计划

状态：待审核

## 平台规则

- Text limit: ${rule?.text_limit || "short"}
- Preferred formats: ${(rule?.preferred_formats || []).join(", ")}
- Avoid: ${(rule?.avoid || []).join(", ")}

## 转换建议

- 当前字符数估算：${totalChars}
- 推荐形式：${recommendation}
- 图片卡片数量建议：${estimatedCards}

## 执行说明

X 平台优先短文本。如果内容超过短文本表达范围，使用 thread 或 image card。当前 Growth OS Viewer 使用 \`x-thread.png\` 作为图片卡片输出。
`;

  return {
    markdown,
    recommendation,
    estimated_cards: estimatedCards
  };
}

function readRules() {
  if (!fs.existsSync(rulesFile)) return [];
  return JSON.parse(fs.readFileSync(rulesFile, "utf8")).platforms || [];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = adaptPlatformContent();
  console.log("Growth OS Platform Adaptation Agent");
  console.log(`Packages: ${result.packages}`);
  console.log(`Posts: ${result.posts}`);
  console.log(`X image plans: ${result.x_image_plans.length}`);
  console.log(`Output: ${result.output}`);
}
