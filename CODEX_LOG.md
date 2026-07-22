# CODEX_LOG

## 2026-07-21 Growth OS v2 Dashboard UI/UX

- 将 Growth OS v2 控制台收紧为 Header KPI、Today、Review Queue、Ready to Publish、Published、Performance 和默认折叠的 System Health。
- Review Queue 默认只渲染有限数量的紧凑记录；正文、原始字段和技术细节默认折叠，增加类型筛选、低价值隐藏、排序和加载更多。
- Published 改为紧凑表格；现有 v2 Unified View 读取、Lifecycle 写入路径和生产运行时未修改。
- 浏览器实际验收通过：页面服务正常、默认筛选开启、详情折叠、浏览器控制台无报错、网络仅请求 v2 页面和 Unified View。

## 2026-07-20 Growth OS Publishing Pipeline P0

- 在统一 Social Agent opportunity 投影上补齐 `pending_review → approved → ready_to_publish → published → archived` 生命周期；Reply 与 Original Post 使用同一套状态和本地操作日志，不增加数据库、Collector、Signal Engine 或外部账号操作。
- Dashboard 的待发布区只显示最多 5 条 `ready_to_publish` 项；待审核区只统计 `pending_review`，审核通过项保留在同页等待“准备发布”，最近发布最多显示 10 条。
- Morning Brief 优先显示 `ready_to_publish` 的具体发布动作；没有真实待发布项时，不以旧静态草稿或 Discovery 占位项填充。
- Published 记录保留发布时间、平台、类型、来源、关联链接与 Performance 空字段（views/clicks/comments/likes/CTR）；本轮不采集表现数据。
- 36 项 Social Agent、Morning Brief、Social Collector 测试及 Discovery workspace、Dashboard 内联脚本解析均通过；本地浏览器确认真实候选可查看原帖、复制草稿、审核通过或归档。未提交或推送。

## 2026-07-20 Growth OS Phase 2.5 Signal Engine P0

- 新增 `scripts/growth-os/runtime/signals/`：按 search/content 分类生成事件式业务信号；核心链路为 Fact → Normalize → Merge → Signal → Morning Brief。
- Signal 保留 `status`、`first_seen`、`last_seen`、`times_seen`、`consumed_at`；七天未再出现的历史信号在下一次运行时标记为 `archived`，不新增定时任务。
- GSC 查询与页面信号按 `normalized_key` 合并证据，区分 Factory Bridge、Games、Brand；GSC 不可用时不使用旧缓存伪造实时信号。
- Morning Collector 完成后先写入 `data/growth-os/runtime/signals-latest.json`，Morning Brief 读取该文件；Dashboard 仅增加折叠式 Growth Signals 摘要，不新增路由、数据库、API 或采集器。
- 39 项相关测试、Dashboard 内联脚本语法和本次改动范围差异检查通过；按用户要求不提交、不推送。

## 2026-07-19 SEO P0 页面信号收拢

- 收拢 Checklist 元数据、H1、可下载文本和 Buyer Guides 索引卡片的 verification 口径；未改 URL、301、robots。
- `/for-buyers/` 已通过品牌与 canonical 检查；quotation comparison 锚文本在现有工作树中已正确指向正式页面。
- XML sitemap 生成器与根 sitemap 不再列出 `llms.txt`/`ai-sitemap.json`；机器资源继续由直接 URL/现有链接提供。
- 本轮不处理 P1 证据内容、P2 外部分发，不提交或推送。

## 2026-07-19 SEO P1 核心入口 CTA 收口

- Buyer Guides 首页主 CTA 改为直达 Supplier Reply Review，次级入口直达 Sample Report。
- 样品前问题、付款前检查、报价比较页面的 Review / Sample Report / Examples 路径已复核；报价比较页补充 Examples 链接。
- Supplier Reply Review 保持现有直接答案、匿名示例、案例入口和主 CTA；未改 URL、canonical、robots 或 sitemap。

## 2026-07-16 GROWTH-004

- 新增 Morning Collector 本地脚本和现有 8787 服务端点；仅由首页“开始今天”触发，不新增服务、API 接入、数据库、计划任务或外部互动。
- 浏览器采集只读访问 Cloudflare、GSC、Clarity、Semrush；GEO、社交、转化复用现有本地记录，品牌监控复用本次 Semrush 结果。
- 结果写入 `data/growth-os/runtime/morning-collector-latest.json` 和日期文件，所有记录明确包含来源、更新时间、`realtime: false` 与阻塞原因。
- 真实演练曾完成 7/8 来源；随后验证 Chrome Direct 每次新会话都可能要求人工允许控制权限，未确认时系统正确记录 3/8 完成和 5 个阻塞，不复用旧值。
- 现有工作台可显示八个来源卡片、最近结果和三项今日建议；未自动发布、点赞、评论、私信或发送任何内容。
- 修复“开始今天无反应”：8787 服务进程的 PATH 找不到 `browser-act`，请求会立即以 `spawn browser-act ENOENT` 结束；现改为解析显式配置、服务 PATH 和用户目录下的可执行文件，并增加回归测试。修复后真实请求完成 7/8 来源，Clarity 因页面指标结构未匹配保留为 `blocked`。

## 2026-07-16 GROWTH-003

- 将增长运营中心默认首页从长篇信息总览收紧为 3 个有顺序的今日任务、3 个工作摘要和 1 个网站与渠道数据摘要。
- 长正文与详细数据默认隐藏；审核、发布、外部信号、数据区域在同页互斥展开，并可收起返回今日任务。
- 数据摘要复用现有 Cloudflare、Analytics、GSC 和异常扫描文件，显示来源与更新时间，明确标记手动导入而非实时数据；未新增路由、状态或监控能力。
- 本地浏览器验证默认页高度 992px（720px 视口）、全部详情默认隐藏、互斥展开、返回入口及原有操作控件均通过。

## 2026-07-16 GROWTH-002

- 将现有 `dashboard.html` 明确为“增长运营中心”，增加今日任务、审核、发布、数据四个首页导航，不新增第二入口或业务模块。
- 新增 `npm run growth:dashboard` 固定启动方式，并在 Growth OS README 记录默认端口和打开地址。
- 已确认 PID 1644 正在运行 `local-dashboard-server.mjs`，`http://127.0.0.1:8787/growth-os/` 与数据视图均返回 HTTP 200；未执行任何对外发布。

## 2026-07-14 Supplier Reply Review 旧入口 301 收口

- 将 `/free-supplier-reply-review/` 从客户端跳转升级为 Cloudflare HTTP 301，保留查询参数并单跳到正式 Supplier Reply Review 页面。
- 构建停止发布旧 HTML 页面，AI Sitemap 删除旧 URL；未修改历史 backlink、推广和 migration 记录。

