# GEO Monitoring

This folder stores manual AI-search visibility checks. It is not proof of ranking or traffic.

## Platforms

- ChatGPT
- Perplexity
- Gemini

## Result Fields

| Field | Meaning |
|---|---|
| `mentioned` | Does the answer mention Gewuji? |
| `citation` | Does it cite `gewuji.dev` or a third-party distribution page? |
| `accuracy` | Does it describe the core idea correctly? |
| `boundary_correct` | Does it avoid verification, audit, inspection, guarantee, and payment protection claims? |

## Prompt Database

Use `docs/growth-os/monitoring/geo-monitoring.md`.

## Output

Weekly reports can be generated locally with:

```text
node scripts/growth-os/geo-report-generator.mjs
```
