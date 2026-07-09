# Opportunity Scoring Model

Use this model before a question enters the content pipeline.

## Score Formula

| Dimension | Weight | Meaning |
|---|---:|---|
| Buyer intent | 40% | The question shows clear buying or sourcing intent |
| Commercial value | 30% | The topic can lead to Supplier Reply Review, Buyer Guides, Field Materials, or factory communication support |
| Competition | 20% | Existing search/social answers are weak, vague, outdated, or overclaiming |
| Content gap | 10% | Gewuji does not yet have a strong page or answer |

## Decision Bands

| Score | Decision |
|---:|---|
| 80-100 | create or update content now |
| 60-79 | prepare brief or watch for more signals |
| 40-59 | keep in backlog |
| 0-39 | reject |

## Boundary Penalty

Subtract points if the topic naturally drifts toward:

- supplier verification guarantee
- factory audit
- quality inspection
- payment protection
- supplier reliability guarantee

If the boundary cannot be made clear, reject the opportunity.

## GO-001 Score

| Dimension | Score | Weighted |
|---|---:|---:|
| Buyer intent | 95 | 38 |
| Commercial value | 90 | 27 |
| Competition | 85 | 17 |
| Content gap | 80 | 8 |
| Total |  | 90 |
