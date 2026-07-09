import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const pipelineDir = path.join(root, "docs/content-pipeline");
const outputDir = path.join(root, "docs/social/content-pack");

const platforms = ["linkedin", "reddit", "x-thread", "substack", "medium"];

export function generateSocialContent(now = new Date()) {
  const packages = readPackages();
  const items = [];

  fs.mkdirSync(outputDir, { recursive: true });
  for (const item of packages) {
    const dir = path.join(outputDir, item.id.toLowerCase());
    fs.mkdirSync(dir, { recursive: true });

    for (const platform of platforms) {
      const file = path.join(dir, `${platform}.md`);
      fs.writeFileSync(file, renderPlatform(platform, item), "utf8");
      items.push({
        content_id: item.id,
        platform,
        file: path.relative(root, file),
        status: "generated",
        generated_at: now.toISOString()
      });
    }
  }

  return {
    output: path.relative(root, outputDir),
    status: "generated",
    packages: packages.length,
    posts: items.length,
    items
  };
}

function readPackages() {
  if (!fs.existsSync(pipelineDir)) return [];
  return fs.readdirSync(pipelineDir)
    .filter((dir) => /^go-\d+$/i.test(dir))
    .sort()
    .map((dir) => {
      const base = path.join(pipelineDir, dir);
      const opportunity = read(path.join(base, "opportunity.md"));
      const brief = read(path.join(base, "brief.md"));
      const draft = read(path.join(base, "draft.md"));
      return {
        id: dir.toUpperCase(),
        title: section(opportunity, "Title") || heading(draft) || dir.toUpperCase(),
        question: section(opportunity, "Buyer Question") || section(opportunity, "User Question"),
        directAnswer: section(draft, "Direct Answer") || section(brief, "Direct Answer Direction"),
        boundary: section(opportunity, "Boundary") || section(opportunity, "Boundary Risk")
      };
    });
}

function renderPlatform(platform, item) {
  if (platform === "linkedin") return `# ${item.id} LinkedIn 草稿

状态：待审核

## 开头钩子

A supplier saying "yes" is not the same as a buyer understanding what is still unclear.

## 正文

${item.title}

For buyers sourcing from China, the useful next step is often not a bigger claim. It is a clearer question:

${item.question || "What information is confirmed, unclear, or still missing?"}

${item.directAnswer}

## 行动引导

If you have an unclear supplier reply, quotation, sample term, or payment detail, review the communication before moving forward.

## 话题标签

#sourcing #manufacturing #supplychain #china
`;

  if (platform === "reddit") return `# ${item.id} Reddit 草稿

状态：待审核

## 标题

${item.question || item.title}

## 回答

I would not treat this as a yes/no supplier check. I would first separate what the supplier actually confirmed from what is still missing.

For this situation, ask:

- What exactly is confirmed?
- What is still unclear?
- What would change before bulk production or payment?
- What evidence or document would make the next step easier to understand?

${item.directAnswer}

No hard sell. If relevant, mention that Gewuji reviews supplier communication, not supplier reliability.
`;

  if (platform === "x-thread") return `# ${item.id} X 串文草稿

状态：待审核

1. ${item.title}

2. The common mistake is treating a supplier reply as proof. It is usually only a starting point.

3. A better question: what has been confirmed, what is unclear, and what still needs a follow-up?

4. ${item.directAnswer}

5. Use this as a communication clarity check, not as verification, audit, inspection, or payment protection.
`;

  if (platform === "substack") return `# ${item.id} Substack 草稿

状态：待审核

## 大纲

1. Why this buyer question matters
2. What the supplier reply can clarify
3. What it cannot prove
4. Questions to ask before the next step
5. Where Supplier Reply Review fits

## 开头

${item.title} is a practical sourcing question because it usually appears before a buyer commits time, money, or trust.

## 要点

- Keep the focus on communication clarity.
- Separate confirmed information from missing information.
- Do not turn the answer into supplier verification or a payment guarantee.
`;

  return `# ${item.id} Medium 草稿

状态：待审核

## 文章大纲

标题：${item.title}

1. Direct answer
2. Why buyers ask this question
3. What information is usually missing
4. Practical checklist
5. Follow-up question examples
6. Boundary: not verification, audit, inspection, or payment protection
7. Next step: review the supplier communication before moving forward
`;
}

function section(text, name) {
  return text.match(new RegExp(`^## ${name}\\s+([\\s\\S]*?)(?=\\n## |$)`, "m"))?.[1]?.trim() || "";
}

function heading(text) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateSocialContent();
  console.log("Growth OS Social Content Generator");
  console.log(`Packages: ${result.packages}`);
  console.log(`Posts: ${result.posts}`);
  console.log(`Output: ${result.output}`);
  console.log(`Status: ${result.status}`);
}
