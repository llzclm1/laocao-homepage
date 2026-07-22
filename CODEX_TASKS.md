# CODEX_TASKS

## 2026-07-21 Growth OS v2 Dashboard UI/UX

- [x] 将 Dashboard 改为操作台布局：Header KPI、Today、Review Queue、Ready to Publish、Published、Performance、System Health。
- [x] 完成 Review Queue 紧凑化、详情折叠、类型筛选、默认隐藏低价值类型、排序和加载更多。
- [x] 完成 Published 紧凑表格与默认折叠 System Health；未修改 v2 API、SQLite、Lifecycle、Unified View、Scheduler 或 Cutover。
- [x] 完成浏览器实际验收与 12 项 v2 核心/迁移/生产适配测试。

## 2026-07-20 Growth OS Publishing Pipeline P0

- [x] Reply Opportunity 与 Original Post 共享 `pending_review → approved → ready_to_publish → published → archived` 状态；不新增第二审核队列或数据库。
- [x] 待审核仅统计 `pending_review`；审核通过项可进入 Ready To Publish，待发布最多 5 条，最近发布最多 10 条。
- [x] Morning Brief 优先 Ready To Publish；没有真实待发布项时允许 Today Actions 少于 3 项，不用旧草稿或 Discovery Task 补位。
- [x] Published 预留 views、clicks、comments、likes、CTR，不采集也不伪造表现。
- [ ] 真实人工审核至少一项后，观察 Ready To Publish 与 Published 回流是否符合日常操作。

## 2026-07-20 Growth OS Phase 2.5 Signal Engine P0

- [x] 将采集、事实、业务信号和 Brief 分层；未修改现有 Collector、数据源、端口或外部账号操作。
- [x] 增加事件式 Signal 结构、`Detected → Confirmed → Consumed → Archived` 生命周期，以及按 `normalized_key` 的证据合并去重。
- [x] 首批实现 GSC 首次查询、高意图查询、首次页面展示、Buyer Guide 首次展示和 Supplier Reply Review 首次点击信号；Games 不进入 Factory Bridge 信号。
- [x] Morning Brief 读取 `signals-latest.json`，首页增加折叠式 Growth Signals 摘要；无实时 GSC 时不生成搜索信号。
- [x] 通过 39 项相关测试、Dashboard 脚本语法检查和本次改动范围的 `git diff --check`；未提交或推送。
- [ ] Social Signals 暂不实现，等待连续、可比较的社交快照。

## 2026-07-19 SEO P0 页面信号收拢

- [x] Checklist 定位收拢为 China Supplier Information Checklist Before Payment，保留原 URL 和下载文件路径。
- [x] 核对 `/for-buyers/` 品牌与 self-canonical；未发现旧 CFB 或额外范围冲突。
- [x] 验证 quotation comparison 锚文本已指向 `/buyer-guides/compare-chinese-supplier-quotations-beyond-price/`。
- [x] XML sitemap 移除 `llms.txt` 与 `ai-sitemap.json`，文件仍保持可访问。
- [ ] P1 真实证据型内容与 P2 外部分发未开始。

## 2026-07-19 SEO P1 核心入口 CTA 收口

- [x] Buyer Guides 首页主 CTA 直达 Supplier Reply Review，次级入口直达 Sample Report。
- [x] 样品前问题、付款前检查、报价比较页面保留 Review / Sample Report / Examples 的可达路径。
- [x] 报价比较页补充 Supplier Reply Review Examples 入口；未改 URL、canonical、robots 或 sitemap。
- [x] Supplier Reply Review 已具备直接答案、匿名示例、案例入口和主 CTA。

## 2026-07-17 GROWTH-006 Social Collector P0

- [x] 新增只读 LinkedIn/Quora 浏览器采集，复用 Growth OS 专用 Chrome 登录态；不发布、不点赞、不回复、不关注，不保存密码、Cookie 或页面快照。
- [x] 每个平台独立会话、15 秒硬超时；社交阶段顺序执行且总预算不超过 35 秒，单个平台失败不阻塞另一平台或 Morning Collector 后续来源。
- [x] 写入 `data/growth-os/runtime/social-collector-latest.json`，记录状态、来源 URL、耗时、可见指标、缺失指标和无快照诊断。
- [x] 首页增加 LinkedIn/Quora 社交摘要与同页展开详情；社交失败不进入今日前三任务。
- [x] 两次独立 Social Collector 运行、一次 Morning Collector 整轮、14 项测试和 Phase A 发现测试通过；运行后无残留浏览器会话。
- [ ] X、Medium、Substack 延后到 LinkedIn/Quora 稳定验证后再评估。