## 2026-07-14

- 完成主站与 Factory 域站内链接边界清理：主站 Buyer 链接留在主域，Supplier Reply Review 作为核心转化页，For Chinese Factories 独立指向 Factory 服务页。
- 未修改视觉、页面正文、sitemap、AI sitemap、`llms.txt` 或广告页发现设置。

## 2026-07-12

- 修正 Social Content Agent 固定模板问题：新增“比较中国供应商报价时不要只看单价”主题，为 LinkedIn、X、Medium、Substack、Quora、Facebook 生成新的平台草稿 ID；未发布到外部平台。

## 2026-07-06

- 前次收口曾确认主站和 factory 子站 clean、本地 `main` 与 `origin/main` 同步；本轮按用户要求完成 YouTube 本地素材包后只做本地 commit，不 push。
- 前次已移除 / 回退 YouTube starter plan 相关未 push commits；当时主站没有 tracked 的 `youtube` / `shorts` 文件。
- 按用户新的 YouTube 本地素材包计划，已重建精简文件集：频道计划、首批 5 条 Shorts 生产包、production manifest、4 周验证方案和空白 tracker。
- 新增 `docs/youtube-ai-faceless-workflow-for-gewuji.md`，把 AI 无脸视频流程改造成 Gewuji Supplier Review 的低成本、边界安全、长尾搜索和服务转化 SOP。
- 已生成第一条本地 Shorts 视频 `outputs/youtube/shorts-batch-01/short-01-deposit-check.mp4`：1080x1920、30fps、40 秒、H.264 MP4、AAC audio；文件位于 ignored `outputs/`，不纳入 git。
- 新增 `docs/youtube-ai-generated-production-route.md`，记录不做口播、不露脸、不拍摄的全 AI 生产路线：Remotion Skills 为主、HyperFrames 为辅，生成式视觉仅限说明性素材并保留人工边界审查。
- 本轮 YouTube 范围保持本地交付：除第一条本地 POC mp4 外，不登录 / 上传 YouTube，不把视频文件纳入 git，不改网站页面、sitemap、schema、构建脚本或公开 URL。
- 前次收口未修改页面、sitemap、robots、buyer guides、Supplier Reply Review 或 Field Materials；本轮 YouTube 素材包同样未修改这些公开页面和站点文件。
- External GEO / 平台反馈记录规则：公开请求无法拿到真实 24h 平台指标，Reddit / Quora / Medium 可能返回 403、challenge 或登录限制；不要伪造 views、likes、replies，等后台真实数据或人工确认后再更新。
- 当前主线保持为 Supplier Reply Review 转化页、Sample Report、Buyer Guides、External GEO 分发与存活观察、Field Materials 信任背书；YouTube 暂不作为当前主线，仅作为后续复用内容和本地验证的测试渠道。

## 2026-07-07

- 用户先确认可临时改用 Chrome 做只读站内检查，因此本轮按用户授权在现有 `browser-act` `chrome-direct` 会话中检查 LinkedIn 和 Reddit。
- Reddit `https://www.reddit.com/message/inbox/` 显示 inbox 为空，未发现新的私信、评论回复、帖子回复或提及。
- LinkedIn 通知页只有动态展示/转发类系统提醒；消息面板最新可见对话仍为 `AUM Zunayed` 且最后一条为我方 7 月 5 日发出的消息；邀请管理页显示 `已收到 0`，未发现新的连接请求。
- 在用户要求“直接生成去发”后，已于 LinkedIn 发布原创短帖 1 条，主题为 sample approval vs mass production risk，链接为 `https://www.linkedin.com/feed/update/urn:li:share:7480108919801991168/`。
- 本轮仅执行这 1 条 LinkedIn 发布动作；未点赞、未评论、未发私信、未发送连接请求、未扩展到其他平台。
- 用户随后要求不要停下，把今天该发的都发掉；因此本轮继续补发可稳发内容。
- 已在 X 发布原创短帖 1 条，主题为 sample proof vs bulk-order risk，链接为 `https://x.com/llzclm_ray/status/2074344633124159908`。
- 已在 Reddit `r/Entrepreneurs` 发布回复 1 条，链接为 `https://old.reddit.com/r/Entrepreneurs/comments/1ueff34/how_do_businesses_actually_vet_suppliers_on/ow0ri1d/`；主题为首单前如何核验 Made-in-China 供应商。
- Quora 目标问题 `How do I find the best supplier from China?` 两次进入答题页后均返回 `Something went wrong. Wait a moment and try again.`，因此未继续强行提交，也未记为已发布。
- 用户补登录后，已在 Substack 发布长文 1 条：`https://gewuji.substack.com/p/a-sample-approval-is-not-production`，标题为 `A sample approval is not production proof`。
- Medium `new-story` 页面可进入编辑器，但本轮发布过程中出现 `Something is wrong and we cannot save your story`，且正文被错误打乱，因此未记为已发布。

## 2026-07-04

- 更新 LinkedIn 标准化主页文案和 Email 开发信核心模板：LinkedIn About 改为 supplier communication signals / risk before payment 口径，CTA 改为 `Review Supplier Reply`，链接统一到 `/free-supplier-reply-review/`；仅更新文档，未操作平台资料页。
- 按用户要求调整海外平台对外内容规则：发帖、评论、回答等内容只要在项目边界内可自动发布，不再逐条等待确认；关注、点赞、连接请求、主动私信、账号资料修改、删除/隐藏内容、争议性回复和正式服务承诺等高风险动作仍需先停下确认。
- 同步更新 `AGENTS.md`、`CODEX_HANDOFF.md`、`CODEX_TASKS.md`，让后续海外互动检查和批量回复按新边界执行。
- 按新规则复核待发布项：Facebook `B054` 在边界内但 Chrome 未登录 Facebook，暂未发布；Facebook `B055` 涉及欺诈追讨/平台申诉，按高风险内容保留确认。
- 同步更新 `docs/promotion/overseas-ops-board.md` 与 `docs/promotion/social-reply-batch-2026-06-29.md`，把 `B054` 标为待可发布会话后自动发，把 `B055` 标为高风险待确认。
- 用户登录 Facebook 后，已发布 `B054` 新手采购/代理问题短评；页面显示“待審查”。已补入海外发布总表、看板和批量回复表。
- 用户要求所有平台继续发后，已发布 `B055` 供应商欺诈追讨问题短评；页面显示“待審查”。已补入海外发布总表、看板和批量回复表。
- 继续按“所有该发平台都发”执行：LinkedIn 发布 `O002` supplier quote assumptions checklist，X 发布 `O003` supplier replies vs quote assumptions，Quora 发布 `Q004` sourcing agency / purchasing agent answer；Reddit 仍被 network security 拦截，未能发布。
- 继续复核剩余候选和站内消息：Facebook / LinkedIn / X / Quora 未发现需要回复的新私信或真人互动；Reddit `B005` 可读但主评论提交控件不可用，未发成功；Facebook `B058` 判定为供应商自我广告不发，`B059` 页面不可见。
- 继续处理可发平台：Quora 发布 `Q005` Chinese aluminum sheet supplier verification answer；LinkedIn / X 搜索候选未找到合适真人求助帖，未追加评论。
- 继续处理剩余候选：Quora 发布 `B011/Q006` reliable China supplier sourcing process 和 `B014/Q007` Alibaba scam avoidance；`B012/B013/B015` 原页面不存在。Reddit 旧版页面发布 `B002` sports products supplier / sourcing agents 回复；`B003/B005` 尝试提交后未在用户评论页出现，按未成功记录。
- 继续补发并验证剩余平台：Reddit 发布 `R002` Alibaba EXW/DDP 条款不一致回复；Quora 发布 `Q008` supplier authenticity verification answer；X 发布 `O004`，但正文被 X 截断成后半句。Reddit `R001/R003/R004/R005` 提交后未在用户评论页出现，`r/ecommerce` 明确因 karma 自动移除，均不计入已发。
- 按用户“再试试”重试：X 补发完整 `O005` payment name mismatch note；Reddit 用更短回复成功发布 `R003` freight forwarder process check。两个动作均已页面验证并补入回访台账。

