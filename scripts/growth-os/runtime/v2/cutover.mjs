import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGACY_SOURCE_DEFINITIONS } from './legacy-data-sources.mjs';
import { runMigration } from './migration.mjs';
import { runV2Scheduler } from './scheduler.mjs';
import { rebuildUnifiedView } from './unified-view.mjs';
import { DEFAULT_DB_PATH, IMPLEMENTATION_ROOT, openV2Store, readUnifiedView } from './store.mjs';

const UID = String(process.getuid?.() || 501);
const CUTOVER_ROOT = join(IMPLEMENTATION_ROOT, 'data/growth-os/v2/cutover');
const PRODUCTION_REPORT = join(IMPLEMENTATION_ROOT, 'data/growth-os/state/growth-os-v2-migration-report.json');
const MANIFEST_PATH = join(IMPLEMENTATION_ROOT, 'data/growth-os/state/growth-os-v2-cutover.json');
const DASHBOARD_PLIST = join(process.env.HOME || '/Users/caocao', 'Library/LaunchAgents/com.gewuji.growthos.dashboard.plist');
const DISCOVERY_PLIST = join(process.env.HOME || '/Users/caocao', 'Library/LaunchAgents/com.gewuji.social-discovery.plist');
const DASHBOARD_LABEL = 'com.gewuji.growthos.dashboard';
const DISCOVERY_LABEL = 'com.gewuji.social-discovery';
const OLD_DASHBOARD_SERVER = join(IMPLEMENTATION_ROOT, 'scripts/growth-os/local-dashboard-server.mjs');
const V2_DASHBOARD_SERVER = join(IMPLEMENTATION_ROOT, 'scripts/growth-os/runtime/v2/dashboard-server.mjs');
const V2_SCHEDULER = join(IMPLEMENTATION_ROOT, 'scripts/growth-os/runtime/v2/scheduler.mjs');

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function runLaunchctl(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('/bin/launchctl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (allowFailure) return `${error.stdout || ''}${error.stderr || ''}`;
    throw new Error(`launchctl ${args.join(' ')} failed: ${error.stderr || error.message}`);
  }
}

function bootout(label) {
  runLaunchctl(['bootout', `gui/${UID}/${label}`], { allowFailure: true });
}

function bootstrap(label, plistPath) {
  runLaunchctl(['enable', `gui/${UID}/${label}`], { allowFailure: true });
  runLaunchctl(['bootstrap', `gui/${UID}`, plistPath]);
}

function sourcePlist({ dashboardReadOnly = false } = {}) {
  const dashboardEnvironment = dashboardReadOnly
    ? '\n    <key>GROWTH_OS_LEGACY_READ_ONLY</key>\n    <string>1</string>'
    : '';
  return {
    dashboard: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n  <key>Label</key><string>${DASHBOARD_LABEL}</string>\n  <key>ProgramArguments</key><array><string>/opt/homebrew/bin/node</string><string>${V2_DASHBOARD_SERVER}</string></array>\n  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>${dashboardEnvironment}\n  <key>WorkingDirectory</key><string>${IMPLEMENTATION_ROOT}</string>\n  <key>StandardOutPath</key><string>${IMPLEMENTATION_ROOT}/data/growth-os/logs/v2-dashboard.stdout.log</string>\n  <key>StandardErrorPath</key><string>${IMPLEMENTATION_ROOT}/data/growth-os/logs/v2-dashboard.stderr.log</string>\n</dict></plist>\n`,
    discovery: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n  <key>Label</key><string>${DISCOVERY_LABEL}</string>\n  <key>ProgramArguments</key><array><string>/opt/homebrew/bin/node</string><string>${V2_SCHEDULER}</string></array>\n  <key>EnvironmentVariables</key><dict><key>SOCIAL_DISCOVERY_PUBLIC_SEARCH</key><string>1</string></dict>\n  <key>StartCalendarInterval</key><array><dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict><dict><key>Hour</key><integer>14</integer><key>Minute</key><integer>0</integer></dict></array>\n  <key>WorkingDirectory</key><string>${IMPLEMENTATION_ROOT}</string>\n  <key>StandardOutPath</key><string>${IMPLEMENTATION_ROOT}/data/growth-os/logs/v2-discovery.stdout.log</string>\n  <key>StandardErrorPath</key><string>${IMPLEMENTATION_ROOT}/data/growth-os/logs/v2-discovery.stderr.log</string>\n</dict></plist>\n`,
  };
}

