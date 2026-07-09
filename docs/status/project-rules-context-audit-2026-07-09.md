# Project Rules and Context Audit

本报告用于判断 `AGENTS.md`、`PROJECT_*` 和现有 handoff 文件哪些适合进入仓库，哪些应保留本地或重写后再提交。

## Overall Decision

Split

建议拆成三类处理：

- `AGENTS.md`：可提交，但先软化过强规则，保留 repo-safe 的 scoped commit、安全边界和项目定位规则。
- `PROJECT_CONTEXT.md` / `PROJECT_DECISIONS.md` / `PROJECT_STATUS.md`：可提交，但先做小范围更新，移除“本次记忆层任务”这类临时表述，并更新到 2026-07-09 当前状态。
- `CODEX_HANDOFF.md`：不建议继续作为 repo 级入口文件提交或强制读取；内容太长、过期、含个人路径、账号、外部发布链接和历史操作细节，应转为 local-only 或归档重写。

## File Inventory

| File | Exists | Current Status | Privacy Risk | Freshness Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | Yes | Modified tracked file | Medium | Medium | Commit after cleanup |
| `PROJECT_CONTEXT.md` | Yes | Untracked | Low | Medium | Commit after cleanup |
| `PROJECT_DECISIONS.md` | Yes | Untracked | Low | Medium | Commit after cleanup |
| `PROJECT_STATUS.md` | Yes | Untracked | Low | Medium | Commit after cleanup |
| `CODEX_HANDOFF.md` | Yes | Tracked, currently clean | High | High | Keep local only or rewrite |

## AGENTS.md Review

`AGENTS.md` 当前新增了一段有用的项目规则：

- commit / push 必须显式确认。
- 提交前检查 `git status`、`git diff --name-only`、staged 文件。
- 不主动修改 `sitemap.xml`、`robots.txt`、canonical、URL、旧项目页面和无关 dirty 文件。
- 明确 Gewuji 是 Factory Bridge + Supplier Reply Review，不是 verification / audit / inspection / guarantee。

但当前版本规则偏硬：

- “Before starting any task, read PROJECT_CONTEXT / PROJECT_DECISIONS / PROJECT_STATUS / CODEX_HANDOFF” 对简单任务过重。
- “If any missing, report before continuing” 容易阻塞小任务。
- 强制读取 `CODEX_HANDOFF.md` 风险很高，因为该文件过长、过期、含大量历史社媒操作。
- 海外社媒规则中“内容在项目边界内时，可以直接写入并发布”不适合作为长期 repo 默认规则；对外发布应默认人工确认或按用户当轮明确授权。
- 浏览器规则写死 Safari，与当前 Codex 内置浏览器 / browser-act 规则不完全一致，容易冲突。

建议软化为：

- “If present and relevant, read PROJECT_CONTEXT / PROJECT_DECISIONS / PROJECT_STATUS before broad strategy or multi-file work.”
- “Do not require CODEX_HANDOFF.md by default.”
- “For simple scoped tasks, follow the user’s current instructions first.”
- “External publishing requires explicit current-turn approval unless the user has just authorized that platform/action.”

## PROJECT_* Review

`PROJECT_CONTEXT.md` 内容整体适合作为 repo-safe 项目上下文：

- 项目定位清楚。
- 用户画像和商业模式清楚。
- 边界表达正确。
- 没有发现密钥、cookie、token、客户名或具体订单隐私。

需要 cleanup 的点：

- “本次记忆层任务只新增 / 更新...” 是临时任务痕迹，不适合作为长期项目上下文。
- 已完成内容需要补到 2026-07-09：旧项目 archive、Field Materials 实拍图、Spanish pilot、llms.txt Markdown、broken links 等近期提交状态。

`PROJECT_DECISIONS.md` 内容整体适合作为 repo-safe 决策记录：

- Factory Bridge + Supplier Reply Review 的边界清楚。
- 不做 verification / audit / inspection / SaaS 的理由清楚。
- AI 辅助方向的边界合理。

需要 cleanup 的点：

- “旧 game / tools / Lab 页面保留但降权，不大规模删除、不急着 noindex” 已被后续 legacy archive / noindex 方向覆盖，需要更新。
- “不手改 sitemap” 应改为“优先通过 build 脚本控制 sitemap；手改前必须确认来源和范围”。

`PROJECT_STATUS.md` 内容可作为短期状态文件：

- 当前阶段和目标清楚。
- 风险、暂停事项、下一步计划有用。

需要 cleanup 的点：

- 更新时间是 2026-07-08，应更新到 2026-07-09。
- “旧 game / KPI / Blue Prince” 风险表述应同步为旧项目已做 archive/noindex，但 GSC/Semrush 可能仍显示一段时间。
- 应补充 Spanish pilot 已上线、Field Materials 实拍图已提交、whitehat distribution playbook 已新增或仍待提交的真实状态。