## 2026-06-29

- 半天批量补记：LinkedIn 新评论 1 条、X 新短帖 1 条，均无推广链接，已补入海外发布总表。
- 新增第三批低风险海外候选文档：`docs/promotion/social-candidate-batch-2026-06-29-round3.md`，主要作为明天的 LinkedIn/X/Quora 选题池，不立即发布。
- Quora 新发布 1 条回答并已补入海外发布总表：`How do I know which suppliers/manufacturers are legit and trustworthy when sourcing on AliBaba?`
- 新增第二批海外社媒候选文档：`docs/promotion/social-candidate-batch-2026-06-29-round2.md`，筛出 Reddit/LinkedIn 可回复位置，并标出暂不建议碰的供应商广告或同行营销帖。
- 新增海外回复执行规划：`docs/promotion/overseas-reply-execution-plan-2026-06-29.md`，明确 50 条候选的今日优先、观察、暂不建议碰分层，并准备 10 条低销售感草稿供 ChatGPT/人工编辑。
- 新增批量候选池文档：`docs/promotion/social-reply-batch-2026-06-29.md`，先集中收集 50 条海外社媒/问答回复候选，用户填写最终回复后再批量发布。
- 新增海外账号包装方案：`docs/promotion/account-packaging-plan.md`，覆盖 Reddit、Quora、X、LinkedIn 的简介、视觉、置顶和发言边界。
- 调整海外社媒回复文风规则：像正常人分享经验，不像销售员找客户；不主动推服务、引导私信或留联系方式。
- 新增海外社媒执行频率规则：每个平台每天发 1-2 条、最多回复 5 条，仍需遵守草稿和发布前确认流程。
- 调整海外社媒回复规则：回复不限次数，看到合适的真人问题或讨论即可准备回复；文风要求去 AI 味、简单直接。
- 调整海外社媒浏览器规则：所有网页、账号、表单和发布/回复操作统一使用 Safari，不再默认 Chrome、Edge、内置浏览器或 chrome-direct。
- 调整海外社媒台账规则：已纳入平台的发布和回复先暂存链接，半天批量更新一次跟进台账和海外发布总表；新平台首次发布仍立即入海外发帖台账。
- 新增 Quora 搜索存档，归档 6 条供应商验证、进口合规、认证核验相关候选问题。
- 发布 Quora 回答并补入海外发帖台账：`https://www.quora.com/How-do-I-verify-a-Chinese-suppliers-certifications-CE-UL-RoHS/answer/%E9%9B%B7%E9%B8%A3-%E6%9B%B9`。
- 新增对外发帖/回复流程规则：需要写内容时先停下，把大致内容交给用户/ChatGPT 编辑；最终发布前再次确认。
- 拆分 Reddit 台账：`reddit-followup-tracker.md` 仅保留已回复记录，新增 `reddit-search-archive.md` 存放候选帖和未提交草稿。
- 新增 Reddit 跟帖记录文件，区分已发评论和待确认草稿。
- 记录 Reddit 账号 `PenFine4776` 和当前已跟帖的 3 个讨论链接。
- 已发布 `r/smallbusiness` 泛制造业找中国供应商回复，并补充评论直达链接。
- 已发布 `r/Business_China` Made-in-China.com private label suppliers 回复，并补入 Reddit 跟进台账和海外发布总表：`https://www.reddit.com/r/Business_China/comments/1udijk9/comment/oufl1mj/`。
- 已发布 `r/Entrepreneurs` Made-in-China supplier vetting 回复，并补入 Reddit 跟进台账和海外发布总表：`https://www.reddit.com/r/Entrepreneurs/comments/1udbvfs/comment/oufqcer/`。
- 新增 `r/Alibaba` 供应商产能升级候选帖，草稿已写但暂不提交。
- 继续归档 Reddit 制造业/中国供应商候选帖 4 条，并修正台账分组。
- 继续搜索并归档 Reddit 泛制造业/供应商验证候选帖 6 条，覆盖 `r/logistics`、`r/procurement`、`r/ecommerce`。
- 发布 LinkedIn 买家向英文动态并记录链接：`https://www.linkedin.com/feed/update/urn:li:share:7477170111196413953/`。
- 发布 X 短帖并补入海外发帖台账：`https://x.com/llzclm_ray/status/2071422809251975472`。
- 新增 X 搜索存档，记录 5 组搜索词、1 条中等匹配候选和未提交回复草稿。
- 切换到 Reddit 候选，补充 `r/Business_China` Made-in-China.com 供应商验证帖英文回复草稿，未提交。
## 2026-06-29

- 新增互动检查与账号包装简报：`docs/promotion/interaction-account-packaging-2026-06-29.md`。
- 已整理 X、LinkedIn、Quora、Reddit 的低营销账号简介草稿；未写入任何平台资料页。
- 互动检查仅确认 Quora / X 暂无必须当天回复线索；LinkedIn 因 Safari 工具焦点异常未继续在 Edge 内操作。

## 2026-06-30

