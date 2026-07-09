# Gewuji Growth OS Full System v1

Gewuji Growth OS 是内部增长操作系统，用来把海外买家问题、工厂资料表达问题和 AI 搜索可见度信号，转成可审核、可发布、可监控的内容与业务改进队列。

它不是网站改版，不是 SaaS，不是自动发帖工具，也不是批量 AI 内容系统。

## Positioning

Gewuji helps:

- overseas buyers understand supplier replies, quotations, sample terms, payment details, and field materials
- Chinese factories improve materials that overseas buyers can understand

Boundaries:

- not supplier verification guarantee
- not factory audit
- not quality inspection
- not payment protection
- not supplier reliability guarantee

## System Flow

```text
Data Sources
-> Opportunity Engine
-> Content Factory
-> Review Engine
-> Publishing Queue
-> Distribution Engine
-> Monitoring Engine
-> Feedback Loop
```

## Modules

| Module | Path | Output |
|---|---|---|
| Architecture | `docs/growth-os/architecture/` | system map and agent roles |
| Opportunity Engine | `docs/growth-os/opportunities/` + `data/growth-os/opportunities.jsonl` | scored opportunity queue |
| Content Factory | `docs/growth-os/content-engine/` + `docs/content-pipeline/` | briefs, drafts, schema plans, distribution drafts |
| Review Engine | `docs/growth-os/review-engine/` | `approved` or `needs_revision` |
| Publishing Queue | `docs/growth-os/publishing/` | `page-ready` checklist |
| Distribution Engine | `docs/growth-os/distribution/` + `docs/social/queue/` | reviewed social drafts |
| Monitoring Engine | `docs/growth-os/monitoring/` + `docs/geo-monitoring/` | SEO and GEO monitoring records |
| Feedback Loop | `docs/growth-os/feedback/` + `data/growth-os/state/content-lifecycle.json` | optimization queue |

## Live Data

Canonical data files:

- `data/growth-os/opportunities.jsonl`
- `data/growth-os/state/content-lifecycle.json`

Docs-side mirrors for structure reference:

- `docs/growth-os/data/opportunities.jsonl`
- `docs/growth-os/state-machine/content-status-schema.md`

## Automation Boundary

Current scripts are local-only:

- `scripts/growth-os/opportunity-validator.mjs`
- `scripts/growth-os/content-status-checker.mjs`
- `scripts/growth-os/geo-report-generator.mjs`

They do not crawl, log in, post, comment, submit forms, or call external APIs.
