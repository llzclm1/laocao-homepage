import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inventoryStatus,
  legacyId,
  loadLegacySources,
} from './legacy-data-sources.mjs';
import { IMPLEMENTATION_ROOT } from './store.mjs';

function summarizeSource(source) {
  const ids = source.records.map(legacyId).filter(Boolean);
  const statusDistribution = {};
  for (const record of source.records) {
    const status = inventoryStatus(record);
    statusDistribution[status] = (statusDistribution[status] ?? 0) + 1;
  }

  const duplicateCounts = {};
  for (const id of ids) {
    duplicateCounts[id] = (duplicateCounts[id] ?? 0) + 1;
  }

  return {
    source: source.relativePath,
    source_key: source.key,
    category: source.category,
    record_count: source.records.length,
    status_distribution: statusDistribution,
    unique_id_count: new Set(ids).size,
    duplicate_record_count: ids.filter(
      (id) => duplicateCounts[id] > 1,
    ).length,
    missing_id_count: source.records.length - ids.length,
    parse_error_count: source.parseErrors.length,
    migratable: source.includeInMigration && source.parseErrors.length === 0,
    missing: source.missing,
  };
}

export function buildLegacyInventory({ sourceSnapshot } = {}) {
  const effectiveSourceSnapshot = sourceSnapshot ?? IMPLEMENTATION_ROOT;
  const sources = loadLegacySources({
    sourceSnapshot: effectiveSourceSnapshot,
  });
  return {
    generated_at: new Date().toISOString(),
    source_snapshot: effectiveSourceSnapshot,
    sources: sources.map(summarizeSource),
    totals: {
      records: sources.reduce((sum, source) => sum + source.records.length, 0),
      migratable_records: sources
        .filter((source) => source.includeInMigration)
        .reduce((sum, source) => sum + source.records.length, 0),
      parse_errors: sources.reduce(
        (sum, source) => sum + source.parseErrors.length,
        0,
      ),
    },
  };
}

export function writeInventoryReport(report, reportPath) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--source-snapshot') {
      args.sourceSnapshot = argv[++index];
    } else if (value === '--report') {
      args.report = argv[++index];
    } else {
      throw new Error('Unknown argument: ' + value);
    }
  }
  return args;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = buildLegacyInventory(args);
    if (args.report) {
      writeInventoryReport(report, args.report);
    }
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
