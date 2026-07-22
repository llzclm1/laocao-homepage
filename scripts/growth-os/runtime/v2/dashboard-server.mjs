import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ContentStore } from './content-store.mjs';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import { DEFAULT_DB_PATH, openV2Store, readUnifiedView } from './store.mjs';
import { readReadyToPublish, readReviewQueue } from './review-queue.mjs';
import { rebuildUnifiedView } from './unified-view.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const dashboardFile = path.join(root, 'docs/growth-os/dashboard.html');
const dbPath = process.env.GROWTH_OS_V2_DB || DEFAULT_DB_PATH;
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8787);
const allowedOrigins = new Set([
  `http://${host}:${port}`,
  `http://localhost:${port}`,
]);
const allowedHosts = new Set([
  `${host}:${port}`,
  `localhost:${port}`,
]);
const csrfToken = randomUUID();
const securityLogPath = process.env.GROWTH_OS_V2_SECURITY_LOG
  || path.join(root, 'data/growth-os/logs/v2-security.jsonl');
const lifecycleRateWindows = new Map();
const idempotencyResults = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const IDEMPOTENCY_TTL_MS = 5 * 60_000;

const contentTypes = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
});

function openReadStore() {
  if (!fs.existsSync(dbPath)) throw new Error(`v2 database is missing: ${dbPath}`);
  return openV2Store({ dbPath, rebuildView: false });
}

function send(res, status, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': typeof value === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': `http://${host}:${port}`,
    'Access-Control-Allow-Headers': 'Content-Type, X-Growth-OS-CSRF, X-Request-Id',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    Vary: 'Origin',
  });
  res.end(body);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requestContext(req, value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    request_id: String(req.headers['x-request-id'] || randomUUID()).slice(0, 120),
    actor: input.actor ?? null,
    opportunity_id: input.opportunity_id ?? null,
    action: input.action ?? null,
    request_time: new Date().toISOString(),
    origin: req.headers.origin ?? null,
    user_agent: req.headers['user-agent'] ?? null,
  };
}

function appendSecurityLog(context, result, error = null) {
  const record = {
    ...context,
    result,
    error: error ? String(error.message || error) : null,
  };
  try {
    fs.mkdirSync(path.dirname(securityLogPath), { recursive: true });
    fs.appendFileSync(securityLogPath, `${JSON.stringify(record)}\n`);
  } catch (logError) {
    console.error(`Growth OS v2 security log failed: ${logError.message}`);
  }
}

function assertLocalMutationRequest(req) {
  const origin = String(req.headers.origin || '');
  const requestHost = String(req.headers.host || '');
  if (!allowedOrigins.has(origin)) {
    throw new HttpError(403, 'origin is not allowed');
  }
  if (!allowedHosts.has(requestHost)) {
    throw new HttpError(403, 'host is not allowed');
  }
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  if (req.headers['x-growth-os-csrf'] !== csrfToken) {
    throw new HttpError(403, 'CSRF token is invalid or missing');
  }
}

function rateLimitKey(actor, action) {
  return `${actor}\u0000${action}`;
}

function pruneRateWindow(key, now) {
  const values = lifecycleRateWindows.get(key) || [];
  const fresh = values.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (fresh.length) lifecycleRateWindows.set(key, fresh);
  else lifecycleRateWindows.delete(key);
  return fresh;
}

function assertRateLimit(actor, action) {
  const now = Date.now();
  const actorKey = rateLimitKey(actor, '*');
  const actionKey = rateLimitKey(actor, action);
  const actorWindow = pruneRateWindow(actorKey, now);
  const actionWindow = pruneRateWindow(actionKey, now);
  if (actorWindow.length >= RATE_LIMIT || actionWindow.length >= RATE_LIMIT) {
    throw new HttpError(429, 'lifecycle write rate limit exceeded');
  }
  actorWindow.push(now);
  actionWindow.push(now);
  lifecycleRateWindows.set(actorKey, actorWindow);
  lifecycleRateWindows.set(actionKey, actionWindow);
}

function getCachedIdempotentResult(key, fingerprint) {
  const cached = idempotencyResults.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    idempotencyResults.delete(key);
    return null;
  }
  if (cached.fingerprint !== fingerprint) {
    throw new HttpError(409, 'idempotency key was reused for a different request');
  }
  return cached.result;
}

