# Opportunity JSON Schema

This schema documents records in `data/growth-os/opportunities.jsonl`.

## Format

One JSON object per line.

## Required Fields

| Field | Type | Example |
|---|---|---|
| `id` | string | `GO-001` |
| `question` | string | `Questions before ordering samples from China` |
| `source` | string | `existing buyer guide workflow` |
| `intent` | string | `buyer research` |
| `score` | number | `90` |
| `status` | string | `published_candidate` |
| `url` | string | `/buyer-guides/questions-before-ordering-samples-from-china/` |
| `boundary_risk` | string | `Must not imply supplier verification...` |
| `next_action` | string | `monitor SEO/GEO and distribution manually` |

## Autonomous Fields

Optional fields for autonomous mode:

| Field | Type | Meaning |
|---|---|---|
| `approval_required` | boolean | true when human approval is needed |
| `approved_by` | string or null | approver |
| `approved_at` | string or null | ISO date |
| `input_files` | array | local files used |
| `output_files` | array | local files produced |

## Allowed Status

- `captured`
- `researched`
- `opportunity_scored`
- `approved`
- `brief_ready`
- `draft_ready`
- `content_package_ready`
- `review_approved`
- `publishing_candidate`
- `approval_required`
- `published_candidate`
- `page_published`
- `distribution_draft`
- `monitoring`
- `optimization_candidate`
- `needs_revision`
- `rejected`
