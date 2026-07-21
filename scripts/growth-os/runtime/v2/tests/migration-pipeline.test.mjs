import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEFAULT_DB_PATH, openV2Store, readUnifiedView } from '../store.mjs';
import { LifecycleEventStore } from '../lifecycle-event-store.mjs';
import { ContentStore } from '../content-store.mjs';
import { isBriefExcluded } from '../morning-brief-rules.mjs';
import { runMigration } from '../migration.mjs';

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'growth-os-v2-legacy-fixture-'));
  const files = {
    opportunities: join(root, 'data/growth-os/opportunities.jsonl'),
    actions: join(
      root,
      'data/social-agent/opportunity-lifecycle-actions.jsonl',
    ),
    publishedContent: join(
      root,
      'data/growth-os/social/published-content.json',
    ),
    publishedLinks: join(root, 'data/growth-os/social/published-links.json'),
    socialResults: join(
      root,
      'data/growth-os/social/social-result-2026-07-09.json',
    ),
  };

  const opportunityLines = [
    {
      id: 'L-001',
      title: 'Legacy pending opportunity',
      url: 'https://legacy.example/source/001',
      dedupe_key: 'legacy-001',
      status: 'pending_review',
      draft: 'Explicit legacy publish draft.',
    },
    {
      id: 'L-001',
      title: 'Duplicate legacy opportunity',
      url: 'https://legacy.example/source/001',
      dedupe_key: 'legacy-001',
      status: 'pending_review',
    },
    {
      id: 'L-005',
      title: 'Duplicate by URL',
      url: 'https://legacy.example/source/001',
      dedupe_key: 'legacy-005',
      status: 'pending_review',
    },
    {
      id: 'L-003',
      title: 'Ready legacy opportunity',
      url: 'https://legacy.example/source/003',
      dedupe_key: 'legacy-003',
      status: 'ready_to_publish',
      draft: 'Ready draft',
    },
    {
      id: 'L-002',
      title: 'Unknown status record',
      url: 'https://legacy.example/source/002',
      dedupe_key: 'legacy-002',
      status: 'mystery_state',
    },
  ];
  const actions = [
    {
      id: 'L-001',
      action: 'approve',
      from_status: 'pending_review',
      to_status: 'approved',
      at: '2026-07-21T01:00:00.000Z',
      snapshot: {
        id: 'L-001',
        suggested_reply: 'Explicit reply draft.',
      },
    },
    {
      id: 'L-001',
      action: 'mark_ready_to_publish',
      from_status: 'approved',
      to_status: 'ready_to_publish',
      at: '2026-07-21T02:00:00.000Z',
      snapshot: {
        id: 'L-001',
        draft: 'Explicit legacy publish draft.',
      },
    },
  ];
  const publishedContent = [
    {
      id: 'L-001',
      platform: 'LinkedIn',
      status: 'published',
      url: 'https://published.example/001',
      published_date: '2026-07-21',
      published_content: 'Published legacy text with explicit semantics.',
    },
    {
      id: 'L-003',
      platform: 'X',
      status: 'published',
      url: '',
      published_date: '2026-07-21',
    },
  ];
  const publishedLinks = [
    {
      content_id: 'L-001',
      platform: 'LinkedIn',
      status: 'published',
      url: 'https://published.example/001',
      published_date: '2026-07-21',
    },
    {
      content_id: 'L-003',
      platform: 'X',
      status: 'published',
      url: '',
      published_date: '2026-07-21',
    },
    {
      content_id: 'L-003',
      platform: 'X',
      status: 'draft_ready',
      url: '',
      published_date: '',
    },
  ];
  const socialResults = [
    {
      content_id: 'L-001',
      platform: 'LinkedIn',
      date: '2026-07-21',
      views: 10,
      likes: 1,
      comments: 2,
      clicks: 3,
      leads: 0,
    },
  ];

  for (const path of Object.values(files)) {
    mkdirSyncForFile(path);
  }
  writeFileSync(
    files.opportunities,
    opportunityLines.map((record) => JSON.stringify(record)).join('\n') +
      '\n',
  );
  writeFileSync(
    files.actions,
    actions.map((record) => JSON.stringify(record)).join('\n') + '\n',
  );
  writeFileSync(files.publishedContent, JSON.stringify(publishedContent));
  writeFileSync(files.publishedLinks, JSON.stringify(publishedLinks));
  writeFileSync(files.socialResults, JSON.stringify(socialResults));

  return { root, files };
}

function mkdirSyncForFile(filePath) {
  const directory = filePath.slice(0, filePath.lastIndexOf('/'));
  mkdirSync(directory, { recursive: true });
}

