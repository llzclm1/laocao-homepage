# Content Factory Workflow

The Content Factory turns one approved opportunity into a complete set of reviewable assets.

## Input

Opportunity ID from `data/growth-os/opportunities.jsonl`.

## Output Folder

```text
docs/content-pipeline/<opportunity-id>/
```

Required files:

1. `opportunity.md`
2. `brief.md`
3. `draft.md`
4. `schema-plan.md`
5. `distribution.md`
6. `geo-monitoring.md`
7. `review.md`

## Workflow

```text
Opportunity ID
-> opportunity.md
-> brief.md
-> draft.md
-> schema-plan.md
-> distribution.md
-> geo-monitoring.md
-> review.md
```

## Content Rules

Every draft must include:

- clear buyer question
- direct answer
- practical checklist or questions
- boundary statement
- internal links
- non-sales CTA

Every draft must avoid:

- supplier verification language
- audit claims
- inspection claims
- quality guarantee
- payment protection
- supplier reliability guarantee
