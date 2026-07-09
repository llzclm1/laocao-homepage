# Growth OS Import Validation

This folder validates local manual imports before Growth OS uses them.

## Scope

Validation checks:

- file naming convention
- required fields
- JSON array shape
- URL match against `data/growth-os/opportunities.jsonl`

## Report

The import runner writes:

```text
data/growth-os/import-reports/import-report-YYYY-MM-DD.md
```

## Boundary

This layer does not call APIs, publish pages, or change website files.
