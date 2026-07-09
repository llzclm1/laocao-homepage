# Dirty Worktree Cleanup Plan

这份计划用于把当前剩余 dirty worktree 拆成可提交、暂留、删除、忽略和人工确认几类，避免后续 scoped commit 混入旧实验产物。

## Current Git Status Summary

当前 `main` 已与 `origin/main` 同步，但工作区仍有大量 modified / untracked 文件。

Modified tracked files:

- `.gitignore`
- `AGENTS.md`
- `buyer-guides/index.html`
- `buyer-guides/verify-chinese-supplier-before-deposit/index.html`
- `data/marketing/social-outreach-log.csv`
- `docs/promotion/overseas-posting-log.md`
- `llms.txt`
- `scripts/build-static-site.mjs`
- `scripts/verify-static-hosting.mjs`

Untracked groups:

- `PROJECT_CONTEXT.md`, `PROJECT_DECISIONS.md`, `PROJECT_STATUS.md`
- `_tmp_*` contact sheets and text extracts
- `assets/home/hero-industrial-*.png`
- `es/buyer-guides/**`
- many `docs/**` strategy, SEO, social, product, design-audit and site-audit files
- `field-materials/field-real-carton-labeling-area.jpg`
- `field-materials/field-real-clean-sample-box.jpg`
- `field-materials/field-real-sample-room-video.jpg`
- `field-materials/field-real-surface-finishing-line.jpg`
- `scripts/content/**` and `scripts/video/**` YouTube / Remotion experiment files and render outputs
- `skills/**`
- `templates/**`

## Files to Commit Later

| File | Reason | Suggested Commit Group |
| --- | --- | --- |
| `es/buyer-guides/index.html` | Spanish buyer guides index page; matches existing Spanish pilot direction. | Spanish buyer guide pilot pages |
| `es/buyer-guides/como-revisar-un-proveedor-chino-antes-de-pagar/index.html` | First Spanish buyer guide article; has canonical / hreflang structure and service boundary language. | Spanish buyer guide pilot pages |
| `buyer-guides/index.html` | Adds Spanish hreflang to English buyer guides index. | Spanish buyer guide pilot pages |
| `buyer-guides/verify-chinese-supplier-before-deposit/index.html` | Adds Spanish hreflang to matching English source article. | Spanish buyer guide pilot pages |
| `scripts/build-static-site.mjs` | Adds `/es/` copy and Spanish buyer guide sitemap generation. | Spanish buyer guide pilot build support |
| `scripts/verify-static-hosting.mjs` | Adds static verification for Spanish pages and hreflang. | Spanish buyer guide pilot build support |
| `AGENTS.md` | Adds project-specific Codex rules, scope boundaries, and Gewuji positioning guardrails. | Project rules files |
| `PROJECT_CONTEXT.md` | Captures current project positioning, users, business model, and stage. | Project context files |
| `PROJECT_DECISIONS.md` | Captures product/SEO/service boundary decisions. | Project context files |
| `PROJECT_STATUS.md` | Captures current project phase and status. | Project context files |
| `docs/status/gewuji-fast-validation-strategy-2026-07.md` | Strategic status doc for fast Supplier Reply Review validation. | Status / strategy docs |
| `docs/status/gewuji-validation-phase-plan-2026-07.md` | Market validation phase plan. | Status / strategy docs |
| `docs/strategy/ai-business-model-analysis-2026-07.md` | AI business model adaptation analysis for Gewuji. | AI strategy docs |
| `docs/strategy/ai-buyer-matching-roadmap-2026-07.md` | AI buyer matching roadmap. | AI strategy docs |
| `docs/strategy/ai-capability-roadmap-2026-2030.md` | Longer-term AI capability roadmap. | AI strategy docs |
| `docs/strategy/ai-product-opportunity-map-2026-07.md` | AI opportunity map; useful as internal strategy. | AI strategy docs |
| `docs/design-audit/field-materials-final-photo-commit-audit-2026-07-09.md` | Final Field Materials photo commit audit just created. | Design audit docs |
| `docs/site-audit/buyer-guides-conversion-path-audit-2026-07.md` | Existing conversion-path audit; useful if not already committed elsewhere. | Site audit docs |
| `docs/site-audit/legacy-project-archive-plan-2026-07-09.md` | Legacy archive plan; useful documentation for completed archive work. | Site audit docs |
| `docs/site-audit/legacy-topic-contamination-audit-2026-07-09.md` | Legacy topic contamination audit. | Site audit docs |
| `docs/site-audit/legacy-url-indexing-audit-2026-07-09.md` | Legacy URL indexing audit. | Site audit docs |
| `docs/site-audit/semrush-technical-issues-note-2026-07-09.md` | Semrush technical issue note. | Site audit docs |
| `docs/site-audit/verification-language-risk-audit-2026-07-08.md` | Verification language audit. | Site audit docs |
| `docs/seo/*.md` selected files | Several SEO / GEO docs look project-relevant, but should be reviewed and committed in smaller topic groups. | SEO / GEO docs |
| `docs/product/supplier-reply-review-*.md` | Product docs for Supplier Reply Review flow, examples, outreach, validation. | Product docs |
| `templates/geo-buyer-question-template.md` | Reusable content template. | Templates |
| `templates/supplier-reply-review-workflow-template.md` | Reusable delivery workflow template. | Templates |
| `skills/gewuji-site-audit-skill/SKILL.md` | Potential reusable site-audit skill. | Skills, only after review |