test('legacy records migrate through the full v2 chain into a temporary database', () => {
  const fixture = createFixture();
  const targetDirectory = mkdtempSync(
    join(tmpdir(), 'growth-os-v2-migration-test-'),
  );
  const targetDb = join(targetDirectory, 'v2.sqlite');
  const reportPath = join(targetDirectory, 'report.json');
  const before = Object.fromEntries(
    Object.entries(fixture.files).map(([key, path]) => [
      key,
      readFileSync(path, 'utf8'),
    ]),
  );

  try {
    const report = runMigration({
      sourceSnapshot: fixture.root,
      targetDb,
      reportPath,
    });
    assert.equal(report.success, true);
    assert.equal(report.production_cutover, 'NOT_STARTED');
    assert.equal(
      report.migration.accounting.matches_legacy_total,
      true,
    );
    assert.equal(report.migration.unmapped_statuses.mystery_state, 1);
    assert.ok(report.migration.rejected_records > 0);
    assert.ok(report.migration.deduplicated_records > 0);
    assert.equal(report.verification.view_rebuild_stable, true);
    assert.equal(
      report.verification.one_current_status_per_opportunity,
      true,
    );
    assert.equal(report.verification.pending_review_matches_view, true);
    assert.equal(report.verification.no_duplicate_dedupe_or_url, true);

    const store = openV2Store({ dbPath: targetDb });
    try {
      const rows = readUnifiedView(store.db);
      const published = rows.find((row) => row.opportunity_id === 'L-001');
      assert.equal(published.current_status, 'published');
      assert.equal(published.performance_status, 'confirmed');
      assert.equal(
        rows.filter((row) => row.current_status === 'published').every(isBriefExcluded),
        true,
      );
      assert.equal(
        store.db
          .prepare(
            'SELECT COUNT(*) AS count FROM lifecycle_events WHERE opportunity_id = ? AND to_status = ?',
          )
          .get('L-001', 'published').count,
        1,
      );
      assert.equal(
        store.db
          .prepare('SELECT COUNT(*) AS count FROM opportunities')
          .get().count,
        report.migration.migrated_opportunities,
      );
    } finally {
      store.close();
    }

    for (const [key, path] of Object.entries(fixture.files)) {
      assert.equal(readFileSync(path, 'utf8'), before[key], key);
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(targetDirectory, { recursive: true, force: true });
  }
});

test('repeating a migration into a non-empty target is rejected without duplication', () => {
  const fixture = createFixture();
  const targetDirectory = mkdtempSync(
    join(tmpdir(), 'growth-os-v2-repeat-test-'),
  );
  const targetDb = join(targetDirectory, 'v2.sqlite');
  try {
    runMigration({ sourceSnapshot: fixture.root, targetDb });
    assert.throws(
      () => runMigration({ sourceSnapshot: fixture.root, targetDb }),
      /target database is not empty/,
    );
    const store = openV2Store({ dbPath: targetDb });
    try {
      assert.equal(
        store.db
          .prepare('SELECT COUNT(*) AS count FROM opportunities')
          .get().count,
        2,
      );
    } finally {
      store.close();
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
    rmSync(targetDirectory, { recursive: true, force: true });
  }
});

test('dry-run refuses the production v2 database path', () => {
  const fixture = createFixture();
  try {
    assert.throws(
      () =>
        runMigration({
          sourceSnapshot: fixture.root,
          targetDb: DEFAULT_DB_PATH,
        }),
      /refuses the production v2 database path/,
    );
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('a mid-transaction publish failure rolls back the event and leaves the prior state', () => {
  const store = openV2Store({ dbPath: ':memory:' });
  try {
    const writer = new LifecycleEventStore({ db: store.db });
    writer.createOpportunity({
      opportunityId: 'rollback-001',
      dedupeKey: 'rollback-001',
      sourceUrl: 'https://rollback.example/source',
      title: 'Rollback test',
      actor: 'tester',
      occurredAt: '2026-07-21T00:00:00.000Z',
    });
    writer.approve('rollback-001');
    new ContentStore({ db: store.db }).saveVersion({
      opportunityId: 'rollback-001',
      contentType: 'publish_draft',
      contentText: 'Rollback publish draft',
      platform: 'test',
      createdBy: 'tester',
    });
    writer.markReadyToPublish('rollback-001');
    store.db
      .prepare(
        'INSERT INTO performance (opportunity_id, performance_status, updated_at) VALUES (?, ?, ?)',
      )
      .run('rollback-001', 'pending', '2026-07-21T00:01:00.000Z');

    assert.throws(
      () =>
        writer.markPublished('rollback-001', {
          publishedAt: '2026-07-21T00:02:00.000Z',
          platform: 'test',
          publishedUrl: 'https://rollback.example/published',
          publishedContent: 'Rollback published content',
        }),
      /UNIQUE constraint failed/,
    );
    assert.equal(
      writer.getCurrentEvent('rollback-001').to_status,
      'ready_to_publish',
    );
    assert.equal(
      writer.getEvents('rollback-001').filter(
        (event) => event.to_status === 'published',
      ).length,
      0,
    );
  } finally {
    store.close();
  }
});
