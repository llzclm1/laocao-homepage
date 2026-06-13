const siteUrl = process.env.SITE_URL || "https://llzclm1.github.io/laocao-homepage/";
const key = process.env.INDEXNOW_KEY || "8221b5ee5eb23147b8f2422b2cb6096e";
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";

const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
const site = new URL(normalizedSiteUrl);
const keyLocation = new URL(`${key}.txt`, normalizedSiteUrl).toString();

const payload = {
  host: site.host,
  key,
  keyLocation,
  urlList: [normalizedSiteUrl],
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

console.log(`IndexNow accepted ${normalizedSiteUrl} with status ${response.status}.`);