function copyLegacySnapshot(snapshotRoot) {
  mkdirSync(snapshotRoot, { recursive: true });
  const records = [];
  for (const definition of LEGACY_SOURCE_DEFINITIONS) {
    const source = resolve(IMPLEMENTATION_ROOT, definition.relativePath);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    const destination = join(snapshotRoot, definition.relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    records.push({
      relative_path: definition.relativePath,
      category: definition.category,
      include_in_migration: definition.includeInMigration,
      sha256: sha256(source),
      bytes: statSync(source).size,
    });
  }
  return records;
}

function legacyHashes() {
  return LEGACY_SOURCE_DEFINITIONS.filter((definition) => definition.includeInMigration)
    .filter((definition) => existsSync(resolve(IMPLEMENTATION_ROOT, definition.relativePath)))
    .map((definition) => ({
      relative_path: definition.relativePath,
      sha256: sha256(resolve(IMPLEMENTATION_ROOT, definition.relativePath)),
    }));
}

function assertLegacyUnchanged(before) {
  const after = new Map(legacyHashes().map((item) => [item.relative_path, item.sha256]));
  const changed = before.filter((item) => after.get(item.relative_path) !== item.sha256);
  if (changed.length) throw new Error(`legacy files changed during cutover: ${changed.map((item) => item.relative_path).join(', ')}`);
  return true;
}

function writePlists({ dashboardReadOnly = false } = {}) {
  const plists = sourcePlist({ dashboardReadOnly });
  mkdirSync(dirname(DASHBOARD_PLIST), { recursive: true });
  writeFileSync(DASHBOARD_PLIST, plists.dashboard);
  writeFileSync(DISCOVERY_PLIST, plists.discovery);
  return plists;
}

function restoreLegacyDashboard(oldDashboardPlist) {
  bootout(DASHBOARD_LABEL);
  writeFileSync(DASHBOARD_PLIST, sourcePlist({ dashboardReadOnly: true }).dashboard.replace(
    `<string>${V2_DASHBOARD_SERVER}</string>`,
    `<string>${OLD_DASHBOARD_SERVER}</string>`,
  ));
  bootstrap(DASHBOARD_LABEL, DASHBOARD_PLIST);
  if (oldDashboardPlist) writeFileSync(join(CUTOVER_ROOT, 'rollback-original-dashboard.plist'), oldDashboardPlist);
}

function productionChecks() {
  const store = openV2Store({ dbPath: DEFAULT_DB_PATH, rebuildView: false });
  try {
    const before = readUnifiedView(store.db);
    const ids = new Set(before.map((row) => row.opportunity_id));
    const duplicateDedupe = store.db.prepare('SELECT dedupe_key FROM opportunities GROUP BY dedupe_key HAVING COUNT(*) > 1').all();
    const duplicateUrl = store.db.prepare('SELECT source_url FROM opportunities WHERE source_url IS NOT NULL GROUP BY source_url HAVING COUNT(*) > 1').all();
    const published = before.filter((row) => row.current_status === 'published');
    const publishedComplete = published.every((row) => row.published_at && row.platform && row.published_url);
    const pending = before.filter((row) => row.current_status === 'pending_review').length;
    const publishedBriefEligible = before.filter((row) => row.current_status === 'published' && row.performance_status === 'action_required');
    store.db.exec('DROP VIEW unified_view');
    rebuildUnifiedView(store.db);
    const after = readUnifiedView(store.db);
    return {
      view_rows: after.length,
      view_rebuild_stable: JSON.stringify(before) === JSON.stringify(after),
      one_current_status_per_opportunity: ids.size === before.length,
      duplicate_dedupe_keys: duplicateDedupe,
      duplicate_source_urls: duplicateUrl,
      no_duplicate_dedupe_or_url: duplicateDedupe.length === 0 && duplicateUrl.length === 0,
      published_metadata_complete: publishedComplete,
      published_not_in_morning_brief: publishedBriefEligible.length === 0,
      pending_review_count: pending,
      performance_pending_for_published: published.every((row) => row.performance_status === 'pending' || row.performance_status === 'confirmed' || row.performance_status === 'action_required'),
    };
  } finally {
    store.close();
  }
}

function runtimeReferenceChecks() {
  const dashboard = readFileSync(join(IMPLEMENTATION_ROOT, 'docs/growth-os/dashboard.html'), 'utf8');
  const packageJson = JSON.parse(readFileSync(join(IMPLEMENTATION_ROOT, 'package.json'), 'utf8'));
  const forbiddenDashboardRefs = [
    'data/social-agent/view.json',
    'data/growth-os/viewer/dashboard-view.json',
    'today_plan',
    '.csv',
    'morning-brief-latest.json',
    'signals-latest.json',
  ].filter((value) => dashboard.includes(value));
  const scripts = packageJson.scripts || {};
  const packageLegacyRefs = [
    scripts['growth:dashboard'],
    scripts['discovery:collect'],
    scripts['discovery:scheduled'],
  ].filter((value) => /local-dashboard-server|run-scheduled-discovery|collect-discovery/.test(value || ''));
  return {
    dashboard_reads_only_v2_adapter: forbiddenDashboardRefs.length === 0,
    forbidden_dashboard_references: forbiddenDashboardRefs,
    package_entrypoints_v2: packageLegacyRefs.length === 0,
    legacy_package_entrypoints: packageLegacyRefs,
  };
}

function activeLaunchAgentChecks() {
  const dashboard = runLaunchctl(['print', `gui/${UID}/${DASHBOARD_LABEL}`], { allowFailure: true });
  const discovery = runLaunchctl(['print', `gui/${UID}/${DISCOVERY_LABEL}`], { allowFailure: true });
  return {
    dashboard_v2: dashboard.includes(V2_DASHBOARD_SERVER),
    discovery_v2: discovery.includes(V2_SCHEDULER),
    dashboard_print: dashboard,
    discovery_print: discovery,
  };
}

function writeManifest(value) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(value, null, 2) + '\n');
}

