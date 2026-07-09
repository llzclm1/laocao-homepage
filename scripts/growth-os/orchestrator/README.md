# Growth OS Daily Run Orchestrator

Local-only runner for chaining Growth OS agent stubs.

## Run

```text
node scripts/growth-os/orchestrator/daily-run.mjs
```

## What It Does

1. Loads `data/growth-os/opportunities.jsonl`.
2. Runs Opportunity Agent.
3. Runs Research Agent.
4. Runs Content Agent.
5. Runs Review Agent.
6. Runs Monitor Agent.
7. Writes `scripts/growth-os/orchestrator/run-state.json`.

## Boundaries

No external API.
No crawler.
No automatic publishing.
No website HTML edits.
No commit or push.
