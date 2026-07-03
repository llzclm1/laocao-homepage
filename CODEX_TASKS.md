# CODEX_TASKS

## 进行中

- AI bot 观察：每周按 `docs/ai-bot-visibility-checklist.md` 记录三个站点 AI bot 请求、核心页抓取、404/5xx 和 sitemap/robots 状态。
- GSC 早期曝光观察：每周把 GSC 新 query/page 录入 `data/gsc/gsc-early-signals.csv`，按 `docs/gsc-query-page-analysis.md` 判断项目、意图和下一步动作；低曝光和 0 点击先观察，不自动删除/noindex。
- 技术 SEO：主站 favicon、`/contact/`、`/lab/` 兼容页已补；Cloudflare `Always Use HTTPS`、`www` 到根域名 301、默认静态扩展名 Cache Rule 已开启；GSC `sitemap.xml` 已重新提交。下一步观察 24 小时 4xx 和静态资源 cache hit rate。
- 主站 IA：旧工具和游戏实验已统一降级到 `/tools/`；如要进一步处理低质量工具页，需用户确认 noindex / sitemap 移除候选。
- 主站 Factory Bridge 入口：中英文首页买家端和工厂端链接已指向 `factory.gewuji.dev`；首页已改为暖工业品牌首页，三入口为海外买家 / 中国工厂 / 实拍素材，部署后检查线上首页导航、Hero 背景图、三入口和移动端按钮是否生效。
- 外链观察：定期把 Ahrefs / GSC 发现的外链补入 `data/backlinks/backlink-audit-log.csv`；无手动处罚前不提交 disavow。
- 干净外链第一批：LinkedIn profile、GitHub profile、GitHub README resource repository、Notion public checklist、About.me profile 已完成并补入 `data/backlinks/backlink-audit-log.csv`；下一步只做定期索引/可访问性复查。
- Godot H5 POC：`game/worldcup-godot/` 已可预览，已套入角色 PNG 并补充轻量背景/特效；下一步如继续推进，应优先做移动端手感、性能和玩法节奏验证，再决定是否替换 `/game/worldcup/`。
- Reddit 海外推广：继续找制造业、找中国供应商、找工厂相关真实问题跟帖。
- 批量回复：等待用户填写 `docs/promotion/social-reply-batch-2026-06-29.md` 的“最终回复”列，再按条目发布。
- 每日跟进：检查已发过的海外站点是否有回复、评论、私信或连接请求，及时整理潜在线索。
- 新站点发帖后：立即补进海外发帖台账，并纳入每日提醒检查范围。
- 账号包装：Facebook / LinkedIn / X / Quora 最小包装已完成。
- 下一步低频互动：Facebook `B056`、`B057`、`B060` 已发布且均显示待审核；LinkedIn `O001` 已发布；下一轮可看 `B054`、`B055` 或回访审核状态。
- LinkedIn 回访：`O001` 新帖需检查评论、连接请求和私信。
- 待发布确认：Facebook `B054`、`B055` 短评草稿已写好，是否发布等用户确认。
- 每日回访：2026-06-30 12:50 CST 已检查 Facebook / LinkedIn / Reddit / Quora / X，本轮无需要当天回复的真人线索。

## 记录

- Reddit 跟帖台账：`docs/promotion/reddit-followup-tracker.md`
- Reddit 搜索存档：`docs/promotion/reddit-search-archive.md`
- 海外发帖台账：`docs/promotion/overseas-posting-log.md`
