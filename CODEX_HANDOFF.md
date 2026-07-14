# CODEX_HANDOFF

## 2026-07-14 主站与 Factory 链接边界收口

- 主站统一导航为 Home、For Buyers、Supplier Reply Review、Field Materials、Contact，并独立指向 Factory 的 For Chinese Factories。
- `/for-buyers/` 保持 Buyer 总入口，`/supplier-reply-review/` 保持核心转化入口；广告页继续 noindex 且不进入 Discovery。
- 主站旧 `/for-factories/` canonical 已指向 Factory 最终 URL；构建与静态验证通过。

## 2026-07-13 有效积压总收口

- 当前有效主线只剩三件事：核心采购页等待 GSC 真实数据、Supplier Reply Review 等待真实转化、Social Content Agent 走人工发布闭环。
- 四篇核心 Buyer Guide、索引、Checklist 和 Supplier Reply Review 已完成 canonical、schema、内链、CTA、构建发布与站内链接审计。唯一真实缺口是 Checklist 没有结构化数据，现已补 WebPage / BreadcrumbList，并加入静态验证。
- Social Content Agent 保留 `Keywords → Opportunities → Drafts → Manual Publish`。机会列表只展示 `data/social-agent/opportunities.json` 中人工审核的真实 HTTPS URL，不再依赖 RSS、搜索结果、旧台账或 Growth OS 状态机。
- Reddit 保持 Trust Building：无链接、无品牌、无 CTA、无私信引导。当前没有未发布且已核对的 Reddit 目标 URL，因此人工队列明确暂停 Reddit，不伪造机会。
- 人工发布队列：`docs/social/manual-publish-queue-2026-07-13.md`。覆盖 LinkedIn、X、Quora、Medium、Substack、Facebook、Reddit；只准备，未发布。
- 2026-07-13 最终队列复核：LinkedIn 157 词、X 224 字符、Medium 815 词、Substack 612 词、Facebook 44 词，均可进入人工发布；Quora 缺真实问题 URL、Reddit 缺真实目标帖子，继续暂停。唯一 X 机会回复已压缩到 280 字符以内。
- GSC 28 天基线：13 展示、0 点击、平均排名 15.9；下一检查日期 2026-08-10，详见 `docs/gsc/gsc-28-day-baseline-2026-07-13.md`。
- 已取代：Growth OS Phase B、更多采集器、复杂默认 Growth OS、旧 Reddit 获客模式。
- 暂停：YouTube 扩展、游戏扩展、Growth OS 新模块和所有缺少真实数据的长期扩展。
- 当前没有可继续离线开发的有效积压；后续只由真实数据、真实目标 URL 或用户明确授权的人工发布触发。
- 旧“进行中”、批量社媒、Growth OS、游戏和 YouTube 历史任务已移至 `docs/archive/codex-tasks-history-before-2026-07-13.md`，不再作为当前任务。
- 已创建只读真实数据提醒：2026-07-20 Factory Bridge 增长数据、2026-08-10 主站 GSC 28 天、2026-08-13 Factory Bridge AI bot 与引用复查，均为北京时间 20:00。
- `CODEX_LOG.md` 有既有用户改动，本轮未将其纳入提交。`$CODEX_HOME/` 和归属不明 dirty/untracked 未处理。
- 独立运行入口为 `npm run social-agent`；正式地址 `http://127.0.0.1:8790/growth-os/dashboard`。`8787` 是旧 Growth OS 本地服务，不再作为轻量 Agent 正式入口。

## 2026-07-13 GSC 内容入口收敛

- 没有重复创建高意图文章；现有 deposit、sample、quotation comparison、factory-vs-trading 页面继续作为核心内容。
- quotation comparison 与 factory-vs-trading 已纳入 Buyer Guides 索引和静态构建发布清单。
- `/china-supplier-checklist/` 已从重定向页改为无需登录的可下载检查清单，并连接到 Buyer Guides 与 Supplier Reply Review。
- 下一步以 28 天 GSC 查询词、核心页面展示和真实点击验证，不继续扩展 Growth OS。
- Supplier Reply Review 不再使用容易失效的 mailto 表单；页面明确列出提交材料、隐私处理和后续交付。
- 旧入口 `/free-supplier-reply-review/` 已改为跳转到 `/supplier-reply-review/`，避免把高意图访客送到泛 Buyer 页面。
- quotation comparison 与 factory-vs-trading 已补 Article/Breadcrumb 结构化数据，并连接到 Checklist 与 Supplier Reply Review。
- factory-vs-trading 原有未发布文章链接已替换为正式 Buyer Guide，避免构建后 404。

## 当前状态

