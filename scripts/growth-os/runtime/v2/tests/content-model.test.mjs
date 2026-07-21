import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ContentStore } from '../content-store.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { openV2Store, readUnifiedView } from '../store.mjs';

function createOpportunity(store, id = 'content-001') {
  return new LifecycleEventStore({ db: store.db }).createOpportunity({
    opportunityId: id,
    dedupeKey: `dedupe:${id}`,
    sourceUrl: `https://example.com/${id}`,
    title: `Content test ${id}`,
    evidence: { why_relevant: 'Test evidence.' },
    actor: 'content-test',
    occurredAt: '2026-07-21T00:00:00.000Z',
  });
}

test('ContentStore keeps typed content, draft versions, and append-only history', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    createOpportunity(store);
    const content = new ContentStore({ db: store.db });
    const original = content.saveVersion({
      opportunityId: 'content-001',
      contentType: 'original_content',
      contentText: 'Original buyer question.',
      platform: 'reddit',
      source: 'https://example.com/content-001',
      createdBy: 'discovery',
    });
    assert.equal(original.version, 1);
    assert.equal(readUnifiedView(store.db)[0].evidence.why_relevant, 'Test evidence.');
    assert.equal(content.saveVersion({
      opportunityId: 'content-001',
      contentType: 'reply_draft',
      contentText: 'First reply draft.',
      createdBy: 'generator',
    }).version, 1);
    assert.equal(content.saveVersion({
      opportunityId: 'content-001',
      contentType: 'reply_draft',
      contentText: 'Revised reply draft.',
      createdBy: 'operator',
    }).version, 2);
    assert.equal(content.getLatest('content-001', 'reply_draft').content_text, 'Revised reply draft.');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM content_items').get().count, 3);
    assert.throws(
      () => store.db.prepare('UPDATE content_items SET content_text = ?').run('mutated'),
      /content_items is append-only/,
    );
    assert.throws(
      () => store.db.prepare('DELETE FROM content_items').run(),
      /content_items is append-only/,
    );
  } finally {
    store.close();
  }
});

test('ready and published require complete content and published content is atomic', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    createOpportunity(store, 'content-002');
    writer.approve('content-002');
    assert.throws(
      () => writer.markReadyToPublish('content-002'),
      /publish_draft is required/,
    );
    const content = new ContentStore({ db: store.db });
    content.saveVersion({
      opportunityId: 'content-002',
      contentType: 'publish_draft',
      contentText: 'Ready to publish draft.',
      platform: 'linkedin',
      createdBy: 'operator',
    });
    writer.markReadyToPublish('content-002');
    assert.throws(
      () => writer.markPublished('content-002', {
        publishedAt: '2026-07-21T00:02:00.000Z',
        platform: 'linkedin',
        publishedUrl: 'https://linkedin.com/posts/002',
      }),
      /publishedContent is required/,
    );
    assert.equal(writer.getCurrentEvent('content-002').to_status, 'ready_to_publish');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM performance').get().count, 0);
    writer.markPublished('content-002', {
      publishedAt: '2026-07-21T00:03:00.000Z',
      platform: 'linkedin',
      publishedUrl: 'https://linkedin.com/posts/002',
      publishedContent: 'Actual published content.',
    });
    const row = readUnifiedView(store.db)[0];
    assert.equal(row.content.latest_publish_draft.content_text, 'Ready to publish draft.');
    assert.equal(row.content.published_content.content_text, 'Actual published content.');
    assert.equal(row.performance_status, 'pending');
    assert.throws(
      () => content.saveVersion({
        opportunityId: 'content-002',
        contentType: 'published_content',
        contentText: 'Changed published content.',
        platform: 'linkedin',
        createdBy: 'operator',
      }),
      /published_content is immutable/,
    );
  } finally {
    store.close();
  }
});
