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
    new URL("tools/worldcup-advisor/", normalizedSiteUrl).toString(),
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
    new URL("tools/seo-content-tools/templates/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/templates/holiday-promotion-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/templates/opening-announcement-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/templates/returning-customer-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/templates/community-notice-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/templates/wechat-channel-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/templates/short-video-script/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/how-to-write-moments-copy/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/xiaohongshu-title-tips/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/promotion-copy-structure/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/doubao-prompt-tips/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/selling-point-method/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/guides/short-video-hook-tips/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/coffee-shop-campaign/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/beauty-salon-promotion/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/clothing-new-arrival/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/photo-studio-booking/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/opening-day/", normalizedSiteUrl).toString(),
    new URL("tools/seo-content-tools/examples/member-day/", normalizedSiteUrl).toString(),
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