## 2026-07-18 Morning Collector 状态口径修复

- [x] 将来源状态统一为 `live`、`cached`、`manual`、`unavailable`、`permission_required`；仅 `live` 计入本轮实时采集。
- [x] 将重复的 Chrome / Browser Act `230404 Operation not permitted` 合并为一个“Chrome 权限未授权”根因和一个授权任务。
- [x] Dashboard 默认显示可读状态与分类数量，原始技术错误移入折叠详情；未提交或推送。

## 2026-07-18 Morning Collector Chrome → Safari 降级适配

- [x] 增加最小 Browser Adapter：Chrome 保持现有 Browser Act 命令面，Safari 使用本机 Safari WebDriver 作为备用适配器。
- [x] Chrome 权限、未运行或连接失败时尝试 Safari；Dashboard 显示降级状态和适配器来源，不改变来源状态模型。
- [x] 通过 22 项 Morning/Social/Adapter 测试；真实运行本次 Chrome 已恢复并采集 3 个实时来源，Safari 降级路径已用测试注入验证，未提交或推送。

## 2026-07-17 GROWTH-005 First Qualified Buyer Submission 工作台优先级

- [x] 今日前三项优先展示审核、发布、回复等业务动作；数据查看仅作不足三项时的补位。
- [x] 顶部固定目标 `First Qualified Buyer Submission`，并显示今日完成度 `完成 X / 3`。
- [x] 将“开始今天”改为“开始采集”；采集完成后显示“重新采集”。
- [x] 网站数据摘要改为站点、Google、真实访问、异常四类结论；保留详细数据折叠区。
- [x] 完成度使用浏览器本地当日状态，不新增服务、API、路由或状态文件。
- [x] 通过内联脚本语法检查、`git diff --check` 和 8787 页面静态入口验证。

## 2026-07-16 GROWTH-004 Morning Collector

- [x] 审计现有 Runtime、8787 服务、Chrome Direct 登录态和 Growth OS 数据目录。
- [x] 首页增加“开始今天”，按固定八来源顺序执行只读采集并写入 `data/growth-os/runtime/`。
- [x] 复用现有本地 GEO、社交与转化记录；所有来源记录 URL/路径、更新时间、实时性和阻塞原因。
- [x] 最近采集结果与三项建议回显到现有今日工作台和数据折叠区。
- [x] 验证 Cloudflare、GSC、Clarity、Semrush 登录可用；Chrome 控制权限未确认时正确记录 `blocked`。

## 2026-07-16 GROWTH-003 今日工作台 P0

- [x] 首页默认只展示 3 个今日任务、待审核/待发布/外部信号摘要和网站与渠道数据摘要。
- [x] 审核、发布、外部信号与数据详情改为同页默认折叠、互斥展开，并提供返回今日任务入口。
- [x] 复用 Cloudflare、Analytics、GSC 与本地异常扫描文件，明确标记手动导入、来源与更新时间。
- [x] 浏览器验证原有审核、发布、外部信号和数据查看操作仍可完成。

## 2026-07-16 GROWTH-002 增长运营中心单一入口

- [x] 确认实际服务为 `scripts/growth-os/local-dashboard-server.mjs`，默认监听 `127.0.0.1:8787`。
- [x] 固定启动命令 `npm run growth:dashboard` 和唯一日常入口 `http://127.0.0.1:8787/growth-os/`。
- [x] 验证首页到今日任务、审核、发布和数据四条锚点路径均可达。

## 2026-07-17 GROWTH-006 Morning Collector Clarity 隔离

- [x] 为 Microsoft Clarity 使用独立浏览器会话，工作预算 13 秒、关闭预算 2 秒，总时长上限 15 秒。
- [x] 增加 `clarity_opened`、`clarity_waiting`、`clarity_scrolling`、`clarity_extracted`、`clarity_timeout`、`clarity_closed` 阶段诊断；解析失败不再进入今日前三任务。
- [x] 连续 3 次完整运行均继续完成 Semrush 与其余来源；Clarity 页面/会话在回归后已清理，无残留会话。

## 2026-07-18 Growth OS Dashboard P0 UX 收紧

