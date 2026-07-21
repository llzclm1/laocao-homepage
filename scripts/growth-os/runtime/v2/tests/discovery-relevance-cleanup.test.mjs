import assert from 'node:assert/strict';
import test from 'node:test';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { openV2Store, readUnifiedView } from '../store.mjs';

function createFixture() {
  const store = openV2Store({ dbPath: ':memory:', rebuildView: true });
  const writer = new LifecycleEventStore({ db: store.db });
  writer.createOpportunity({
    opportunityId: 'relevance-cleanup-001',
    dedupeKey: 'relevance-cleanup-dedupe-001',
    sourceUrl: 'https://reddit.com/r/Alibaba/comments/abc123/example',
    title: 'Irrelevant discovery fixture',
    actor: 'test-fixture',
  });
  return { store, writer };
}

test('irrelevant discovery cleanup is a controlled append-only lifecycle event', () => {
  const { store, writer } = createFixture();

  const event = writer.archiveIrrelevantDiscovery('relevance-cleanup-001', {
    cleanupId: 'CLEANUP-TEST-001',
    relevanceScore: 15,
    relevanceCategory: 'C',
    rejectionReason: 'missing procurement context',
    sourceUrl: 'https://reddit.com/r/Alibaba/comments/abc123/example',
    dryRunReport: '/tmp/relevance-cleanup-test.json',
    archivedAt: '2026-07-21T10:00:00.000Z',
    actor: 'system-relevance-cleanup',
  });

  assert.equal(event.event_type, 'archive_irrelevant_discovery');
  assert.equal(event.from_status, 'pending_review');
  assert.equal(event.to_status, 'archived');
  assert.equal(event.actor, 'system-relevance-cleanup');
  const evidence = JSON.parse(event.evidence_ref);
  assert.deepEqual(evidence, {
    cleanup_id: 'CLEANUP-TEST-001',
    relevance_score: 15,
    relevance_category: 'C',
    rejection_reason: 'missing procurement context',
    source_url: 'https://reddit.com/r/Alibaba/comments/abc123/example',
    dry_run_report: '/tmp/relevance-cleanup-test.json',
    archived_at: '2026-07-21T10:00:00.000Z',
    actor: 'system-relevance-cleanup',
  });
  assert.equal(
    readUnifiedView(store.db).find((row) => row.opportunity_id === 'relevance-cleanup-001').current_status,
    'archived',
  );

  assert.throws(
    () => writer.archiveIrrelevantDiscovery('relevance-cleanup-001', {
      cleanupId: 'CLEANUP-TEST-002',
      relevanceScore: 10,
      relevanceCategory: 'C',
      rejectionReason: 'duplicate test',
      sourceUrl: 'https://example.com',
      dryRunReport: '/tmp/relevance-cleanup-test.json',
      archivedAt: '2026-07-21T10:01:00.000Z',
      actor: 'dashboard-operator',
    }),
    /requires actor system-relevance-cleanup/,
  );

  store.close();
});
