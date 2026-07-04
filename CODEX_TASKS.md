# CODEX_TASKS

## 进行中

- AI bot 观察：每周按 `docs/ai-bot-visibility-checklist.md` 记录三个站点 AI bot 请求、核心页抓取、404/5xx 和 sitemap/robots 状态。
- GSC 早期曝光观察：每周把 GSC 新 query/page 录入 `data/gsc/gsc-early-signals.csv`，按 `docs/gsc-query-page-analysis.md` 判断项目、意图和下一步动作；低曝光和 0 点击先观察，不自动删除/noindex。
- 技术 SEO：主站 favicon、`/contact/`、`/lab/` 兼容页已补；Cloudflare `Always Use HTTPS`、`www` 到根域名 301、默认静态扩展名 Cache Rule 已开启；GSC `sitemap.xml` 已重新提交。下一步观察 24 小时 4xx 和静态资源 cache hit rate。
- 主站 IA：旧工具和游戏实验已统一降级到 `/tools/`；如要进一步处理低质量工具页，需用户确认 noindex / sitemap 移除候选。
- 主站 Factory Bridge 入口：中英文首页已改为“国内工厂对外资料重构 / 海外开发内容 / 实拍素材背书”主线；主站可控 `/for-buyers/` 已降级为海外采购商辅助页，`/field-materials/` 为 Field Evidence / 实拍素材背书。部署后检查首页三入口、子页 Header / Footer、Field Materials 图片和移动端按钮是否生效。
- Factory 子域名源头：`factory.gewuji.dev` 实际源码在 `/Users/caocao/Documents/工厂桥梁`；本仓库 `CNAME` 为 `gewuji.dev`，当前只控制主站静态页面。两个仓库都需要部署后才能让线上主站和子域名完全同步。
- 外链观察：定期把 Ahrefs / GSC 发现的外链补入 `data/backlinks/backlink-audit-log.csv`；无手动处罚前不提交 disavow。
- 干净外链第一批：LinkedIn profile、GitHub profile、GitHub README resource repository、Notion public checklist、About.me profile 已完成并补入 `data/backlinks/backlink-audit-log.csv`；下一步只做定期索引/可访问性复查。
- Godot H5 POC：`game/worldcup-godot/` 已可预览，已套入角色 PNG 并补充轻量背景/特效；下一步如继续推进，应优先做移动端手感、性能和玩法节奏验证，再决定是否替换 `/game/worldcup/`。
- Reddit 海外推广：继续找制造业、找中国供应商、找工厂相关真实问题跟帖。
- 批量回复：内容在项目边界内时可直接按条目发布；越界或高风险动作先停下确认。
- 每日跟进：检查已发过的海外站点是否有回复、评论、私信或连接请求，边界内回复可自动处理，潜在线索继续记录。
- 新站点发帖后：立即补进海外发帖台账，并纳入每日提醒检查范围。
- 账号包装：Facebook / LinkedIn / X / Quora 最小包装已完成。
- 下一步低频互动：Facebook `B054`、`B055`、`B056`、`B057`、`B060` 已发布且均显示待审核；LinkedIn `O001`、`O002` 已发布；X `O003`、`O004`、`O005` 已发布，其中 `O004` 文本被平台截断、`O005` 为完整补发；Quora `Q004`、`Q005`、`Q006`、`Q007`、`Q008` 已发布；Reddit `B002`、`R002`、`R003` 已发布。下一轮优先回访审核状态和真人回复。
- LinkedIn 回访：`O001` 新帖需检查评论、连接请求和私信。
- 待发布处理：暂无已定稿待发布项；Reddit `B003/B005/R001/R003/R004/R005` 已尝试但提交后未在用户评论页出现，`r/ecommerce` 因 karma 自动移除，Facebook `B058` 是供应商广告不发，`B059` 页面不可见。
- 每日回访：2026-06-30 12:50 CST 已检查 Facebook / LinkedIn / Reddit / Quora / X，本轮无需要当天回复的真人线索。

## 记录

- Reddit 跟帖台账：`docs/promotion/reddit-followup-tracker.md`
- Reddit 搜索存档：`docs/promotion/reddit-search-archive.md`
- 海外发帖台账：`docs/promotion/overseas-posting-log.md`
