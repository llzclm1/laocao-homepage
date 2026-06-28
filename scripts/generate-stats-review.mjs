import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const inputDir = path.join(root, "tools/site-stats-review/input");
const outputDir = path.join(root, "outputs/stats-reviews");
const today = new Date().toISOString().slice(0, 10);

const files = fs.existsSync(inputDir)
  ? fs.readdirSync(inputDir).filter((name) => /\.(csv|json)$/i.test(name))
  : [];

const platformFiles = {
  ga: files.find((name) => /(ga4|google|analytics)/i.test(name)),
  clarity: files.find((name) => /clarity/i.test(name)),
  cloudflare: files.find((name) => /cloudflare|cf/i.test(name)),
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((item) => item.trim());
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])),
  );
}

if (process.argv.includes("--self-test")) {
  assert.deepEqual(parseCsv('page,views\n"/a,b",12\n'), [{ page: "/a,b", views: "12" }]);
  console.log("self-test passed");
  process.exit(0);
}

function readPlatform(key) {
  const file = platformFiles[key];
  if (!file) return { file: null, rows: [] };

  const fullPath = path.join(inputDir, file);
  const text = fs.readFileSync(fullPath, "utf8");
  const rows = file.endsWith(".json") ? JSON.parse(text) : parseCsv(text);
  return { file, rows: Array.isArray(rows) ? rows : [rows] };
}

function valueOf(row, names) {
  const entries = Object.entries(row ?? {});
  const found = entries.find(([key]) => names.some((name) => key.toLowerCase().includes(name)));
  return found?.[1] ?? "";
}

