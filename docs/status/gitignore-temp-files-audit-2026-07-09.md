# Gitignore and Temporary Files Audit

本报告用于判断当前剩余 dirty / untracked 文件中，哪些应进入 `.gitignore`、哪些应本地删除、哪些应保留本地、哪些应后续分组提交。

## Overall Decision

Needs scoped cleanup before any more mixed commits.

建议下一步先做一个很小的 `.gitignore` hygiene commit，只处理明确的临时文件和渲染产物规则；随后再删除本地临时文件和排除图片。不要把 docs、scripts、assets 一次性打包提交。

## Current Dirty / Untracked Summary

当前 `main` 已与 `origin/main` 同步，但 worktree 仍有混合 dirty：

- Modified tracked files: `.gitignore`, `CODEX_HANDOFF.md`, `buyer-guides/index.html`, `data/marketing/social-outreach-log.csv`, `docs/promotion/overseas-posting-log.md`, `docs/promotion/reddit-followup-tracker.md`, `llms.txt`, `scripts/verify-static-hosting.mjs`
- Root temp contact sheets: `_tmp_*`
- Field Materials excluded images: 4 files still present
- Untracked design audit screenshots and contact sheets
- Untracked strategy / SEO / social / product docs
- Untracked YouTube / video scripts and render outputs
- Untracked Remotion renderer directory
- Untracked home hero assets
- Untracked local skill/template files

## Files Recommended for .gitignore

| Pattern or File | Reason | Risk |
| --- | --- | --- |
| `_tmp_*` | Root contact sheets and OCR/text scratch files; not source content. | Low; only if future intentional files avoid this prefix. |
| `.codex-exec/` | Local execution and render scratch directory with contact sheets and segment videos. | Low; should not be committed. |
| `scripts/content/**/output/` | Generated video/audio/render output folders. | Medium; if a future package intentionally stores hand-authored source under `output/`, use an exception. |
| `scripts/content/**/preview*/` | Generated preview frames and contact sheets. | Low; generated artifacts. |
| `scripts/content/**/thumbnails*/` | Generated thumbnail frames. | Medium; final selected thumbnails may need a separate production asset path. |
| `scripts/content/**/*.mp4` | Rendered videos are large generated binaries. | Low for repo; high only if a final video must be released from repo, which is not current strategy. |
| `scripts/content/**/*.mp3` | Generated voiceover files. | Low; generated binaries. |
| `scripts/content/**/voiceover*.json` | TTS summaries and generation metadata. | Low; generated. |
| `scripts/video/remotion-renderer/node_modules/` | Dependency output if created later. | Low; standard ignore. |
| `scripts/video/remotion-renderer/out/` | Future Remotion render output. | Low. |
| `field-materials/field-real-carton-labeling-area.jpg` | Previously rejected Field Materials image with visible watermark risk. | Low; exact file ignore avoids broad image ignore. |
| `field-materials/field-real-sample-room-video.jpg` | Previously rejected duplicate / not used image. | Low. |
| `field-materials/field-real-surface-finishing-line.jpg` | Previously rejected semantic mismatch image. | Low. |
| `field-materials/field-real-clean-sample-box.jpg` | Previously rejected duplicate-feeling / not page-fit image. | Low. |

## Files Recommended for Local Delete

| File | Reason | Safe to Delete? |
| --- | --- | --- |
| `_tmp_*` root files | Temporary contact sheets and text extraction scratch files. | Yes, after confirming no pending manual review depends on them. |
| `.codex-exec/` render scratch directories | Generated intermediate frames, contact sheets, and segment videos. | Yes, if no current render debugging is active. |
| `field-materials/field-real-carton-labeling-area.jpg` | Excluded due to visible watermark risk. | Yes, or move to local archive. |
| `field-materials/field-real-sample-room-video.jpg` | Excluded due to duplicate sample-room usage. | Yes, or move to local archive. |
| `field-materials/field-real-surface-finishing-line.jpg` | Excluded due to semantic mismatch. | Yes, or move to local archive. |
| `field-materials/field-real-clean-sample-box.jpg` | Excluded due to duplicate / weak fit. | Yes, or move to local archive. |
| Generated `scripts/content/**/output/` media | Large generated video, audio, preview, and thumbnail artifacts. | Yes, if final exports are backed up outside repo. |

## Files Recommended to Keep Local Only

