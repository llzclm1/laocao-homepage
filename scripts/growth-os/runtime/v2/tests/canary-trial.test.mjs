import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_DB_PATH } from '../store.mjs';
import { runCanaryTrial } from '../canary-trial.mjs';

test('canary trial is isolated, verifies the operator workflow, and cleans up', () => {
  const report = runCanaryTrial();

  assert.equal(report.success, true);
  assert.equal(report.production_cutover, 'NOT_STARTED');
  assert.equal(report.canary_records.snapshot_records, 6);
  assert.equal(report.canary_records.unique_opportunities, 4);
  assert.equal(report.canary_records.duplicate_records, 1);
  assert.equal(report.canary_records.rejected_anomalies, 1);

  assert.equal(report.migration.migrated, 4);
  assert.equal(report.migration.migrated_opportunities, 4);
  assert.equal(report.migration.migrated_publications, 1);
  assert.equal(report.migration.rejected, 1);
  assert.equal(report.migration.deduplicated, 1);
  assert.equal(report.migration.accounting.matches_legacy_total, true);
  assert.equal(report.migration.published_metadata_complete, true);
  assert.equal(
    report.migration.rejected_records[0].reason,
    'published_metadata_missing',
  );

  assert.deepEqual(report.dashboard.status_distribution, {
    pending_review: 1,
    ready_to_publish: 1,
    approved: 1,
    published: 1,
  });
  assert.equal(report.dashboard.input, 'canary unified_view');
  assert.equal(report.dashboard.unified_view_only, true);

  assert.equal(report.morning_brief.input, 'canary unified_view');
  assert.equal(report.morning_brief.first_delivery_count, 2);
  assert.equal(report.morning_brief.second_delivery_count, 0);
  assert.equal(report.morning_brief.duplicate_suppressed, true);
  assert.equal(report.morning_brief.published_excluded, true);
  assert.equal(report.morning_brief.manual_changed_record_excluded, true);

  assert.equal(report.lifecycle.writer, 'LifecycleEventStore');
  assert.equal(report.lifecycle.manual_event_type, 'approve');
  assert.equal(report.lifecycle.single_writer_verified, true);
  assert.equal(report.lifecycle.direct_current_status_column_present, false);

  assert.equal(report.view_rebuild.deleted_before_rebuild, true);
  assert.equal(report.view_rebuild.rows_before, 4);
  assert.equal(report.view_rebuild.rows_after, 4);
  assert.equal(report.view_rebuild.stable, true);
  assert.equal(report.view_rebuild.target_counts.published, 1);
  assert.equal(report.view_rebuild.target_counts.performance, 1);

  assert.equal(report.legacy_production_impact.unchanged, true);
  assert.equal(report.legacy_production_impact.old_runtime_touched, false);
  assert.equal(report.rollback.cleaned, true);
  assert.equal(report.rollback.canary_database_removed, true);
  assert.equal(report.rollback.source_snapshot_removed, true);
  assert.equal(report.rollback.canary_root_removed, true);
  assert.equal(existsSync(report.canary_database), false);
  assert.equal(existsSync(DEFAULT_DB_PATH), false);
});