- 正在做 China Factory Bridge 海外推广。
- 2026-07-09 已完成今日海外社媒发布：LinkedIn 原创短帖 1 条（factory videos / visible context，成功发布但未捕获直达 share URL）、Reddit `r/AmazonFBA` 回复 1 条：`https://old.reddit.com/r/AmazonFBA/comments/1f6civi/alibaba_no_response_from_suppliers/owf9ur7/`、X 短帖 1 条：`https://x.com/llzclm_ray/status/2075066776300446041`、Substack 长文 1 条：`https://gewuji.substack.com/p/questions-to-ask-before-paying-a`。Quora 本轮未强发，避免弱内容；Medium 未继续发布。
- 2026-07-09 已同步发布台账：`docs/promotion/overseas-posting-log.md`、`docs/promotion/reddit-followup-tracker.md`、`data/marketing/social-outreach-log.csv`。下一轮每日回访需检查 7 月 9 日新增的 LinkedIn / Reddit / X / Substack 互动，并在 LinkedIn activity 中回填直达 share URL。
- 2026-07-06 前次收口曾确认主站和 factory 子站 clean；本轮 YouTube 本地素材包完成后只做本地 commit，不 push，因此 `main` 会相对 `origin/main` ahead 1。
- 2026-07-06 已按用户要求重建精简 YouTube 本地素材包：`docs/youtube-channel-plan.md`、`docs/youtube-validation-plan.md`、`docs/youtube-ai-faceless-workflow-for-gewuji.md`、`docs/youtube-4-week-validation-tracker.csv`、`scripts/content/youtube-shorts-batch-01.md`、`scripts/content/youtube-shorts-batch-01-production-manifest.csv`。本轮只做本地素材、验证框架和 AI 无脸视频 SOP；除第一条本地 POC mp4 外，不登录 / 上传 YouTube，不把视频文件纳入 git，不改网站页面、sitemap、schema 或构建脚本。
- 2026-07-07 用户已明确允许本轮临时改用 Chrome；已完成 LinkedIn / Reddit 只读回访，未发现需要当天回复的真人线索；随后已在 LinkedIn 发布 1 条原创短帖，主题为 sample approval vs mass production risk：`https://www.linkedin.com/feed/update/urn:li:share:7480108919801991168/`，无链接、无私信引导，已纳入每日回访。
- 2026-07-07 用户随后要求“不要停下来，把今天该发的都发掉”；本轮继续完成 X 原创短帖 1 条：`https://x.com/llzclm_ray/status/2074344633124159908`，以及 Reddit `r/Entrepreneurs` 回复 1 条：`https://old.reddit.com/r/Entrepreneurs/comments/1ueff34/how_do_businesses_actually_vet_suppliers_on/ow0ri1d/`。Quora 目标问题答题页两次进入后都返回 `Something went wrong`，因此未把 Quora 记为已发。
- 2026-07-07 用户登录后，已新增发布 Substack 长文 1 条：`https://gewuji.substack.com/p/a-sample-approval-is-not-production`，主题为 sample approval vs production proof。Medium 编辑器虽可进入，但本轮出现保存异常和正文错位，未记为已发；LinkedIn article 入口未继续深挖。
- 2026-07-06 已生成第一条本地视频文件：`outputs/youtube/shorts-batch-01/short-01-deposit-check.mp4`。该目录被 `.gitignore` 忽略，视频文件不进仓库；manifest 已把 `short-01-deposit-check` 标为 `local_mp4_generated`。
- 2026-07-06 新增全 AI 视频生产路线：`docs/youtube-ai-generated-production-route.md`。路线明确第一阶段不做真人口播、不露脸、不拍摄，主方案为 Remotion Skills，HyperFrames 作为备选，生成式视觉只做说明性素材。
- 当前主线是 Supplier Reply Review 转化页、Supplier Reply Review Sample Report、Buyer Guides 长尾 SEO、External GEO 分发与存活观察、Field Materials 信任背书。
- External GEO 平台数据不要猜：公开请求无法拿到真实 24h 指标，Reddit / Quora / Medium 可能返回 403、challenge 或登录限制；只有拿到后台真实数据或人工确认后再更新 views / likes / replies。
- YouTube 暂不作为当前主线；当前仅作为复用 buyer guides / external content 的本地测试渠道，不抢 Supplier Reply Review、Buyer Guides 和外部分发优先级。
- 主站路径确认：`https://gewuji.dev/` 源码在 `/Users/caocao/Documents/我的主页`；factory 子域名 `https://factory.gewuji.dev/` 源码在 `/Users/caocao/Documents/工厂桥梁`。
- 2026-07-04 紧急纠偏后：factory 子域名错误双边入口改版已回滚；主站中英文首页已按“中国工厂 / 海外买家”双边分流入口重构，未改 sitemap、robots、published_pages 或路由结构。
- 2026-07-04 已把 LinkedIn 标准 About / CTA 和 Email 开发信核心模板写入 `docs/profile-link-copy.md` 与 `docs/promotion/account-packaging-plan.md`；尚未实际改 LinkedIn 主页。
- 国内社媒不做。
- Reddit 账号：`PenFine4776`。
- Reddit 跟帖台账：`docs/promotion/reddit-followup-tracker.md`。
- Reddit 搜索存档：`docs/promotion/reddit-search-archive.md`。
- Quora 搜索存档：`docs/promotion/quora-search-archive.md`。
- X 搜索存档：`docs/promotion/x-search-archive.md`。
- 海外发帖台账：`docs/promotion/overseas-posting-log.md`。
- 自动任务：每天 09:30 检查已发过的海外站点回复和私信。
- Quora 已发布 1 条回答，后续每日回访需检查新评论、赞同和私信。
- Quora 今日新增 1 条回答：`https://www.quora.com/How-do-I-know-which-suppliers-manufacturers-are-legit-and-trustworthy-when-sourcing-on-AliBaba/answer/%E9%9B%B7%E9%B8%A3-%E6%9B%B9`，后续每日回访需检查评论、赞同和私信。
- X 已发布 1 条短帖，后续每日回访需检查回复、引用、转帖和私信。
- X 今日新增 1 条短帖：`https://x.com/llzclm_ray/status/2071503026687516804`，后续每日回访需检查回复、引用、转帖和私信。
- LinkedIn 今日新增 1 条评论：`https://www.linkedin.com/posts/cengizgunduz_chinasourcing-procurement-supplychain-share-7474821897986170880-mW2q/`，后续每日回访需检查回复和连接请求。
- X 今日搜索到 1 条中等匹配候选，已归档草稿，未自动回复。
- 已新增海外回复执行规划：`docs/promotion/overseas-reply-execution-plan-2026-06-29.md`，把 50 条候选分成今日优先、观察、暂不建议碰，并准备 10 条可交给 ChatGPT 编辑的草稿。
- 已新增第二批海外社媒候选：`docs/promotion/social-candidate-batch-2026-06-29-round2.md`，本轮主推 Reddit 候选，LinkedIn 仅少量备选，X 暂不作为主阵地。
- 已新增第三批低风险候选：`docs/promotion/social-candidate-batch-2026-06-29-round3.md`，用于明天或下一轮；仅整理未发布。
- Reddit 今日已发布 `r/Business_China` 的 Made-in-China.com private label manufacturers 回复：`https://www.reddit.com/r/Business_China/comments/1udijk9/comment/oufl1mj/`，后续每日回访需检查新回复。
- Reddit 今日已发布 `r/Entrepreneurs` 的 Made-in-China supplier vetting 回复：`https://www.reddit.com/r/Entrepreneurs/comments/1udbvfs/comment/oufqcer/`，后续每日回访需检查新回复。
- 已按用户要求改为批量候选池流程：先收集 50 条可回复位置到 `docs/promotion/social-reply-batch-2026-06-29.md`，用户在“最终回复”列填写后，再批量打开对应平台发布。
- 海外社媒回复文风：像正常人分享经验，不像销售员找客户；不主动推服务、引导私信、留联系方式或写“我可以帮你”。
- 2026-07-04 起，对外发帖/回复规则已改为：内容在项目边界内可自动写入并发布，不再逐条等待确认；关注、点赞、连接请求、主动私信、账号资料修改、删除/隐藏内容、争议性回复、正式服务承诺等高风险动作仍需先停下确认。
- 2026-07-04 10:18 尝试按新规则发布 Facebook `B054`：内容在边界内，但 Chrome 当前 Facebook 未登录，仅能读公开帖，不能评论；`B055` 涉及欺诈追讨/平台申诉，按高风险内容先停下确认。
- 2026-07-04 10:23 用户登录 Facebook 后，已发布 `B054` 评论；页面显示“待審查”。`B055` 仍按高风险内容保留确认。
- 2026-07-04 10:28 用户要求所有平台继续发后，已发布 Facebook `B055` 评论；页面显示“待審查”。当前已定稿待发布项清空。
- 2026-07-04 10:38 按“所有该发平台都发”继续执行：LinkedIn 发 `O002` 原创短帖，X 发 `O003` 原创短帖，Quora 回答 `Q004`；Reddit 仍被 network security 拦截，未能发布。
- 2026-07-04 10:49 继续复核剩余候选和私信/通知：Facebook 无新通知/私信；LinkedIn 无新私信，只有曝光/系统通知；X 无提及，私信需要 passcode；Quora 无私信，通知为推荐内容；Reddit `B005` 可读但主评论提交控件不可用，未发成功；Facebook `B058` 是供应商广告不发，`B059` 页面不可见。
- 2026-07-04 10:53 继续处理可发平台：Quora 发布 `Q005` aluminum sheet supplier verification answer；LinkedIn / X 搜索未找到合适真人求助帖，未追加评论。
- 2026-07-04 11:04 继续处理剩余候选：Quora 发布 `B011/Q006` 和 `B014/Q007`；`B012/B013/B015` 原页面不存在。Reddit 旧版页面可用，已发布 `B002`；`B003/B005` 尝试提交后未出现在用户评论页，按未成功记录。
- 2026-07-04 11:23 继续补发并验证：Reddit 发布 `R002` EXW/DDP 条款不一致回复：`https://old.reddit.com/r/Alibaba/comments/1udi4p4/firsttime_buyer_is_this_a_scam_supplier_says_ship/ovfwfsd/`；Quora 发布 `Q008` supplier authenticity verification answer：`https://www.quora.com/How-can-we-verify-the-authenticity-of-suppliers-on-Alibaba-from-China-and-India-What-methods-can-be-used-to-ensure-they-are-legitimate-producers/answer/%E9%9B%B7%E9%B8%A3-%E6%9B%B9`；X 发布 `O004` 但正文被 X 截断为后半句：`https://x.com/llzclm_ray/status/2073245584623104200`。Reddit `R001/R003/R004/R005` 提交后未在用户评论页出现，`r/ecommerce` 明确因 karma 自动移除，不计入已发。
- 2026-07-04 11:38 按“再试试”重试：X 补发完整 `O005` payment name mismatch note：`https://x.com/llzclm_ray/status/2073252920011927583`；Reddit 用更短文案成功发布 `R003` freight forwarder process check：`https://old.reddit.com/r/Alibaba/comments/1ugysty/looking_for_a_reliable_freight_forwarder_to_italy/ovg1ygw/`。
- 已新增海外账号包装方案：`docs/promotion/account-packaging-plan.md`，优先降低销售感和 Reddit 风控。
- Quora 另有 6 条相近候选问题已归档，未回答。

