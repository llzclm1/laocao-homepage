import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { applyReviewAction } from "./review/apply-review-action.mjs";
import { addManualSocialOpportunity, discoverSocialOpportunities, recordDiscoveryAction } from "./discovery/social-discovery-engine.mjs";
import { refreshDashboardDiscovery } from "./runtime/dashboard-generator.mjs";
import { markContentPublished } from "./state/state-manager.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.PORT || 8787);
const host = "127.0.0.1";
const publishedLinksFile = path.join(root, "data/growth-os/social/published-links.json");
const publishedContentFile = path.join(root, "data/growth-os/social/published-content.json");
const socialMetricsFile = path.join(root, "data/growth-os/social/social-metrics.json");
const buyerSignalsFile = path.join(root, "data/growth-os/customer-memory/buyer-signals.jsonl");
const reviewActionsFile = path.join(root, "data/growth-os/actions/review-actions.jsonl");
const dashboardViewFile = path.join(root, "data/growth-os/viewer/dashboard-view.json");
const allowedPlatforms = new Set(["LinkedIn", "Reddit", "X", "Substack", "Medium"]);
const allowedPublishingStatuses = new Set(["draft_ready", "published", "measuring"]);
const allowedReviewActions = new Set(["approve", "reject", "revision"]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${host}:${port}`);
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.method === "GET" && url.pathname === "/__copy") {
    return copyText(url.searchParams.get("path"), url.searchParams.get("part"), res);
  }
  if (req.method === "GET" && url.pathname === "/__review-package") return sendReviewPackage(url, res);
  if (req.method === "POST" && url.pathname === "/__copy") return copyToClipboard(req, res);
  if (req.method === "POST" && url.pathname === "/__publishing-links") return savePublishingLink(req, res);
  if (req.method === "POST" && url.pathname === "/__buyer-signal") return saveBuyerSignal(req, res);
  if (req.method === "POST" && url.pathname === "/__review-action") return saveReviewAction(req, res);
  if (req.method === "POST" && url.pathname === "/__discovery-action") return saveDiscoveryAction(req, res);
  if (req.method === "POST" && url.pathname === "/__manual-discovery") return saveManualDiscovery(req, res);

  const pathname = decodeURIComponent(url.pathname);
  const reviewPath = pathname.match(/^\/growth-os\/review\/(go-\d+)\/?$/i);
  const dashboardPath = pathname === "/" || /^\/growth-os(?:\/dashboard)?\/?$/i.test(pathname);
  const file = path.normalize(path.join(root, reviewPath ? "/docs/growth-os/viewer/review/go-review.html" : dashboardPath ? "/docs/growth-os/dashboard.html" : pathname));

  if (!file.startsWith(root)) return send(res, 403, "Forbidden");
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) return sendDirectory(res, pathname, file);

  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, "Not found");
    res.writeHead(200, {
      "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(data);
  });
}).listen(port, host, () => {
  console.log(`Growth OS dashboard: http://${host}:${port}/growth-os/`);
});

function copyToClipboard(req, res) {
  readBody(req, 100000, (body) => {
    try {
      const { path: requestPath, part } = JSON.parse(body || "{}");
      copyText(requestPath, part, res);
    } catch {
      send(res, 400, "Invalid copy request");
    }
  });
}

