# Opportunity Queue

This is the human-readable queue for Growth OS opportunities. The canonical structured queue is `data/growth-os/opportunities.jsonl`.

## Entry Rules

Every opportunity needs:

- ID
- question
- source
- intent
- score
- status
- URL or target URL
- boundary risk
- next action

## Status Values

- `captured`
- `scored`
- `approved`
- `brief_ready`
- `draft_ready`
- `review_ready`
- `published_candidate`
- `published`
- `distributed`
- `monitoring`
- `needs_revision`
- `improve_or_stop`
- `rejected`

## Current Queue

| ID | Question | Source | Intent | Score | Status | URL | Next action | Boundary risk |
|---|---|---|---|---:|---|---|---|---|
| GO-001 | Questions before ordering samples from China | existing buyer guide workflow | buyer research | 90 | `published_candidate` | `/buyer-guides/questions-before-ordering-samples-from-china/` | monitor SEO/GEO and distribution manually | Must not imply verification, audit, inspection, quality guarantee, payment protection, or supplier reliability guarantee |

## Intake Template

| ID | Question | Source | Intent | Score | Status | URL | Next action | Boundary risk |
|---|---|---|---|---:|---|---|---|---|
| GO-XXX |  |  |  |  | `captured` |  |  |  |