## 注意

- Reddit 回复以实用建议为主，不硬广、不主动拉私信。
- 发评论属于对外发言；内容在边界内时可自动发布，越界或高风险动作才需要用户确认。
- 当前 Reddit 已跟帖 5 条，另有 10 条候选帖转入搜索存档。
- `r/Alibaba` 有一条供应商产能升级草稿曾写入页面，但因规则较严、当天发帖较多，暂不提交。
- LinkedIn 继续发英文买家向内容；内容在边界内时可自动发布。
- 每日回访规则：检查已发布/已跟帖的平台互动；边界内真人回复可自动处理，点赞、主动私信、连接请求等高风险动作仍需确认。
- 台账规则：已纳入平台的发布和回复先暂存链接，半天批量更新一次跟进台账和海外发布总表；新平台首次发布仍需立即补进海外发帖台账。
- 对外内容流程：选题后判断是否在项目边界内；在边界内可直接写入并发布，越界或高风险动作先停下确认。
- 浏览器规则：海外社媒网页、账号、表单和发布/回复操作统一使用 Safari；工具无法操作 Safari 时先说明并停下。
- 海外社媒频率：每个已纳入平台每天目标发 1-2 条；回复不限次数，看到合适的真人问题或讨论就准备回复，文风去 AI 味、简单直接。
## 2026-06-29 互动检查与账号包装