- [x] Morning Collector 顶部改为紧凑状态行，保留实时、缓存、人工和未采集数量；今日前三业务任务仍为主层级。
- [x] 社交摘要移除 `Unknown`，改为“暂无实时数据 / 等待下次同步”；网站与渠道详细数据默认折叠，点击后仍可查看原始指标和技术详情。
- [x] 将 GSC、Semrush、GEO、Website conversion 等关键字段翻译为运营语言；未改采集逻辑、路由、API 或外部账号操作。

## 2026-07-18 X 相关性过滤

- [x] X 候选只保留中国采购、供应商沟通、工厂、报价、样品、MOQ、付款、交期等项目相关信号。
- [x] Vibe Coding、AI builder、Build in Public 等无项目相关信号的 X 内容不再进入候选或 Dashboard；LinkedIn、Quora 和其他平台不变。

## 2026-07-20 X AI 内容排除

- [x] 排除 X 上与 Factory Bridge 无关的 AI、Codex、Vibe Coding、LLM、GPT、自动化和 workflow 内容；不改变 LinkedIn、Quora 或其他平台规则。

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

## 2026-07-20 Today Actions 与 Review Queue 对齐

- [x] Today Actions 的“审核”任务仅从 `data/social-agent/view.json` 的真实 Review Queue 生成。
- [x] `data/growth-os/viewer/dashboard-view.json` 的 `opportunities` 不再直接生成“审核”；明确内容计划仅标记为“建议创作”。
- [x] Review Queue 为空时允许 Today Actions 少于 3 项，未凑数生成审核任务；补充 Morning Brief 回归测试。

## 2026-07-20 平台优先级

- [x] Today Actions、Morning Brief 与 Review Queue 默认顺序已调整为 SEO/GEO、LinkedIn、Quora、Email/Lead、LinkedIn 原创、Reddit。
- [x] Reddit 作为低频备用来源保留在审核队列；没有高价值帖子时不影响 Today Actions。

## 2026-07-20 Opportunity 数量策略

- [x] Today Actions 最多 3 项，SEO/GEO 最多 2 项；空缺不再用 Discovery Task 或网站状态占位填充。
- [x] Review Queue 限制为回复 20 条、原创 10 条；Dashboard 显示分组计数，最近完成最多显示 10 条。
- [x] LinkedIn、Quora 每日回复上限为 2，Reddit 为 1；不要求每天每个平台都有动作。
- [x] 自动原创草稿最多 1 条 LinkedIn；X 在无现有证据型生成器时允许为 0。

## 2026-07-20 Growth OS 全链路修复

- [x] Morning Brief 过滤已进入 Social Agent 生命周期的旧 Dashboard 计划，避免 approved / ready_to_publish / published 内容重复进入 Today Actions。
- [x] 发布状态必须记录公开 HTTPS 链接；Dashboard 发布按钮改为先要求填写链接，Review Queue 同步保存 `published_url`。
- [x] Reply Opportunity 在待发布阶段显示“标记已回复”，自动复用已知原帖链接，不要求重复输入；Original Post 仍要求人工填写实际发布链接。
- [x] Leads 增加统一只读读取入口，Dashboard 同时读取转化 CSV 与 `buyer-signals.jsonl`，手工事件补充 `captured_at`、`input_mode`、`source_status`。
- [x] 定时 Discovery 完成后同步刷新 Signals 与 Morning Brief；公开搜索 HTTP 202 挑战明确标记为 blocked，不再伪装为无结果。
- [x] scheduled Discovery 默认在同一轮刷新 Morning Collector、Signals 与 Morning Brief；可用 `--skip-morning-collector` 保留仅 Discovery 的降级运行。
- [x] 增加 Brief、Social Agent、Provider 回归测试；未提交、未推送。
- [x] 审核通过后可直接标记“已发布/已回复”，记录完成证据并自动归档隐藏；不再先把内容移动到 Ready To Publish。
- [x] Ready To Publish 只显示主动生成的 `original_post`；回复机会改在待审核/待回复区处理，不再混入待发布列表。
- [x] Dashboard 增加“生成今日内容”按钮，执行现有 Discovery → Social Agent → Review Queue → Morning Brief 链路，生成当前真实候选的回复机会与原创发帖草稿；不执行外部发布或回复。
- [x] 将用户提供的 20 个 Factory Bridge 关键词写入 Social Agent 关键词源，并让公开搜索查询轮换使用完整关键词列表。
- [x] “生成今日内容”状态改为同时显示当前回复机会、原创发帖数量和本轮新增发现，避免把“新增 0”误读为没有生成内容。

