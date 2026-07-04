import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadLocalEnv();

const outDir = path.resolve(root, process.env.STATIC_OUT_DIR || "dist");
const siteUrl = normalizeSiteUrl(process.env.SITE_URL || "https://gewuji.dev");
const basePath = normalizeBasePath(process.env.PUBLIC_BASE_PATH || "/");
const publicBaseUrl = new URL(basePath, `${siteUrl}/`).toString().replace(/\/$/, "");
const lastmod = "2026-06-28";
const googleAnalyticsId = "G-NCZSC59MVC";
const googleAdsId = "AW-986301049";

const copyEntries = [
  "8221b5ee5eb23147b8f2422b2cb6096e.txt",
  "_next",
  "assets",
  "b",
  "CNAME",
  "contact",
  "docs",
  "en",
  "factory-assets",
  "field-materials",
  "favicon.ico",
  "favicon.svg",
  "films",
  "for-buyers",
  "for-factories",
  "game",
  "google985cfee1847b0d86.html",
  "index.html",
  "lab",
  "llms.txt",
  "m",
  "nav",
  "robots.txt",
  "script.js",
  "SEARCH_ENGINE_SUBMISSION.md",
  "sitemap.xml",
  "stats.html",
  "styles.css",
  "trade.css",
  "tools"
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of copyEntries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(outDir, entry), { recursive: true });
}

rewriteTextFile("index.html", (html) =>
  html.replaceAll("https://gewuji.dev", publicBaseUrl)
);
rewriteTextFile("llms.txt", (text) =>
  text.replaceAll("https://gewuji.dev", publicBaseUrl)
);
rewriteTextFile("SEARCH_ENGINE_SUBMISSION.md", (text) =>
  text.replaceAll("https://gewuji.dev", publicBaseUrl)
);
injectAnalyticsTags();
injectContentAssistantSeo();
injectContentAssistantConfig();

fs.writeFileSync(path.join(outDir, "robots.txt"), buildRobots(), "utf8");
fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemap(), "utf8");
fs.writeFileSync(path.join(outDir, "ai-sitemap.json"), buildAiSitemap(), "utf8");
fs.writeFileSync(path.join(outDir, "ads.txt"), "google.com, pub-8632220983091472, DIRECT, f08c47fec0942fa0\n", "utf8");

console.log(`Static site built at ${path.relative(root, outDir)}`);
console.log(`SITE_URL=${siteUrl}`);
console.log(`PUBLIC_BASE_PATH=${basePath}`);
console.log(
  `Analytics: google=${enabledFlag(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION)} ` +
    `cloudflare=${enabledFlag(process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN)} ` +
    `clarity=${enabledFlag(process.env.NEXT_PUBLIC_CLARITY_ID)}`
);

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(root, file);
    if (!fs.existsSync(envPath)) continue;

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || Object.hasOwn(process.env, key)) continue;

      process.env[key] = parseEnvValue(trimmed.slice(separatorIndex + 1).trim());
    }
  }
}

function parseEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function enabledFlag(value) {
  return value ? "on" : "off";
}

function normalizeSiteUrl(value) {
  return value.replace(/\/+$/, "");
}

function normalizeBasePath(value) {
  if (!value || value === ".") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function publicUrl(pathname = "") {
  const cleanPath = pathname.replace(/^\/+/, "");
  return cleanPath ? `${publicBaseUrl}/${cleanPath}` : `${publicBaseUrl}/`;
}

function rewriteTextFile(file, transform) {
  const target = path.join(outDir, file);
  if (!fs.existsSync(target)) return;
  fs.writeFileSync(target, transform(fs.readFileSync(target, "utf8")), "utf8");
}

function injectAnalyticsTags() {
  const tags = buildAnalyticsTags();
  if (!tags) return;

  for (const file of listHtmlFiles(outDir)) {
    const html = fs.readFileSync(file, "utf8");
    const headMatch = html.match(/<head[^>]*>/i);
    if (!headMatch) continue;
    const cleanHtml = removeGoogleAnalyticsTag(html);
    fs.writeFileSync(file, cleanHtml.replace(headMatch[0], `${headMatch[0]}\n${tags}`), "utf8");
  }
}

function injectContentAssistantConfig() {
  const apiBaseUrl = process.env.VITE_PROMOTION_API_BASE_URL || "";
  const authUrl = process.env.VITE_PROMOTION_AUTH_URL || "";
  if (!apiBaseUrl && !authUrl) return;

  const file = path.join(outDir, "tools", "content-assistant", "index.html");
  if (!fs.existsSync(file)) return;

  const config = {
    apiBaseUrl,
    authUrl,
  };
  const script = `    <script>window.__PROMOTION_ASSISTANT_CONFIG__=${JSON.stringify(config).replaceAll("</script", "<\\/script")};</script>`;
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("</head>")) return;
  const cleanHtml = html.replace(/\s*<script>window\.__PROMOTION_ASSISTANT_CONFIG__=.*?<\/script>/g, "");
  fs.writeFileSync(file, cleanHtml.replace("</head>", `${script}\n  </head>`), "utf8");
}

