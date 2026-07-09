# Monitoring Result Schema

This schema defines future local monitoring result records.

## File

Suggested file:

```text
data/growth-os/monitoring-results.jsonl
```

## Fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Result ID |
| `opportunity_id` | string | yes | Related GO ID |
| `url` | string | yes | Page URL |
| `platform` | string | yes | ChatGPT / Perplexity / Gemini / Google / GSC |
| `query` | string | yes | Prompt or search query |
| `date_checked` | string | yes | ISO date |
| `mentioned` | boolean or null | no | Whether Gewuji was mentioned |
| `citation` | boolean or null | no | Whether Gewuji was cited |
| `accuracy` | string or number | no | Accuracy note or score |
| `boundary_correct` | boolean or null | no | Whether answer stayed inside boundary |
| `notes` | string | no | Manual notes |

## Boundary

Monitoring results must not be used as public ranking claims without separate human approval.