- 本轮新增简报：`docs/promotion/interaction-account-packaging-2026-06-29.md`。
- Quora / X 暂无需要当天回复的真人线索；X 私信页要求加密 passcode，仍不进入。
- LinkedIn 通知需要后续在 Safari 中继续只读检查；当前工具尝试打开时实际前台显示 Edge，按项目规则已停止。
- 账号包装建议已准备：优先 X bio，其次 Quora credential/bio，再 LinkedIn headline/about；Reddit 低频保守，不放链接。

## 2026-06-30 每日互动检查

- 已复核 `docs/promotion/overseas-posting-log.md` 与 `docs/promotion/reddit-followup-tracker.md`，当前纳入每日检查的平台仍为 LinkedIn、Reddit、Quora、X。
- 本轮未新增已记录平台，也未发现台账缺口。
- Reddit 公开接口与旧版页面请求均被 403 拦截，无法在当前环境稳定确认新增楼中回复。
- LinkedIn 需按项目规则使用 Safari 只读检查；当前会话无 Safari 自动化能力，因此未进入站内通知、评论区或私信页。
- 结论：本轮无法可靠确认新的真人回复、评论、私信或连接请求；需在可用 Safari 工具下补做只读回访，再决定是否准备回复草稿。

## 2026-06-30 候选扩搜

- 用户要求继续搜各个平台，并新增 Facebook。
- 已新增 `docs/promotion/facebook-search-archive.md`，先收集 5 条公开可见的 Facebook 候选帖子，只做搜索存档和草稿方向，不做进群、评论或私信。
- 已把 5 条 Facebook 候选补进 `docs/promotion/social-reply-batch-2026-06-29.md`（`B051`-`B055`）。
- 当前 Facebook 还未发生实际对外动作，因此暂不补进 `docs/promotion/overseas-posting-log.md`，也暂不纳入每日互动回访范围。

## 2026-06-30 Facebook 草稿

- 用户确认继续推进后，已为 `B051`、`B052`、`B053` 写好英文回复草稿。
- 草稿已直接填入 `docs/promotion/social-reply-batch-2026-06-29.md` 的“最终回复”列，但仍未发布。
- 当前优先顺序：`B051` > `B052` > `B053`；如果要实际发送，仍需先做最终确认，再按平台规则操作。
- 三条草稿已进一步压短，更接近 Facebook 真人评论语气。

## 2026-06-30 Facebook 已发布

- 已在 Safari 中实际发布 Facebook 评论 3 条：`B051`、`B052`、`B053`。
- `B051` 发布后页面显示“待审核”；`B052`、`B053` 已正常提交，未见额外拦截提示。
- Facebook 已从候选阶段转为已纳入平台，已补进 `docs/promotion/overseas-posting-log.md`，后续每日回访需检查回复、评论和私信。

## 2026-06-30 Facebook 第二批候选

- 已继续补 Facebook 公开候选 5 条，新增到 `docs/promotion/facebook-search-archive.md`。
- 已把 `B056`-`B060` 补进 `docs/promotion/social-reply-batch-2026-06-29.md`，本轮仍只做候选整理，不发布。
- 当前更值得下一轮优先看的条目是 `B056`、`B057`、`B060`，问题更具体，也更像真实买家后续问题。

## 2026-06-30 轻量看板

- 已新增 `docs/promotion/overseas-ops-board.md` 作为海外推广总入口。
- 看板只保留 4 个区块：`今日回访`、`待起草`、`待发布确认`、`已发布待回访`。
- 原始明细仍留在发布总表、批量候选池和各平台搜索存档，不新增第二套流程。

## 2026-06-30 7 天起号表

- 已新增 `docs/promotion/7-day-account-warmup-plan.md`。
- 这份表只定义 7 天的轻量动作节奏，不引入新工具，不替代现有看板和台账。
- 当前建议主顺序：Facebook 评论型起号 > LinkedIn 短评论/短原创 > Quora 沉淀回答 > X 低频存在感。
- 2026-07-05 已把增长主线从“公众号 / 视频号”切到“英文 SEO + Quora + Reddit + LinkedIn/X”，新增英文栏目 `/buyer-guides/` 与首批 14 个静态 guide URL 占位页。
- 2026-07-05 已在 Chrome 发布 Quora 回答 `How can I safely buy from a supplier in China?`：`https://www.quora.com/How-can-I-safely-buy-from-a-supplier-in-China/answer/%E9%9B%B7%E9%B8%A3-%E6%9B%B9`；无链接、无私信引导，后续纳入每日回访。
- 新增策略文档：`docs/growth-channel-shift.md`、`docs/buyer-guides-content-roadmap.md`、`docs/quora-reddit-linkedin-distribution-plan.md`。
- 新增执行表：`data/content/buyer-guides-14-day-plan.csv`。
- 当前 buyer guides 先完成 URL、title、meta、H1、outline 占位和统一 CTA / 边界；正文 800-1200 词内容仍待后续按 14 天计划逐篇补写。

## 2026-06-30 Facebook 账号包装

- 已在 Safari 中确认 Facebook 个人主页简介公开可见：`Practical notes on Chinese suppliers, samples, factory visibility, and sourcing communication.`
- Facebook Day 1 最小包装按“已完成”处理；暂不假设已填写城市、工作经历或其他详细资料。
- 下一步建议进入 LinkedIn profile，准备更新 headline / about；填写和保存前仍需用户确认。

## 2026-06-30 LinkedIn 账号包装

- 已在 Safari 中确认 LinkedIn headline 保存为：`China sourcing notes | Supplier visibility, samples, factory materials, buyer-side checks`
- 现有 About 内容是个人经验记录口吻，没有链接、私信引导或服务承诺，暂不改。
- 下一步回到 Day 1/Day 2 节奏：只读回访已发位置，优先处理真人回复；需要新互动时先起草、确认后再发。

## 2026-06-30 X / Quora 账号包装

