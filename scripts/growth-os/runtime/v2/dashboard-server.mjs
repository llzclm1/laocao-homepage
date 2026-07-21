import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import { DEFAULT_DB_PATH, openV2Store, readUnifiedView } from './store.mjs';
import { readReadyToPublish, readReviewQueue } from './review-queue.mjs';
import { rebuildUnifiedView } from './unified-view.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const dashboardFile = path.join(root, 'docs/growth-os/dashboard.html');
const dbPath = process.env.GROWTH_OS_V2_DB || DEFAULT_DB_PATH;
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8787);

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error('request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('request body must be JSON'));
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
  const opportunityId = String(value.opportunity_id || '').trim();
  const action = String(value.action || '').trim();
  if (!opportunityId) throw new Error('opportunity_id is required');
  if (!['approve', 'ready_to_publish', 'mark_published', 'archive'].includes(action)) {
    throw new Error(`unsupported lifecycle action: ${action}`);
  }

  const store = openReadStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    const options = { actor: 'dashboard-operator' };
    let event;
    if (action === 'approve') event = writer.approve(opportunityId, options);
    if (action === 'ready_to_publish') event = writer.markReadyToPublish(opportunityId, options);
    if (action === 'archive') event = writer.archive(opportunityId, options);
    if (action === 'mark_published') {
      event = writer.markPublished(opportunityId, {
        ...options,
        publishedAt: value.published_at,
        platform: value.platform,
        publishedUrl: value.published_url,
      });
    }
    rebuildUnifiedView(store.db);
    return { ok: true, event, view: readView() };
  } finally {
    store.close();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  if (req.method === 'OPTIONS') return send(res, 204, '');

  try {
    if (req.method === 'GET' && url.pathname === '/__v2/health') {
      const view = readView();
      return send(res, 200, { ok: true, db_path: dbPath, unified_view_count: view.items.length });
    }
    if (req.method === 'GET' && url.pathname === '/__v2/unified-view') {
      return send(res, 200, readView());
    }
    if (req.method === 'POST' && url.pathname === '/__v2/lifecycle') {
      return send(res, 200, await applyLifecycleAction(await readBody(req)));
    }
    if (req.method === 'GET' && (url.pathname === '/' || /^\/growth-os(?:\/dashboard)?\/?$/i.test(url.pathname))) {
      const data = fs.readFileSync(dashboardFile);
      res.writeHead(200, { 'Content-Type': contentTypes['.html'], 'Cache-Control': 'no-store' });
      return res.end(data);
    }
    return send(res, 404, 'Not found');
  } catch (error) {
    return send(res, 503, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Growth OS v2 dashboard: http://${host}:${port}/growth-os/`);
});