## Files to Keep Uncommitted

| File | Reason |
| --- | --- |
| `data/marketing/social-outreach-log.csv` | Operational log; may contain ongoing manual tracking. Keep local until reviewed for privacy and usefulness. |
| `data/marketing/external-geo-feedback-log.csv` | External GEO feedback log; useful operationally, but review before committing. |
| `docs/promotion/overseas-posting-log.md` | Posting log; may contain draft outreach history. Keep uncommitted until reviewed. |
| `docs/social/*.md` | Public reply drafts and QA notes; useful for operations, but should be reviewed for tone, privacy, and platform fit. |
| `docs/marketing/*.md` | Marketing execution/research notes; keep until a dedicated marketing-doc commit. |
| `docs/ai/gewuji-ai-market-research-system-2026-07.md` | Potentially useful, but not needed for current site release. |
| `docs/youtube-agent-saas-v1.md` | YouTube / AI agent experiment direction; not current site priority. |
| `docs/supplier-reply-review-system-5.md` | Potential system doc; review before committing. |
| `assets/home/hero-industrial-bright-premium.png` | Candidate home hero asset, not currently part of a scoped page commit. |
| `assets/home/hero-industrial-cinematic-dark.png` | Candidate home hero asset, not currently part of a scoped page commit. |
| `scripts/content/*.mjs` top-level generator scripts | Experimental content/video production scripts; keep local until productized. |
| `scripts/video/remotion-renderer/**` source files | Remotion experiment; large scope and not current site release. |

## Files to Delete

| File | Reason |
| --- | --- |
| `_tmp_*-sheet.jpg` | Temporary contact-sheet images; not site assets. |
| `_tmp_*-sheet.txt` | Temporary extraction notes; not project docs. |
| `field-materials/field-real-carton-labeling-area.jpg` | Not used; watermark risk; explicitly excluded from Field Materials commit. |
| `field-materials/field-real-clean-sample-box.jpg` | Not used; duplicate/weak context; explicitly excluded from Field Materials commit. |
| `field-materials/field-real-sample-room-video.jpg` | Not used; duplicate sample-room image; explicitly excluded from Field Materials commit. |
| `field-materials/field-real-surface-finishing-line.jpg` | Not used; semantic mismatch; explicitly excluded from Field Materials commit. |
| `docs/design-audit/*-2026-07-08.png` visual QA screenshots | Mostly one-off screenshots. Delete unless a specific report needs them. |
| `docs/design-audit/field-materials-candidate-grid-2026-07-08.jpg` | Contact sheet / audit artifact, not a site asset. |
| `scripts/content/**/output/**` | Render outputs, videos, thumbnails, voiceovers, generated packages; too large/noisy for repo unless explicitly selected. |
| `scripts/video/remotion-renderer/scripts/content/**/output/**` | Duplicated render output under renderer; should not be versioned. |

