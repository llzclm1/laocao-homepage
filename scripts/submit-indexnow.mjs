const siteUrl = process.env.SITE_URL || "https://gewuji.dev/";
const key = process.env.INDEXNOW_KEY || "8221b5ee5eb23147b8f2422b2cb6096e";
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";

const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
const site = new URL(normalizedSiteUrl);
const keyLocation = new URL(`${key}.txt`, normalizedSiteUrl).toString();

const payload = {
  host: site.host,
  key,
  keyLocation,
  urlList: [
    normalizedSiteUrl,
    new URL("tools/seo-content-tools/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/pages/moments-campaign-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/pages/xiaohongshu-seeding-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/pages/store-promotion-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/pages/doubao-image-prompt/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/pages/product-selling-points/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/industries/restaurant-promotion-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/industries/beauty-salon-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/industries/clothing-new-arrival-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/industries/photo-studio-copy/", normalizedSiteUrl).toString(),
  ],
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

console.log(`IndexNow accepted ${payload.urlList.length} URLs with status ${response.status}.`);