- X bio 已确认合格，未改：`Practical notes on China sourcing, supplier checks, samples, packing, and factory visibility. Specific evidence beats smooth replies.`
- Quora bio 已保存并显示：`I write practical answers about supplier checks, product samples, packaging details, and factory visibility when sourcing from China.`
- Quora credential 入口是单独表单，当前已有 `Knows Mandarin Chinese`，暂不改。

## 2026-06-30 回访结果

- 已按看板在 Safari 中只读检查 Facebook / LinkedIn / Reddit / Quora / X，未发现需要当天回复的真人线索。
- Facebook：`B051` 评论可见但无回复；`B052` 当前排序未见我方评论；`B053` 可见讨论多为供应商广告，无有效线索。
- LinkedIn：仅浏览量、首帖祝贺等系统通知，无评论、提及或连接请求。
- Reddit：通知页只显示邮件摘要提示，无新增回复/提及；本轮不逐帖翻楼。
- Quora：通知页显示无新通知。
- X：通知页仅 X Premium 促销，提及页为空，私信入口未见未读标记。
- 下一步建议：不追旧互动，优先起草 Facebook `B056`、`B057`、`B060`，继续保持短评、低销售感，发布前仍需用户确认。

## 2026-06-30 Facebook 第二批草稿

- 已在 `docs/promotion/social-reply-batch-2026-06-29.md` 为 `B056`、`B057`、`B060` 写入短评版英文草稿。
- 本轮未打开 Facebook，未发布、点赞、私信或关注。
- 如用户要发，仍需先确认最终文本，再逐条到 Safari 填入，点击提交前再次确认。

## 2026-06-30 Facebook 第二批已发布

- 已在 Safari 发布 Facebook 评论 `B056`、`B057`、`B060`。
- 三条发布后页面均显示“待审核”；未点赞、关注、私信或执行其他互动。
- 已补入 `docs/promotion/overseas-posting-log.md` 和 `docs/promotion/overseas-ops-board.md`，后续每日回访需优先看是否过审、是否有真人回复。

## 2026-06-30 低频原创草稿

- 已准备 LinkedIn / X 通用短帖 `O001`，存放在 `docs/promotion/overseas-ops-board.md` 的“待发布确认”。
- 草稿不含链接、不引导私信：`A fast supplier reply feels good, but it is not proof. Before trusting the quote, check who you are paying, what product they actually control, and whether the sample, packing, and company details match.`
- 本轮未打开平台，未发布；如用户要发，仍需进入 Safari 填入并在提交前确认。

## 2026-06-30 LinkedIn O001 已发布

- 用户确认后，已在 Safari 发布 LinkedIn 低频原创短帖 `O001`。
- 链接：`https://www.linkedin.com/feed/update/urn:li:share:7477633458249449472/`
- 本帖无链接、无私信引导、无服务承诺；后续每日回访需检查评论、连接请求和私信。

## 2026-06-30 Facebook B054/B055 草稿

- 已为 Facebook 候选 `B054`、`B055` 写入短评版英文草稿。
- 两条已从“待起草”转入 `docs/promotion/overseas-ops-board.md` 的“待发布确认”。
- 本轮未打开 Facebook，未发布、点赞、关注或私信；如要发，仍需用户确认最终文本和提交动作。

## 2026-07-02 主站入口修复

- 已将首页 footer 的工厂桥梁入口从 `https://factory.gewuji.dev/` 改为站内 `for-factories/` 和 `for-buyers/`。
- 已将首页“最近项目进展”和 `llms.txt` 最近项目进展同步到 Factory Bridge 站内入口变化。
- 本地顺序执行 `npm run build && npm run verify:static` 通过。
- 线上 `gewuji.dev/for-factories/` 和 `gewuji.dev/for-buyers/` 当前可访问；如首页仍显示旧链接，优先等待 GitHub Pages / Cloudflare 缓存刷新或手动清缓存。

## 2026-07-02 Godot H5 POC

- 已新增 Godot 版世界杯摸鱼 H5 POC，源码在 `godot/worldcup-poc/`，静态预览产物在 `game/worldcup-godot/`。
- 当前正式游戏入口仍是 Canvas 版 `game/worldcup/`，Godot 版只作为独立预览页，不替换线上主入口。
- 已把 Canvas 版世界杯角色 PNG 复用到 Godot POC：蓝色主角、巡逻同事、HR、老板、发消息主管、会议通知均已接入 `Sprite2D`。
- Godot 4.7 完整 Web 导出 CLI 仍报 preset configuration error；当前采用 `--export-pack` 生成 `index.pck`，并用官方 Web no-threads 模板文件手工封装 `index.html/js/wasm`。
- Godot Web 预览已恢复为真实 Godot 页面 `game/worldcup-godot/`，不再跳转 Canvas H5。
- 冻结原因定位为多 PackedScene/多脚本导出后 Web 运行时报 `function signature mismatch`；当前改为单场景单脚本实体管理，并使用 Godot 4.6 Web no-threads runtime/package，Playwright 12-20 秒验证可持续运行。
- 已为 Godot POC 增加轻量背景和特效：球场线、办公室贴纸/标识、桌面高光、足球尾迹、命中火花、敌人出现/击退粒子环；特效数量上限为 60，避免重新引入卡死问题。
- 最近一次导出使用 `/tmp/godot46/Godot.app/Contents/MacOS/Godot --headless --path godot/worldcup-poc --export-pack Web game/worldcup-godot/index.pck`，并通过 `npm run build:prod && npm run verify:static`。

## 2026-07-02 主站信息架构清理

- 首页已从工具/项目展示改为 Factory Bridge、Field Materials、Lab 低优先级入口。
- 旧工具 URL 未删除，统一收纳到 `/tools/`；主导航不再直接展示 World Cup Advisor、Photo Booth、Content Assistant 等临时工具。
- sitemap 已提高 `/for-buyers/`、`/for-factories/`、`/field-materials/` 权重，降低旧工具权重；noindex / 移除 sitemap 候选仍待用户确认。
- 游戏实验已标记为迁移候选，迁移建议写入 `docs/game-content-migration-plan.md`；当前未做 noindex、301 或独立游戏站页面创建。