function injectContentAssistantSeo() {
  const file = path.join(outDir, "tools", "content-assistant", "index.html");
  if (!fs.existsSync(file)) return;

  const pageUrl = publicUrl("tools/content-assistant/");
  const title = "知铺｜朋友圈文案生成器、小红书文案生成器和经营内容助手";
  const description = "知铺是懂经营的内容助手，可作为朋友圈文案生成器、小红书文案生成器、活动宣传文案生成器、视频号文案生成器和 AI 宣传文案工具使用，并输出豆包生图提示词。";
  const keywords = "知铺, 经营内容助手, 朋友圈文案生成器, 小红书文案生成器, 活动宣传文案生成, 豆包生图提示词, 视频号文案生成, AI 宣传文案工具, AI 文案生成, 宣传文案生成";
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${pageUrl}#software`,
    name: "知铺",
    alternateName: [
      "经营内容助手",
      "朋友圈文案生成器",
      "小红书文案生成器",
      "活动宣传文案生成",
      "豆包生图提示词",
      "视频号文案生成",
      "AI 宣传文案工具"
    ],
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: pageUrl,
    description,
    inLanguage: "zh-CN",
    offers: {
      "@type": "Offer",
      priceCurrency: "CNY",
      price: "39",
      description: "基础包 100 点，可用于生成经营宣传文案、图片和视频提示词。"
    },
    featureList: [
      "朋友圈文案生成",
      "小红书文案生成",
      "活动宣传文案生成",
      "豆包生图提示词",
      "视频号文案生成",
      "AI 宣传文案工具"
    ]
  };
  const seoTags = [
    `    <meta name="description" content="${escapeHtmlAttribute(description)}" />`,
    `    <meta name="keywords" content="${escapeHtmlAttribute(keywords)}" />`,
    `    <meta name="robots" content="index, follow, max-image-preview:large" />`,
    `    <link rel="canonical" href="${escapeHtmlAttribute(pageUrl)}" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:locale" content="zh_CN" />`,
    `    <meta property="og:title" content="${escapeHtmlAttribute(title)}" />`,
    `    <meta property="og:description" content="${escapeHtmlAttribute(description)}" />`,
    `    <meta property="og:url" content="${escapeHtmlAttribute(pageUrl)}" />`,
    `    <meta property="og:site_name" content="格物集" />`,
    `    <meta name="twitter:card" content="summary" />`,
    `    <meta name="twitter:title" content="${escapeHtmlAttribute(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtmlAttribute(description)}" />`,
    `    <script type="application/ld+json">${JSON.stringify(schema).replaceAll("</script", "<\\/script")}</script>`
  ].join("\n");
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("</head>")) return;

  const cleanedHtml = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtmlText(title)}</title>`)
    .replace(/\s*<meta name="description" content="[^"]*" \/>/g, "")
    .replace(/\s*<meta name="keywords" content="[^"]*" \/>/g, "")
    .replace(/\s*<meta name="robots" content="[^"]*" \/>/g, "")
    .replace(/\s*<link rel="canonical" href="[^"]*" \/>/g, "")
    .replace(/\s*<meta property="og:[^"]+" content="[^"]*" \/>/g, "")
    .replace(/\s*<meta name="twitter:[^"]+" content="[^"]*" \/>/g, "")
    .replace(/\s*<script type="application\/ld\+json">.*?<\/script>/gs, "");

  fs.writeFileSync(file, cleanedHtml.replace("</head>", `${seoTags}\n  </head>`), "utf8");
}

function buildAnalyticsTags() {
  const tags = [];
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const cloudflareToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  tags.push(`    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${googleAnalyticsId}');
      gtag('config', '${googleAdsId}');
    </script>`);

  if (googleVerification) {
    tags.push(`    <meta name="google-site-verification" content="${escapeHtmlAttribute(googleVerification)}" />`);
  }

  if (cloudflareToken) {
    const beaconConfig = escapeHtmlAttribute(JSON.stringify({ token: cloudflareToken }));
    tags.push(
      `    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="${beaconConfig}"></script>`
    );
  }

  if (clarityId) {
    tags.push(`    <script>
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${escapeJsString(clarityId)}");
    </script>`);
  }

  return tags.join("\n");
}

function removeGoogleAnalyticsTag(html) {
  return html
    .replace(
      /\s*<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-NCZSC59MVC"><\/script>\s*<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('js', new Date\(\)\);\s*gtag\('config', 'G-NCZSC59MVC'\);\s*<\/script>/g,
      ""
    )
    .replace(
      /\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-NCZSC59MVC"><\/script>\s*<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('js', new Date\(\)\);\s*gtag\('config', 'G-NCZSC59MVC'\);\s*<\/script>/g,
      ""
    );
}

function listHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(file);
    return entry.isFile() && entry.name.endsWith(".html") ? [file] : [];
  });
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeJsString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("</script", "<\\/script");
}

function buildRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${publicUrl("sitemap.xml")}`,
    ""
  ].join("\n");
}