- 复核 `docs/promotion/overseas-posting-log.md` 与 `docs/promotion/reddit-followup-tracker.md`，确认当前每日回访范围仍为 LinkedIn、Reddit、Quora、X。
- 尝试只读检查 Reddit 跟帖互动时，公开 JSON 与 old.reddit 页面均返回 403，未获得稳定可用的公开互动数据。
- 按项目规则未改用其他浏览器替代 Safari 检查 LinkedIn；当前环境无 Safari 自动化能力，因此停止站内通知/评论/私信检查。
- 本轮未执行任何对外动作，也未生成新的对外回复内容；待 Safari 可用后补做只读回访。
- 新增 `docs/promotion/facebook-search-archive.md`，整理 5 条 Facebook 公开候选帖子和 3 条暂不建议碰的位置。
- 已把 5 条 Facebook 候选补入 `docs/promotion/social-reply-batch-2026-06-29.md`（`B051`-`B055`），继续维持“只整理、不发布”。
- 已为 Facebook 候选 `B051`、`B052`、`B053` 写好英文回复草稿，并填入批量候选表“最终回复”列；未执行任何发布动作。
- 已按用户要求把 `B051`、`B052`、`B053` 压成更短、更像真人短评的版本；仍未发布。
- 已在 Safari 中发布 Facebook 评论 3 条：`B051`、`B052`、`B053`；其中 `B051` 页面显示“待审核”。
- 已将 Facebook 首次实际对外动作补入 `docs/promotion/overseas-posting-log.md`，Facebook 后续纳入每日互动回访范围。
- 已新增 Facebook 第二批候选 5 条，并补入批量候选表 `B056`-`B060`；继续保持“只整理、不发布”。
- 已新增轻量看板 `docs/promotion/overseas-ops-board.md`，汇总今日回访、待起草、待发布确认和已发布待回访。
- 已新增 `docs/promotion/7-day-account-warmup-plan.md`，把账号包装、评论型起号、低频原创和回访节奏拆成 7 天动作表。
- 已确认 Facebook 个人主页简介公开可见：`Practical notes on Chinese suppliers, samples, factory visibility, and sourcing communication.`；下一步进入 LinkedIn headline / about 包装，保存前仍需用户确认。
- 已在 Safari 中确认 LinkedIn headline 保存为：`China sourcing notes | Supplier visibility, samples, factory materials, buyer-side checks`；现有 About 已符合低销售感个人经验定位，暂不改。
- 已确认 X bio 已符合低销售感定位，未改；已在 Safari 中保存 Quora bio，Credential 暂不改。
- 已在 Safari 只读完成本轮 Facebook / LinkedIn / Reddit / Quora / X 回访：未发现需要当天回复的真人线索；Facebook `B051` 评论可见但无回复，`B052` 当前排序未见我方评论，`B053` 可见讨论多为供应商广告；LinkedIn 仅系统/浏览量通知；Reddit 通知页无新增；Quora 无新通知；X 仅促销通知且提及为空。
- 已为 Facebook 候选 `B056`、`B057`、`B060` 写入短评版英文草稿；未打开平台，未发布。
- 已在 Safari 发布 Facebook 评论 `B056`、`B057`、`B060`；三条页面均显示“待审核”，已补入海外发布总表和看板，后续纳入每日回访。
- 已准备 LinkedIn / X 通用低频原创短帖 `O001`，写入看板“待发布确认”；未打开平台，未发布。
- 用户确认后，已在 Safari 发布 LinkedIn 低频原创短帖 `O001`：`https://www.linkedin.com/feed/update/urn:li:share:7477633458249449472/`；无推广链接，后续纳入每日回访。
- 已为 Facebook 候选 `B054`、`B055` 写入短评版英文草稿，并转入看板“待发布确认”；未打开平台，未发布。

## 2026-07-01

- 主站 footer 新增 `https://factory.gewuji.dev/` 的自然入口链接，用于连接格物集主站与工厂桥梁子项目；已通过 `npm run build:prod` 和 `npm run verify:static`。

## 2026-07-02