export async function executeCutover() {
  if (existsSync(DEFAULT_DB_PATH)) throw new Error(`production v2 database already exists; refusing overwrite: ${DEFAULT_DB_PATH}`);
  const cutoverId = new Date().toISOString().replace(/[:.]/g, '-');
  const cutoverDir = join(CUTOVER_ROOT, cutoverId);
  const snapshotRoot = join(cutoverDir, 'legacy-snapshot');
  mkdirSync(cutoverDir, { recursive: true });
  const oldDashboardPlist = existsSync(DASHBOARD_PLIST) ? readFileSync(DASHBOARD_PLIST, 'utf8') : null;
  const oldDiscoveryPlist = existsSync(DISCOVERY_PLIST) ? readFileSync(DISCOVERY_PLIST, 'utf8') : null;
  const t0 = new Date().toISOString();
  bootout(DISCOVERY_LABEL);
  bootout(DASHBOARD_LABEL);
  const legacyBefore = legacyHashes();
  const snapshotFiles = copyLegacySnapshot(snapshotRoot);
  writeFileSync(join(cutoverDir, 'snapshot-manifest.json'), JSON.stringify({ t0, files: snapshotFiles }, null, 2) + '\n');
  const manifest = {
    cutover_id: cutoverId,
    t0,
    snapshot_dir: cutoverDir,
    source_snapshot: snapshotRoot,
    production_db: DEFAULT_DB_PATH,
    migration_report: PRODUCTION_REPORT,
    legacy_hashes_at_t0: legacyBefore,
    old_dashboard_plist: oldDashboardPlist,
    old_discovery_plist: oldDiscoveryPlist,
    status: 'T0_FROZEN',
  };
  writeManifest(manifest);

  try {
    const migration = runMigration({
      sourceSnapshot: snapshotRoot,
      targetDb: DEFAULT_DB_PATH,
      reportPath: PRODUCTION_REPORT,
      allowProductionTarget: true,
    });
    manifest.migration = migration.migration;
    manifest.status = 'V_VALIDATED';
    writeManifest(manifest);
    assertLegacyUnchanged(legacyBefore);
    const preSwitch = productionChecks();
    if (!preSwitch.view_rebuild_stable || !preSwitch.one_current_status_per_opportunity || !preSwitch.no_duplicate_dedupe_or_url || !preSwitch.published_metadata_complete || !preSwitch.published_not_in_morning_brief) {
      throw new Error('production v2 validation failed before cutover');
    }

    writePlists();
    bootstrap(DASHBOARD_LABEL, DASHBOARD_PLIST);
    bootstrap(DISCOVERY_LABEL, DISCOVERY_PLIST);
    manifest.status = 'C_SWITCHED';
    writeManifest(manifest);

    const scheduledRun = await runV2Scheduler({ dbPath: DEFAULT_DB_PATH });
    assertLegacyUnchanged(legacyBefore);
    const validation = {
      migration_success: migration.success,
      migration_counts: migration.migration,
      pre_switch: preSwitch,
      scheduled_v2_run: scheduledRun,
      production_checks: productionChecks(),
      runtime_references: runtimeReferenceChecks(),
      active_launch_agents: activeLaunchAgentChecks(),
      legacy_files_unchanged: true,
    };
    const passed = validation.migration_success
      && validation.production_checks.view_rebuild_stable
      && validation.production_checks.one_current_status_per_opportunity
      && validation.production_checks.no_duplicate_dedupe_or_url
      && validation.production_checks.published_metadata_complete
      && validation.production_checks.published_not_in_morning_brief
      && validation.runtime_references.dashboard_reads_only_v2_adapter
      && validation.runtime_references.package_entrypoints_v2
      && validation.active_launch_agents.dashboard_v2
      && validation.active_launch_agents.discovery_v2;
    if (!passed) throw new Error('post-cutover validation failed');
    manifest.status = 'COMPLETED';
    manifest.validation = validation;
    manifest.production_cutover = 'COMPLETED';
    writeManifest(manifest);
    return manifest;
  } catch (error) {
    bootout(DISCOVERY_LABEL);
    bootout(DASHBOARD_LABEL);
    if (oldDashboardPlist) writeFileSync(DASHBOARD_PLIST, oldDashboardPlist);
    if (oldDiscoveryPlist) writeFileSync(DISCOVERY_PLIST, oldDiscoveryPlist);
    if (oldDashboardPlist) bootstrap(DASHBOARD_LABEL, DASHBOARD_PLIST);
    if (oldDiscoveryPlist) bootstrap(DISCOVERY_LABEL, DISCOVERY_PLIST);
    for (const suffix of ['', '-wal', '-shm']) {
      const target = DEFAULT_DB_PATH + suffix;
      if (existsSync(target)) unlinkSync(target);
    }
    manifest.status = 'FAILED_ROLLED_BACK';
    manifest.production_cutover = 'FAILED';
    manifest.error = error.message;
    writeManifest(manifest);
    error.cutoverManifest = manifest;
    throw error;
  }
}

