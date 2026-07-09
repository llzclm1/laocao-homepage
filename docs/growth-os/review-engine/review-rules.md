# Review Engine Rules

The Review Engine decides whether a content asset is `approved` or `needs_revision`.

## Inputs

- `docs/content-pipeline/<id>/draft.md`
- `docs/content-pipeline/<id>/schema-plan.md`
- `docs/content-pipeline/<id>/distribution.md`

## Output

Allowed decisions:

- `approved`
- `needs_revision`

## Required Checks

The draft must contain:

- buyer or factory question
- direct answer
- missing information or information gap
- next questions
- visible boundary statement
- non-sales CTA if CTA exists

## Prohibited Claims

Needs revision if it says or implies:

- supplier verification guarantee
- factory audit
- inspection
- quality guarantee
- payment safety
- payment protection
- supplier reliability guarantee

## Allowed Framing

Approved framing:

- communication clarity
- missing information
- questions to ask
- next steps
- visible information
- supplier reply review
- field materials context

## Schema Review

Schema must match visible page content.

Do not approve schema that contains:

- fake ratings
- fake reviews
- fake verification claims
- claims not visible on page
