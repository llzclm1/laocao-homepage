import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { getBriefDeduplicationKey, getEligibleStage, isBriefEligible, isBriefExcluded, shouldSendBrief } from '../morning-brief-rules.mjs';
import { readUnifiedView, openV2Store } from '../store.mjs';
import { rebuildUnifiedView, unifiedViewExists } from '../unified-view.mjs';

const BASE_TIME = '2026-07-21T00:00:00.000Z';

function openTestStore() {
  return openV2Store({ dbPath: ':memory:' });
}

function opportunityInput(overrides = {}) {
  return {
    opportunityId: 'opp-001',
    dedupeKey: 'dedupe-001',
    sourceUrl: 'https://example.com/post/001',
    title: 'A real opportunity',
    body: 'Evidence-backed content.',
    actor: 'tester',
    occurredAt: BASE_TIME,
    ...overrides,
  };
}

test('Opportunity ID, dedupe key, and source URL are unique', () => {
  const store = openTestStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity(opportunityInput());

    assert.throws(
      () => writer.createOpportunity(opportunityInput({ title: 'same id' })),
      /UNIQUE constraint failed/,
    );
    assert.throws(
      () =>
        writer.createOpportunity(
          opportunityInput({
            opportunityId: 'opp-002',
            sourceUrl: 'https://example.com/post/002',
          }),
        ),
      /UNIQUE constraint failed/,
    );
    assert.throws(
      () =>
        writer.createOpportunity(
          opportunityInput({
            opportunityId: 'opp-003',
            dedupeKey: 'dedupe-003',
          }),
        ),
      /UNIQUE constraint failed/,
    );
  } finally {
    store.close();
  }
});

test('Only the Lifecycle Event Store changes lifecycle state', () => {
  const store = openTestStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity(opportunityInput());

    assert.equal(writer.getCurrentEvent('opp-001').to_status, 'pending_review');
    assert.throws(
      () => writer.markReadyToPublish('opp-001'),
      /invalid lifecycle transition: pending_review -> ready_to_publish/,
    );
    assert.throws(
      () => writer.transition('opp-001', 'not_a_status'),
      /invalid lifecycle status/,
    );

    writer.approve('opp-001', { actor: 'reviewer', occurredAt: '2026-07-21T00:01:00.000Z' });
    writer.markReadyToPublish('opp-001', {
      actor: 'reviewer',
      occurredAt: '2026-07-21T00:02:00.000Z',
    });

    assert.deepEqual(
      writer.getEvents('opp-001').map((event) => event.to_status),
      ['pending_review', 'approved', 'ready_to_publish'],
    );
    assert.equal(readUnifiedView(store.db)[0].current_status, 'ready_to_publish');
  } finally {
    store.close();
  }
});

test('Published requires all metadata and creates pending performance in one transaction', () => {
  const store = openTestStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity(opportunityInput());
    writer.approve('opp-001');
    writer.markReadyToPublish('opp-001');

    assert.throws(
      () =>
        writer.markPublished('opp-001', {
          platform: 'linkedin',
          publishedUrl: 'https://linkedin.com/post/001',
        }),
      /publishedAt is required/,
    );
    assert.throws(
      () =>
        writer.markPublished('opp-001', {
          publishedAt: BASE_TIME,
          publishedUrl: 'https://linkedin.com/post/001',
        }),
      /platform is required/,
    );
    assert.throws(
      () =>
        writer.markPublished('opp-001', {
          publishedAt: BASE_TIME,
          platform: 'linkedin',
        }),
      /publishedUrl is required/,
    );

    assert.equal(writer.getEvents('opp-001').length, 3);
    writer.markPublished('opp-001', {
      actor: 'publisher',
      occurredAt: '2026-07-21T00:03:00.000Z',
      publishedAt: '2026-07-21T00:03:00.000Z',
      platform: 'linkedin',
      publishedUrl: 'https://linkedin.com/post/001',
    });

    const row = readUnifiedView(store.db)[0];
    assert.equal(row.current_status, 'published');
    assert.equal(row.published_at, '2026-07-21T00:03:00.000Z');
    assert.equal(row.platform, 'linkedin');
    assert.equal(row.published_url, 'https://linkedin.com/post/001');
    assert.equal(row.performance_status, 'pending');
    assert.equal(
      store.db
        .prepare('SELECT COUNT(*) AS count FROM lifecycle_events WHERE to_status = ?')
        .get('published').count,
      1,
    );
  } finally {
    store.close();
  }
});