function cacheIdempotentResult(key, fingerprint, result) {
  idempotencyResults.set(key, {
    fingerprint,
    result,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}

function normalizeLifecycleMutationError(error) {
  if (
    /content integrity gate failed|(?:original_content|reply_draft|publish_draft) is required/.test(
      String(error?.message || ''),
    )
  ) {
    return new HttpError(422, error.message);
  }
  return error;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new HttpError(413, 'request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new HttpError(400, 'request body must be JSON'));
      }
    });
    req.on('error', reject);
  });
}

function counts(rows) {
  return rows.reduce((result, row) => {
    result[row.current_status] = (result[row.current_status] || 0) + 1;
    return result;
  }, {});
}

function readView() {
  const store = openReadStore();
  try {
    const items = readUnifiedView(store.db);
    return {
      generated_at: new Date().toISOString(),
      items,
      counts: counts(items),
      review_queue: readReviewQueue(store.db),
      ready_to_publish: readReadyToPublish(store.db),
    };
  } finally {
    store.close();
  }
}

async function applyLifecycleAction(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new HttpError(400, 'request body must be one JSON object');
  }
  if (Array.isArray(value.opportunity_ids) || Array.isArray(value.opportunities)) {
    throw new HttpError(400, 'batch lifecycle payloads are not allowed');
  }
  const opportunityId = typeof value.opportunity_id === 'string' ? value.opportunity_id.trim() : '';
  const action = typeof value.action === 'string' ? value.action.trim() : '';
  const actor = typeof value.actor === 'string' ? value.actor.trim() : '';
  const idempotencyKey = typeof value.idempotency_key === 'string' ? value.idempotency_key.trim() : '';
  if (!opportunityId) throw new HttpError(400, 'opportunity_id is required');
  if (!actor) throw new HttpError(400, 'actor is required');
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(actor)) throw new HttpError(400, 'actor format is invalid');
  if (actor === 'dashboard-operator') throw new HttpError(403, 'an explicit operator actor is required');
  if (actor === 'system-p0-recovery') throw new HttpError(403, 'recovery actor is not allowed on dashboard endpoint');
  if (!idempotencyKey || idempotencyKey.length > 160) throw new HttpError(400, 'idempotency_key is required');
  if (!['approve', 'ready_to_publish', 'mark_published', 'archive'].includes(action)) {
    throw new HttpError(400, `unsupported lifecycle action: ${action}`);
  }

  const fingerprint = JSON.stringify({
    opportunityId,
    action,
    actor,
    idempotencyKey,
    publishedAt: value.published_at ?? null,
    platform: value.platform ?? null,
    publishedUrl: value.published_url ?? null,
    publishedContent: value.published_content ?? null,
  });
  const cached = getCachedIdempotentResult(`${actor}:${idempotencyKey}`, fingerprint);
  if (cached) return cached;
  assertRateLimit(actor, action);

  const store = openReadStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    const options = { actor };
    let event;
    try {
      if (action === 'approve') event = writer.approve(opportunityId, options);
      if (action === 'ready_to_publish') event = writer.markReadyToPublish(opportunityId, options);
      if (action === 'archive') event = writer.archive(opportunityId, options);
      if (action === 'mark_published') {
        event = writer.markPublished(opportunityId, {
          ...options,
          publishedAt: value.published_at,
          platform: value.platform,
          publishedUrl: value.published_url,
          publishedContent: value.published_content,
        });
      }
    } catch (error) {
      throw normalizeLifecycleMutationError(error);
    }
    rebuildUnifiedView(store.db);
    const result = { ok: true, event, view: readView() };
    cacheIdempotentResult(`${actor}:${idempotencyKey}`, fingerprint, result);
    return result;
  } finally {
    store.close();
  }
}

