import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { openV2Store, readUnifiedView } from '../store.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { ContentStore } from '../content-store.mjs';

const ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));

function createTempDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'growth-os-p0-test-'));
  const dbPath = join(directory, 'growth-os-v2.sqlite');
  const securityLogPath = join(directory, 'security.jsonl');
  const store = openV2Store({ dbPath, rebuildView: true });
  const writer = new LifecycleEventStore({ db: store.db });
  const opportunities = [];
  for (let index = 0; index < 14; index += 1) {
    const opportunityId = `p0-test-${index}`;
    writer.createOpportunity({
      opportunityId,
      dedupeKey: `p0-test-dedupe-${index}`,
      sourceUrl: `https://example.com/p0-test/${index}`,
      title: `P0 test opportunity ${index}`,
      body: 'P0 protection test body',
      actor: 'p0-test-fixture',
    });
    const content = new ContentStore({ db: store.db });
    content.saveVersion({
      opportunityId,
      contentType: 'original_content',
      contentText: `A buyer asks about the supplier opportunity ${index} before ordering.`,
      platform: 'reddit',
      createdBy: 'p0-test-fixture',
    });
    content.saveVersion({
      opportunityId,
      contentType: 'reply_draft',
      contentText: `Reply about the supplier opportunity ${index} before ordering.`,
      platform: 'reddit',
      createdBy: 'p0-test-fixture',
    });
    opportunities.push(opportunityId);
  }
  store.close();
  return { dbPath, securityLogPath, opportunities };
}

