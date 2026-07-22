import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ContentStore } from '../content-store.mjs';
import {
  assessOriginalContent,
  getOpportunityContentIntegrity,
} from '../content-integrity.mjs';
import { runV2Discovery } from '../discovery.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { buildContentCompletionPlan } from '../content-completion.mjs';
import { openV2Store, readUnifiedView } from '../store.mjs';

const VALID_ORIGINAL = 'A buyer asks about a China supplier quotation and sample before placing an order.';

function createOpportunity(store, id, { sourceUrl = `https://example.com/${id}`, platform = 'reddit' } = {}) {
  return new LifecycleEventStore({ db: store.db }).createOpportunity({
    opportunityId: id,
    dedupeKey: `dedupe:${id}`,
    sourceUrl,
    title: `Supplier quotation question ${id}`,
    evidence: platform ? { platform } : {},
    actor: 'gate-test',
  });
}

function saveContent(store, id, contentType, contentText, platform = 'reddit') {
  return new ContentStore({ db: store.db }).saveVersion({
    opportunityId: id,
    contentType,
    contentText,
    platform,
    createdBy: 'gate-test',
  });
}

test('Approve rejects missing original, reply, platform, and source URL', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    createOpportunity(store, 'missing-all', { platform: null });
    assert.throws(() => writer.approve('missing-all'), /original_content.*reply_draft.*platform/);

    createOpportunity(store, 'missing-reply');
    saveContent(store, 'missing-reply', 'original_content', VALID_ORIGINAL);
    assert.throws(() => writer.approve('missing-reply'), /reply_draft/);

    createOpportunity(store, 'missing-platform', { platform: null });
    saveContent(store, 'missing-platform', 'original_content', VALID_ORIGINAL, null);
    saveContent(store, 'missing-platform', 'reply_draft', 'Reply about the supplier quotation and sample before ordering.', null);
    assert.throws(() => writer.approve('missing-platform'), /platform/);

    createOpportunity(store, 'missing-url', { sourceUrl: null });
    saveContent(store, 'missing-url', 'original_content', VALID_ORIGINAL);
    saveContent(store, 'missing-url', 'reply_draft', 'Reply about the supplier quotation and sample before ordering.');
    assert.throws(() => writer.approve('missing-url'), /source_url/);

    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events WHERE event_type = ?').get('approve').count, 0);
  } finally {
    store.close();
  }
});

test('An obviously mismatched reply draft cannot be approved or auto-migrated', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    createOpportunity(store, 'mismatch-001');
    saveContent(store, 'mismatch-001', 'original_content', 'The buyer needs PFAS-free certification for a China supplier shipment.');
    saveContent(store, 'mismatch-001', 'reply_draft', 'Ask about CAD dimensions, tooling, fixtures, and factory production capacity.');
    assert.throws(() => writer.approve('mismatch-001'), /reply_draft_semantic_mismatch/);

    const sourceRoot = mkdtempSync(join(tmpdir(), 'growth-os-integrity-source-'));
    try {
      const sourcePath = join(sourceRoot, 'data/growth-os/social-discovery/discovered-posts.json');
      mkdirSync(join(sourceRoot, 'data/growth-os/social-discovery'), { recursive: true });
      writeFileSync(sourcePath, JSON.stringify([{
        id: 'mismatch-001',
        url: 'https://example.com/mismatch-001',
        suggested_comment: 'Ask about CAD dimensions, tooling, fixtures, and factory production capacity.',
      }]));
      const plan = buildContentCompletionPlan({ db: store.db, sourceSnapshot: sourceRoot });
      assert.equal(plan.actions.some((item) => item.content_type === 'reply_draft'), false);
      assert.equal(plan.skipped.find((item) => item.opportunity_id === 'mismatch-001').reason, 'reply_draft_semantic_mismatch');
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
    }
  } finally {
    store.close();
  }
});

test('Ready requires publish draft and complete content, then publishes atomically', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    createOpportunity(store, 'e2e-001', { platform: 'linkedin' });
    saveContent(store, 'e2e-001', 'original_content', VALID_ORIGINAL, 'linkedin');
    saveContent(store, 'e2e-001', 'reply_draft', 'Reply about the supplier quotation and sample before ordering.', 'linkedin');
    writer.approve('e2e-001');
    assert.throws(() => writer.markReadyToPublish('e2e-001'), /publish_draft/);
    saveContent(store, 'e2e-001', 'publish_draft', 'Publish draft about comparing the supplier quotation and sample.', 'linkedin');
    writer.markReadyToPublish('e2e-001');
    writer.markPublished('e2e-001', {
      publishedAt: '2026-07-22T01:00:00.000Z',
      platform: 'linkedin',
      publishedUrl: 'https://linkedin.example/posts/e2e-001',
      publishedContent: 'The actual published supplier guidance.',
    });
    const row = readUnifiedView(store.db)[0];
    assert.equal(row.current_status, 'published');
    assert.equal(row.content.published_content.content_text, 'The actual published supplier guidance.');
    assert.equal(row.performance_status, 'pending');
  } finally {
    store.close();
  }
});

test('Discovery rejects snippet-only and footer content before creating an opportunity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'growth-os-integrity-discovery-'));
  const dbPath = join(directory, 'v2.sqlite');
  try {
    const result = await runV2Discovery({
      dbPath,
      sourceResults: [{
        platform: 'reddit',
        source_name: 'gate-test',
        collection_status: 'success',
        items: [
          {
            url: 'https://reddit.com/r/Alibaba/comments/snippet-only',
            title: 'How do I source from a China supplier?',
            snippet: VALID_ORIGINAL,
            platform: 'reddit',
          },
          {
            url: 'https://reddit.com/r/Alibaba/comments/footer-only',
            title: 'How do I source from a China supplier?',
            body: '5. timeline: read more and view comments for the rest of this post.',
            platform: 'reddit',
          },
        ],
      }],
      now: new Date('2026-07-22T01:00:00.000Z'),
    });
    assert.equal(result.added.length, 0);
    assert.equal(result.rejected.some((item) => item.reason === 'missing_original_content'), true);
    assert.equal(result.rejected.some((item) => item.reason === 'snippet_or_footer_original_content'), true);
    const store = openV2Store({ dbPath, rebuildView: false });
    try {
      assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count, 0);
    } finally {
      store.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Integrity report exposes missing fields without changing lifecycle state', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    createOpportunity(store, 'report-001');
    const report = getOpportunityContentIntegrity(store.db, 'report-001');
    assert.equal(report.valid, false);
    assert.deepEqual(report.missing, ['original_content', 'reply_draft']);
    assert.equal(assessOriginalContent('Please use this pinned weekly thread.').valid, false);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count, 1);
  } finally {
    store.close();
  }
});