## Files to Add to .gitignore

| File/Pattern | Reason |
| --- | --- |
| `_tmp_*` | Temporary sheets and OCR/extraction artifacts should not appear in status. |
| `scripts/content/**/output/` | Generated videos, thumbnails, voiceovers and render packages. |
| `scripts/content/**/output/**` | Recursive generated output guard. |
| `scripts/video/remotion-renderer/scripts/content/**/output/` | Nested generated output inside Remotion renderer. |
| `scripts/video/remotion-renderer/.remotion-props.json` | Local render props. |
| `field-materials/field-real-carton-labeling-area.jpg` | Excluded risky image. |
| `field-materials/field-real-clean-sample-box.jpg` | Excluded duplicate/weak image. |
| `field-materials/field-real-sample-room-video.jpg` | Excluded duplicate image. |
| `field-materials/field-real-surface-finishing-line.jpg` | Excluded semantic mismatch image. |
| `docs/design-audit/*.png` | Screenshot artifacts; commit only intentionally with `git add -f` if needed. |
| `docs/design-audit/*candidate-grid*.jpg` | Contact sheets are temporary audit artifacts. |
| `*.mp4` | Generated video outputs. |
| `*.mp3` | Generated voiceover outputs. |

## Requires Human Review

| File | Question |
| --- | --- |
| `.gitignore` | Current diff only ignores `scripts/content/youtube-poc-*/output/`; should it be broadened to all generated script/video outputs before committing? |
| `llms.txt` | Markdown rewrite appears useful for AI crawler readiness, but check whether latest committed version already covers this or if this is an uncommitted duplicate from earlier work. |
| `AGENTS.md` | New rules are useful but strong; confirm whether project should require `PROJECT_*` and `CODEX_HANDOFF.md` before every task. |
| `PROJECT_CONTEXT.md` | Confirm whether root project context docs should live in repo. |
| `PROJECT_DECISIONS.md` | Confirm whether root project decision log should live in repo. |
| `PROJECT_STATUS.md` | Confirm whether root project status should live in repo and how often it should be updated. |
| `es/buyer-guides/**` | Confirm Spanish pilot is ready to publish, including Spanish quality, hreflang, sitemap inclusion, and whether `/es/` should be indexed now. |
| `buyer-guides/*` hreflang changes | Commit only with `/es/` pages and build/verify support. |
| `scripts/build-static-site.mjs` | Spanish sitemap/copy support should only commit with Spanish pages. |
| `scripts/verify-static-hosting.mjs` | Spanish verification should only commit with Spanish pages. |
| `skills/gewuji-site-audit-skill/**` | Confirm whether custom skill belongs in this site repo or in local Codex skills only. |
| `scripts/video/remotion-renderer/**` | Decide whether this is a real project submodule/tool or only a local experiment. |
| `docs/design-audit/full-site-visual-consistency-audit-2026-07-08.md` | Could be useful, but screenshots around it are noisy. Confirm desired retention. |
| `docs/seo/*` | Many look useful, but should be reviewed and grouped by SEO/GEO strategy topic. |
| `docs/product/*` | Product docs look useful; check for private user/customer details before committing. |
| `docs/social/*` | May contain platform-ready drafts; check for tone, account context, and privacy. |
| `docs/marketing/*` | Check whether these are execution logs or strategy docs before committing. |

## Recommended Cleanup Order

1. Spanish pilot group: commit or discard `/es/buyer-guides/**`, related English hreflang, `scripts/build-static-site.mjs`, and `scripts/verify-static-hosting.mjs` together.
2. Project rules/context group: decide whether to commit `AGENTS.md` and `PROJECT_*` files. If yes, make one scoped docs/rules commit.
3. Ignore/delete generated artifacts: update `.gitignore` for `_tmp_*`, generated video/audio/output folders, and excluded Field Materials images, then delete local temp files after confirmation.
4. Strategy/status docs: review and commit useful docs in small topic groups: status, AI strategy, SEO/GEO, product, site audits.
5. Experimental scripts/video group: keep local or move out of repo unless there is a clear production use.
6. Marketing/social logs: review for privacy and decide whether logs belong in git.