## 2026-07-02 外链健康观察

- 已新增外链健康检查、风险策略、干净外链计划和数据表，路径见 `docs/backlink-*.md` 与 `data/backlinks/`。
- 已新增第二阶段第一批干净外链执行材料：`docs/clean-backlink-first-batch.md`、`docs/profile-link-copy.md`、`docs/github-readme-backlink-template.md`、`docs/notion-checklist-template.md`、`data/backlinks/first-batch-backlink-plan.csv`。本轮只生成文案和清单，未注册账号、未提交外链、未 push。
- 第一批干净外链已完成 1 条：GitHub profile README `https://github.com/llzclm1/llzclm1`，已记录到 `data/backlinks/backlink-audit-log.csv`。
- 第一批干净外链已完成 2 条：LinkedIn Featured link 已指向 `https://gewuji.dev/for-buyers/`，已记录到 `data/backlinks/backlink-audit-log.csv`。
- 第一批干净外链已完成 3 条：GitHub resource README `https://github.com/llzclm1/supplier-communication-notes`，已记录到 `data/backlinks/backlink-audit-log.csv`。
- 第一批干净外链已完成 4 条：Notion public checklist `https://dazzling-shade-a49.notion.site/Supplier-Communication-Checklist-Before-a-Sample-Order-391592c3c41380bba0f4e8f77a4e1289`，链接到 `https://gewuji.dev/for-buyers/`，已记录到 `data/backlinks/backlink-audit-log.csv`。
- 第一批干净外链已完成 5 条：About.me profile `https://about.me/ray_vision` 新增 `Gewuji` 链接按钮，指向 `https://gewuji.dev/`，已记录到 `data/backlinks/backlink-audit-log.csv`。
- 当前策略是记录、分类、观察；不自动购买外链，不自动 disavow，不自动提交 Google Search Console。

## 2026-07-02 AI Bot 可见性优化

- 新增 `docs/ai-bot-visibility-checklist.md`，用于每周检查 `gewuji.dev`、`games.gewuji.dev`、`factory.gewuji.dev` 的 AI bot 抓取路径、核心页覆盖、错误码和重定向。
- 主站 `sitemap.xml` 生成已收紧为：`/`、`/tools/`、`/for-buyers/`、`/for-factories/`、`/field-materials/`、`/llms.txt`、`/ai-sitemap.json`。
- 主站 `ai-sitemap.json` 口径已调整：格物集是主站 / 品牌母站，工厂桥梁是主业务项目，Lab / Tools 只收纳实验；不再把 World Cup Advisor、Photo Booth、Content Assistant 抬到 AI sitemap 核心页。
- 已通过 `npm run build:prod && npm run verify:static`。
- 未屏蔽 AI bot，未 noindex，未删除页面，未 push。

## 2026-07-03 英文首页同步

- `en/index.html` 已跟随中文首页，改为 Factory Bridge、Field Materials、Lab、Contact 的英文结构。
- 删除英文首页旧的 Personal Product Lab / Selected Work / PixRoom / Office Survivor 项目墙主叙事。
- `scripts/verify-static-hosting.mjs` 已增加英文首页定位断言，避免回退到旧口径。
- 已通过 `npm run build:prod && npm run verify:static`。

## 2026-07-05 海外平台发布

- 已在 Chrome 中发布 X 原创短帖：first supplier order checklist，无链接，后续每日回访需检查回复、引用和私信。
- 已在 Chrome 中发布 LinkedIn 原创短帖：supplier first-order assumption checklist，无链接；未捕获具体 share URL，先以 feed 入口记录，后续回访时补直达链接。
- 已在 Chrome 中发布 Reddit `r/Alibaba` DDP 价格问题回复：`https://old.reddit.com/r/Alibaba/comments/1unaq3i/question_about_ddp_price/ovno8yp/`。
- 已在 Chrome 中发布 Facebook 个人动态：first supplier order checklist；系统提示已成功与 FRIENDS 分享，无链接。
- Quora 当前 Chrome 未登录，候选问题为 `https://www.quora.com/How-can-I-safely-buy-from-a-supplier-in-China`；用户登录后可继续发布。
- 本轮未点赞、关注、连接、私信或放推广链接；Reddit 回复只给公开、具体的费用边界检查建议。

## 2026-07-03 GSC 早期曝光观察

- 已新增 GSC 早期曝光观察系统：`docs/gsc-early-signal-review.md`、`docs/gsc-query-page-analysis.md`、`docs/gsc-optimization-rules.md`、`data/gsc/gsc-early-signals.csv`。
- 当前基线：过去 3 个月点击 0、曝光 10、CTR 0%、平均排名 53；已记录示例 query `role playing game key performance indicators`。
- 当前策略是记录 query/page 对应关系并小幅优化相关页面；不因 0 点击删除页面，不自动 noindex，不改 sitemap，不 push。

## 2026-07-03 技术 SEO 小修

