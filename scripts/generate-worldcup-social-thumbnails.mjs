import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "tools", "worldcup-advisor", "assets", "social");

const pages = [
  {
    slug: "overview",
    label: "World Cup Advisor",
    title: "世界杯参谋站",
    subtitle: "赛程、比分预测、复盘和球队资料集中看",
    metric: "44",
    metricLabel: "已完赛",
    accent: "今日重点",
    rows: [
      ["葡萄牙", "01:00", "乌兹别克斯坦"],
      ["英格兰", "04:00", "加纳"],
      ["哥伦比亚", "10:00", "刚果民主共和国"]
    ]
  },
  {
    slug: "fixtures",
    label: "Fixtures",
    title: "2026 世界杯赛程",
    subtitle: "按北京时间看未开赛、已完赛和重点场",
    metric: "104",
    metricLabel: "总场次",
    accent: "北京时间",
    rows: [
      ["Czech Republic", "07.24", "Mexico"],
      ["South Africa", "07.24", "South Korea"],
      ["Portugal", "01:00", "Uzbekistan"]
    ]
  },
  {
    slug: "advisor",
    label: "Match Advisor",
    title: "世界杯比分预测",
    subtitle: "赛前判断、关键变量和观赛重点",
    metric: "3",
    metricLabel: "重点场",
    accent: "不构成投注建议",
    rows: [
      ["葡萄牙", "2 : 0", "乌兹别克斯坦"],
      ["英格兰", "2 : 1", "加纳"],
      ["哥伦比亚", "2 : 1", "刚果民主共和国"]
    ]
  },
  {
    slug: "groups",
    label: "Groups",
    title: "小组积分排名",
    subtitle: "按已完赛比分计算积分、净胜球和进球数",
    metric: "12",
    metricLabel: "小组",
    accent: "自动排名",
    rows: [
      ["A组", "Mexico", "6 pts"],
      ["B组", "Canada", "4 pts"],
      ["K组", "Portugal", "赛前"]
    ]
  },
  {
    slug: "history",
    label: "History",
    title: "世界杯历史结果",
    subtitle: "已完赛比分、北京时间和复盘标签",
    metric: "44",
    metricLabel: "结果",
    accent: "赛后记录",
    rows: [
      ["Mexico", "2 : 0", "South Africa"],
      ["Spain", "3 : 1", "Saudi Arabia"],
      ["Japan", "1 : 1", "Chile"]
    ]
  },
  {
    slug: "review",
    label: "Review",
    title: "世界杯赛后复盘",
    subtitle: "集中看比分偏差、节奏标签和下一轮修正",
    metric: "44",
    metricLabel: "样本",
    accent: "复盘",
    rows: [
      ["低比分", "1 : 0", "节奏偏慢"],
      ["常规比分", "2 : 1", "判断兑现"],
      ["大比分", "4 : 1", "防线失衡"]
    ]
  },
  {
    slug: "teams",
    label: "Teams",
    title: "2026 世界杯球队资料",
    subtitle: "核心球员、优势风险和参谋观察",
    metric: "48",
    metricLabel: "球队",
    accent: "球队画像",
    rows: [
      ["Portugal", "前场个人能力", "高"],
      ["England", "阵容深度", "高"],
      ["Croatia", "中场经验", "高"]
    ]
  },
  {
    slug: "match-portugal-uzbekistan",
    label: "Match Detail",
    title: "葡萄牙 vs 乌兹别克斯坦",
    subtitle: "北京时间 2026-06-24 01:00 开赛",
    metric: "K组",
    metricLabel: "单场详情",
    accent: "赛前分析",
    rows: [
      ["葡萄牙", "预测", "占优"],
      ["变量", "前20分钟", "压迫强度"],
      ["复盘", "赛后", "更新"]
    ]
  },
  {
    slug: "match-england-ghana",
    label: "Match Detail",
    title: "英格兰 vs 加纳",
    subtitle: "北京时间 2026-06-24 04:00 开赛",
    metric: "L组",
    metricLabel: "单场详情",
    accent: "关键变量",
    rows: [
      ["英格兰", "预测", "占优"],
      ["加纳", "反击", "边路速度"],
      ["复盘", "赛后", "更新"]
    ]
  },
  {
    slug: "match-panama-croatia",
    label: "Match Detail",
    title: "巴拿马 vs 克罗地亚",
    subtitle: "北京时间 2026-06-24 07:00 开赛",
    metric: "L组",
    metricLabel: "单场详情",
    accent: "控场经验",
    rows: [
      ["巴拿马", "低位防守", "关键"],
      ["克罗地亚", "控场", "占优"],
      ["复盘", "赛后", "更新"]
    ]
  },
  {
    slug: "match-colombia-dr-congo",
    label: "Match Detail",
    title: "哥伦比亚 vs 刚果民主共和国",
    subtitle: "北京时间 2026-06-24 10:00 开赛",
    metric: "K组",
    metricLabel: "单场详情",
    accent: "开放回合",
    rows: [
      ["哥伦比亚", "进攻层次", "更丰富"],
      ["刚果民主共和国", "身体冲击", "变量"],
      ["复盘", "赛后", "更新"]
    ]
  }
];

fs.mkdirSync(outputDir, { recursive: true });

for (const page of pages) {
  fs.writeFileSync(path.join(outputDir, `${page.slug}.svg`), renderSvg(page), "utf8");
}

console.log(`Generated ${pages.length} World Cup social thumbnails in ${path.relative(root, outputDir)}`);

