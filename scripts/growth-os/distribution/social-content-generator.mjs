import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fitXText } from "../discovery/platform-policy.mjs";

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
    fs.writeFileSync(
      path.join(dir, "social-image-brief.md"),
      renderImageBrief(item, fs.existsSync(path.join(dir, "social-image.png"))),
      "utf8"
    );
  }

  return {
    output: path.relative(root, outputDir),
    status: "generated",
    packages: packages.length,
    posts: items.length,
    items
  };
}

function renderImageBrief(item, imageExists) {
  const profile = topicProfile(item);
  return `# ${item.id} 社媒配图说明

状态：${imageExists ? "已生成" : "待生成"}

## 内容主题

${profile.subject}

## 视觉方向

${profile.imageBrief}

## 固定限制

- 使用真实、克制的编辑摄影风格。
- 不使用品牌、可读文字、水印或伪造认证。
- 不暗示供应商验证、工厂审核、质量检验或付款保护。
- 文件名：\`social-image.png\`。
`;
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
  const profile = topicProfile(item);

  if (platform === "linkedin") return `# ${item.id} LinkedIn 草稿

状态：待审核

## 开头钩子

${profile.linkedinHook}

## 正文

One sourcing habit that saves a lot of back-and-forth: turn the supplier's “yes” into a written scope before the next payment or production step.

For ${profile.subject}, I would want the reply to make three things clear:

- ${profile.points[0]}
- ${profile.points[1]}
- ${profile.points[2]}

This is not about assuming the worst. It is about making sure the buyer and supplier are talking about the same deliverable before the next commitment.

## 讨论问题

${profile.question}

## 话题标签

#sourcing #supplychain #manufacturing
`;

  if (platform === "reddit") return `# ${item.id} Reddit 草稿

状态：待审核

## 使用方式

只用于已有、相关的真实讨论下方。不要作为新帖发布，不带链接或品牌介绍。

## 评论正文

${redditComment(item)}
`;

  if (platform === "x-thread") return renderXThread(item, profile);

  if (platform === "substack") return `# ${item.id} Substack 草稿

状态：待审核

## 大纲

1. The sourcing decision hidden inside this question
2. The details that need a written answer
3. What can still change after a “yes”
4. A practical follow-up message
5. What a buyer should decide next

## 开头

${profile.substackOpening}

## 要点

- ${profile.points[0]}
- ${profile.points[1]}
- ${profile.points[2]}
- Separate what is documented from what is only assumed.

## 读者问题

${profile.question}
`;

  return `# ${item.id} Medium 草稿

状态：待审核

## 文章大纲

标题：${item.title}

副标题：${profile.mediumDeck}

1. The practical decision behind the question
2. Why a short supplier reply is rarely enough
3. The three details to compare or confirm
4. A worked example of a better follow-up question
5. What remains unknown after the answer
6. A checklist before the next commitment

## 开篇角度

${profile.mediumOpening}
`;
}

export function renderXThread(item, profile = topicProfile(item)) {
  const posts = [
    profile.xHook,
    profile.points[0],
    profile.points[1],
    profile.points[2],
    "The goal is a clearer order scope, not a guess based on a short reply."
  ].map((text) => fitXText(text));
  return `# ${item.id} X 串文草稿

状态：待审核

1/5 ${posts[0]}

2/5 ${posts[1]}

3/5 ${posts[2]}

4/5 ${posts[3]}

5/5 ${posts[4]}
`;
}

function redditComment(item) {
  const topic = `${item.title} ${item.question}`.toLowerCase();
  if (topic.includes("sample")) return `One thing I'd clarify first is what kind of sample it is. A stock sample, a custom sample, and a pre-production sample can answer very different questions.

I'd ask the supplier to confirm the exact material, finish, packaging, and what is different from the eventual bulk order. I would also separate the sample fee, shipping, and any tooling or printing cost. That makes it easier to judge whether the sample is useful for the next decision rather than just whether it looks good.`;
  if (topic.includes("deposit")) return `I'd ask them to put the order scope into one clean written summary before paying: exact specification, quantity, price, trade term, what the deposit covers, when the balance is due, and what can change the price or lead time.

If a supplier gives a vague “yes” in chat, I usually ask them to restate that point in the summary. It is much easier to spot a mismatch before payment when both sides are looking at the same description of the order.`;
  if (topic.includes("video")) return `A factory video can be useful context, but I would treat it as a snapshot. It can show that a product, process, or machine was visible at that moment; it does not answer every question about the future order.

I find it more useful to ask for specific shots related to the product and process being discussed than to rely on a generic factory tour.`;
  if (topic.includes("quotation") || topic.includes("alibaba")) return `I would compare the scope before comparing the headline price. Make sure the material, finish, quantity, packaging, trade term, lead time, and separate charges are actually the same.

If one quote says “packaging included” and another only says “packing,” I would ask both suppliers to spell out what is included before treating the numbers as comparable.`;
  return `I would ask the supplier to separate what is confirmed from what still needs a written answer. For any detail that affects the order, cost, or timing, it is safer to get a clear restatement than to infer the meaning from a short reply.`;
}

