# Growth OS Autonomous Runtime

Run the local Growth OS loop with one command:

```text
node scripts/growth-os/runtime/run.mjs
```

Dry run:

```text
node scripts/growth-os/runtime/run.mjs --dry-run
```

## What It Runs

1. Problem Radar
2. Opportunity scoring
3. Decision Engine
4. Research and Content agent stubs
5. Review queue update
6. Performance report
7. Morning report

## Boundaries

- No external API.
- No page publishing.
- No social posting.
- No commit or push.
- No website HTML, CSS, sitemap, robots, or llms changes.

Dry run writes the daily Markdown report only and skips runtime state / decision log updates.