async function saveContent(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new HttpError(400, 'request body must be one JSON object');
  }
  if (Array.isArray(value.opportunity_ids) || Array.isArray(value.opportunities)) {
    throw new HttpError(400, 'batch content payloads are not allowed');
  }
  const opportunityId = typeof value.opportunity_id === 'string' ? value.opportunity_id.trim() : '';
  const contentType = typeof value.content_type === 'string' ? value.content_type.trim() : '';
  const contentText = typeof value.content_text === 'string' ? value.content_text.trim() : '';
  const actor = typeof value.actor === 'string' ? value.actor.trim() : '';
  const idempotencyKey = typeof value.idempotency_key === 'string' ? value.idempotency_key.trim() : '';
  if (!opportunityId) throw new HttpError(400, 'opportunity_id is required');
  if (!['reply_draft', 'publish_draft'].includes(contentType)) {
    throw new HttpError(400, 'only reply_draft and publish_draft can be saved from the dashboard');
  }
  if (!contentText) throw new HttpError(400, 'content_text is required');
  if (contentText.length > 50_000) throw new HttpError(413, 'content_text is too large');
  if (!actor) throw new HttpError(400, 'actor is required');
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(actor)) throw new HttpError(400, 'actor format is invalid');
  if (actor === 'dashboard-operator') throw new HttpError(403, 'an explicit operator actor is required');
  if (actor === 'system-p0-recovery') throw new HttpError(403, 'recovery actor is not allowed on dashboard endpoint');
  if (!idempotencyKey || idempotencyKey.length > 160) throw new HttpError(400, 'idempotency_key is required');

  const fingerprint = JSON.stringify({
    opportunityId,
    contentType,
    contentText,
    platform: value.platform ?? null,
    source: value.source ?? 'dashboard',
    actor,
  });
  const cacheKey = `${actor}:content:${idempotencyKey}`;
  const cached = getCachedIdempotentResult(cacheKey, fingerprint);
  if (cached) return cached;
  assertRateLimit(actor, `content:${contentType}`);

  const store = openReadStore();
  try {
    const current = store.db.prepare('SELECT current_status FROM unified_view WHERE opportunity_id = ?').get(opportunityId);
    if (!current) throw new HttpError(404, 'opportunity not found');
    if (['published', 'archived'].includes(current.current_status)) {
      throw new HttpError(409, `content cannot be edited after ${current.current_status}`);
    }
    const content = new ContentStore({ db: store.db });
    const saved = content.saveVersion({
      opportunityId,
      contentType,
      contentText,
      platform: value.platform,
      source: value.source ?? 'dashboard',
      createdBy: actor,
    });
    rebuildUnifiedView(store.db);
    const result = { ok: true, content: saved, view: readView() };
    cacheIdempotentResult(cacheKey, fingerprint, result);
    return result;
  } finally {
    store.close();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  if (req.method === 'OPTIONS') {
    if (!allowedHosts.has(String(req.headers.host || '')) || !allowedOrigins.has(String(req.headers.origin || ''))) {
      return send(res, 403, { ok: false, error: 'origin or host is not allowed' });
    }
    return send(res, 204, '');
  }

  try {
    if (req.method === 'GET' && url.pathname === '/__v2/csrf') {
      if (!allowedHosts.has(String(req.headers.host || ''))) throw new HttpError(403, 'host is not allowed');
      return send(res, 200, { csrf_token: csrfToken });
    }
    if (req.method === 'GET' && url.pathname === '/__v2/health') {
      const view = readView();
      return send(res, 200, { ok: true, db_path: dbPath, unified_view_count: view.items.length });
    }
    if (req.method === 'GET' && url.pathname === '/__v2/unified-view') {
      return send(res, 200, readView());
    }
    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      const favicon = path.join(root, 'favicon.ico');
      if (!fs.existsSync(favicon)) return send(res, 204, '');
      res.writeHead(200, { 'Content-Type': 'image/x-icon', 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(favicon));
    }
    if (req.method === 'POST' && url.pathname === '/__v2/lifecycle') {
      let value = {};
      let context = requestContext(req, value);
      try {
        value = await readBody(req);
        context = requestContext(req, value);
        assertLocalMutationRequest(req);
        const result = await applyLifecycleAction(value);
        appendSecurityLog(context, 'success');
        return send(res, 200, result);
      } catch (error) {
        appendSecurityLog(context, 'rejected', error);
        throw error;
      }
    }
    if (req.method === 'POST' && url.pathname === '/__v2/content') {
      let value = {};
      let context = requestContext(req, value);
      try {
        value = await readBody(req);
        context = requestContext(req, {
          ...value,
          action: `save_${value?.content_type || 'content'}`,
        });
        assertLocalMutationRequest(req);
        const result = await saveContent(value);
        appendSecurityLog(context, 'success');
        return send(res, 200, result);
      } catch (error) {
        appendSecurityLog(context, 'rejected', error);
        throw error;
      }
    }
    if (req.method === 'GET' && (url.pathname === '/' || /^\/growth-os(?:\/dashboard)?\/?$/i.test(url.pathname))) {
      const data = fs.readFileSync(dashboardFile);
      res.writeHead(200, { 'Content-Type': contentTypes['.html'], 'Cache-Control': 'no-store' });
      return res.end(data);
    }
    return send(res, 404, 'Not found');
  } catch (error) {
    return send(res, error.status || 503, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Growth OS v2 dashboard: http://${host}:${port}/growth-os/`);
});
