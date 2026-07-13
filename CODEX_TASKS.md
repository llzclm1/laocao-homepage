# CODEX_TASKS

## 2026-07-13 GSC 内容入口

- [x] 将 quotation comparison 与 factory-vs-trading 两篇现有 Buyer Guide 纳入正式构建和索引。
- [x] 将 `/china-supplier-checklist/` 从跳转页改为可直接使用和下载的免费清单。
- [ ] 发布后观察 28 天 GSC 查询词、核心页面展示和自然点击。
- [x] 将 Supplier Reply Review 从不稳定的 mailto 表单改为明确的邮件提交入口。
- [x] 修正 `/free-supplier-reply-review/` 到正式 Review 页面。
- [x] 为 quotation comparison 与 factory-vs-trading 页面补结构化数据和明确转化内链。
- [x] 清理 factory-vs-trading 页面指向未发布文章的 404 链接。

## 进行中

- Social Discovery：RSS 三次真实采集仍在验证，Phase B 保持暂停。当前优先级是人工执行闭环：Inbox 审核候选 → Today 最多 3 条 → 录入真实回复 URL → Results 记录真实结果；不要自动安装 launchd 或执行社媒互动。

- 当前主线：Supplier Reply Review 转化页、Supplier Reply Review Sample Report、Buyer Guides 长尾 SEO、External GEO 分发与存活观察、Field Materials 信任背书。
- External GEO 反馈回填：只在拿到后台真实数据或人工确认后更新 views / likes / replies；公开请求遇到 403、challenge 或登录限制时不要造数。
- YouTube：精简本地素材包已完成；暂不作为当前主线。后续只有用户明确要求时才生成真实 `.mp4`、登录 / 上传 YouTube 或扩展 4 周真实发布数据。
- AI bot 观察：每周按 `docs/ai-bot-visibility-checklist.md` 记录三个站点 AI bot 请求、核心页抓取、404/5xx 和 sitemap/robots 状态。
- GSC 早期曝光观察：每周把 GSC 新 query/page 录入 `data/gsc/gsc-early-signals.csv`，按 `docs/gsc-query-page-analysis.md` 判断项目、意图和下一步动作；低曝光和 0 点击先观察，不自动删除/noindex。
- 技术 SEO：主站 favicon、`/contact/`、`/lab/` 兼容页已补；Cloudflare `Always Use HTTPS`、`www` 到根域名 301、默认静态扩展名 Cache Rule 已开启；GSC `sitemap.xml` 已重新提交。下一步观察 24 小时 4xx 和静态资源 cache hit rate。
- 主站 IA：旧工具和游戏实验已统一降级到 `/tools/`；如要进一步处理低质量工具页，需用户确认 noindex / sitemap 移除候选。
- 主站 Factory Bridge 入口：中英文首页已改为“中国工厂 / 海外买家”双边分流入口；主站可控 `/for-buyers/` 已降级为海外采购商辅助页，`/field-materials/` 为 Field Evidence / 实拍素材背书。部署后检查首页双入口、底部双 CTA、Field Materials 图片和移动端按钮是否生效。
- 新增长主线：英文 SEO + Quora + Reddit + LinkedIn / X。`/buyer-guides/` 已落栏目页和 14 个英文 guide 占位 URL；下一步按 `data/content/buyer-guides-14-day-plan.csv` 逐篇补正文并做渠道拆分。
- Factory 子域名源头：`factory.gewuji.dev` 实际源码在 `/Users/caocao/Documents/工厂桥梁`；本仓库 `CNAME` 为 `gewuji.dev`，当前只控制主站静态页面。两个仓库都需要部署后才能让线上主站和子域名完全同步。
- 外链观察：定期把 Ahrefs / GSC 发现的外链补入 `data/backlinks/backlink-audit-log.csv`；无手动处罚前不提交 disavow。
- 干净外链第一批：LinkedIn profile、GitHub profile、GitHub README resource repository、Notion public checklist、About.me profile 已完成并补入 `data/backlinks/backlink-audit-log.csv`；下一步只做定期索引/可访问性复查。
- Godot H5 POC：`game/worldcup-godot/` 已可预览，已套入角色 PNG 并补充轻量背景/特效；下一步如继续推进，应优先做移动端手感、性能和玩法节奏验证，再决定是否替换 `/game/worldcup/`。
- Reddit 海外推广：继续找制造业、找中国供应商、找工厂相关真实问题跟帖。
- 批量回复：内容在项目边界内时可直接按条目发布；越界或高风险动作先停下确认。
- 每日跟进：检查已发过的海外站点是否有回复、评论、私信或连接请求，边界内回复可自动处理，潜在线索继续记录。
- 新站点发帖后：立即补进海外发帖台账，并纳入每日提醒检查范围。
- 账号包装：Facebook / X / Quora 最小包装已完成；LinkedIn headline、About 和 Featured `Review Supplier Reply` 已按新标准实际保存。后续只需按每日回访检查互动、私信和连接请求。
- 下一步低频互动：Facebook `B054`、`B055`、`B056`、`B057`、`B060` 已发布且均显示待审核；LinkedIn `O001`、`O002` 已发布；X `O003`、`O004`、`O005` 已发布，其中 `O004` 文本被平台截断、`O005` 为完整补发；Quora `Q004`、`Q005`、`Q006`、`Q007`、`Q008` 已发布；Reddit `B002`、`R002`、`R003` 已发布。下一轮优先回访审核状态和真人回复。
- LinkedIn 回访：`O001` 新帖需检查评论、连接请求和私信。
- 待发布处理：暂无已定稿待发布项；Reddit `B003/B005/R001/R003/R004/R005` 已尝试但提交后未在用户评论页出现，`r/ecommerce` 因 karma 自动移除，Facebook `B058` 是供应商广告不发，`B059` 页面不可见。
- 每日回访：2026-06-30 12:50 CST 已检查 Facebook / LinkedIn / Reddit / Quora / X，本轮无需要当天回复的真人线索。
- 2026-07-05 已发布 X / LinkedIn / Facebook 原创短帖各 1 条，并在 Reddit `r/Alibaba` 发布 DDP price 回复 1 条；用户登录 Quora 后已补发 `How can I safely buy from a supplier in China?` 回答，下一步回访这些新发布位置是否有真人回复。
- 2026-07-07 已完成 LinkedIn / Reddit 只读回访：Reddit inbox 为空，LinkedIn 只有系统曝光提醒、无新消息、无连接请求。已新增 LinkedIn 原创短帖 1 条，主题为 sample approval vs mass production risk；下一步回访该帖评论、私信和连接请求。
- 2026-07-07 已继续发完今日可稳发内容：X 原创短帖 1 条、Reddit 回复 1 条；Quora 目标问题答题页异常，暂未发成。下一步回访今天新增的 LinkedIn / X / Reddit 三条内容。
- 2026-07-07 已新增 Substack 长文 1 条；下一步把它也纳入每日回访。Medium 保存异常、Quora 答题页异常，后续如继续扩平台，优先重试这两个。

