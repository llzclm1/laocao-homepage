# Gewuji Codex Working Rules

这些规则用于减少无关改动和混合提交。简单任务优先按用户当轮指令执行，不为了读上下文而阻塞。

## Context

- For non-trivial site, SEO, product, or multi-file changes, review relevant project context files if present:
  - `PROJECT_CONTEXT.md`
  - `PROJECT_DECISIONS.md`
  - `PROJECT_STATUS.md`
- For scoped tasks, inspect only files relevant to the requested change.
- If expected files are missing, report clearly before making risky assumptions.
- Treat `CODEX_HANDOFF.md` as local working context. Do not require it by default and do not commit it unless explicitly requested.

## Git Discipline

- Run `git status` before staging.
- Keep commits scoped to the user-approved files and hunks.
- Use `git add -p` when a file contains unrelated changes.
- Never stage unrelated dirty or untracked files.
- Never commit unless explicitly requested.
- Never push unless explicitly requested.

## Protected Surfaces

Do not touch these unless the user explicitly asks:

- `sitemap.xml`
- `robots.txt`
- canonical tags
- URLs
- unrelated uncommitted files
- old project / lab / tools pages
- `CODEX_HANDOFF.md`

## Project Boundary

Gewuji is:

- Factory Bridge
- Supplier Reply Review
- buyer communication support
- factory material communication support

Gewuji is not:

- supplier verification
- factory audit
- legal due diligence
- quality inspection
- supplier reliability guarantee
- payment safety guarantee
- supplier scoring

Use language like:

- visible signal
- communication signal
- information gap
- unclear terms
- next questions
- field material

Avoid language like:

- verified supplier
- audited factory
- safe supplier
- reliable supplier guarantee
- payment safe
- risk-free sourcing

## Site Style

- Keep the site static and low-dependency.
- Prefer small, reversible HTML/CSS/content changes.
- Do not add new frameworks or build complexity for one-off work.
- Match the existing visual direction: silver industrial, premium B2B, Factory Bridge.
- Avoid old foreign trade marketing style and generic AI SaaS dashboard style.

## External Publishing

Do not publish, reply, DM, follow, like, or change account profiles unless the current user request explicitly authorizes that platform and action.

Drafting and research are fine when requested, but public actions need explicit current-turn approval.