- 修复主站 footer 的工厂桥梁入口：从外部 `factory.gewuji.dev` 改为站内 `for-factories/` 和 `for-buyers/`，避免入口指向未确认子域名；已通过 `npm run build && npm run verify:static`。
- 每日更新记录同步：`index.html` 最近项目进展新增 Factory Bridge 站内入口说明，`llms.txt` 同步保留最近两条项目级进展；已顺序执行 `npm run build && npm run verify:static`。
- 导出 Godot 版世界杯摸鱼 H5 POC 到 `game/worldcup-godot/`，新增 `index.html/js/wasm/pck` 与音频 worklet 文件；Godot 源码 HUD 改为 ASCII 文案以避免 Web 默认字体缺中文。
- 补充 Godot POC 静态托管校验，忽略 `.godot/` 本地缓存，并保留 `.gd.uid` 资源 UID 文件；已通过 `npm run build:prod && npm run verify:static`，本地 Playwright smoke test 截图确认页面可显示。
- 已将世界杯角色 PNG 套入 Godot POC 的 Player/Enemy 场景，主角使用蓝色 idle/run 图，敌人按巡逻同事、HR、老板、发消息主管、会议通知切换贴图；重新打包 `game/worldcup-godot/index.pck` 并通过静态校验。
- 发现 Godot Web POC 几秒无响应实为主循环停在约 1 秒，控制台报 `function signature mismatch`；已将 `game/worldcup-godot/index.html` 临时改为跳转到稳定 Canvas H5，Godot 源码和素材保留继续排查。
- 已恢复真实 Godot 预览页：改用 Godot 4.6 Web no-threads runtime 重新生成 `index.js/wasm/pck`，并把 POC 逻辑改成单场景单脚本实体管理，避开 Web 运行时 `function signature mismatch`；本地 12 秒和 20 秒 Playwright 截图验证通过。
- 根据 Clarity 过去 7 天访问结构，新增 `/tools/` 工具总入口，首页明确格物集主站 / Tools / Factory Bridge 分流，并给 World Cup Advisor 7 个页面底部增加轻量 “More from Gewuji” 内链模块；已通过 `npm run build:prod && npm run verify:static`。
- Godot 版世界杯摸鱼 H5 POC 增加球场线、办公室贴纸/标识、桌面高光、射击尾迹、命中特效、出生/击退环形粒子，并限制动态特效数量；已重新导出 `game/worldcup-godot/index.pck`，通过 `npm run build:prod && npm run verify:static`。
- 主站信息架构清理：首页和主导航聚焦 Factory Bridge / Field Materials，旧工具统一降级收纳到 `/tools/`，首页移除工具项目网格和世界杯状态脚本；sitemap 提升业务页权重、降低旧工具权重；已通过 `npm run build:prod`、`node --check script.js`、`npm run verify:static`。
- 游戏和临时工具 IA 清理：`/tools/` 增加游戏实验归档卡片和迁移标记，`/game/worldcup/` sitemap 降权，新增 `docs/game-content-migration-plan.md` 独立游戏站迁移建议；已通过 `npm run build:prod`、`npm run verify:static`。
- 新增外链健康检查和干净外链建设观察系统：`docs/backlink-health-check.md`、`docs/backlink-risk-policy.md`、`docs/clean-backlink-plan.md`、`data/backlinks/backlink-audit-log.csv`、`data/backlinks/clean-backlink-targets.json`；未执行 disavow、外链提交或购买外链。
- AI bot 可见性优化：新增 `docs/ai-bot-visibility-checklist.md`，收紧主站 sitemap 为首页、`/tools/`、工厂桥梁核心页、`llms.txt`、`ai-sitemap.json`，并重写 AI sitemap 口径为格物集主站 / 工厂桥梁 / Lab 边界；已通过 `npm run build:prod && npm run verify:static`，未 push。
- 英文首页同步中文首页信息架构：`en/index.html` 从旧产品实验室/项目墙改为 Factory Bridge、Field Materials、Lab、联系入口结构，并补充英文页定位校验；已通过 `npm run build:prod && npm run verify:static`。
- 中英文首页同步保护：`verify:static` 现在会比较中英文首页的核心 section、导航、hero CTA 和 footer 链接；中文首页结构更新但英文首页未跟进时会直接失败。
- 首页清理：按要求移除中文和英文首页的最近项目进展 / Recent updates 板块；已通过 `npm run build:prod && npm run verify:static`。
- 首页工厂桥梁去重：Factory Bridge 区只保留买家端和工厂端入口，Field Materials 区只保留素材入口，避免桥梁内容和素材内容互相重复；中英文同步更新并通过静态校验。
- 首页文案风格调整：中文和英文首页改为更克制、专业、国际化的 Factory Bridge / Field Materials / supplier communication 表达，压缩个人介绍，强化非审厂、非验货、非法律尽调边界；已通过 `npm run build:prod && npm run verify:static`，未 push。
- 外链健康系统第二阶段：新增第一批干净外链执行计划、Profile 文案、GitHub README 模板、Notion checklist 模板和 CSV 执行表；本轮只生成文案和清单，未注册账号、未提交外链、未 disavow、未 push。
- 第一批干净外链执行：已创建并发布 GitHub profile README `https://github.com/llzclm1/llzclm1`，链接到 `https://gewuji.dev/`，并更新外链 audit log 与 first-batch 执行表。
- 第一批干净外链执行：已在 LinkedIn profile 的 Featured 区添加 `Gewuji Factory Bridge`，链接到 `https://gewuji.dev/for-buyers/`，并更新外链 audit log 与 first-batch 执行表。
- 第一批干净外链执行：已创建并发布 GitHub resource README `https://github.com/llzclm1/supplier-communication-notes`，链接到 `https://gewuji.dev/field-materials/`，并更新外链 audit log 与 first-batch 执行表。
- 第一批干净外链执行：已发布 Notion public checklist `https://dazzling-shade-a49.notion.site/Supplier-Communication-Checklist-Before-a-Sample-Order-391592c3c41380bba0f4e8f77a4e1289`，链接到 `https://gewuji.dev/for-buyers/`，并更新外链 audit log 与 first-batch 执行表；About.me 仍待登录。
- 第一批干净外链执行：已在 About.me profile `https://about.me/ray_vision` 添加 `Gewuji` 链接按钮，指向 `https://gewuji.dev/`，并更新外链 audit log 与 first-batch 执行表。

## 2026-07-03