| File | Reason |
| --- | --- |
| `CODEX_HANDOFF.md` | Contains local-only operational context, historical platform activity, links, and machine-specific details. Do not commit further changes as repo context. |
| `scripts/content/youtube-*` render run directories | Experimental generated content and media outputs; useful for local review but too large/noisy for repo. |
| `scripts/video/remotion-renderer/` | Experimental video rendering workspace; may become a separate scoped project later, but not with current mixed dirty state. |
| `docs/design-audit/*.png`, `docs/design-audit/*.jpg`, `docs/design-audit/*.gif` | Visual QA screenshots/contact sheets; many are temporary evidence, not site content. Keep local unless a specific audit report needs one. |
| `assets/home/hero-industrial-bright-premium.png`, `assets/home/hero-industrial-cinematic-dark.png` | Candidate hero assets; keep local until a page actually uses them. |

## Files Recommended for Later Scoped Commit

| File or Group | Suggested Commit Scope |
| --- | --- |
| `.gitignore` | Commit only temp/render/output ignore patterns after review. |
| `docs/status/gewuji-fast-validation-strategy-2026-07.md`, `docs/status/gewuji-validation-phase-plan-2026-07.md` | Status / validation docs scoped commit. |
| `docs/strategy/*` untracked strategy docs | Strategy docs scoped commits, one topic at a time. |
| `docs/seo/*` untracked SEO/GEO docs | SEO/GEO docs scoped commits by topic. |
| `docs/social/*` untracked social drafts | Social drafts scoped commit only if they are final, not platform logs. |
| `docs/product/*` untracked product docs | Product/Supplier Reply Review docs scoped commit. |
| `data/marketing/external-geo-feedback-log.csv` | Data tracking scoped commit if it is intended as repo-visible tracking. |
| `templates/geo-buyer-question-template.md`, `templates/supplier-reply-review-workflow-template.md` | Template docs scoped commit after content review. |
| `skills/gewuji-site-audit-skill/*` | Commit only if this repo should own the skill; otherwise keep local. |

## .gitignore Review

Current `.gitignore` dirty hunk:

```gitignore
# Local YouTube POC render outputs
scripts/content/youtube-poc-*/output/
scripts/content/youtube-poc-*/output-v*/
```

Assessment:

- Safe but too narrow for current dirty state.
- It will not ignore the largest current output groups such as `scripts/content/youtube-delivery-risk-01/output/`, `scripts/content/youtube-long-*/output/`, `scripts/content/youtube-agent-saas-run-01/output/`, or `scripts/video/`.
- It does not risk hiding site pages, docs, or production assets.
- It should be expanded in a scoped `.gitignore` commit, not mixed with docs or page changes.

## Field Materials Excluded Image Review

All four previously excluded images still exist in the worktree:

| File | Prior Reason | Recommendation |
| --- | --- | --- |
| `field-materials/field-real-carton-labeling-area.jpg` | Watermark risk. | Local delete or move to local archive; exact ignore if retained. |
| `field-materials/field-real-sample-room-video.jpg` | Duplicate / not used. | Local delete or move to local archive; exact ignore if retained. |
| `field-materials/field-real-surface-finishing-line.jpg` | Semantic mismatch. | Local delete or move to local archive; exact ignore if retained. |
| `field-materials/field-real-clean-sample-box.jpg` | Duplicate-feeling / weak page fit. | Local delete or move to local archive; exact ignore if retained. |

Do not commit these images.

## CODEX_HANDOFF.md Recommendation

`CODEX_HANDOFF.md` should be treated as local-only.

Recommendation:

- Do not stage current modifications.
- Do not commit future modifications unless rewritten into a short repo-safe handoff.
- Prefer adding `CODEX_HANDOFF.md` to `.gitignore` only after deciding how to handle the already tracked file. Since it is tracked, `.gitignore` alone will not stop tracked modifications from appearing.
- If the goal is to keep it private, use a separate cleanup task to either restore it to repo-safe tracked content or remove it from tracking with explicit approval.

## Risks

- A broad ignore like `docs/**/*.png` could hide audit evidence that may occasionally be worth committing.
- A broad ignore like `assets/**/*.png` could hide real production assets.
- A broad ignore like `scripts/content/**` could hide source scripts and templates that may be worth reviewing later.
- `CODEX_HANDOFF.md` is tracked; ignoring it does not solve tracked modifications.
- Large video outputs can bloat the repo if accidentally committed.
- Some untracked strategy / SEO / product docs may be valuable, so deletion should be limited to obvious generated artifacts and rejected images.

## Suggested Next Codex Task

Next smallest task:

Update `.gitignore` only, with scoped patterns for root `_tmp_*`, `.codex-exec/`, generated video/audio outputs, and the four exact rejected Field Materials images. Do not delete files in the same task.