async function waitForServer(child, baseUrl) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/__v2/health`);
      if (response.ok) return;
    } catch {
      // The child is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const output = child.stdout?.read()?.toString() || '';
  const errors = child.stderr?.read()?.toString() || '';
  throw new Error(`dashboard server did not start: ${output} ${errors}`);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { response, body };
}

test('P0 recovery is append-only and dashboard lifecycle writes are protected', async () => {
  const { dbPath, securityLogPath, opportunities } = createTempDatabase();
  const port = 18_787 + Math.floor(Math.random() * 500);
  const baseUrl = `http://127.0.0.1:${port}`;
  const origin = baseUrl;
  const child = spawn(process.env.GROWTH_OS_NODE || '/opt/homebrew/bin/node', ['scripts/growth-os/runtime/v2/dashboard-server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      GROWTH_OS_V2_DB: dbPath,
      GROWTH_OS_V2_SECURITY_LOG: securityLogPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(child, baseUrl);
    const csrf = await jsonRequest(`${baseUrl}/__v2/csrf`);
    assert.equal(csrf.response.status, 200);
    const token = csrf.body.csrf_token;
    const headers = {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-Growth-OS-CSRF': token,
    };

    const incompleteStore = openV2Store({ dbPath, rebuildView: true });
    const incompleteWriter = new LifecycleEventStore({ db: incompleteStore.db });
    incompleteWriter.createOpportunity({
      opportunityId: 'p0-missing-reply',
      dedupeKey: 'p0-missing-reply',
      sourceUrl: 'https://example.com/p0-missing-reply',
      title: 'P0 missing reply fixture',
      evidence: { platform: 'reddit' },
      actor: 'p0-test-fixture',
    });
    new ContentStore({ db: incompleteStore.db }).saveVersion({
      opportunityId: 'p0-missing-reply',
      contentType: 'original_content',
      contentText: 'A buyer asks about a supplier reply before placing an order.',
      platform: 'reddit',
      createdBy: 'p0-test-fixture',
    });
    incompleteStore.close();
    const blockedApprove = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        opportunity_id: 'p0-missing-reply',
        action: 'approve',
        actor: 'qa-operator',
        idempotency_key: 'qa-missing-reply',
      }),
    });
    assert.equal(blockedApprove.response.status, 422);
    assert.match(blockedApprove.body.error, /reply_draft/);

    const legitimatePayload = {
      opportunity_id: opportunities[0],
      action: 'approve',
      actor: 'qa-operator',
      idempotency_key: 'qa-approve-once',
    };
    const first = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify(legitimatePayload),
    });
    assert.equal(first.response.status, 200);
    const second = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify(legitimatePayload),
    });
    assert.equal(second.response.status, 200);
    assert.equal(second.body.event.event_id, first.body.event.event_id);

    const afterIdempotency = openV2Store({ dbPath, rebuildView: false });
    assert.equal(
      afterIdempotency.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events WHERE opportunity_id = ?').get(opportunities[0]).count,
      2,
    );
    afterIdempotency.close();

    const savedPublishDraft = await jsonRequest(`${baseUrl}/__v2/content`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        opportunity_id: opportunities[0],
        content_type: 'publish_draft',
        content_text: 'Publish content about the supplier opportunity before ordering.',
        actor: 'qa-operator',
        idempotency_key: 'qa-publish-draft',
      }),
    });
    assert.equal(savedPublishDraft.response.status, 200);
    const ready = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        opportunity_id: opportunities[0],
        action: 'ready_to_publish',
        actor: 'qa-operator',
        idempotency_key: 'qa-ready-once',
      }),
    });
    assert.equal(ready.response.status, 200);
    const published = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        opportunity_id: opportunities[0],
        action: 'mark_published',
        actor: 'qa-operator',
        idempotency_key: 'qa-publish-once',
        published_at: '2026-07-22T01:00:00.000Z',
        platform: 'reddit',
        published_url: 'https://reddit.example/p0-test-0',
        published_content: 'The actual published supplier guidance.',
      }),
    });
    assert.equal(published.response.status, 200);
    const editPublished = await jsonRequest(`${baseUrl}/__v2/content`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        opportunity_id: opportunities[0],
        content_type: 'reply_draft',
        content_text: 'A draft must not be edited after publishing.',
        actor: 'qa-operator',
        idempotency_key: 'qa-edit-published',
      }),
    });
    assert.equal(editPublished.response.status, 409);

    const invalidOrigin = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers: { ...headers, Origin: 'http://evil.example' },
      body: JSON.stringify({ ...legitimatePayload, opportunity_id: opportunities[1], idempotency_key: 'invalid-origin' }),
    });
    assert.equal(invalidOrigin.response.status, 403);

    const missingToken = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...legitimatePayload, opportunity_id: opportunities[1], idempotency_key: 'missing-token' }),
    });
    assert.equal(missingToken.response.status, 403);

    const genericActor = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...legitimatePayload, opportunity_id: opportunities[1], actor: 'dashboard-operator', idempotency_key: 'generic-actor' }),
    });
    assert.equal(genericActor.response.status, 403);

    const batchPayload = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify([legitimatePayload]),
    });
    assert.equal(batchPayload.response.status, 400);

    const rateResults = [];
    for (let index = 1; index <= 11; index += 1) {
      rateResults.push(await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          opportunity_id: opportunities[index],
          action: 'approve',
          actor: 'rate-test-operator',
          idempotency_key: `rate-${index}`,
        }),
      }));
    }
    assert.deepEqual(rateResults.slice(0, 10).map(({ response }) => response.status), Array(10).fill(200));
    assert.equal(rateResults[10].response.status, 429);

    const recoveryThroughDashboard = await jsonRequest(`${baseUrl}/__v2/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        opportunity_id: opportunities[13],
        action: 'approve',
        actor: 'system-p0-recovery',
        idempotency_key: 'recovery-not-dashboard',
      }),
    });
    assert.equal(recoveryThroughDashboard.response.status, 403);

    const recoveryStore = openV2Store({ dbPath, rebuildView: true });
    const recoveryWriter = new LifecycleEventStore({ db: recoveryStore.db });
    const recoveryOpportunity = 'p0-recovery-fixture';
    const original = recoveryWriter.createOpportunity({
      opportunityId: recoveryOpportunity,
      dedupeKey: 'p0-recovery-dedupe',
      sourceUrl: 'https://example.com/p0-recovery',
      title: 'P0 recovery fixture',
      actor: 'p0-test-fixture',
    });
    const recoveryContent = new ContentStore({ db: recoveryStore.db });
    recoveryContent.saveVersion({
      opportunityId: recoveryOpportunity,
      contentType: 'original_content',
      contentText: 'A buyer asks about a supplier recovery opportunity before ordering.',
      platform: 'reddit',
      createdBy: 'p0-test-fixture',
    });
    recoveryContent.saveVersion({
      opportunityId: recoveryOpportunity,
      contentType: 'reply_draft',
      contentText: 'Reply about the supplier recovery opportunity before ordering.',
      platform: 'reddit',
      createdBy: 'p0-test-fixture',
    });
    const approved = recoveryWriter.approve(recoveryOpportunity, { actor: 'dashboard-operator' });
    const historicalIds = recoveryStore.db.prepare('SELECT event_id FROM lifecycle_events ORDER BY event_seq').all().map(({ event_id }) => event_id);
    const recovered = recoveryWriter.restorePendingReview(recoveryOpportunity, {
      incidentId: 'P0-TEST',
      originalApproveEventId: approved.event_id,
      recoveryReason: 'test controlled recovery',
      actor: 'system-p0-recovery',
      recoveredAt: '2026-07-21T09:00:00.000Z',
    });
    assert.equal(recovered.event_type, 'admin_restore_pending_review');
    assert.equal(JSON.parse(recovered.evidence_ref).original_approve_event_id, approved.event_id);
    assert.equal(readUnifiedView(recoveryStore.db).find((row) => row.opportunity_id === recoveryOpportunity).current_status, 'pending_review');
    const currentIds = recoveryStore.db.prepare('SELECT event_id FROM lifecycle_events ORDER BY event_seq').all().map(({ event_id }) => event_id);
    assert.deepEqual(currentIds.slice(0, historicalIds.length), historicalIds);
    assert.equal(currentIds.length, historicalIds.length + 1);
    recoveryStore.close();

    assert.equal(readFileSync(securityLogPath, 'utf8').split('\n').filter(Boolean).length >= 15, true);
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
});
