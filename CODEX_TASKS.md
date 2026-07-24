# CODEX_TASKS

## 2026-07-14 Supplier Reply Review 旧入口 301 收口

- [x] 配置 `/free-supplier-reply-review/` 到 `/supplier-reply-review/` 的 Cloudflare 301。
- [x] 删除旧 HTML 构建输出和 AI Sitemap 条目。
- [x] 验证单跳、query string、目标 canonical 与实体引用。

## 2026-07-14 主站与 Factory 链接边界收口

- [x] 统一主站生产页面导航与 Buyer 入口。
- [x] 将主站 `/for-factories/` canonical 收口到 Factory 最终 URL。
- [x] 确认广告页 noindex，且未进入 sitemap、AI sitemap 或 `llms.txt`。

## 2026-07-13 有效积压总收口

以下分类是当前有效口径；下方历史记录只作追溯，不再自动转为开发任务。

### 已完成

- [x] 复核下一批 LinkedIn、X、Medium、Substack、Facebook 草稿的平台长度、重复主题、事实边界和推广风险；Quora、Reddit 因缺少真实目标 URL 继续暂停。队列见 `docs/social/manual-publish-queue-2026-07-13.md`。
- [x] 修正唯一 X 机会卡建议回复超过 280 字符的问题，并重新生成 Social Agent 视图。
- [x] 审核四篇核心 Buyer Guide（deposit、sample questions、quotation comparison、factory vs trading）、Buyer Guides 索引、`/china-supplier-checklist/`、`/supplier-reply-review/` 的 canonical、schema、内链、CTA、构建发布和站内失效链接。
- [x] 修复 Checklist 缺少 WebPage / BreadcrumbList schema，并增加静态验证断言；其余被审页面未发现需要修改的真实问题。
- [x] 将 Social Content Agent 从 Growth OS 状态机中独立出来：保留 `Keywords → Opportunities → Drafts → Manual Publish`、真实公开 URL、人工审核和 Reddit Trust Building；不再依赖 RSS、搜索候选或旧台账。
- [x] 建立精简人工发布队列：`docs/social/manual-publish-queue-2026-07-13.md`。
- [x] 建立 GSC 28 天基线：13 展示、0 点击、平均排名 15.9，见 `docs/gsc/gsc-28-day-baseline-2026-07-13.md`。
- [x] 本地运行 `npm run build`、`npm run verify:static`、Social Agent Node 检查和差异检查。

### 等待真实数据

- [ ] 2026-08-10 复查 GSC 过去 28 天总览与核心页 query/page；未拿到真实数据前不补数、不扩写、不删页。
- [ ] External GEO、社媒互动、外链、Clarity、AI bot 和已发布内容表现，只在后台真实数据或人工确认后回填。
- [ ] Supplier Reply Review 的提交量、有效对话和转化结果，等待真实使用数据。

### 人工发布

- [ ] 按 `docs/social/manual-publish-queue-2026-07-13.md` 人工审核 LinkedIn、X、Quora、Medium、Substack、Facebook 草稿；本轮只准备，不发布。
- [ ] Reddit 暂无未发布且已核对的真实目标 URL；继续 Trust Building，必须无链接、无品牌、无 CTA、无私信引导。
- [x] 浏览器端页面、真实机会、草稿数量和本地保存接口已完成验证。
- [x] 将轻量 Agent 正式入口固定为 `8790`，避免与仍占用 `8787` 的旧 Growth OS 服务冲突。

### 已取代

- Growth OS Phase B、复杂默认 Growth OS 工作流和自动互动，已由轻量 Social Content Agent 人工闭环取代。
- 旧 Reddit 获客模式（批量候选、追求回复量、带转化目的互动）已由 Reddit Trust Building 取代。
- 更多自动采集器已由“真实公开 URL + 人工审核”口径取代，不继续实现。

### 暂停

- YouTube 扩展、更多视频批次、真实上传和 4 周扩展数据暂停；仅保留已有本地材料。
- 游戏扩展、Godot 替换和新玩法开发暂停。
- Growth OS 新模块、更多连接器、GEO 自动化和其他未验证扩展暂停。
- `$CODEX_HOME/` 仅审计并排除，不纳入仓库处理；归属不明 dirty/untracked 不清理、不提交。

### 当前结论

- 当前没有可继续离线开发的有效积压。
- 后续工作只能由真实数据、真实目标 URL 或用户明确授权的人工发布触发。
- 历史“进行中”和日期记录已移至 `docs/archive/codex-tasks-history-before-2026-07-13.md`，不再自动恢复为任务。

## 2026-07-13 GSC 内容入口

- [x] 将 quotation comparison 与 factory-vs-trading 两篇现有 Buyer Guide 纳入正式构建和索引。
- [x] 将 `/china-supplier-checklist/` 从跳转页改为可直接使用和下载的免费清单。
- [ ] 发布后观察 28 天 GSC 查询词、核心页面展示和自然点击。
- [x] 将 Supplier Reply Review 从不稳定的 mailto 表单改为明确的邮件提交入口。
- [x] 修正 `/free-supplier-reply-review/` 到正式 Review 页面。
- [x] 为 quotation comparison 与 factory-vs-trading 页面补结构化数据和明确转化内链。
- [x] 清理 factory-vs-trading 页面指向未发布文章的 404 链接。

## 2026-07-24 Supplier Reply Review Conversion Funnel P0

- [x] 收口 Supplier Reply Review 首页、Examples 与 Sample Report 的付费 CTA。
- [x] 为 6 篇高意图 Buyer Guides 增加上下文付费 CTA，不全站统一替换。
- [x] 新 CTA 使用 `supplier_reply_check_click`，并同步静态托管校验。
- [ ] 在 GA4 观察 `supplier_reply_check_click` → `payment_page_view` → `submit_page_view`，以真实数据决定下一步。