- 新增 GSC 早期曝光观察系统：`docs/gsc-early-signal-review.md`、`docs/gsc-query-page-analysis.md`、`docs/gsc-optimization-rules.md`、`data/gsc/gsc-early-signals.csv`；已写入当前已知 query 示例，未改页面、sitemap、noindex、重定向，未 push。
- 技术 SEO 小修：新增主站 `/favicon.ico`、`/contact/`、`/lab/` 兼容页，并把 `/contact/` 加入 sitemap；已通过 `npm run build:prod && npm run verify:static`。未改 Cloudflare 设置。
- Cloudflare 后台已开启 `gewuji.dev` 的 `Always Use HTTPS`，验证 `http://gewuji.dev/` 返回 301 到 `https://gewuji.dev/`。
- Cloudflare 后台已新增并启用 `www` 到根域名 301 Redirect Rule，验证 `https://www.gewuji.dev/` 返回 301 到 `https://gewuji.dev/`。
- GSC 已重新提交 `https://gewuji.dev/sitemap.xml`，页面提示提交成功；现有 sitemap 行显示状态 `成功`，发现页面数 `63`。
- Cloudflare 后台已新增并启用默认文件扩展名 Cache Rule，仅让静态文件扩展名符合缓存条件；验证 CSS、JS、图片和 favicon 第二次请求为 `cf-cache-status: HIT`，首页和 sitemap 仍为 `DYNAMIC`。
- 首页工业档案馆方向落地：中英文首页首屏改为现场证据板、左侧品牌竖栏和低圆角目录式视觉，OG/Twitter 图切到工厂现场图；已通过 `npm run build:prod && npm run verify:static`，并生成桌面/移动预览图到 `outputs/`。
- 首页冷静高级方向首屏密度调整：收紧首屏高度和间距、放大右侧现场图片组、将项目数字条放入首屏底部，避免页面过空；已通过 `npm run build:prod && npm run verify:static`。
- 主站首页中英文 Factory Bridge 买家端和工厂端入口已改为直接指向 `https://factory.gewuji.dev/for-buyers/` 与 `https://factory.gewuji.dev/for-factories/`；Field Materials 仍保留在主站；已通过 `npm run build:prod && npm run verify:static`。
- 买家端页面从 supplier verification / reality check 口径调整为 supplier communication support，工厂端页面保留更直接的中文转化文案但降低“拿单”承诺感；`llms.txt` 和静态校验同步更新，已通过 `npm run build:prod && npm run verify:static`，未 push。
- 中英文首页改为暖工业品牌首页：`/` 和 `/en/` 保留三入口（海外买家 / 中国工厂 / 实拍素材），Hero 使用本地真实工厂图 `field-materials/nonwoven-line-02.jpg` 加暖黑遮罩，Lab 降级为细条入口；已通过 `npm run build:prod && npm run verify:static`，并生成预览图 `outputs/warm-home-zh-desktop.png`、`outputs/warm-home-en-desktop.png`、`outputs/warm-home-zh-mobile.png`。按用户要求未 push。
- 中英文首页强制简化为 Hero、三入口、小 Lab、Contact、Footer：移除独立 About、三入口大标题和卡片主次差异，入口标题改为海外买家 / 中国工厂 / 实拍素材及对应英文；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`，按用户要求不自动 push。

## 2026-07-04

- 主站首页排版细节微调：Hero 标题改为整词块断行并加宽标题容器，两个主入口按钮加宽，双栏分流区补英文小标签，能力层标题改为左标右题，底部双 CTA 标题拆成两行；未改配色、背景图、路由、sitemap 或 robots。已通过本地截图检查、`npm run build:prod`、`npm run verify:static`、`git diff --check`。
- 紧急纠偏：已确认主站 `gewuji.dev` 源码为 `/Users/caocao/Documents/我的主页`，factory 子域名源码为 `/Users/caocao/Documents/工厂桥梁`；错误改到 factory 子域名的双边入口版已在 factory 仓库回滚。
- 主站中英文首页按样图信息结构改为“中国工厂 / 海外买家”双边入口：Hero 两个主按钮、双边分流区、“我们处理什么信息”能力层、底部双 CTA；保留原米白/浅灰/黑字/棕色点缀、工厂背景图和杂志式排版。
- 本轮主站只改首页相关文件和静态校验断言，未改 sitemap、robots、published_pages、路由结构或 SEO 页面白名单；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`。
- 中英文首页字体、色彩和短文案调整为更克制的工业杂志感：中文标题改用宋体/思源宋体 fallback，英文标题改用 Archivo / Space Grotesk fallback，暖黑背景和暗金点缀压低饱和度；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`，按用户要求不自动 push。
- 中英文首页继续压缩视觉优先级：首屏控制在一屏内完成判断，三入口后先 Contact、再 Lab 小入口，Lab 降级为 footer 前弱链接条；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`，按用户要求不自动 push。
- 中英文首页亮度和色彩层级微调：仅调整 `.warm-home` 背景、文字、线条、按钮和 Hero 遮罩，保持首页结构与文案不变；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`，按用户要求不自动 push。
- 中英文首页字体方案和 Contact 文案微调：标题改为首页作用域 serif fallback，正文按中英文分别使用清晰 sans fallback，Contact 改为发送现有材料的正式审阅口径；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`，按用户要求不自动 push。
- 首页标题字体可见性修正：由于前一版中文 serif 栈与旧版接近，英文外部字体未加载时变化不明显，已把首页标题优先级改为系统可命中的 `Songti SC` / `Georgia` 并降低粗重字重；已通过静态验证后推送。
- 线上 CSS 缓存修正：首页 HTML 已更新但 `styles.css` 仍被静态缓存返回旧内容，因此把首页字体覆盖内联到 `/` 和 `/en/`，保证标题字体调整立即生效；未改其他页面。
- Factory Bridge 子页面视觉系统统一：`/for-buyers/`、`/for-factories/`、`/field-materials/` 从旧 CFB / Next 导出模板改为 GEWUJI / Factory Bridge 统一壳，补充暖工业 CSS token、统一 Header / Footer、CTA / 表单文案、Field Materials canonical 和 AI sitemap / llms 口径；已通过 `npm run build:prod`、`npm run verify:static`、本地链接审计和 `git diff --check`，按用户要求未 push。
- 主站与 Factory Bridge 定位冲突复核：主站可控的 `/for-buyers/`、`/field-materials/` 修正旧锚点和过强 buyer-check 口径，`llms.txt` 与 AI sitemap 改为“服务国内工厂的工厂对外资料重构”主线；已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`。另确认 `factory.gewuji.dev` 实际源码在 `/Users/caocao/Documents/工厂桥梁`，本仓库仍只部署 `gewuji.dev`。
- LinkedIn 主页 headline 已保存为 `Supplier communication risk review | China sourcing signals before payment`，About 已保存为用户给定的 supplier communication signals 标准文案。Featured 新 CTA 添加时发现 `https://gewuji.dev/free-supplier-reply-review/` 线上为 404，LinkedIn 判定无效链接；已先新增主站 `/free-supplier-reply-review/` 落地页并加入构建 sitemap / AI sitemap，待部署生效后回 LinkedIn 添加正确 Featured 链接。
- GitHub Pages 部署后 `https://gewuji.dev/free-supplier-reply-review/` 已返回 200；LinkedIn Featured 已新增 `Review Supplier Reply`，实际链接经 LinkedIn safety 跳转指向 `https://gewuji.dev/free-supplier-reply-review/`。主页验证通过：headline、About、新 Featured 均显示；旧 `Gewuji Factory Bridge` Featured 保留在第二位。

## 2026-07-04 Field Materials Hero Image

- `/field-materials/` 和 `/en/field-materials/` 首屏图、preload、OG/Twitter 图已从 `fastener-workshop-01.jpg` 换为更干净的 `nonwoven-line-02.jpg`。
- 素材样本列表、sitemap 和 robots 未改。
- 已通过 `npm run build:prod` 和 `npm run verify:static`。

## 2026-07-05 Homepage Clarity Events

- Added Microsoft Clarity custom click events to only the Chinese homepage `/` and English homepage `/en/`.
- Kept the implementation inline and guarded with `if (window.clarity)`.
- Did not change homepage visuals, text, href targets, sitemap, tools, games, factory subdomain, or other pages.
- `npm run build:prod`, `npm run verify:static`, and `git diff --check` passed.

## 2026-07-05 Buyer Guides Channel Shift

- Switched the documented growth focus from `公众号 / 视频号` to `英文 SEO + Quora + Reddit + LinkedIn/X`.
- Added new static collection page `/buyer-guides/` plus 14 English buyer-guide URLs with title, meta description, H1, shared outline sections, soft CTA, and service-boundary copy.
- Added new planning docs: `docs/growth-channel-shift.md`, `docs/buyer-guides-content-roadmap.md`, `docs/quora-reddit-linkedin-distribution-plan.md`, and `data/content/buyer-guides-14-day-plan.csv`.
- Updated `scripts/build-static-site.mjs` and `scripts/verify-static-hosting.mjs` so buyer guides are copied, indexed, and checked with the rest of the static site.

## 2026-07-05 海外平台发布

- 已在 Google Chrome 中发布 X 原创短帖 1 条，主题为 first supplier order checklist；无链接、无私信引导。
- 已在 Google Chrome 中发布 LinkedIn 原创短帖 1 条，主题为 supplier first-order assumptions；无链接、无私信引导。
- 已在 Google Chrome 中发布 Reddit `r/Alibaba` DDP price 回复 1 条：`https://old.reddit.com/r/Alibaba/comments/1unaq3i/question_about_ddp_price/ovno8yp/`。
- 已同步更新 `docs/promotion/overseas-posting-log.md` 和 `docs/promotion/reddit-followup-tracker.md`；本轮未点赞、关注、连接、私信或放推广链接。
- 已在 Google Chrome 中发布 Facebook 个人动态 1 条，主题为 first supplier order checklist；系统提示已成功与 FRIENDS 分享，无链接、无私信引导。
- 用户登录 Quora 后，已在 Google Chrome 中发布 `How can I safely buy from a supplier in China?` 回答：`https://www.quora.com/How-can-I-safely-buy-from-a-supplier-in-China/answer/%E9%9B%B7%E9%B8%A3-%E6%9B%B9`；无链接、无私信引导、无服务承诺。

