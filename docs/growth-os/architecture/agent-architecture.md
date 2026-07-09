# Growth OS Agent Architecture

This is an internal agent map. It defines responsibilities, not autonomous external actions.

## Agents

| Agent | Inputs | Outputs | Allowed |
|---|---|---|---|
| Opportunity Agent | questions, URLs, notes | scored opportunity item | local JSON/Markdown only |
| Content Agent | opportunity ID | brief, draft, schema plan, distribution drafts | draft generation |
| Review Agent | draft and schema plan | `approved` or `needs_revision` | boundary checks |
| Publishing Agent | approved draft | page checklist | page readiness only |
| Distribution Agent | published URL | social drafts | manual review queue |
| Monitoring Agent | URL and prompt set | SEO/GEO report | local report generation |
| Feedback Agent | status data | optimization queue | content decisions |

## Hard Stops

All agents must stop before:

- publishing a page
- posting to social platforms
- submitting forms
- collecting private data
- making guarantee claims

## Handoff Contract

Each agent must pass:

- opportunity ID
- source
- status
- next action
- boundary risk
- files produced