function renderSvg(page) {
  const rows = page.rows.map((row, index) => {
    const y = 370 + index * 58;
    return `
      <g transform="translate(550 ${y})">
        <rect width="490" height="42" rx="12" fill="${index === 0 ? "#f8f5ff" : "#ffffff"}" stroke="#eceaf2"/>
        <text x="26" y="27" font-size="18" font-family="Arial, 'PingFang SC', sans-serif" font-weight="700" fill="#24212b">${escapeXml(row[0])}</text>
        <text x="245" y="27" text-anchor="middle" font-size="20" font-family="Arial, 'PingFang SC', sans-serif" font-weight="800" fill="#2f16df">${escapeXml(row[1])}</text>
        <text x="464" y="27" text-anchor="end" font-size="18" font-family="Arial, 'PingFang SC', sans-serif" font-weight="700" fill="#6b6676">${escapeXml(row[2])}</text>
      </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(page.title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef2f7"/>
      <stop offset="58%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e5e9f0"/>
    </linearGradient>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6f32ff"/>
      <stop offset="100%" stop-color="#351adf"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#667085" flood-opacity=".22"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <path d="M-40 94 C130 24 245 72 330 160" fill="none" stroke="#ffffff" stroke-width="2" opacity=".72"/>
  <path d="M102 0 C220 78 318 138 446 160" fill="none" stroke="#ffffff" stroke-width="2" opacity=".55"/>

  <g transform="translate(144 52) rotate(11 456 266)" filter="url(#shadow)">
    <rect width="912" height="532" rx="30" fill="#ffffff"/>
    <rect x="0" y="0" width="912" height="92" rx="30" fill="#ffffff"/>
    <rect x="0" y="68" width="912" height="1" fill="#eeeef4"/>
    <circle cx="70" cy="44" r="13" fill="#f23f5f"/>
    <circle cx="70" cy="44" r="7" fill="#ffffff" opacity=".9"/>
    <text x="96" y="54" font-size="31" font-family="Arial, 'PingFang SC', sans-serif" font-weight="900" fill="#24212b">GoalScore</text>
    <text x="560" y="54" font-size="23" font-family="Arial, 'PingFang SC', sans-serif" font-weight="900" fill="#4d22f2">Live Scores</text>
    <rect x="588" y="76" width="68" height="5" rx="3" fill="#6f32ff"/>
    <text x="708" y="54" font-size="22" font-family="Arial, 'PingFang SC', sans-serif" fill="#9a96a4">All Match</text>

    <g transform="translate(52 116)">
      <rect width="350" height="270" rx="24" fill="#ffffff" stroke="#e8e8ef"/>
      <text x="28" y="46" font-size="23" font-family="Arial, 'PingFang SC', sans-serif" font-weight="900" fill="#24212b">${escapeXml(page.label)}</text>
      <text x="28" y="78" font-size="18" font-family="Arial, 'PingFang SC', sans-serif" fill="#aaa6b3">${escapeXml(page.subtitle)}</text>
      <g transform="translate(38 116)">
        <circle cx="46" cy="44" r="38" fill="#f0f5ff" stroke="#2f16df" stroke-width="5"/>
        <text x="46" y="54" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="900" fill="#2f16df">WC</text>
        <text x="232" y="54" text-anchor="middle" font-size="43" font-family="Arial, sans-serif" font-weight="900" fill="#24212b">${escapeXml(page.metric)}</text>
      </g>
      <text x="270" y="194" text-anchor="middle" font-size="19" font-family="Arial, 'PingFang SC', sans-serif" font-weight="700" fill="#6b6676">${escapeXml(page.metricLabel)}</text>
      <rect x="86" y="214" width="178" height="55" rx="10" fill="#5b25ec"/>
      <text x="175" y="249" text-anchor="middle" font-size="19" font-family="Arial, 'PingFang SC', sans-serif" font-weight="800" fill="#ffffff">${escapeXml(page.accent)}</text>
    </g>

    <g transform="translate(452 116)">
      <rect width="408" height="160" rx="24" fill="url(#hero)"/>
      <circle cx="336" cy="46" r="96" fill="#ffffff" opacity=".08"/>
      <circle cx="382" cy="128" r="112" fill="#120a78" opacity=".12"/>
      <text x="34" y="58" font-size="32" font-family="Arial, 'PingFang SC', sans-serif" font-weight="900" fill="#ffffff">${escapeXml(page.title)}</text>
      <text x="34" y="94" font-size="19" font-family="Arial, 'PingFang SC', sans-serif" fill="#efeaff">${escapeXml(page.subtitle)}</text>
      <rect x="34" y="114" width="138" height="38" rx="8" fill="#ffffff"/>
      <text x="103" y="139" text-anchor="middle" font-size="15" font-family="Arial, 'PingFang SC', sans-serif" font-weight="800" fill="#351adf">Open Advisor</text>
    </g>

    <g transform="translate(452 310)">
      <rect width="408" height="54" rx="14" fill="#f7f7fa"/>
      <text x="26" y="35" font-size="18" font-family="Arial, 'PingFang SC', sans-serif" font-weight="900" fill="#24212b">Match board</text>
      <text x="380" y="35" text-anchor="end" font-size="16" font-family="Arial, 'PingFang SC', sans-serif" font-weight="800" fill="#f23f5f">Live</text>
    </g>
    ${rows}
  </g>

  <g transform="translate(72 476)">
    <text x="0" y="0" font-size="52" font-family="Arial, 'PingFang SC', sans-serif" font-weight="900" fill="#24212b">${escapeXml(page.title)}</text>
    <text x="2" y="42" font-size="24" font-family="Arial, 'PingFang SC', sans-serif" fill="#6b6676">${escapeXml(page.subtitle)}</text>
  </g>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