## 2026-07-05 Gewuji GEO SOP

- Added `docs/gewuji-geo-sop.md`, `docs/gewuji-geo-page-matrix.md`, `docs/gewuji-geo-checklist.md`, `docs/gewuji-ai-prompt-monitoring.md`, `data/geo/gewuji-prompt-matrix.csv`, and `data/geo/ai-prompt-monitoring-log.csv`.
- Kept the SOP specific to Gewuji / Factory Bridge: buyer guides, checklist/template pages, field evidence, and factory material pages.
- Did not modify pages, sitemap, factory subdomain files, or deployment output.

## 2026-07-05 Buyer Guides First 5 Execution

- Limited build output and sitemap to `/buyer-guides/` plus the first 5 published guides.
- Added Article / FAQPage / BreadcrumbList schema, visible FAQ blocks, and `Last updated: July 5, 2026` to the first 5 guide pages.
- Kept old checklist / RFQ / FQ / review paths accessible as compatibility redirects but removed old redirect paths from sitemap.
- Added `docs/gsc-bing-submit-checklist-2026-07-05.md` for manual GSC and Bing submission.

## 2026-07-11 Social Discovery v3 Phase A

- 新增公开 Source Adapter、Reddit RSS、Search Provider 降级、手动每日调度入口和来源健康状态；未安装系统计划任务，未登录或操作社媒平台。
- 公开 RSS 403/429 会进入来源冷却；未配置 Search Provider 时返回 `not_configured`，不伪造候选、不阻塞其他来源。
- 当前自动持久化候选仍为 0；Phase B-D 未执行。

## 2026-07-11 Social Execution Workspace

- 将候选工作流收口为 Inbox、Today、Results、Reports 四个视图，Today 默认最多显示 3 条人工选择的候选。
- 增加严格的 Viewed、Draft Prepared、Replied（必须有真实回复 URL）和结果动作；本地操作后立即刷新 Viewer 数据，不等待 Runtime。
- Business Signals 只从 Results 的人工结果与真实发布记录计算；未新增登录、评论、发布或采集功能。
# 2026-07-17

- Growth OS 首页 UX：将今日前三项收口为业务动作优先（审核、发布、回复），补充 `First Qualified Buyer Submission` 目标和当日完成度；“开始今天”改为“开始采集/重新采集”；网站数据摘要改为结论式状态卡，并保留详细数据折叠区。仅修改 `docs/growth-os/dashboard.html`，未新增 API、路由、模块或自动外部互动。
- GROWTH-006：Morning Collector 的 Clarity 改为独立会话和 15 秒硬预算（13 秒工作 + 2 秒关闭），增加阶段日志与 `collected/partial/extraction_failed/blocked` 状态；Clarity 不再进入今日前三任务。连续 3 次完整运行均到达 Semrush，Clarity 会话已清理；未提交或推送。
- GROWTH-006 Social Collector P0：将社交阶段从本地历史记录改为只读 LinkedIn/Quora 浏览器采集；每个平台独立会话和 15 秒硬超时，社交阶段总预算 35 秒，失败隔离并继续后续来源。两次独立运行均完成，Morning Collector 整轮不被阻塞，首页摘要/详情验证通过，未提交或推送。
- Morning Collector 状态口径修复：识别重复 Chrome / Browser Act 权限错误为单一根因；区分实时、缓存、人工、暂不可用和需要授权；Dashboard 隐藏原始错误并保留折叠技术详情。Morning/Social 测试 18/18、脚本语法和 diff 检查通过；未提交或推送。
- Chrome → Safari 降级适配：新增 Browser Adapter 与 Safari WebDriver 备用实现；Chrome 失败时按有限路径尝试 Safari，并在 Dashboard 标明适配器。22 项测试通过；真实运行时 Chrome 已恢复，Cloudflare 页面未提取指标、GSC/Semrush/品牌监控实时采集成功，Safari 真实降级待开启 Remote Automation 后验证；未提交或推送。
- Growth OS Dashboard P0 UX 收紧：Morning Collector 改为紧凑状态行；社交摘要不再显示 `Unknown`；网站与渠道详细来源改为默认折叠；GSC、Semrush、GEO、转化指标改用运营语言。Dashboard 内联脚本、22 项 Runtime/Social/Browser 测试、页面 HTTP 200 和相关文案检查通过；未提交或推送。
- X 相关性过滤：移除 X 对 Build in Public / AI builder 主题的默认匹配，新增项目相关信号过滤；更新 X 平台规则为中国采购、供应商沟通和买家问题；无关 Vibe Coding 候选不再进入候选或 Dashboard。新增过滤断言通过；Phase A 与平台策略测试通过。Workspace-flow 的既有审计数据仍有 2 个历史一致性错误，未因本次任务修改。
- X AI 内容排除：新增 AI、Codex、Vibe Coding、LLM、GPT、自动化和 workflow 排除词；刷新本地候选视图，历史发现记录保留追溯但不再作为可执行机会展示。未发布或操作 X 账号。

## 2026-07-20 Today Actions 与 Review Queue 对齐

- 修正 Morning Brief 的数据源错位：审核任务改为只读取 `data/social-agent/view.json` 的 Review Queue；Growth OS `opportunities` 不再被误标为审核。
- 空 Review Queue 不生成审核任务；显式内容计划使用“建议创作”文案；补充空队列、真实队列、状态过滤和内容计划测试。
- 未修改 Collector、Signal Engine、Dashboard 主结构、路由或外部账号操作；未提交、未推送。

## 2026-07-20 Growth OS 平台优先级

- 将 Today Actions、Morning Brief 与 Review Queue 默认顺序统一为：SEO/GEO（100）、LinkedIn 回复（90）、Quora 回复（85）、Email/Lead（80）、LinkedIn 原创（75）、Reddit 回复（60）。
- Reddit 仍保留在统一审核队列，但不会为了凑满今日三项而进入 Today Actions；真实候选排序验证为 LinkedIn 回复、Quora 回复、LinkedIn 原创、Reddit 回复。
- 未修改 Discovery、Collector、Signal Engine、Morning Collector、队列数据结构、路由或外部账号；未提交、未推送。

## 2026-07-20 Growth OS Opportunity 数量策略

