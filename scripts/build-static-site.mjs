import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(root, process.env.STATIC_OUT_DIR || "dist");
const siteUrl = normalizeSiteUrl(process.env.SITE_URL || "https://gewuji.dev");
const basePath = normalizeBasePath(process.env.PUBLIC_BASE_PATH || "/");
const publicBaseUrl = new URL(basePath, `${siteUrl}/`).toString().replace(/\/$/, "");
const lastmod = "2026-06-15";

const copyEntries = [
  "8221b5ee5eb23147b8f2422b2cb6096e.txt",
  "assets",
  "CNAME",
  "docs",
  "favicon.svg",
  "films",
  "game",
  "google985cfee1847b0d86.html",
  "index.html",
  "llms.txt",
  "robots.txt",
  "script.js",
  "SEARCH_ENGINE_SUBMISSION.md",
  "sitemap.xml",
  "stats.html",
  "styles.css"
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

fs.writeFileSync(path.join(outDir, "robots.txt"), buildRobots(), "utf8");
fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemap(), "utf8");

console.log(`Static site built at ${path.relative(root, outDir)}`);
console.log(`SITE_URL=${siteUrl}`);
console.log(`PUBLIC_BASE_PATH=${basePath}`);

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
    if (!html.includes("</head>")) continue;
    fs.writeFileSync(file, html.replace("</head>", `${tags}\n  </head>`), "utf8");
  }
}

function buildAnalyticsTags() {
  const tags = [];
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const cloudflareToken = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

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

function escapeJsString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("</script", "<\\/script");
}

function buildRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${publicUrl("sitemap.xml")}`,
    "",
    `LLMs: ${publicUrl("llms.txt")}`,
    ""
  ].join("\n");
}

function buildSitemap() {
  const entries = [
    ["", "1.0"],
    ["game/worldcup/", "0.8"],
    ["llms.txt", "0.6"]
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