function numberOf(row, names) {
  const raw = String(valueOf(row, names)).replace(/,/g, "");
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function sum(rows, names) {
  const values = rows.map((row) => numberOf(row, names)).filter((value) => value !== null);
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function top(rows, labelNames, metricNames, limit = 5) {
  return rows
    .map((row) => ({
      label: valueOf(row, labelNames),
      value: numberOf(row, metricNames) ?? 0,
    }))
    .filter((item) => item.label)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function formatNumber(value) {
  return value === null || value === undefined ? "缺数据" : Math.round(value).toLocaleString("zh-CN");
}

function list(items) {
  return items.length ? items.map((item) => `${item.label}（${formatNumber(item.value)}）`).join("、") : "缺数据";
}

const ga = readPlatform("ga");
const clarity = readPlatform("clarity");
const cloudflare = readPlatform("cloudflare");

const gaStats = {
  users: sum(ga.rows, ["users", "用户"]),
  sessions: sum(ga.rows, ["sessions", "会话"]),
  views: sum(ga.rows, ["views", "浏览"]),
  newUsers: sum(ga.rows, ["new users", "newusers", "新用户"]),
  engagement: sum(ga.rows, ["engagement", "互动"]),
  topPages: top(ga.rows, ["page", "path", "页面"], ["views", "浏览", "sessions", "会话"]),
  lowPages: top(ga.rows, ["page", "path", "页面"], ["bounce", "跳出", "low engagement", "低互动"]),
  sources: top(ga.rows, ["source", "medium", "channel", "来源", "渠道"], ["users", "sessions", "用户", "会话"], 8),
};

const clarityStats = {
  sessions: sum(clarity.rows, ["sessions", "会话"]),
  recordings: sum(clarity.rows, ["recordings", "录屏"]),
  duration: sum(clarity.rows, ["duration", "time", "停留"]),
  scroll: sum(clarity.rows, ["scroll", "滚动"]),
  rage: sum(clarity.rows, ["rage"]),
  dead: sum(clarity.rows, ["dead"]),
  quick: sum(clarity.rows, ["quick"]),
  pages: top(clarity.rows, ["page", "path", "页面"], ["sessions", "会话"]),
};

const cfStats = {
  requests: sum(cloudflare.rows, ["requests", "请求"]),
  visitors: sum(cloudflare.rows, ["visitors", "访客"]),
  threats: sum(cloudflare.rows, ["threats", "blocked", "拦截", "威胁"]),
  bots: sum(cloudflare.rows, ["bot", "机器人", "爬虫"]),
  countries: top(cloudflare.rows, ["country", "国家", "地区"], ["requests", "请求", "visitors", "访客"], 8),
  paths: top(cloudflare.rows, ["path", "url", "路径"], ["requests", "请求"], 8),
};

const humanSignals = [
  gaStats.users && gaStats.sessions ? "GA 有用户和会话记录" : "",
  clarityStats.recordings ? "Clarity 有录屏可回看" : "",
  clarityStats.scroll ? "Clarity 有滚动行为" : "",
].filter(Boolean);

const botSignals = [
  cfStats.bots ? `Cloudflare 标记 Bot/爬虫 ${formatNumber(cfStats.bots)}` : "",
  cfStats.threats ? `安全拦截 ${formatNumber(cfStats.threats)}` : "",
  cfStats.requests && gaStats.sessions && cfStats.requests > gaStats.sessions * 20
    ? "Cloudflare 请求量明显高于 GA 会话，可能含静态资源、爬虫或被拦截流量"
    : "",
].filter(Boolean);

const missing = Object.entries(platformFiles)
  .filter(([, file]) => !file)
  .map(([key]) => key.toUpperCase())
  .join("、");

const report = `# 网站统计复盘报告

生成日期：${today}
数据范围：最近 3 天
数据来源：${[ga.file, clarity.file, cloudflare.file].filter(Boolean).join("、") || "暂无导出文件"}

## 1. 总体结论

${humanSignals.length ? humanSignals.join("；") : "目前缺少 GA/Clarity 数据，无法确认真实访问质量。"}
${botSignals.length ? botSignals.join("；") : "Cloudflare 暂未看到可量化的异常流量信号。"}
${missing ? `缺少 ${missing} 数据，本次结论需要补充后再复盘。` : "三个平台数据已纳入对比，优先以 GA 和 Clarity 判断真人访问。"}

## 2. 真实访问判断

更可能是真人的访问：${humanSignals.length ? humanSignals.join("；") : "需要 GA 用户、会话和 Clarity 录屏/滚动数据确认"}。
更可能是爬虫或异常流量：${botSignals.length ? botSignals.join("；") : "暂无明确证据"}。

## 3. 三个平台数据对比

| 平台 | 主要数据 | 判断 | 备注 |
| --- | --- | --- | --- |
| Google Analytics | 用户 ${formatNumber(gaStats.users)}；会话 ${formatNumber(gaStats.sessions)}；浏览 ${formatNumber(gaStats.views)}；新用户 ${formatNumber(gaStats.newUsers)} | ${ga.rows.length ? "用于判断真实用户和来源" : "缺数据"} | 热门页面：${list(gaStats.topPages)} |
| Microsoft Clarity | Sessions ${formatNumber(clarityStats.sessions)}；录屏 ${formatNumber(clarityStats.recordings)}；滚动 ${formatNumber(clarityStats.scroll)} | ${clarity.rows.length ? "用于判断用户是否看懂页面" : "缺数据"} | 异常点击：Rage ${formatNumber(clarityStats.rage)} / Dead ${formatNumber(clarityStats.dead)} / Quick backs ${formatNumber(clarityStats.quick)} |
| Cloudflare | 请求 ${formatNumber(cfStats.requests)}；独立访客 ${formatNumber(cfStats.visitors)}；Bot ${formatNumber(cfStats.bots)}；拦截 ${formatNumber(cfStats.threats)} | ${cloudflare.rows.length ? "只作流量和安全辅助判断" : "缺数据"} | 国家/地区：${list(cfStats.countries)} |

## 4. 来源渠道分析

主要来源：${list(gaStats.sources)}。
继续优先发布有 GA 会话且 Clarity 有停留/滚动的渠道；只有 Cloudflare 请求、没有 GA/Clarity 行为的来源，先不要当作有效获客。

## 5. 用户行为分析

- 用户有没有滚动：${clarityStats.scroll ? `有，滚动数据 ${formatNumber(clarityStats.scroll)}` : "缺少或未发现滚动数据"}
- 有没有点击：${clarity.rows.length ? "请结合 Clarity 热力图确认主要点击区域" : "缺少 Clarity 数据"}
- 有没有明显卡住：${clarityStats.rage || clarityStats.dead ? "有异常点击信号，需要回看录屏" : "暂未发现可量化卡住信号"}
- 有没有很快退出：${clarityStats.quick ? `Quick backs ${formatNumber(clarityStats.quick)}，需要关注` : "暂未发现可量化快速返回信号"}
- 需要优化页面：${list(clarityStats.pages)}

## 6. 异常流量分析

- 爬虫/机器人：${cfStats.bots ? formatNumber(cfStats.bots) : "缺数据或未发现"}
- 异常国家访问：${list(cfStats.countries)}
- 突然暴增请求：${cfStats.requests && gaStats.sessions && cfStats.requests > gaStats.sessions * 20 ? "有，请检查热门路径和 Bot 标记" : "未确认"}
- 可疑 IP 或路径：${list(cfStats.paths)}
- GA、Clarity、Cloudflare 不一致原因：Cloudflare 统计所有边缘请求和静态资源，也包含 Bot、预加载、被拦截请求；GA/Clarity 依赖前端脚本加载和同意状态，更接近真人行为但会漏掉拦截脚本或禁 JS 的访问。

## 7. 下一个 3 天建议

- 优先回看 Clarity 录屏最多的页面，确认首屏文案和主要按钮是否被理解。
- 继续发布 GA 有会话、Clarity 有滚动的来源渠道；暂停只有 Cloudflare 请求但没有用户行为的渠道。
- 如果 Cloudflare Bot 或拦截数升高，检查对应国家/路径，并考虑加 WAF 规则。
- 给热门页面补充关键按钮点击、滚动深度、外链点击等 GA 事件追踪。
- 下次复盘前补齐缺失平台导出文件或 API Token：${missing || "已齐"}。
`;

fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${today}.md`);
fs.writeFileSync(outputPath, report);

console.log(outputPath);
