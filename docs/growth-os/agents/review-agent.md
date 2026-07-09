# Review Agent

## Input

- `docs/content-pipeline/<go-id>/draft.md`
- `docs/content-pipeline/<go-id>/schema-plan.md`
- `docs/content-pipeline/<go-id>/distribution.md`
- `docs/growth-os/review-engine/boundary-checklist.md`

## Process

1. Check forbidden claims.
2. Check allowed positioning.
3. Check direct answer and buyer usefulness.
4. Check schema and FAQ alignment.
5. Return decision.

## Output

- `docs/content-pipeline/<go-id>/review.md`
- decision: `approved` or `needs_revision`

## Human Checkpoint

Human approval is required for final decision if the item is going to a website page or external platform.
