# Daily Run

## Purpose

Find and process new sourcing questions into local opportunity candidates.

## Steps

1. Read local source questions.
2. Validate existing opportunities.
3. Add or update opportunity queue.
4. Score new opportunities.
5. Generate content package for approved high-score items.
6. Run review checks.
7. Mark publishing candidates as `approval_required`.

## Inputs

- `data/growth-os/opportunities.jsonl`
- future `data/growth-os/source-questions.jsonl`
- `docs/content-pipeline/`

## Outputs

- updated opportunity queue
- content package drafts
- review result
- publishing candidate status

## Human Checkpoint

Anything marked `approval_required` waits for manual approval.
