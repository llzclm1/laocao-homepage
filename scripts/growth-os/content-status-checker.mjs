import { fileURLToPath } from "node:url";

import { loadLifecycleState, validateLifecycleState } from "./state/state-manager.mjs";

const result = validateLifecycleState(loadLifecycleState());
const errors = [...result.errors];
const warnings = [...result.warnings];

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(`checked ${result.checked} lifecycle records`);
