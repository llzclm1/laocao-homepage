# Opportunity Agent

## Input

- `data/growth-os/source-questions.jsonl`
- `data/growth-os/opportunities.jsonl`
- manual notes from Google Search, Reddit, Quora, LinkedIn, AI Search, Supplier Questions, Customer Conversations

## Process

1. Normalize each question.
2. Remove duplicates.
3. Classify intent.
4. Estimate buyer or factory value.
5. Create or update opportunity records.

## Output

- `data/growth-os/opportunities.jsonl`
- `docs/growth-os/opportunities/queue.md`

## Human Checkpoint

Required when a new opportunity score is high enough to enter content production.

Set:

```json
{"approval_required": true}
```