## 记录

- Reddit 跟帖台账：`docs/promotion/reddit-followup-tracker.md`
- Reddit 搜索存档：`docs/promotion/reddit-search-archive.md`
- 海外发帖台账：`docs/promotion/overseas-posting-log.md`

## 2026-07-04 Field Materials Hero Image

- Done: `/field-materials/` 首屏图已换为 `nonwoven-line-02.jpg`，中英文页同步。
- Done: 分享预览图和 preload 已同步。
- Next: 部署后检查线上首屏图片是否刷新。

## 2026-07-05 Homepage Clarity Events

- Done: `/` and `/en/` homepage entrance clicks now trigger Clarity custom events.
- Done: event calls are guarded by `window.clarity`.
- Next: after deployment, verify events appear in Clarity custom events.

## 2026-07-05 Buyer Guides Shift

- Done: added `/buyer-guides/` index page and 14 buyer-guide static placeholder pages.
- Done: added `docs/growth-channel-shift.md`, `docs/buyer-guides-content-roadmap.md`, `docs/quora-reddit-linkedin-distribution-plan.md`, and `data/content/buyer-guides-14-day-plan.csv`.
- Next: write the first full 800-1200 word guide and start the 14-day publish/distribution cycle.

## 2026-07-05 Gewuji GEO SOP

- Done: added GEO SOP, page matrix, checklist, AI prompt monitoring flow, prompt matrix CSV, and blank monitoring log CSV.
- Next: use `data/geo/gewuji-prompt-matrix.csv` for weekly manual AI prompt tests.

## 2026-07-05 Buyer Guides First 5 Execution

- Done: publish only first 5 buyer guides in build output and sitemap.
- Done: add Article / FAQPage / BreadcrumbList schema to those guide pages.
- Done: keep old paths accessible but out of sitemap.
- Next: after deployment, manually submit the URLs in `docs/gsc-bing-submit-checklist-2026-07-05.md`.

## 2026-07-06 YouTube Local Validation Pack

- Done: rebuilt the compact YouTube local asset pack for Gewuji Supplier Review.
- Done: added the channel plan, first 5 Shorts production pack, production manifest, 4-week validation plan, and blank 4-week tracker.
- Done: added `docs/youtube-ai-faceless-workflow-for-gewuji.md` to adapt AI faceless video production into a boundary-safe Gewuji SOP.
- Done: generated the first local Short video at `outputs/youtube/shorts-batch-01/short-01-deposit-check.mp4`; mp4 stays ignored under `outputs/`.
- Done: kept scope local only: generated mp4 stays ignored under `outputs/`; no YouTube login/upload, no website pages, no sitemap, no schema, and no build-script changes.
- Done: added `docs/youtube-ai-generated-production-route.md` for the no-talking-head, all-AI production route.
- Next: if requested later, generate real Shorts with the existing local `ffmpeg` workflow and fill tracker metrics only from real YouTube / analytics data.
