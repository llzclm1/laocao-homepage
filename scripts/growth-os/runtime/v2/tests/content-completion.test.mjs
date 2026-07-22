import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ContentStore } from '../content-store.mjs';
import {
  buildContentCompletionPlan,
  generateReplyDraft,
  runContentCompletion,
} from '../content-completion.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { openV2Store, readUnifiedView } from '../store.mjs';

function createOpportunity(store, id, status = 'pending_review', evidence = {}, withOriginal = false) {
  const writer = new LifecycleEventStore({ db: store.db });
  writer.createOpportunity({
    opportunityId: id,
    dedupeKey: `dedupe:${id}`,
    sourceUrl: `https://example.com/${id}`,
    title: `Supplier question ${id}`,
    evidence,
    actor: 'test',
    occurredAt: '2026-07-21T00:00:00.000Z',
  });
  if (withOriginal || status === 'approved') {
    new ContentStore({ db: store.db }).saveVersion({
      opportunityId: id,
      contentType: 'original_content',
      contentText: 'Buyer asks how to compare a China supplier sample before ordering.',
      platform: 'reddit',
      createdBy: 'test',
    });
    if (status === 'approved') writer.approve(id, { actor: 'test' });
  }
  return writer;
}

function sourceRoot(records) {
  const root = mkdtempSync(join(tmpdir(), 'growth-os-content-completion-source-'));
  const file = join(root, 'data/growth-os/social-discovery/discovered-posts.json');
  mkdirSync(join(root, 'data/growth-os/social-discovery'), { recursive: true });
  writeFileSync(file, JSON.stringify(records));
  return root;
}

test('reply generation stays grounded in the captured sourcing context', () => {
  const draft = generateReplyDraft({
    title: 'Compare China supplier samples',
    originalContent: 'The buyer is comparing a sample and the production quote.',
  });
  assert.match(draft, /sample|quote/i);
  assert.match(draft, /acceptance|specification/i);
});

test('completion prefers an explicit legacy reply and derives a publish draft', () => {
  const source = sourceRoot([{
    id: 'legacy-001',
    url: 'https://example.com/legacy-001',
    snippet: 'Buyer asks how to compare a China supplier sample.',
    suggested_reply: 'Ask for the sample acceptance criteria before production.',
  }]);
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    createOpportunity(store, 'legacy-001', 'pending_review', { legacy_id: 'legacy-001' }, true);
    const plan = buildContentCompletionPlan({ db: store.db, sourceSnapshot: source });
    assert.equal(plan.counts.by_content_type.reply_draft, 1);
    assert.equal(plan.counts.by_content_type.publish_draft, 1);
    assert.equal(plan.actions.find((item) => item.content_type === 'reply_draft').classification, 'explicit_legacy');
  } finally {
    store.close();
  }
});

test('completion appends content without touching lifecycle or status', () => {
  const source = sourceRoot([]);
  const directory = mkdtempSync(join(tmpdir(), 'growth-os-content-completion-db-'));
  const targetDb = join(directory, 'v2.sqlite');
  const initial = openV2Store({ dbPath: targetDb });
  try {
    createOpportunity(initial, 'generated-001');
    new ContentStore({ db: initial.db }).saveVersion({
      opportunityId: 'generated-001',
      contentType: 'original_content',
      contentText: 'Buyer needs a quotation and MOQ from a China manufacturer.',
      platform: 'reddit',
      createdBy: 'test',
    });
  } finally {
    initial.close();
  }

  const first = runContentCompletion({
    targetDb,
    sourceSnapshot: source,
    execute: true,
    now: '2026-07-21T01:00:00.000Z',
  });
  assert.equal(first.verification.lifecycle_events_unchanged, true);
  assert.equal(first.verification.statuses_unchanged, true);
  assert.equal(first.results.filter((item) => item.result === 'saved').length, 2);

  const second = runContentCompletion({
    targetDb,
    sourceSnapshot: source,
    execute: true,
    now: '2026-07-21T01:01:00.000Z',
  });
  assert.equal(second.results.every((item) => item.result === 'skipped_content_exists'), true);

  const store = openV2Store({ dbPath: targetDb });
  try {
    const row = readUnifiedView(store.db)[0];
    assert.equal(row.current_status, 'pending_review');
    assert.equal(row.content.latest_reply_draft.metadata.generation_method, 'operator_assist_from_captured_content');
    assert.equal(row.content.latest_publish_draft.metadata.derivation, 'latest_reply_draft');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count, 1);
  } finally {
    store.close();
  }
});