function topicProfile(item) {
  const topic = `${item.title} ${item.question}`.toLowerCase();

  if (topic.includes("sample")) return {
    subject: "a sample order",
    linkedinHook: "A sample is useful only when both sides agree on what it represents.",
    xHook: "A supplier saying “we can send a sample” is not the end of the question. It is the start.",
    points: [
      "What kind of sample it is: stock, custom, or pre-production.",
      "What materials, packaging, branding, and accessories are actually included.",
      "Which costs, timings, and bulk-order details still need written confirmation."
    ],
    question: "What is the one sample detail you now ask suppliers to confirm in writing?",
    substackOpening: "A sample order looks like a small sourcing step, but it often sets expectations for a much larger order. The phrase “we can send a sample” hides several decisions: what is being sampled, what the buyer is paying for, and how closely it resembles a future bulk order.",
    mediumDeck: "A practical way to define what a supplier sample will and will not answer.",
    mediumOpening: "The useful sample question is not whether a supplier can send one. It is whether the buyer can describe the sample scope clearly enough that the reply leaves fewer assumptions behind.",
    imageBrief: "打开的样品运输箱中放着未贴牌的实体样品，旁边是自然褶皱的规格纸、卡尺和笔。强调样品范围与细节确认，不要整齐平铺的纸张。",
    reddit: `I'd get the supplier to put the sample scope in one message before paying. The main problem is that “sample” can mean a stock item, a quick mock-up, or something close to the eventual order.

I would ask:

- Is this a stock sample, a custom sample, or a pre-production sample?
- What exact material, dimensions, color, finish, logo, packaging, and accessories are included?
- Which parts will be different in a future bulk order?
- What are the separate costs for the sample, shipping, tooling, printing, and any refundable fee?
- What is the sample lead time, shipping method, and what needs written approval before production?

The useful question is not just “can you send one?” It is “what will this sample actually tell me, and what will still be unknown afterward?” A good-looking sample can still leave the bulk specification, packaging, or production process unclear.`
  };

  if (topic.includes("deposit")) return {
    subject: "a supplier deposit",
    linkedinHook: "The deposit is rarely the hard part. The hard part is whether the order scope is clear before it is paid.",
    xHook: "Before a supplier deposit, ask for one clean written order summary. Do not rely on a long chat history.",
    points: [
      "The exact product, quantity, price, currency, and trade term.",
      "What the deposit covers, when the balance is due, and what starts the production clock.",
      "Which changes can alter price, lead time, MOQ, packaging, or payment details."
    ],
    question: "Which deposit detail has caused the most confusion in your sourcing process?",
    substackOpening: "The word “deposit” makes a sourcing decision feel financial, but most deposit problems begin earlier as information problems. A buyer may have a price and a payment request while still lacking one shared description of the order that price refers to.",
    mediumDeck: "How to turn scattered supplier messages into one order summary before a deposit.",
    mediumOpening: "Before a deposit is paid, the buyer should be able to point to one written summary and say: this is the product, scope, timing, and payment arrangement we both mean.",
    imageBrief: "采购桌上有略微折过的报价单、计算器、材料色卡和样品包装。强调付款前比对订单范围，不出现现金、银行卡或品牌。",
    reddit: `Before paying a deposit, I would ask for one clean written summary rather than relying on a long chat history.

At minimum, make sure it states:

- the exact product specification, quantity, price, currency, and trade term;
- what the deposit covers and when the remaining balance is due;
- the production lead time and what event starts that clock;
- packaging, labels, accessories, and any tooling or sample costs;
- which changes would affect price, timing, or minimum order quantity;
- the beneficiary name and payment details shown on the current quotation or pro forma invoice.

If a reply is vague, I would ask the supplier to restate the point in the summary instead of interpreting “yes” as agreement. The goal is simply to make sure both sides are discussing the same order before money changes hands.`
  };

  if (topic.includes("video")) return {
    subject: "a factory video",
    linkedinHook: "A factory video can answer a useful question, but only if you ask it to show something specific.",
    xHook: "A factory video is context, not a conclusion.",
    points: [
      "What was visibly present in the video at that time.",
      "Whether the footage answers a specific request about the product or process.",
      "Which claims about ownership, capacity, quality, or delivery still need other evidence."
    ],
    question: "What specific shot would make a supplier video more useful for your next decision?",
    substackOpening: "Factory videos are persuasive because they make a distant supplier feel tangible. But their value improves sharply when they are treated as a response to a specific question rather than as a generic tour.",
    mediumDeck: "A practical framework for interpreting supplier video without over-reading it.",
    mediumOpening: "The problem with a polished factory video is not that it is useless. The problem is that viewers often give it answers it was never designed to provide.",
    imageBrief: "真实车间里，一位从背后拍摄的工作人员用手机记录某个工序；画面同时保留局部设备和环境上下文，表达视频只是一个有限视角。",
    reddit: `A factory video can be useful context, but I would treat it as a snapshot, not proof of every claim being made.

It can show things like:

- that certain people, products, equipment, or work areas were visible at that time;
- how a product appears to be handled or assembled;
- whether the supplier can answer a specific request with relevant footage.

It usually cannot answer, on its own:

- whether the site is owned by the seller or how much of the work is outsourced;
- whether the equipment is being used for your product or your specification;
- whether current capacity, material, quality controls, or delivery timing match a quotation.

If you request a video, ask for a short list of specific shots: the product, the relevant process, packaging, and a dated reference to your order. That is more useful than a polished generic tour.`
  };

  if (topic.includes("quotation") || topic.includes("alibaba")) return {
    subject: "supplier quotations",
    linkedinHook: "The lowest supplier quote is often not the lowest comparable offer.",
    xHook: "Do not compare supplier quotations by the headline price until you normalize the scope.",
    points: [
      "Whether the material, finish, accessories, and quantity are genuinely the same.",
      "Which separate costs are excluded from the headline number.",
      "Whether payment terms, trade terms, lead time, and price validity match."
    ],
    question: "What line item do you always normalize before comparing two supplier quotations?",
    substackOpening: "Quotations create a false sense of precision. Two suppliers can both quote a product name and a unit price while describing different materials, packaging, payment schedules, or delivery terms.",
    mediumDeck: "A like-for-like method for comparing supplier quotations beyond the unit price.",
    mediumOpening: "A comparison becomes useful only after the buyer has made the suppliers' quoted scopes comparable. Before that, a lower price may simply mean fewer included details.",
    imageBrief: "三份角度不同、边角有轻微折痕的报价单，配材料色卡、小型零件、尺子和夹子。强调逐项对比，不要优惠标签或金钱符号。",
    reddit: `I would put the quotations side by side and normalize the terms before looking at the headline price. A cheaper quote is often just quoting a different product or scope.

For each supplier, compare:

- product specification, material, dimensions, finish, and included accessories;
- MOQ and price breaks at the same quantity;
- tooling, printing, packaging, sample, shipping, and other separate charges;
- trade term, destination, lead time, and validity period;
- payment schedule and what changes can affect price or timing.

Then send the same follow-up questions to every supplier. If one quote says “custom packaging included” and another simply says “packing,” I would not call them comparable until both explain exactly what that means. The goal is to compare like for like, not to pick the lowest number.`
  };

  return {
    subject: "a supplier reply",
    linkedinHook: "A quick supplier reply is useful only when it reduces assumptions.",
    xHook: "Turn a supplier “yes” into a written scope before making the next commitment.",
    points: ["What is confirmed.", "What remains unclear.", "What needs a follow-up before the next step."],
    question: "Which supplier reply do you find hardest to interpret?",
    substackOpening: "Clear sourcing decisions start with clear information. The useful task is separating what a supplier has stated from what the buyer is assuming.",
    mediumDeck: "A practical method for clarifying supplier communication before the next step.",
    mediumOpening: "A short confirmation can sound complete while still leaving the decision-critical details unstated.",
    imageBrief: "一张自然处理过的供应商沟通记录与产品样品、笔记本并置，突出确认信息与待确认信息的区分。",
    reddit: `I would start by asking the supplier to separate confirmed details from assumptions and missing information. A useful reply should make the next decision easier without relying on vague “yes” answers.

Ask for the exact scope, cost, timing, exclusions, and what would change before the next commitment. If a point matters to the order, get it restated clearly in writing rather than inferring it from a short chat reply.`
  };
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