export function rollbackCutover() {
  if (!existsSync(MANIFEST_PATH)) throw new Error(`cutover manifest is missing: ${MANIFEST_PATH}`);
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.status !== 'COMPLETED' && manifest.status !== 'C_SWITCHED') throw new Error(`cutover is not rollbackable: ${manifest.status}`);
  const quarantine = join(manifest.snapshot_dir, 'post-cutover-quarantine');
  mkdirSync(quarantine, { recursive: true });
  if (existsSync(DEFAULT_DB_PATH)) copyFileSync(DEFAULT_DB_PATH, join(quarantine, 'production-v2.sqlite'));
  bootout(DISCOVERY_LABEL);
  bootout(DASHBOARD_LABEL);
  writeFileSync(DASHBOARD_PLIST, sourcePlist({ dashboardReadOnly: true }).dashboard.replace(
    `<string>${V2_DASHBOARD_SERVER}</string>`,
    `<string>${OLD_DASHBOARD_SERVER}</string>`,
  ));
  bootstrap(DASHBOARD_LABEL, DASHBOARD_PLIST);
  const updated = {
    ...manifest,
    status: 'ROLLED_BACK',
    production_cutover: 'ROLLED_BACK',
    rollback_at: new Date().toISOString(),
    post_cutover_quarantine: quarantine,
    discovery_writer_restored: false,
    dashboard_mode: 'legacy_read_only',
  };
  writeManifest(updated);
  return updated;
}

function printUsage() {
  console.log([
    'Growth OS v2 production cutover',
    '',
    '  execute  Freeze old LaunchAgents, snapshot, migrate, validate, switch, and verify',
    '  rollback Stop v2, quarantine post-cutover DB, and restore read-only dashboard',
  ].join('\n'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const command = process.argv[2];
  if (!['execute', 'rollback'].includes(command)) {
    printUsage();
    process.exitCode = 1;
  } else {
    try {
      const result = command === 'execute' ? await executeCutover() : rollbackCutover();
      console.log(JSON.stringify({
        status: result.status,
        production_cutover: result.production_cutover,
        production_db: result.production_db,
        migration_report: result.migration_report,
        snapshot_dir: result.snapshot_dir,
        validation: result.validation ?? null,
        rollback: result.post_cutover_quarantine ? {
          quarantine: result.post_cutover_quarantine,
          dashboard_mode: result.dashboard_mode,
          discovery_writer_restored: result.discovery_writer_restored,
        } : null,
      }, null, 2));
    } catch (error) {
      console.error(JSON.stringify({ status: 'FAILED', error: error.message, cutover: error.cutoverManifest ?? null }, null, 2));
      process.exitCode = 1;
    }
  }
}
