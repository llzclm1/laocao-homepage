# Growth OS System Architecture

This document defines the full v1 operating system for turning market signals into reviewed Gewuji content, distribution tasks, monitoring, and feedback.

## Goal

Build a local-first growth workflow:

```text
Google Search
Reddit
Quora
LinkedIn
AI Search
Supplier Questions
Customer Conversations

-> Opportunity Engine
-> Content Factory
-> Review Engine
-> Publishing Queue
-> Distribution Engine
-> Monitoring Engine
-> Feedback Loop
```

## Core Rule

Every idea must become a structured opportunity before it becomes a page, post, or product change.

## Data Sources

| Source | Use | Boundary |
|---|---|---|
| Google Search | buyer questions and SERP gaps | no ranking guarantee |
| Reddit | real buyer language | no spam or link dropping |
| Quora | question patterns | no auto posting |
| LinkedIn | professional wording and factory-side pain | no automation |
| AI Search | GEO visibility checks | no exaggerated claims |
| Supplier Questions | field demand | anonymize |
| Customer Conversations | product improvement | no private data |

## Engine Responsibilities

| Engine | Responsibility | Output |
|---|---|---|
| Opportunity Engine | score buyer/factory questions | `data/growth-os/opportunities.jsonl` |
| Content Factory | produce pipeline docs | `docs/content-pipeline/<id>/` |
| Review Engine | enforce boundary and quality | `approved` or `needs_revision` |
| Publishing Queue | check page-readiness | `page-ready` |
| Distribution Engine | prepare manual social drafts | `docs/social/queue/` |
| Monitoring Engine | track SEO/GEO outcomes | reports and status data |
| Feedback Loop | decide update/merge/stop | optimization queue |

## Non-Goals

- No supplier verification product.
- No factory audit workflow.
- No quality inspection claims.
- No payment protection positioning.
- No automatic posting, scraping, or outreach.
- No bulk AI page generation.