test('Unified View is derived, contains one current row, and can be rebuilt after deletion', () => {
  const store = openTestStore();
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity(opportunityInput());
    writer.approve('opp-001');
    const beforeDelete = readUnifiedView(store.db);

    assert.equal(unifiedViewExists(store.db), true);
    assert.equal(beforeDelete.length, 1);
    assert.equal(new Set(beforeDelete.map((row) => row.opportunity_id)).size, 1);

    store.db.exec('DROP VIEW unified_view');
    assert.equal(unifiedViewExists(store.db), false);
    assert.throws(() => readUnifiedView(store.db), /no such table: unified_view/);

    rebuildUnifiedView(store.db);
    assert.equal(unifiedViewExists(store.db), true);
    assert.deepEqual(readUnifiedView(store.db), beforeDelete);
    assert.equal(
      store.db
        .prepare('SELECT COUNT(*) AS count FROM opportunities')
        .get().count,
      1,
    );
    assert.equal(
      store.db
        .prepare('SELECT COUNT(*) AS count FROM lifecycle_events')
        .get().count,
      2,
    );
  } finally {
    store.close();
  }
});

test('Morning Brief eligibility, exclusions, cooldown, and status-change reset are deterministic', () => {
  assert.equal(getEligibleStage({ current_status: 'pending_review' }), 'pending_review');
  assert.equal(getEligibleStage({ current_status: 'ready_to_publish' }), 'ready_to_publish');
  assert.equal(
    getEligibleStage({
      current_status: 'published',
      performance_status: 'action_required',
    }),
    'action_required',
  );
  assert.equal(isBriefEligible({ current_status: 'approved' }), false);
  assert.equal(isBriefExcluded({ current_status: 'approved' }), true);
  assert.equal(isBriefExcluded({ current_status: 'published' }), true);
  assert.equal(
    isBriefEligible({
      current_status: 'published',
      performance_status: 'action_required',
    }),
    true,
  );
  assert.equal(
    isBriefExcluded({
      current_status: 'published',
      performance_status: 'action_required',
    }),
    false,
  );

  assert.equal(
    getBriefDeduplicationKey({
      briefDate: '2026-07-21',
      opportunityId: 'opp-001',
      eligibleStage: 'pending_review',
    }),
    '2026-07-21:opp-001:pending_review',
  );
  assert.equal(
    shouldSendBrief({
      lastBriefGeneratedAt: null,
      now: '2026-07-21T09:00:00.000Z',
    }),
    true,
  );
  assert.equal(
    shouldSendBrief({
      lastBriefGeneratedAt: '2026-07-21T09:00:00.000Z',
      now: '2026-07-21T10:00:00.000Z',
    }),
    false,
  );
  assert.equal(
    shouldSendBrief({
      lastBriefGeneratedAt: '2026-07-21T09:00:00.000Z',
      statusChangedAt: '2026-07-21T09:30:00.000Z',
      now: '2026-07-21T10:00:00.000Z',
    }),
    true,
  );
  assert.equal(
    shouldSendBrief({
      lastBriefGeneratedAt: '2026-07-21T09:00:00.000Z',
      signalChangedAt: '2026-07-21T09:30:00.000Z',
      now: '2026-07-21T10:00:00.000Z',
    }),
    true,
  );
  assert.equal(
    shouldSendBrief({
      lastBriefGeneratedAt: '2026-07-21T09:00:00.000Z',
      now: '2026-07-22T09:00:00.000Z',
    }),
    true,
  );
});
