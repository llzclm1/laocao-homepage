# Project Status

## Updated

2026-07-09

## Current State

`main` is synced with `origin/main`.

The working tree still has existing dirty / untracked files. They should be handled in scoped groups, not swept into one commit.

Current cleanup group:

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `PROJECT_DECISIONS.md`
- `PROJECT_STATUS.md`

## Completed

Recently completed and pushed:

- Spanish buyer guide pilot page
- GEO AI search readiness playbook
- Cloudflare traffic observation note
- Cloudflare security insights triage note
- Field Materials real photo gallery
- legacy project archive / noindex discovery cleanup
- broken internal links and email links fix
- Buyer Guides metadata and CTA improvements
- dirty worktree cleanup plan

## Current Priorities

1. Commit cleaned `AGENTS.md` and `PROJECT_*` files as a scoped project-rules commit.
2. Decide local-only handling for `CODEX_HANDOFF.md`.
3. Handle `.gitignore` hygiene for temp files and render outputs.
4. Clean temporary files and excluded Field Materials images.
5. Prepare a core-pages GEO TL;DR and schema brief before changing pages.

## Product Focus

The current product focus remains Supplier Reply Review.

The next useful validation work is:

- get real buyer material submissions
- complete manual review reports
- record what parts of the report helped
- refine Sample Report, Examples, and Buyer Guides from real questions

## Active Site Areas

Core active areas:

- `/`
- `/for-buyers/`
- `/for-factories/`
- `/field-materials/`
- `/supplier-reply-review/`
- `/supplier-reply-review/sample-report/`
- `/supplier-reply-review/examples/`
- `/buyer-guides/`
- `/es/buyer-guides/`

Legacy areas remain accessible but are archive/noindex or removed from main discovery surfaces where applicable.

## Known Dirty Groups

Remaining dirty / untracked files should be classified before committing.

Likely groups:

- project rules and context files
- local-only handoff or private context
- temporary files
- video / content experiments
- Field Materials excluded images
- SEO / strategy / social drafts
- unrelated page or script changes

Do not use `git add .` in this repo while these groups remain mixed.

## Boundaries

Do not claim Gewuji provides:

- supplier verification
- factory audit
- legal due diligence
- quality inspection
- payment safety guarantee
- supplier reliability guarantee

Do not commit:

- private account history
- local absolute paths
- customer or supplier private data
- tokens, cookies, passwords, sessions, or secrets
- large video render outputs
- temporary screenshots or contact sheets