## Privacy Notes

没有在 `PROJECT_CONTEXT.md`、`PROJECT_DECISIONS.md`、`PROJECT_STATUS.md` 中发现明显密钥、token、cookie、客户名或订单隐私。

`CODEX_HANDOFF.md` 风险较高，包含：

- 本地个人路径：如 `/Users/caocao/Documents/我的主页`、`/Users/caocao/Documents/工厂桥梁`。
- 社媒账号/用户名：如 Reddit 账号、X 链接、Quora 作者链接。
- 多个平台的发布链接、互动记录、私信/通知状态。
- 外部账号包装、发布节奏和浏览器操作历史。

这些内容不适合作为公开 repo 的默认上下文。

## Outdated Notes

过期或容易误导的内容：

- `CODEX_HANDOFF.md` 中大量 2026-06-29 到 2026-07-07 的社媒发布、YouTube、旧 game / tools、Godot POC、外链执行记录，已经不适合作为当前主线入口。
- `PROJECT_STATUS.md` 仍写 2026-07-08，缺少 2026-07-09 的 Spanish pilot、Field Materials、legacy archive、broken links 等提交状态。
- `PROJECT_DECISIONS.md` 中旧项目处理策略需要从“保留但降权、不急 noindex”更新为“legacy archive + noindex + 移出主 discovery surfaces”。
- `AGENTS.md` 中强制读取 `CODEX_HANDOFF.md` 会把过期历史重新带入每个任务。

## Recommended Repo-Safe Version

适合提交到 repo 的内容：

- 精简版 `AGENTS.md`：
  - scoped commit / no push unless asked
  - 不碰 sitemap / robots / canonical / URL，除非用户明确允许
  - 不碰无关 dirty
  - Gewuji 定位和边界
  - 文档默认中文，英文 SEO 页面按页面语境写
  - simple task 不强制读长文档

- `PROJECT_CONTEXT.md`：
  - 项目定位
  - 用户画像
  - 商业模式
  - 页面结构
  - 服务边界
  - 当前增长/SEO 主线

- `PROJECT_DECISIONS.md`：
  - 不做 verification / audit / inspection / legal due diligence / payment guarantee 的原因
  - 旧项目 archive 处理原则
  - Spanish pilot 小语种策略
  - 外部分发白帽边界

- `PROJECT_STATUS.md`：
  - 当前日期状态
  - 已完成提交
  - 当前 dirty 分组
  - 下一步优先级

## Recommended Local-Only Content

不应进入 repo 或不应作为默认必读：

- 具体社媒账号名、个人主页链接、发布链接、私信/通知状态。
- 本地机器绝对路径。
- 外部平台操作历史和每日回访细节。
- 大量已过期 handoff timeline。
- 临时实验、YouTube / video render 输出、截图、contact sheet、未确认图片。

`CODEX_HANDOFF.md` 建议改为 local-only 或重写成极短 handoff，仅保留当前主线和最近 3-5 个决策。

## Suggested Cleanup Plan

A. 软化 `AGENTS.md` 后提交

- 把 “Always Read First” 改为 “Read if present and relevant”。
- 移除默认强制读取 `CODEX_HANDOFF.md`。
- 保留 scoped commit、安全边界、定位边界。
- 外部发布规则改为需要当前任务明确授权。

B. 更新 `PROJECT_CONTEXT` / `PROJECT_DECISIONS` / `PROJECT_STATUS` 后提交

- 清理临时任务措辞。
- 更新日期和已完成状态到 2026-07-09。
- 同步 legacy archive、Spanish pilot、Field Materials、broken links、llms.txt 等近期结果。

C. 保留本地并加入 `.gitignore`

- 如果不想维护 repo 级上下文，则把 `PROJECT_CONTEXT.md`、`PROJECT_DECISIONS.md`、`PROJECT_STATUS.md` 加入 `.gitignore`。
- `CODEX_HANDOFF.md` 如果继续保留个人操作记录，也建议加入 `.gitignore` 或迁移到本地私有笔记。

D. 删除过期文件

- 不建议立即删除 `CODEX_HANDOFF.md`，因为它是 tracked 文件且可能仍有历史价值。
- 推荐先生成精简替代版，再决定是否删除或从 repo 移出。

## Suggested Next Codex Task

建议下一步先做最小执行：

只修改 `AGENTS.md`，软化规则后做 scoped commit。

允许范围：

- `AGENTS.md`

目标：

- 保留 scoped commit / no push unless asked / no unrelated dirty / Gewuji boundary。
- 删除或软化强制读取 `PROJECT_*` 和 `CODEX_HANDOFF.md`。
- 删除过强的社媒自动发布规则，改成当前任务明确授权才执行。
- 不处理 `PROJECT_*`，不处理 `CODEX_HANDOFF.md`，不处理 `.gitignore`。
