import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { ContentStore } from '../content-store.mjs';
import { buildMorningBrief } from '../morning-brief.mjs';
import { readReadyToPublish, readReviewQueue } from '../review-queue.mjs';
import { openV2Store, readUnifiedView } from '../store.mjs';

function openTestStore() {
  return openV2Store({ dbPath: ':memory:' });
}

function create(store, id, url) {
  const writer = new LifecycleEventStore({ db: store.db });
  writer.createOpportunity({
    opportunityId: id,
    dedupeKey: `url:${url}`,
    sourceUrl: url,
    title: `Opportunity ${id}`,
    body: 'Evidence from a public source.',
    actor: 'test',
    occurredAt: '2026-07-21T00:00:00.000Z',
  });
  new ContentStore({ db: store.db }).saveVersion({
    opportunityId: id,
    contentType: 'original_content',
    contentText: `A buyer asks about the supplier opportunity ${id} before ordering.`,
    platform: 'linkedin',
    createdBy: 'test',
  });
}

function saveReplyDraft(store, id) {
  const content = new ContentStore({ db: store.db });
  return content.saveVersion({
    opportunityId: id,
    contentType: 'reply_draft',
    contentText: `Reply for ${id}`,
    platform: 'linkedin',
    createdBy: 'test',
  });
}

function savePublishDraft(store, id) {
  const content = new ContentStore({ db: store.db });
  return content.saveVersion({
    opportunityId: id,
    contentType: 'publish_draft',
    contentText: `Draft for ${id}`,
    platform: 'linkedin',
    createdBy: 'test',
  });
}

test('Review Queue and Morning Brief are derived from one Unified View', () => {
  const store = openTestStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    create(store, 'pending-001', 'https://example.com/pending');
    create(store, 'ready-001', 'https://example.com/ready');
    saveReplyDraft(store, 'ready-001');
    writer.approve('ready-001', { occurredAt: '2026-07-21T00:01:00.000Z' });
    savePublishDraft(store, 'ready-001');
    writer.markReadyToPublish('ready-001', { occurredAt: '2026-07-21T00:02:00.000Z' });

    assert.equal(readReviewQueue(store.db).count, 1);
    assert.equal(readReadyToPublish(store.db).count, 1);
    assert.equal(readUnifiedView(store.db).length, 2);

    const first = buildMorningBrief(store.db, { now: new Date('2026-07-21T08:00:00.000Z') });
    const second = buildMorningBrief(store.db, { now: new Date('2026-07-21T08:05:00.000Z') });
    assert.equal(first.delivered_count, 2);
    assert.equal(second.delivered_count, 0);
    assert.equal(
      store.db.prepare('SELECT COUNT(*) AS count FROM brief_deliveries').get().count,
      2,
    );
  } finally {
    store.close();
  }
});

test('Published rows leave the Brief and retain one complete publication fact', () => {
  const store = openTestStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    create(store, 'published-001', 'https://example.com/source');
    saveReplyDraft(store, 'published-001');
    writer.approve('published-001');
    savePublishDraft(store, 'published-001');
    writer.markReadyToPublish('published-001');
    writer.markPublished('published-001', {
      publishedAt: '2026-07-21T08:00:00.000Z',
      platform: 'linkedin',
      publishedUrl: 'https://linkedin.com/posts/001',
      publishedContent: 'Published adapter test content.',
    });

    const view = readUnifiedView(store.db);
    assert.equal(view[0].current_status, 'published');
    assert.equal(buildMorningBrief(store.db, { now: new Date('2026-07-21T08:05:00.000Z') }).eligible_count, 0);
    const publication = store.db.prepare('SELECT published_at, platform, published_url FROM lifecycle_events WHERE to_status = ?').get('published');
    assert.equal(publication.published_at, '2026-07-21T08:00:00.000Z');
    assert.equal(publication.platform, 'linkedin');
    assert.equal(publication.published_url, 'https://linkedin.com/posts/001');
  } finally {
    store.close();
  }
});

test('Production Dashboard has no legacy business-data read paths', () => {
  const html = readFileSync(new URL('../../../../../docs/growth-os/dashboard.html', import.meta.url), 'utf8');
  for (const forbidden of [
    'data/social-agent/view.json',
    'data/growth-os/viewer/dashboard-view.json',
    'today_plan',
    '.csv',
    'morning-brief-latest.json',
    'signals-latest.json',
  ]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
  assert.equal(html.includes('/__v2/unified-view'), true);
  assert.equal(html.includes('/__v2/lifecycle'), true);
});
