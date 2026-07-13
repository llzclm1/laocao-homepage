import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addSocialAgentOpportunity, markSocialAgentDraftPublished, runSocialAgent, saveSocialAgentKeywords } from "./run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.PORT || 8790);
const host = "127.0.0.1";
const dashboard = path.join(root, "docs/growth-os/dashboard.html");
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${host}:${port}`);
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.method === "POST") {
    try {
      const value = await readBody(req);
      if (url.pathname === "/__social-agent-keywords") return json(res, { ok: true, view: saveSocialAgentKeywords(value) });
      if (url.pathname === "/__manual-discovery") return json(res, { ok: true, ...addSocialAgentOpportunity(value) });
      if (url.pathname === "/__social-agent-draft-published") return json(res, { ok: true, view: markSocialAgentDraftPublished(value) });
      if (url.pathname === "/__social-agent-run") return json(res, { ok: true, ...(await runSocialAgent()) });
    } catch (error) {
      return send(res, 400, error.message || "Invalid request");
    }
  }
  const pathname = decodeURIComponent(url.pathname);
  const file = pathname === "/" || /^\/growth-os(?:\/dashboard)?\/?$/.test(pathname)
    ? dashboard
    : path.normalize(path.join(root, pathname));
  if (!file.startsWith(root)) return send(res, 403, "Forbidden");
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, "Not found");
    res.writeHead(200, headers(types[path.extname(file)] || "application/octet-stream"));
    res.end(data);
  });
}).listen(port, host, () => console.log(`Social Content Agent: http://${host}:${port}/growth-os/dashboard`));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20000) reject(new Error("Request too large"));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function headers(type) {
  return { "Content-Type": type, "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
}
function send(res, status, body) { res.writeHead(status, headers("text/plain; charset=utf-8")); res.end(body); }
function json(res, value) { res.writeHead(200, headers("application/json; charset=utf-8")); res.end(JSON.stringify(value)); }
