import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboardHtml = readFileSync(new URL('../../../../../docs/growth-os/dashboard.html', import.meta.url), 'utf8');

test('homepage is an operator workspace, not a status dashboard', () => {
  assert.match(dashboardHtml, /Today’s Work/);
  assert.match(dashboardHtml, /function selectTodayWork\(rows, limit = 5\)/);
  assert.match(dashboardHtml, /\.slice\(0, limit\)/);
  assert.match(dashboardHtml, /!\["pending_review", "ready_to_publish"\]\.includes\(row\.current_status\)/);
  assert.match(dashboardHtml, /row\.current_status === "pending_review"\) return row\.content_integrity\?\.approve\?\.valid === true/);
  assert.match(dashboardHtml, /row\.current_status === "published" \|\| row\.current_status === "archived"\) return false/);
  assert.match(dashboardHtml, /renderSecondaryWorkspace\(\{ pending, approved, ready, published/);
  assert.doesNotMatch(dashboardHtml, /renderHeaderKpis\(rows/);
});
