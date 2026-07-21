import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigration } from './migration.mjs';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--source-snapshot') {
      args.sourceSnapshot = argv[++index];
    } else if (value === '--target-db') {
      args.targetDb = argv[++index];
    } else if (value === '--report') {
      args.reportPath = argv[++index];
    } else if (value === '--help') {
      args.help = true;
    } else {
      throw new Error('Unknown argument: ' + value);
    }
  }
  return args;
}

function printHelp() {
  console.log(
    [
      'Growth OS v2 non-production migration dry run',
      '',
      'Options:',
      '  --source-snapshot <directory>  Read-only legacy snapshot root',
      '  --target-db <path>            Temporary SQLite target; production path is refused',
      '  --report <path>               JSON migration report path',
    ].join('\n'),
  );
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exitCode = 0;
    } else {
      const result = runMigration({
        sourceSnapshot: args.sourceSnapshot,
        targetDb: args.targetDb,
        reportPath: args.reportPath,
      });
      console.log(
        JSON.stringify(
          {
            success: result.success,
            target_db: result.targetDb,
            report_path: result.reportPath,
            legacy_total: result.migration.legacy_total,
            migrated_opportunities: result.migration.migrated_opportunities,
            migrated_lifecycle_events: result.migration.migrated_lifecycle_events,
            migrated_publications: result.migration.migrated_publications,
            migrated_performance_records:
              result.migration.migrated_performance_records,
            deduplicated_records: result.migration.deduplicated_records,
            rejected_records: result.migration.rejected_records,
            unmapped_statuses: result.migration.unmapped_statuses,
            production_cutover: result.production_cutover,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          success: false,
          error: error.message,
          report_path: error.reportPath ?? null,
          report: error.report
            ? {
                migration: error.report.migration,
                verification: error.report.verification,
                production_cutover: error.report.production_cutover,
              }
            : null,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
