import fs from "node:fs";
import path from "node:path";

const siteUrl = (process.env.SITE_URL || "https://gewuji.dev").replace(/\/+$/, "");
const key = process.env.INDEXNOW_KEY || "8221b5ee5eb23147b8f2422b2cb6096e";
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const sitemapPath = process.argv[2] || (fs.existsSync("dist/sitemap.xml") ? "dist/sitemap.xml" : "sitemap.xml");

if (!fs.existsSync(sitemapPath)) {
  throw new Error(`Sitemap not found: ${sitemapPath}`);
}

const sitemap = fs.readFileSync(sitemapPath, "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].trim())
  .filter((url, idx, all) => url.startsWith(`${siteUrl}/`) && all.indexOf(url) === idx);

if (urlList.length === 0) {
  throw new Error(`No matching ${siteUrl}/ URLs found in ${sitemapPath}`);
}

const payload = {
  host: new URL(siteUrl).host,
  key,
  keyLocation: `${siteUrl}/${key}.txt`,
  urlList,
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(payload),
});

if (!response.ok && response.status !== 202) {
  const text = await response.text();
  throw new Error(`IndexNow submission failed: ${response.status} ${text}`);
}

console.log(`IndexNow accepted ${urlList.length} URLs from ${path.basename(sitemapPath)} with status ${response.status}.`);
