# GO-001 Schema Plan

This file defines schema intent only. Do not modify website code until the page implementation task starts.

## Target Page

```text
/buyer-guides/questions-before-ordering-samples-from-china/
```

## Schema Types

Use:

- `Article`
- `FAQPage`
- `BreadcrumbList` if the existing site pattern supports it

Do not add fake ratings, fake reviews, fake author credentials, or claim verification authority.

## Article Schema Plan

Recommended fields:

| Field | Value |
|---|---|
| `@type` | `Article` |
| `headline` | `Questions Before Ordering Samples From China` |
| `description` | `A practical buyer checklist for clarifying sample type, product specs, fees, shipping, packaging, and what a China supplier sample does not prove.` |
| `author` | Gewuji |
| `publisher` | Gewuji |
| `mainEntityOfPage` | `https://gewuji.dev/buyer-guides/questions-before-ordering-samples-from-china/` |
| `inLanguage` | `en` |
| `articleSection` | Buyer Guides |

Boundary language should be visible on page content, not hidden only in schema.

## FAQPage Schema Plan

Only include FAQPage schema if the final page visibly includes the same FAQ questions and answers.

FAQ candidates:

1. What should I ask before ordering a sample from a Chinese supplier?
2. Is a sample from China proof that bulk production will be the same?
3. Should I pay a sample fee before confirming product details?
4. What is the difference between a stock sample and a custom sample?
5. Can I ask the supplier for sample photos or videos before shipment?
6. What should I do if the sample fee or shipping cost changes?
7. When should I slow down before ordering a sample?

## FAQ Answer Boundaries

FAQ answers must not say or imply:

- Gewuji verifies suppliers
- sample questions audit factories
- sample review guarantees quality
- clear communication makes payment safe
- a supplier is safe, real, reliable, or guaranteed

## Internal Link Targets

Suggested page links:

- `/supplier-reply-review/`
- `/supplier-reply-review/sample-report/`
- `/supplier-reply-review/examples/`
- `/field-materials/`
- `/buyer-guides/`

## Implementation Notes For Later

- Follow the existing site schema pattern.
- Keep schema content aligned with visible page copy.
- Do not add schema for claims that are not visible on the page.
- Do not modify `sitemap.xml` or `robots.txt` in this content pipeline step.
