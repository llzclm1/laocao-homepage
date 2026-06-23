const toolLabels = {
  xiaohongshu: "小红书文案生成器",
  moments: "朋友圈文案生成器",
  campaign: "活动宣传文案生成器",
  doubao: "豆包生图提示词生成器",
  sellingPoints: "商品卖点提炼工具"
};

let currentTool = "xiaohongshu";

const form = document.querySelector("#generator-form");
const output = document.querySelector("#tool-output");
const currentToolLabel = document.querySelector("#current-tool-label");
const copyButton = document.querySelector("#copy-output");
const tabs = document.querySelectorAll(".tool-tab");

function lines(value) {
  return value
    .split(/[\n；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readForm() {
  const data = new FormData(form);
  const category = String(data.get("category") || "你的行业").trim();
  const topic = String(data.get("topic") || "今天要宣传的内容").trim();
  const highlights = String(data.get("highlights") || "请补充亮点").trim();
  const tone = String(data.get("tone") || "自然亲切").trim();
  const cta = String(data.get("cta") || "欢迎了解").trim();
  const points = lines(highlights);

  return { category, topic, highlights, tone, cta, points };
}

function listPoints(points) {
  return points.map((point, index) => `${index + 1}. ${point}`).join("\n");
}

function generateXiaohongshu(data) {
  return `小红书文案生成器

标题备选：
1. ${data.topic}，最近真的可以试试
2. ${data.category}这次活动，适合认真看看
3. 想找${data.category}灵感的人，可以先收藏

正文：
最近在做「${data.topic}」，整体风格会更偏${data.tone}。

这次最想强调的几个点：
${listPoints(data.points)}

如果你正在找一个更省心的选择，这个活动比较适合先体验一下。${data.cta}。

话题标签：
#${data.category} #小红书文案生成器 #活动宣传 #经营内容助手`;
}

function generateMoments(data) {
  return `朋友圈文案生成器

今天想认真推荐一下：${data.topic}。

${data.highlights}

这条不写得太复杂，重点就是希望大家能更快知道有什么、适合谁、怎么参与。

感兴趣的话，${data.cta}。`;
}

function generateCampaign(data) {
  return `活动宣传文案生成器

活动主题：
${data.topic}

适合人群：
正在关注${data.category}、想要轻松体验、希望用更低成本尝试的用户。

活动亮点：
${listPoints(data.points)}

宣传正文：
这次活动围绕「${data.topic}」展开，信息简单清楚，适合直接转发到朋友圈、小红书、社群和视频号简介里。

行动引导：
${data.cta}`;
}

function generateDoubao(data) {
  return `豆包生图提示词生成器

主体：
${data.topic}

画面内容：
以${data.category}为核心场景，突出${data.points[0] || data.highlights}，整体氛围${data.tone}。

构图与光线：
主体位于画面中心偏前景，背景保持真实生活感，柔和自然光，细节清晰，适合社媒宣传图。

风格：
真实商业摄影，干净画面，高质感，适合朋友圈、小红书和视频号封面。

完整提示词：
${data.topic}，${data.category}场景，${data.highlights}，${data.tone}氛围，真实商业摄影，柔和自然光，主体清晰，背景简洁，有生活感，适合社媒宣传图。`;
}

function generateSellingPoints(data) {
  return `商品卖点提炼工具

一句话卖点：
${data.topic}，适合想要更轻松解决${data.category}需求的用户。

核心卖点：
${listPoints(data.points)}

用户利益：
1. 更快理解这个产品或活动是否适合自己。
2. 减少选择成本，信息更直接。
3. 可以马上根据「${data.cta}」完成下一步行动。

可用于页面短句：
${data.topic}，把复杂选择变简单。`;
}

function generate() {
  const data = readForm();
  const generators = {
    xiaohongshu: generateXiaohongshu,
    moments: generateMoments,
    campaign: generateCampaign,
    doubao: generateDoubao,
    sellingPoints: generateSellingPoints
  };

  output.textContent = generators[currentTool](data);
  currentToolLabel.textContent = toolLabels[currentTool];
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentTool = tab.dataset.tool;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    generate();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

copyButton.addEventListener("click", async () => {
  const text = output.textContent.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "已复制";
  } catch {
    copyButton.textContent = "复制失败";
  }

  window.setTimeout(() => {
    copyButton.textContent = "复制";
  }, 1400);
});

generate();