## 2026-07-21 Growth OS v2 Content Work Item

- [x] 建立 typed `content_items` Source of Truth 与 `ContentStore`，支持原始内容、回复草稿、发布草稿和不可变已发布正文。
- [x] Unified View 返回 typed content，Dashboard 增加现有布局内的 Work Item 编辑、版本保存、复制和发布事实展示。
- [x] 完成生产备份与一次性内容迁移；状态与生命周期数量不变，Growth OS v2 测试 24/24 通过。
- [x] Content Layer 纵向验收：Today 与 Review Queue 复用同一 `renderWorkItem`，补齐原文、来源、推荐理由、分类、回复/发布草稿状态；Ready 强制要求 Reply Draft 与 Publish Draft。

## 2026-07-21 生产 Content Layer Completion

- [x] 新增受控 Content Completion 工具，所有写入经 `ContentStore`，不修改 Lifecycle、Unified View、Dashboard、Discovery 或 Scheduler。
- [x] 生产补齐 12 条 Reply Draft、21 条 Publish Draft；生产状态、Opportunity 数量和 Lifecycle Event 数量保持不变。
- [x] 生产备份与完成报告已保存；临时库端到端验证通过；历史 Published 正文无法明确恢复的 4 条保持缺失，不伪造。
- [ ] 后续需人工确认生成草稿并决定是否发布；不要把生成的 Publish Draft 视为已发布正文。

## 2026-07-22 Growth OS v2 Content Integrity Gates

- [x] Lifecycle 在 Approve、Ready 和 Published 前统一校验 original_content、reply_draft、publish_draft、platform、source_url 及草稿关联。
- [x] Discovery 拒绝 snippet/footer/短正文；完整正文入队前同步完成 Reply Draft 与 Publish Draft，写入统一 ContentStore。
- [x] Content Completion 与迁移不再使用 snippet 伪装原文；明显语义错配或歧义旧草稿跳过，不自动补入生产内容。
- [x] 临时数据库门禁与端到端测试通过 35/35；生产 SQLite 使用只读连接审计，未发生变化。
- [ ] 生产只读审计显示 25 条活动记录会被新门禁阻止（含 4 条历史 Published 正文缺失）；等待人工决定内容修复，不自动修改生产数据。

## 2026-07-22 Production Bug Audit 修复

- [x] Dashboard 操作按钮改为读取 Unified View 的统一 Content Integrity 结果；缺失/无效内容不再显示 Approve、Ready 或 Published 操作。
- [x] 健康状态同时检查活动内容和已发布正文；生产异常显示 Warning，并暴露 `content_repair_required` 及原因。
- [x] Unified View 补充平台、relevance score、分类和原因；修复 DOM 重复 ID 与通用 actor 默认值。
- [x] Discovery 默认加入 X 查询，支持 x.com/twitter.com status URL；新捕获原文清理 Reddit footer，旧异常不自动改写。
- [x] 临时库 v2 测试通过 38/38；生产库未写入，Dashboard 进程已重载并完成 API/DOM 契约复核。
- [x] Social Workspace 与 Growth OS 全量回归通过 59/59；生产 SQLite SHA-256 指纹重载前后保持 `34a7bf35bfbdcb5ab936493a4e71b13b50ea516936b8a723851918a6540ea0b9`。

## 2026-07-22 Operator Workspace 最后一次产品尝试

- [x] 首页主视图改为 `Today’s Work`，最多展示 5 条内容完整且可以立即行动的 Work Item。
- [x] Today 只选择有效的 `pending_review` 与 `ready_to_publish`；`approved` 留在二级工作区，`published`、`archived` 不进入首页。
- [x] Today 按 Ready 优先、relevance score、最近活动时间排序；审核完成后记录离开 Today，下一条工作项补位。
- [x] 全量 Review Queue、Approved、Ready、Published、Performance、System Health 收入默认折叠的“其他工作区”，保留原有 v2 数据和操作入口。
- [x] 未修改数据库、Lifecycle、Discovery、Scheduler、Performance 或历史记录；真实生产页面 DOM 验收通过，首屏显示 4 条有效工作项且二级工作区默认关闭。
- [x] v2 测试 39/39、Social Workspace 与 Runtime 全量回归 59/59、Dashboard 内联脚本解析通过。
- [ ] 生产候选当前仍以 Reddit 为主，这是本轮明确冻结的 Discovery/数据问题，不在本次首页重组中伪造多平台工作项。
