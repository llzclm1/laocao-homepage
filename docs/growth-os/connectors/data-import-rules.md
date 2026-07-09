# Growth OS Data Import Rules

These rules keep manual Growth OS imports predictable before any real API connection exists.

## Sources

- GSC exports go in `data/growth-os/imports/gsc/`
- GA4 or analytics exports go in `data/growth-os/imports/analytics/`
- GEO prompt results go in `data/growth-os/imports/geo/`
- Cloudflare exports go in `data/growth-os/imports/cloudflare/`

## Rules

- Use the required file naming convention.
- Keep one export date per file.
- Do not include private customer data.
- Use page URLs that can be matched to `data/growth-os/opportunities.jsonl` when possible.
- Treat warnings as manual review items, not public claims.

## Required Fields

| Source | Required fields |
|---|---|
| GSC | `url`, `query`, `clicks`, `impressions`, `ctr`, `position`, `date` |
| Analytics | `url`, `pageviews`, `sessions`, `referrer`, `country`, `device`, `date` |
| GEO | `platform`, `prompt`, `mentioned`, `citation_url`, `accuracy`, `date` |
| Cloudflare | `requests`, `country`, `bot`, `date` |

## Validation Output

Import validation writes a Markdown report to `data/growth-os/import-reports/`.

Errors mean the file or row needs cleanup. Warnings mean the import can still be useful, but a human should review the signal before using it.
