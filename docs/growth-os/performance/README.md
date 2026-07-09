# Growth OS Performance Feedback Loop

This folder stores the local feedback layer for Growth OS content.

## Purpose

Performance review turns published or publish-candidate content records into clear next actions:

- keep monitoring
- improve the page
- create a related opportunity
- stop or defer weak ideas

## Inputs

- `data/growth-os/state/content-lifecycle.json`
- `docs/geo-monitoring/`
- `docs/growth-os/monitoring/`

## Output

`content-performance-report.md` is generated locally by:

```text
node scripts/growth-os/performance/performance-analyzer.mjs
```

The report is advisory only. It does not publish pages, call APIs, or change website content.

## Boundary

Performance feedback must keep Gewuji positioned around communication clarity, buyer questions, missing information, and next steps. It must not push claims about supplier verification, factory audits, inspections, guarantees, payment protection, or supplier reliability.
