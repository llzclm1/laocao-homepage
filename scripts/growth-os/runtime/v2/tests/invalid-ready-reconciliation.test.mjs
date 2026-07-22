import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ContentStore } from '../content-store.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { openV2Store, readUnifiedView } from '../store.mjs';

test('controlled reconciliation returns invalid ready item to approved without creating content', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity({
      opportunityId: 'invalid-ready-001',
      dedupeKey: 'invalid-ready-001',
      sourceUrl: 'https://example.com/invalid-ready-001',
      title: 'Historical invalid Ready item',
      actor: 'test',
      occurredAt: '2026-07-21T00:00:00.000Z',
    });
    const content = new ContentStore({ db: store.db });
    content.saveVersion({
      opportunityId: 'invalid-ready-001',
      contentType: 'original_content',
      contentText: 'A buyer asks about a supplier draft before ordering.',
      platform: 'reddit',
      createdBy: 'test',
    });
    content.saveVersion({
      opportunityId: 'invalid-ready-001',
      contentType: 'reply_draft',
      contentText: 'Reply about the supplier draft before ordering.',
      platform: 'reddit',
      createdBy: 'test',
    });
    writer.approve('invalid-ready-001');
    content.saveVersion({
      opportunityId: 'invalid-ready-001',
      contentType: 'publish_draft',
      contentText: 'A real publish draft.',
      platform: 'reddit',
      createdBy: 'test',
    });
    writer.markReadyToPublish('invalid-ready-001');
    assert.throws(
      () => writer.reconcileMissingPublishDraft('invalid-ready-001', {
        reconciliationId: 'test-reconciliation',
        recoveryReason: 'Draft exists.',
        sourceAssessment: 'This must not reconcile.',
        dryRunReport: 'test-report',
        actor: 'system-content-reconciliation',
      }),
      /publish_draft/,
    );

    writer.createOpportunity({
      opportunityId: 'invalid-ready-002',
      dedupeKey: 'invalid-ready-002',
      sourceUrl: 'https://example.com/invalid-ready-002',
      title: 'Historical invalid Ready item without draft',
      actor: 'test',
    });
    store.db.prepare('INSERT INTO lifecycle_events (event_id, opportunity_id, from_status, to_status, event_type, actor, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'legacy-ready-event',
      'invalid-ready-002',
      'approved',
      'ready_to_publish',
      'mark_ready_to_publish',
      'legacy-test',
      '2026-07-21T00:01:00.000Z',
    );
    const before = store.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count;
    const event = writer.reconcileMissingPublishDraft('invalid-ready-002', {
      reconciliationId: 'test-reconciliation',
      recoveryReason: 'No canonical publish draft exists.',
      sourceAssessment: 'Legacy candidates are ambiguous.',
      dryRunReport: 'test-report',
      actor: 'system-content-reconciliation',
      occurredAt: '2026-07-21T00:02:00.000Z',
    });
    assert.equal(event.event_type, 'admin_reconcile_missing_publish_draft');
    assert.equal(event.from_status, 'ready_to_publish');
    assert.equal(event.to_status, 'approved');
    assert.equal(writer.getCurrentEvent('invalid-ready-002').to_status, 'approved');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count, before + 1);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM content_items WHERE opportunity_id = ?').get('invalid-ready-002').count, 0);
    assert.equal(readUnifiedView(store.db).find((row) => row.opportunity_id === 'invalid-ready-002').current_status, 'approved');
    assert.throws(
      () => writer.reconcileMissingPublishDraft('invalid-ready-002', {
        reconciliationId: 'test-reconciliation',
        recoveryReason: 'repeat',
        sourceAssessment: 'repeat',
        dryRunReport: 'test-report',
        actor: 'dashboard-operator',
      }),
      /requires actor system-content-reconciliation/,
    );
  } finally {
    store.close();
  }
});

test('Dashboard shows a non-empty action for missing Publish Draft without exposing a blank editor', () => {
  const html = readFileSync(new URL('../../../../../docs/growth-os/dashboard.html', import.meta.url), 'utf8');
  assert.equal(html.includes('Publish Draft missing'), true);
  assert.equal(html.includes('Create Publish Draft'), true);
  assert.equal(html.includes('data-content-create-shell hidden'), true);
  assert.equal(html.includes('dashboard-operator'), false);
  assert.equal(html.includes('row.content_integrity?.approve'), true);
  assert.equal(html.includes('contentIntegrityComplete(rows)'), true);
});
