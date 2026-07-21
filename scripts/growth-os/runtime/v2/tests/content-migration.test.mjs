import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildContentMigrationPlan } from '../content-migration.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { openV2Store } from '../store.mjs';

function writeJson(root, relativePath, value) {
  const path = join(root, relativePath);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

function writeRaw(root, relativePath, value) {
  const path = join(root, relativePath);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, value);
}

test('content migration does not promote generic opportunity fields to published content', () => {
  const sourceRoot = mkdtempSync(join(tmpdir(), 'growth-os-content-migration-'));
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    writeRaw(sourceRoot, 'data/growth-os/opportunities.jsonl', [
      {
        id: 'LEGACY-001',
        title: 'Generic legacy opportunity',
        url: 'https://legacy.example/001',
        status: 'pending_review',
        body: 'This is a generic body.',
        content_text: 'This is not confirmed published content.',
      },
    ].map((record) => JSON.stringify(record)).join('\n') + '\n');
    writeJson(sourceRoot, 'data/growth-os/social/published-content.json', [
      {
        id: 'LEGACY-PUB',
        title: 'Explicit published record',
        url: 'https://legacy.example/pub',
        status: 'published',
        content_text: 'Explicit published text.',
      },
    ]);

    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity({
      opportunityId: 'opp-generic',
      dedupeKey: 'generic',
      sourceUrl: 'https://legacy.example/001',
      title: 'Generic legacy opportunity',
      evidence: { legacy_id: 'LEGACY-001' },
      actor: 'test',
    });
    writer.createOpportunity({
      opportunityId: 'opp-published',
      dedupeKey: 'published',
      sourceUrl: 'https://legacy.example/pub',
      title: 'Explicit published record',
      evidence: { legacy_id: 'LEGACY-PUB' },
      actor: 'test',
    });

    const plan = buildContentMigrationPlan({ db: store.db, sourceSnapshot: sourceRoot });
    const generic = plan.opportunities.find((item) => item.opportunity_id === 'opp-generic');
    const published = plan.opportunities.find((item) => item.opportunity_id === 'opp-published');
    assert.equal(generic.content.published_content, null);
    assert.equal(generic.classification, 'skip_ambiguous_body');
    assert.equal(published.content.published_content.contentText, 'Explicit published text.');
  } finally {
    store.close();
    rmSync(sourceRoot, { recursive: true, force: true });
  }
});
