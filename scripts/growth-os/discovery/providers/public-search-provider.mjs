const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const USER_AGENT = "GrowthOS-PublicDiscovery/3.1 (+https://gewuji.dev/; public search only; no login)";

import { fetchPublicResponse } from "../sources/public-request.mjs";

export function createPublicSearchProvider(environment = process.env, fetchImpl = fetch) {
  if (!isEnabled(environment.SOCIAL_DISCOVERY_PUBLIC_SEARCH)) return null;

  return {
    name: "duckduckgo_html",
    status: "configured",
    input_mode: "automated",
    async search({ query, platform }) {
      try {
        const url = new URL(SEARCH_ENDPOINT);
        url.searchParams.set("q", query);
        const response = await fetchPublicResponse(url, {
          headers: { "Accept": "text/html", "User-Agent": USER_AGENT },
          fetchImpl
        });
        if (response.status === 202) {
          return { status: "blocked", items: [], error: "Public search returned an asynchronous challenge (202); no result page was verified." };
        }
        if (!response.ok) {
          const status = response.status === 403 || response.status === 429 ? "blocked" : "failed";
          return { status, items: [], error: `Public search returned ${response.status}` };
        }
        return {
          status: "success",
          items: parseDuckDuckGoHtml(await response.text(), platform),
          error: null
        };
      } catch (error) {
        return { status: "failed", items: [], error: String(error.message || error).slice(0, 240) };
      }
    }
  };
}

export function parseDuckDuckGoHtml(html, platform) {
  const anchors = [...String(html || "").matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .filter((match) => /\bresult__a\b/i.test(match[1] || ""));

  return anchors.map((match, index) => {
    const href = attribute(match[1], "href");
    const url = destinationUrl(href);
    if (!url || !matchesPlatform(url, platform)) return null;
    const nextOffset = anchors[index + 1]?.index ?? String(html || "").length;
    const section = String(html || "").slice(match.index, nextOffset);
    const snippet = htmlText(section.match(/class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1] || "");
    const title = resultTitle(htmlText(match[2]), snippet, url, platform);
    return { url, canonical_url: url, title, snippet, author: null, published_at: null };
  }).filter(Boolean);
}

function isEnabled(value) {
  return ["1", "true", "yes", "enabled"].includes(String(value || "").trim().toLowerCase());
}

function attribute(source, name) {
  return String(source || "").match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] || "";
}

function destinationUrl(value) {
  try {
    const raw = decodeEntities(value);
    const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw, SEARCH_ENDPOINT);
    if (/duckduckgo\.com$/i.test(url.hostname) && url.pathname === "/l/") return url.searchParams.get("uddg") || "";
    return url.toString();
  } catch {
    return "";
  }
}

function matchesPlatform(value, platform) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.toLowerCase();
    if (platform === "quora") return host === "quora.com" && pathname.length > 2 && !/^\/(?:profile|topic|about|help|policy|rules)\//.test(pathname);
    if (platform === "linkedin") return (host === "linkedin.com" || host.endsWith(".linkedin.com")) && /\/(?:posts|feed\/update)\//.test(pathname);
    if (platform === "reddit") return host === "reddit.com" && /^\/r\/[^/]+\/comments\/[^/]+/.test(pathname);
    return false;
  } catch {
    return false;
  }
}

function resultTitle(title, snippet, value, platform) {
  const cleanTitle = String(title || "").trim();
  if (cleanTitle && !new RegExp(`^${platform}$`, "i").test(cleanTitle)) return cleanTitle;
  const fallback = String(snippet || "").trim();
  if (fallback) return fallback.slice(0, 160);
  try {
    const path = decodeURIComponent(new URL(value).pathname.replace(/^\//, "").replace(/[/-]+/g, " "));
    return path.slice(0, 160) || cleanTitle;
  } catch {
    return cleanTitle;
  }
}

function htmlText(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:quot|#34);/gi, "\"")
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}