- 已补主站 `/favicon.ico`、轻量 `/contact/` 页面和 `/lab/` 到 `/tools/` 的兼容跳转页。
- `/contact/` 已加入主站 sitemap；首页联系入口改为真实 `contact/` 链接。
- 已通过 `npm run build:prod && npm run verify:static`。
- 已在 Cloudflare `gewuji.dev` SSL/TLS 边缘证书页开启 `始终使用 HTTPS`。验证：`http://gewuji.dev/` 现在 301 到 `https://gewuji.dev/`。
- 已在 Cloudflare 新增并启用 `www` 到根域名的 301 Redirect Rule。验证：`https://www.gewuji.dev/` 现在 301 到 `https://gewuji.dev/`。
- 已在 GSC 为 `https://gewuji.dev/` 重新提交 `sitemap.xml`，页面提示“已成功提交站点地图”；sitemap 行显示状态 `成功`，发现页面数 `63`。
- 已在 Cloudflare 新增并启用默认文件扩展名 Cache Rule：仅匹配静态文件扩展名，操作为“符合缓存条件”，未设置缓存 HTML、sitemap 或 robots。验证：`favicon.ico`、`styles.css`、`script.js`、PNG 第二次请求均为 `cf-cache-status: HIT`；首页和 `sitemap.xml` 仍为 `DYNAMIC`。
- 下一步只需观察 Cloudflare 未来 24 小时 4xx 是否下降；GSC URL Inspection 对 `/contact/` 可人工检查，但不是必须阻塞项。

## 2026-07-03 Factory Bridge 子域名入口

- 主站中英文首页的 Factory Bridge 买家端和工厂端入口已改为直接指向：
  - `https://factory.gewuji.dev/for-buyers/`
  - `https://factory.gewuji.dev/for-factories/`
- Field Materials 仍保留为主站内部入口 `field-materials/`。
- 结构化 ItemList 已同步到 factory 子域名入口。
- 已通过 `npm run build:prod && npm run verify:static`。

## 2026-07-03 首页工业档案馆视觉

- 中英文首页首屏已从冷静高级版本改为工业档案馆 / 现场图录方向：左侧品牌竖栏、真实工厂图片证据板、低圆角目录式按钮和数字条。
- `styles.css` 新增 `.atlas-home` 作用域样式，旧 `.calm-home` 样式保留未删；当前只应用到 `index.html` 和 `en/index.html`。
- OG/Twitter 首页预览图已切到 `factory-assets/workshop-wide.jpg`。
- 已通过 `npm run build:prod && npm run verify:static`，本地预览图在 `outputs/homepage-atlas-desktop.png`、`outputs/homepage-atlas-mobile.png` 和 `outputs/homepage-atlas-en-desktop.png`。

## 2026-07-03 暖工业首页强制简化

- 按用户新规格仅调整主站中文首页 `/`、英文首页 `/en/` 和首页作用域 CSS；未改 `/for-buyers/`、`/for-factories/`、`/field-materials/`、`/tools/` 或世界杯相关文件。
- 中文首页 Hero：`真实工厂 / 值得被正确理解`；英文首页 Hero：`Real Factories. / Clearly Understood.`。
- 首页结构收敛为 Hero、三入口、Contact、Lab 细条、Footer；独立 About、FAQ、服务流程和卡片主次差异已移除，Lab 不在顶部导航，不作为第四主入口。
- 当前视觉优先级为 Hero > 三入口 > Contact > Lab > Footer；桌面首屏保留主标题、副标题、三个入口按钮和真实工厂背景图。
- 字体和色彩已调整为工业杂志感：中文标题走宋体/思源宋体 fallback，英文标题走 Archivo / Space Grotesk fallback，背景为暖黑，暗金只做点缀。
- 2026-07-04 已继续提亮首页专属 `.warm-home` 色彩层级：主背景从近黑抬到暖深灰，Hero 工厂图减少压暗遮罩，文字、线条、按钮和入口区域更清楚；首页结构和文案未改。
- 2026-07-04 已把首页标题字体切到首页作用域 serif fallback，并把 Contact 改为发送现有材料的正式审阅口径；未改首页结构、服务页或 Lab 优先级。

- 2026-07-04 针对“页面没变”的反馈，已把首页标题 serif 改为系统优先的 `Songti SC` / `Georgia`，避免未加载外部字体时视觉变化不明显。
- 2026-07-04 发现线上 `styles.css` 静态缓存仍返回旧内容，已把首页字体覆盖内联到中文首页和英文首页，保证新字体优先级不依赖 CSS 缓存刷新。
- Hero 背景使用本地真实工厂图 `field-materials/nonwoven-line-02.jpg`，已人工检查未见客户名、工厂名、图纸、订单号或人员正脸；页面用暖黑遮罩弱化水印和背景干扰。
- 已通过 `npm run build:prod`、`npm run verify:static`、`git diff --check`；本轮未重新生成预览图。
- 用户明确要求不要自动 `git push`；本轮只提交本地 commit，等待用户确认后再推送。

## 2026-07-04 Factory Bridge 子页视觉统一

- `styles.css` 已新增 Factory Bridge 作用域 `.bridge-page` 视觉系统，颜色 token 与首页暖工业方向一致，但子页正文使用暖米色，适合长内容阅读。
- `/for-buyers/`、`/for-factories/`、`/field-materials/` 已从旧 CFB / Next 导出模板改为干净静态 HTML，顶部统一为 `GEWUJI` + 小字 `Factory Bridge`，Footer 统一为 `GEWUJI / Factory Bridge · Field Materials · Supplier Communication`。
- 子页 CTA / 表单统一为发送现有材料口径，邮箱为 `laocao@gewuji.dev`；不再使用 `hello@chinafactorybridge.com`、`CFB`、旧模板 Header 或高压营销词。
- `field-materials/` 已补 canonical：`https://gewuji.dev/field-materials/`，保留所有现有真实匿名工厂素材图片。
- `llms.txt` 和 `ai-sitemap.json` 生成口径已改为 `Factory Bridge by Gewuji`，保留必要长尾词，但不把 `China Factory Bridge` 作为主品牌。
- 已通过 `npm run build:prod`、`npm run verify:static`、本地链接审计和 `git diff --check`。
- 注意：本仓库部署域名仍是 `gewuji.dev`。`factory.gewuji.dev/` 根路径线上当前由其他部署源返回内容，后续若要让 factory 根入口页同步，需要先确认对应仓库或部署配置。

## 2026-07-04 定位冲突复核