function savePublishingLink(req, res) {
  readBody(req, 100000, (body) => {
    try {
      const entry = normalizePublishingEntry(JSON.parse(body || "{}"));
      const records = readPublishedLinks();
      const next = upsertPublishingEntry(records, entry);
      fs.mkdirSync(path.dirname(publishedLinksFile), { recursive: true });
      fs.writeFileSync(publishedLinksFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      writePublishedContent(next);
      writeSocialMetrics(next);
      const transition = entry.url && ["published", "measuring"].includes(entry.status)
        ? markContentPublished(entry.content_id, { note: `${entry.platform}: ${entry.url}` })
        : null;
      sendJson(res, { ok: true, items: next, transition });
    } catch (error) {
      send(res, 400, error.message || "Invalid publishing link");
    }
  });
}

function saveBuyerSignal(req, res) {
  readBody(req, 20000, (body) => {
    try {
      const value = JSON.parse(body || "{}");
      const entry = {
        source: requiredText(value.source, "source"),
        question: requiredText(value.question, "question"),
        stage: requiredText(value.stage, "stage"),
        pain: requiredText(value.pain, "pain"),
        related_go: String(value.related_go || "").trim(),
        date: new Date().toISOString().slice(0, 10)
      };
      fs.mkdirSync(path.dirname(buyerSignalsFile), { recursive: true });
      fs.appendFileSync(buyerSignalsFile, `${JSON.stringify(entry)}\n`, "utf8");
      sendJson(res, { ok: true, item: entry });
    } catch (error) {
      send(res, 400, error.message || "Invalid buyer signal");
    }
  });
}

function saveReviewAction(req, res) {
  readBody(req, 20000, (body) => {
    try {
      const value = JSON.parse(body || "{}");
      const action = String(value.action || "").trim();
      if (!allowedReviewActions.has(action)) throw new Error("Invalid review action");
      const entry = {
        id: normalizeGoId(value.id),
        action,
        user: "local",
        date: new Date().toISOString().slice(0, 10),
        note: String(value.note || "").trim()
      };
      fs.mkdirSync(path.dirname(reviewActionsFile), { recursive: true });
      fs.appendFileSync(reviewActionsFile, `${JSON.stringify(entry)}\n`, "utf8");
      const transition = applyReviewAction(entry, { now: new Date() });
      sendJson(res, { ok: true, item: entry, transition });
    } catch (error) {
      send(res, 400, error.message || "Invalid review action");
    }
  });
}

function saveDiscoveryAction(req, res) {
  readBody(req, 20000, (body) => {
    try {
      const now = new Date();
      const entry = recordDiscoveryAction(JSON.parse(body || "{}"), now);
      const discovery = discoverSocialOpportunities(now);
      refreshDashboardDiscovery(discovery, now);
      sendJson(res, { ok: true, entry, workspace: discovery.workspace });
    } catch (error) {
      send(res, 400, error.message || "Invalid discovery action");
    }
  });
}

function saveManualDiscovery(req, res) {
  readBody(req, 20000, (body) => {
    try {
      const now = new Date();
      const result = addManualSocialOpportunity(JSON.parse(body || "{}"), now);
      const discovery = discoverSocialOpportunities(now);
      refreshDashboardDiscovery(discovery, now);
      sendJson(res, { ok: true, ...result });
    } catch (error) {
      send(res, 400, error.message || "Invalid manual discovery entry");
    }
  });
}

function sendReviewPackage(url, res) {
  try {
    const id = normalizeGoId(url.searchParams.get("id"));
    const slug = id.toLowerCase();
    const pipelineDir = path.join(root, "docs/content-pipeline", slug);
    const socialDir = path.join(root, "docs/social/content-pack", slug);
    const dashboard = readJson(dashboardViewFile, {});
    const opportunity = (dashboard.opportunities || []).find((item) => item.id === id) || {};

    sendJson(res, {
      id,
      title: opportunity.title || readTitle(path.join(pipelineDir, "draft.md")) || id,
      score: {
        seo: opportunity.seo_score || 0,
        geo: opportunity.geo_score || 0,
        business: opportunity.business_score || 0,
        status: opportunity.status_cn || opportunity.status || ""
      },
      sections: {
        opportunity: readText(path.join(pipelineDir, "opportunity.md")),
        draft: readText(path.join(pipelineDir, "draft.md")),
        faq: readFaq(path.join(pipelineDir, "draft.md")),
        schema: readText(path.join(pipelineDir, "schema-plan.md")),
        geo: readText(path.join(pipelineDir, "geo-monitoring.md")),
        linkedin: readText(path.join(socialDir, "linkedin.md")),
        reddit: readText(path.join(socialDir, "reddit.md")),
        x: readText(path.join(socialDir, "x-thread.md")),
        substack: readText(path.join(socialDir, "substack.md")),
        medium: readText(path.join(socialDir, "medium.md"))
      }
    });
  } catch (error) {
    send(res, 400, error.message || "Invalid review package request");
  }
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
}

function readTitle(file) {
  const text = readText(file);
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
}

function readFaq(file) {
  const text = readText(file);
  const match = text.match(/^##\s+FAQ\s*\n([\s\S]*?)(?=^##\s+|\s*$)/im);
  return match ? match[1].trim() : "";
}

function normalizeGoId(value) {
  const id = String(value || "").trim().toUpperCase();
  if (!/^GO-\d+$/i.test(id)) throw new Error("Invalid GO id");
  return id;
}

function requiredText(value, field) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${field} is required`);
  if (text.length > 1000) throw new Error(`${field} is too long`);
  return text;
}

function readBody(req, limit, callback) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > limit) req.destroy();
  });
  req.on("end", () => callback(body));
}

function readPublishedLinks() {
  if (!fs.existsSync(publishedLinksFile)) return [];
  const value = JSON.parse(fs.readFileSync(publishedLinksFile, "utf8"));
  if (!Array.isArray(value)) throw new Error("Published links file must contain an array");
  return value.map(normalizePublishingEntry);
}

function upsertPublishingEntry(records, entry) {
  const key = publishingKey(entry);
  const index = records.findIndex((item) => publishingKey(item) === key);
  if (index === -1) return [...records, entry].sort(sortPublishingEntries);
  const next = [...records];
  next[index] = entry;
  return next.sort(sortPublishingEntries);
}

function normalizePublishingEntry(value) {
  const contentId = String(value.content_id || "").trim().toUpperCase();
  const platform = normalizePlatform(value.platform);
  const status = String(value.status || "draft_ready").trim();
  const url = String(value.url || "").trim();
  const publishedDate = String(value.published_date || "").trim();
  const metrics = value.metrics || {};

  if (!/^GO-\d+$/i.test(contentId)) throw new Error("Invalid content_id");
  if (!allowedPlatforms.has(platform)) throw new Error("Invalid platform");
  if (!allowedPublishingStatuses.has(status)) throw new Error("Invalid status");
  if (url && !/^https?:\/\//i.test(url)) throw new Error("Published URL must start with http:// or https://");
  if (status !== "draft_ready" && !url) throw new Error("Published URL is required for published or measuring status");
  if (publishedDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishedDate)) throw new Error("Published date must use YYYY-MM-DD");

  return {
    content_id: contentId,
    platform,
    status,
    url,
    published_date: publishedDate,
    metrics: {
      views: nonNegativeNumber(metrics.views),
      likes: nonNegativeNumber(metrics.likes),
      comments: nonNegativeNumber(metrics.comments),
      clicks: nonNegativeNumber(metrics.clicks),
      leads: nonNegativeNumber(metrics.leads)
    }
  };
}

function writePublishedContent(records) {
  const published = records
    .filter((item) => item.url)
    .map((item) => ({
      id: item.content_id,
      platform: item.platform,
      status: "published",
      url: item.url,
      published_date: item.published_date
    }));
  fs.writeFileSync(publishedContentFile, `${JSON.stringify(published, null, 2)}\n`, "utf8");
}

function writeSocialMetrics(records) {
  const metrics = records
    .filter((item) => Object.values(item.metrics).some((value) => Number(value) > 0))
    .map((item) => ({
      id: item.content_id,
      platform: item.platform,
      ...item.metrics
    }));
  fs.writeFileSync(socialMetricsFile, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
}

function normalizePlatform(platform) {
  const text = String(platform || "").trim().toLowerCase();
  if (text === "linkedin") return "LinkedIn";
  if (text === "reddit") return "Reddit";
  if (text === "x" || text === "x-thread") return "X";
  if (text === "substack") return "Substack";
  if (text === "medium") return "Medium";
  return platform;
}

function nonNegativeNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error("Metrics must be non-negative numbers");
  return Math.round(number);
}

function publishingKey(item) {
  return `${item.content_id}:${item.platform}`;
}

function sortPublishingEntries(a, b) {
  return publishingKey(a).localeCompare(publishingKey(b));
}

function copyText(requestPath, part, res) {
  if (!["title", "content", "all"].includes(part)) return send(res, 400, "Invalid copy part");

  const file = path.normalize(path.join(root, decodeURIComponent(requestPath || "")));
  if (!file.startsWith(root)) return send(res, 403, "Forbidden");

  const text = getDraftPart(fs.readFileSync(file, "utf8"), part);
  if (!text) return send(res, 422, "Empty copy part");

  const child = spawn("pbcopy");
  child.on("error", () => send(res, 500, "pbcopy failed"));
  child.on("close", (code) => {
    if (code) return send(res, 500, "pbcopy failed");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(`<script>document.body.textContent = "已复制 ${part} (${text.length} chars)";</script>`);
  });
  child.stdin.end(text);
}

function getDraftPart(markdown, part) {
  const text = markdown.trim();
  if (part === "all") return text;
  if (part === "title") return getDraftTitle(text);
  if (part === "content") return getDraftContent(text);
  return "";
}

function getDraftTitle(text) {
  const directTitle = text.match(/^标题[:：]\s*(.+)$/m);
  if (directTitle) return directTitle[1].trim();

  for (const heading of ["标题", "开头钩子", "开头"]) {
    const section = getSection(text, heading);
    if (section) return stripNumber(section.split("\n")[0]);
  }

  const firstNumbered = text.match(/^\d+\.\s+(.+)$/m);
  return firstNumbered ? firstNumbered[1].trim() : "";
}

function getDraftContent(text) {
  const sections = [...text.matchAll(/^##\s+(.+?)\s*\n([\s\S]*?)(?=^##\s+|\s*$)/gm)]
    .filter((match) => !["标题", "开头钩子"].includes(match[1].trim()))
    .map((match) => match[2].replace(/^标题[:：].+$/m, "").trim())
    .filter(Boolean);
  if (sections.length) return sections.join("\n\n");

  return text
    .replace(/^# .+\n?/, "")
    .replace(/^状态[:：].+\n?/m, "")
    .trim();
}

function getSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^##\\s+|\\s*$)`, "m"));
  return match ? match[1].trim() : "";
}

function stripNumber(text) {
  return text.replace(/^\d+\.\s+/, "").trim();
}

function send(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(text);
}

function sendJson(res, value) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(value));
}

function sendDirectory(res, pathname, dir) {
  const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const links = fs.readdirSync(dir)
    .sort()
    .map((entry) => `<li><a href="${base}${encodeURIComponent(entry)}">${entry}</a></li>`)
    .join("");
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(`<!doctype html><meta charset="utf-8"><title>${base}</title><h1>${base}</h1><ul>${links}</ul>`);
}
