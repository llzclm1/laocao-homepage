import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMorningBrief } from './morning-brief.mjs';
import { runV2Discovery } from './discovery.mjs';
import { rebuildUnifiedView } from './unified-view.mjs';
import { DEFAULT_DB_PATH, openV2Store, readUnifiedView } from './store.mjs';

export async function runV2Scheduler({ dbPath = DEFAULT_DB_PATH, now = new Date() } = {}) {
  if (!existsSync(dbPath)) throw new Error(`v2 production database is missing: ${dbPath}`);
  const discovery = await runV2Discovery({ dbPath, now });
  const store = openV2Store({ dbPath, rebuildView: false });
  try {
    rebuildUnifiedView(store.db);
    const view = readUnifiedView(store.db);
    const brief = buildMorningBrief(store.db, { now });
    return {
      ran_at: now.toISOString(),
      discovery,
      unified_view: { count: view.length },
      morning_brief: brief,
    };
  } finally {
    store.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    console.log(JSON.stringify(await runV2Scheduler(), null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