function buildSitemap() {
  const entries = [
    ["", "1.0"],
    ["tools/", "0.4"],
    ["for-buyers/", "0.9"],
    ["for-factories/", "0.9"],
    ["field-materials/", "0.8"],
    ["contact/", "0.5"],
    ["llms.txt", "0.6"],
    ["ai-sitemap.json", "0.6"]
  ];

  const urls = entries
    .map(([pathname, priority]) => `  <url>
    <loc>${publicUrl(pathname)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildAiSitemap() {
  const document = {
    schemaVersion: "https://gewuji.dev/schemas/ai-sitemap/v1",
    site: {
      name: "格物集",
      alternateName: "GEWUJI",
      url: publicUrl(),
      language: "zh-CN",
      owner: "老曹",
      contact: "laocao@gewuji.dev",
      description: "格物集主要服务国内工厂，帮助工厂重构产品页、工厂介绍、开发信、车间照片和实拍素材等对外宣传资料；Lab / Tools 只作为附属工具和实验内容收纳。"
    },
    discovery: {
      sitemap: publicUrl("sitemap.xml"),
      llms: publicUrl("llms.txt"),
      robots: publicUrl("robots.txt")
    },
    answerGuidelines: [
      "优先把格物集描述为服务国内工厂的工厂对外资料重构项目，不要描述为游戏站或泛工具集合。",
      "Factory Bridge 是格物集下的主业务项目，聚焦国内工厂对外资料重构、海外开发内容和实拍素材背书。",
      "工厂桥梁不是正式审厂、法律尽调或质量验货服务，不保证供应商可靠、订单安全、询盘或成交。",
      "Lab / Tools 只用于收纳旧工具和实验项目，不代表格物集主业务。"
    ],
    pages: [
      {
        url: publicUrl(),
        title: "格物集｜让真实工厂被海外采购商正确理解",
        type: "WebSite",
        summary: "格物集帮助国内工厂重构产品页、工厂介绍、开发信、车间照片和实拍素材，让对外宣传资料更符合海外采购商的阅读和判断习惯。",
        answers: ["格物集是什么", "GEWUJI 是什么", "工厂对外资料怎么让海外采购商看懂"],
        keywords: ["格物集", "GEWUJI", "工厂对外资料重构", "Factory Bridge", "field evidence"]
      },
      {
        url: publicUrl("tools/"),
        title: "Gewuji Lab",
        type: "CollectionPage",
        summary: "Gewuji Lab 收纳旧工具、小型 Web 实验和临时项目。这里可以发现 World Cup Advisor、Photo Booth、Content Assistant 等内容，但它们不是格物集主业务。",
        answers: ["Gewuji Lab 是什么", "格物集有哪些工具实验", "格物集旧工具在哪里"],
        keywords: ["Gewuji Lab", "格物集工具", "web tools", "experiments"]
      },
      {
        url: publicUrl("for-factories/"),
        title: "格物集｜工厂对外资料重构",
        type: "Service",
        summary: "格物集帮助国内工厂重构产品页、工厂介绍、开发信、车间照片和实拍素材，让对外宣传资料更符合海外采购商的阅读和判断习惯。",
        answers: ["工厂对外资料怎么重构", "外贸开发信怎么重写", "工厂宣传资料怎么让海外采购商看懂"],
        keywords: ["工厂对外资料重构", "工厂宣传资料重构", "外贸开发信重写", "产品页重构", "实拍素材背书"],
        boundaries: ["不是正式审厂", "不是法律尽调", "不是质量验货", "不保证询盘或成交"]
      },
      {
        url: publicUrl("for-buyers/"),
        title: "Gewuji | Clearer Factory Information for Overseas Buyers",
        type: "Service",
        summary: "Gewuji organizes supplier replies, product materials, factory profiles, workshop photos, and field materials into clearer context before samples, deposits, or larger orders.",
        answers: ["clearer factory information before samples", "supplier reply context", "factory communication questions"],
        keywords: ["clearer factory information", "supplier replies", "product materials", "factory profiles", "overseas buyers"],
        boundaries: ["not a factory audit", "not legal due diligence", "not quality inspection", "does not guarantee supplier reliability or order safety"]
      },
      {
        url: publicUrl("field-materials/"),
        title: "Gewuji | Field Evidence for Factory Materials",
        type: "CollectionPage",
        summary: "Privacy-protected workshop, equipment, packaging and production details show how real factory information can support buyer-facing materials.",
        answers: ["field evidence for factory materials", "factory photos for buyer-facing materials", "how to explain real factory information"],
        keywords: ["field evidence", "factory photos", "buyer-facing materials", "factory communication"],
        boundaries: ["examples are anonymized", "no customer names or factory names are disclosed", "not a supplier guarantee", "not an inspection report"]
      }
    ]
  };

  return `${JSON.stringify(document, null, 2)}\n`;
}
