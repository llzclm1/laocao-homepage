export function createRunContext(argv = process.argv, now = new Date()) {
  return {
    dryRun: argv.includes("--dry-run"),
    date: now.toISOString(),
    day: now.toISOString().slice(0, 10)
  };
}