- 主站可控的 `/for-buyers/` 已进一步降级为海外采购商辅助页，避免继续被理解为 supplier verification / reliability check 主服务。
- 主站可控的 `/field-materials/` 导航旧锚点已改为 `/for-factories/#material-rewrite` 和 `/for-factories/#outreach-content`，Field Materials 口径继续收敛为 Field Evidence / 实拍素材背书。
- `llms.txt` 顶部站点事实、推荐摘要和引用方式已从旧“个人产品实验室”改为“服务国内工厂的工厂对外资料重构”主线；`ai-sitemap.json` 生成脚本同步。
- 已确认 `factory.gewuji.dev` 对应另一个本地仓库 `/Users/caocao/Documents/工厂桥梁`，本仓库只部署 `gewuji.dev`。本轮主站验证通过：`npm run build:prod`、`npm run verify:static`、`git diff --check`。

## 2026-07-04 LinkedIn 主页更新

- LinkedIn headline 已保存为 `Supplier communication risk review | China sourcing signals before payment`。
- LinkedIn About 已保存为用户给定的标准文案：supplier communication signals / reply clarity / missing information / quotation risk signals。
- Featured 旧链接已恢复为原 `Gewuji Factory Bridge` 显示，避免新 CTA 指向旧 `/for-buyers/` URL。
- 用户指定 CTA URL `https://gewuji.dev/free-supplier-reply-review/` 已新增为主站静态落地页并部署成功，当前返回 200。
- LinkedIn Featured 已新增 `Review Supplier Reply`，描述为 `Structured review of Chinese supplier replies, quotations, and missing information before payment.`，链接经 LinkedIn safety 跳转指向 `https://gewuji.dev/free-supplier-reply-review/`。
- 主页最终验证通过：headline、About、新 Featured 均显示；旧 `Gewuji Factory Bridge` Featured 保留在第二位。

## 2026-07-04 Field Materials Hero Image

- `/field-materials/` and `/en/field-materials/` now use `field-materials/nonwoven-line-02.jpg` as hero, preload, OG, and Twitter image.
- The old `fastener-workshop-01.jpg` remains in the material sample gallery; only the first-screen image changed.
- `npm run build:prod` and `npm run verify:static` passed.

## 2026-07-05 Homepage Clarity Events

- `/` and `/en/` now have guarded Microsoft Clarity click events on homepage entrance and language-switch links.
- Event calls use `if (window.clarity) window.clarity("event", eventName);`.
- No visual, copy, route, sitemap, tools, games, factory subdomain, or service page changes were made.

## 2026-07-05 Gewuji GEO SOP

- Added Gewuji-specific GEO SOP, page matrix, checklist, AI prompt monitoring flow, prompt matrix CSV, and blank monitoring log CSV.
- GEO direction is buyer guides, checklist/template pages, field evidence, and factory material pages.
- Do not shift this into SaaS review, VS, alternatives, toplist, or AI tool directory tactics.

## 2026-07-05 Buyer Guides First 5 Execution

- Published only the first 5 buyer guides in build output and sitemap.
- Added Article, FAQPage, and BreadcrumbList schema, FAQ sections, and updated dates to the first 5 guides.
- Old compatibility paths stay accessible but are excluded from sitemap.
- `docs/gsc-bing-submit-checklist-2026-07-05.md` lists manual GSC / Bing submit URLs.

## 2026-07-11 Social Discovery Engine v2.1

- v2.1 只做公开内容发现、去重、主题匹配、候选排序和人工回复辅助；不登录社媒、不读取私信、不自动评论或发帖。
- Reddit 已切换到配置化 subreddit RSS；Quora、LinkedIn、X 仅使用公开搜索结果或人工粘贴/导入的真实公开 URL。旧 Reddit JSON 的 403 仅作为历史错误记录，不会继续请求。
- 候选池：`data/growth-os/social-discovery/discovered-posts.json`；人工入池：`manual-inbox.json`；关键词与 RSS 列表：`discovery-keywords.json`；失败记录：`discovery-errors.json`。
- Runtime 输出自动新发现、旧日志库存、人工入池、采集状态和候选新鲜度。超过 14 天、已回复、已删除、锁帖或已忽略的候选不进入今日机会。
- Reddit RSS dry-run 已验证返回 10 个真实公开 URL，但未写入候选池；当前持久化自动候选为 0，不能表述为稳定的每日自动发现。
- 当前自动采集没有新增已验证候选时，Dashboard 明确显示旧日志筛选与人工/搜索结果导入模式；不会把旧日志候选伪装成当天发现。

## 2026-07-11 Social Discovery v3 Phase A

- 已建立公开 Source Adapter、Reddit RSS、可配置 Search Provider、手动调度入口、来源状态和 Discovery Health；未登录、不自动互动、不安装 launchd。
- `source-status.json` 是来源运行状态源；`collection-state.json` 只保留 v2.1 的 RSS dry-run 观察。当前自动新候选仍为 0，运行模式保持 existing log + manual inbox + import。
- Phase B-D 未开始：候选验证/排序、结果回收/归因、策略反馈和完整测试需用户继续确认后再做。

## 2026-07-11 Social Execution Workspace

- 社媒候选状态统一由 `data/growth-os/social-discovery/candidate-actions.jsonl` 的事件序列推导：Inbox → Today → Viewed → Draft Prepared → Replied / Outcome Pending → Results。
- Dashboard 默认打开 Today；旧日志、RSS、手工入池和导入候选都先进入 Inbox，最多 3 条经人工确认后加入 Today，不再按排名自动生成今日任务。
- Results 记录真实回复 URL、删除、收到回复、买家/合作信号、审核请求和付费机会；Business Signals 只读取这些人工记录与真实发布数据。
- RSS 第 1 次真实采集为 0 条新候选、1 个 403、6 个 429，Health 为 Blocked；第 2、3 次仍按已创建的 Codex automation 执行。Phase B 与采集器扩张继续暂停。
