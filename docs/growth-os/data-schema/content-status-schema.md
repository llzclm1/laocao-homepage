# Content Status Schema

This schema documents `data/growth-os/content-status.json`.

## Root

```json
{
  "updated_at": "2026-07-09",
  "items": []
}
```

## Item Fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Opportunity ID |
| `url` | string | yes | Page URL or target URL |
| `publish_date` | string | yes | Date content became a candidate or published page |
| `status` | string | yes | Current state |
| `traffic` | number or null | no | Traffic signal |
| `ranking` | number/string/null | no | Search position or note |
| `ai_citation` | number/string/null | no | AI citation state |
| `conversion` | number/string/null | no | Lead or CTA signal |
| `next_review` | string | no | Next review date |
| `optimization_queue` | array | no | Suggested improvements |

## Autonomous Fields

- `approval_required`
- `approved_by`
- `approved_at`
- `last_agent_run_at`
- `last_monitoring_report`

## Allowed Status

- `draft`
- `review`
- `published_candidate`
- `approval_required`
- `page_published`
- `distributed`
- `monitoring`
- `optimization_candidate`
- `improve_or_stop`