- 统一审核池限制为回复最多 20 条、原创最多 10 条；按现有优先级和业务评分保留靠前候选，来源层的发现记录不因此删除。
- Today Actions 保持最多 3 项，SEO/GEO 最多占 2 项；无 URL 的 Discovery Task 与网站状态占位不再进入今日任务。
- LinkedIn、Quora 的每日人工回复上限设为 2，Reddit 设为 1；Dashboard 显示回复/原创池计数，并将最近完成展示限制为 10 条。
- 自动原创草稿每天最多生成 1 条 LinkedIn；当前没有独立的 X 自动生成分支，因此在缺少证据时保持 0。
- 未新增 Collector、路由、端口、数据库或外部账号操作；未提交、未推送。

## 2026-07-20 Growth OS 全链路逻辑修复

- 修正 Morning Brief 与 Social Agent 生命周期的边界：旧 `dashboard-view.today_plan` 中已被 Social Queue 接管的机会不再重复生成 Today Action。
- 发布生命周期增加公开 HTTPS URL 门槛；Dashboard 通过人工输入 URL 后才允许记录 `published`，并展示已发布链接。
- Reply Opportunity 的待发布按钮恢复为“标记已回复”，直接复用已知原帖链接；Original Post 仍要求填写实际发布链接。
- Leads Dashboard 改读本地 buyer-signal JSONL 兼容入口，保留原有转化 CSV；新增记录带有采集时间和人工来源标记。
- 定时 Discovery 刷新时同步重建 Signals 与 Morning Brief；DuckDuckGo 202 异步挑战记录为 `blocked`。
- scheduled Discovery 默认把 Morning Collector → Signals → Morning Brief 纳入同一轮；保留 `--skip-morning-collector` 作为显式降级选项。
- 回归验证：63 项 Node 测试、Discovery Phase A、workspace-flow、platform strategy 全部通过；未提交、未推送。
- 发布动作修正：审核通过的 Reply / Original 可直接标记完成；系统追加 published 记录后自动追加 archived 记录，保留发布时间与原帖/发布链接，Dashboard 从当前队列隐藏该项。新增生命周期回归测试；未提交、未推送。
- Ready To Publish 口径收紧为仅主动生成的 Original Post；Reply Opportunity 从待发布区移出，在待审核/待回复区继续保留，Morning Brief 仍以“回复”动作表达。新增优先级回归测试；未提交、未推送。
- Dashboard 增加单一“生成今日内容”按钮，调用现有 `/__social-agent-run` 并执行 Discovery → Social Agent → Review Queue → Morning Brief；不登录、不自动回复或发布。实跑结果：Reddit 抓取 10 条、加入 2 条；Quora/LinkedIn 当前未配置搜索 Provider，正确返回 `not_configured`。
- 更新 Social Agent 搜索关键词为用户指定的 20 个 Factory Bridge 主题；Discovery 查询生成不再只取前 6 个关键词，而是按现有轮换机制使用完整列表。
- 修正“生成今日内容”反馈：不再只显示平台新增候选数，改为显示回复机会、原创发帖和本轮新增发现的实际数量。

## 2026-07-21 Growth OS v2 Content Work Item

- Implemented the typed `content_items` Source of Truth and `ContentStore` for original content, versioned reply/publish drafts, and immutable published content.
- Added typed Unified View fields and Work Item editing/copying/published-content display in the existing Growth OS Dashboard.
- Completed production backup and explicit-content migration without changing lifecycle/status counts; v2 regression suite passes 24/24.
- Content Layer vertical slice: Today and Review Queue now reuse the same Work Item renderer; added visible original/source/reason/classification/draft status and enforced Reply Draft + Publish Draft before Ready. Temporary browser E2E reached Published with complete metadata; production DB was not written.

## 2026-07-21 Production Content Layer Completion

- 新增受控 `scripts/growth-os/runtime/v2/content-completion.mjs`：明确旧草稿优先迁移；缺失回复基于已捕获原文生成并标记 `review_required`；Publish Draft 从 Reply Draft 派生并保留版本；不伪造历史 Published Content。
- 生产库完成备份 `data/growth-os/state/growth-os-v2-before-content-completion-20260721-145935.sqlite`，按固化 dry-run 追加 12 条 Reply Draft、21 条 Publish Draft；Opportunity、Lifecycle、状态分布未变化。
- 临时库与生产校验通过：v2 测试 30/30，真实 Work Item 副本完成 Reply/Publish 版本编辑 → Approved → Ready → Published，发布事实包含时间、平台、链接，Performance 为 pending。
- 4 条历史 Published 因没有可证实正文来源保持缺失，未从旧 URL 或通用 body 推断；未提交、未推送。

## 2026-07-22 Content Integrity Gates

- 新增 `content-integrity.mjs`，统一校验正文有效性、平台、来源链接和草稿语义关联；Lifecycle API 对门禁失败返回 422，不写入 Lifecycle Event。
- Discovery 只接受明确捕获的正文，拒绝 snippet/footer/短正文；成功记录在进入 pending_review 前通过 ContentStore 保存 original、reply 和 publish draft。
- Content Completion 与迁移停止把 `snippet` 当作 original_content；旧草稿语义错配或无法确认关联时跳过。
- 临时库 `npm run test:growth:v2` 通过 35/35；生产库只读审计指纹不变，当前 14 条活动记录会被门禁阻止，未执行生产修复。

## 2026-07-22 Production Bug Audit 修复

- 统一 Dashboard 与 Lifecycle 的内容完整性判断，阻止缺失原文、回复草稿、平台、来源 URL 或发布草稿的操作按钮。
- 修复健康状态误报、relevance score/platform 未暴露、默认通用 actor、重复 DOM id；已发布/归档记录禁止继续保存草稿。
- Discovery 默认纳入 X；新原文清理 Reddit footer，历史生产内容仅计算标记，不自动迁移或覆盖。
- 临时数据库 `npm run test:growth:v2` 通过 38/38；生产 SQLite 保持只读，使用副本完成浏览器 DOM 验证。

## 2026-07-22 Production Bug Audit 回归收口

- 发现并修正旧 Social Workspace 测试仍断言已移除的 v1 Dashboard 错误文案；测试改为校验 v2 Unified View 入口并确认旧文案不存在。
- `npm run test:growth:v2` 通过 38/38；Social Workspace 与 Runtime 全量回归通过 59/59；Dashboard 内联脚本解析通过。
- 生产 Dashboard LaunchAgent 已重载到最新 v2 代码；生产 SQLite 只读，重载前后 SHA-256 均为 `34a7bf35bfbdcb5ab936493a4e71b13b50ea516936b8a723851918a6540ea0b9`。
- 生产当前状态为 pending_review 18、approved 8、ready_to_publish 1、published 4、archived 55；活动异常仍只读暴露并由门禁阻止，不自动伪造或修复历史内容。
