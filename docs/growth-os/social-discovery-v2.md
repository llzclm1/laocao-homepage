# Social Discovery Engine v2.1

Social Discovery Engine v2.1 用公开内容和人工导入建立候选池，再由 Runtime 完成去重、评分、新鲜度判断和 Dashboard 输出；任何外部互动仍由人工完成。

## 数据入口

- `data/marketing/social-outreach-log.csv`：已有外联日志，只作为候选库存，不会标为当天自动发现。
- Reddit RSS：读取 `discovery-keywords.json` 中配置的 subreddit 公开 RSS，每个 feed 每轮最多请求一次。
- 公开搜索 RSS：仅用于 Quora、LinkedIn、X 的公开搜索结果；没有真实可访问 URL 时不入池。
- `data/growth-os/social-discovery/manual-inbox.json`：Dashboard 手工粘贴公开 URL 后的本地记录。
- `scripts/growth-os/discovery/import-social-opportunities.mjs`：导入 JSON 或 CSV 搜索结果。

不登录社媒、不读取私信、不使用 Cookie、不绕过访问限制、不自动评论、发帖、点赞、关注或修改平台状态。

## 运行方式

```bash
node scripts/growth-os/discovery/collect-social-opportunities.mjs
node scripts/growth-os/discovery/collect-social-opportunities.mjs --platform reddit --limit 10
node scripts/growth-os/discovery/import-social-opportunities.mjs --file /absolute/path/results.json --platform linkedin
node scripts/growth-os/discovery/import-social-opportunities.mjs --file /absolute/path/results.csv --dry-run
```

采集器按平台每天最多运行一次，间隔不足一小时或同日已采集时会跳过，`--dry-run` 同样不会绕过频率保护且不会写文件。单个 RSS 或搜索源失败只记录到 `discovery-errors.json`，不会重试同一来源或尝试绕过限制。

导入字段为 `url`、`title`、`snippet`、`author`、`platform`、`discovered_at`。标题和公开 URL 缺失时拒绝导入。Dashboard 的手工收集表单对应 URL、平台、主题、作者（可选）和简短说明（可选）。

## 候选字段与去重

原始候选池是 `data/growth-os/social-discovery/discovered-posts.json`。每条候选包含公开 URL、标题、摘要、作者、来源、评分、风险和人工审核标记，以及：

- `first_seen_at`：首次进入候选池的时间。
- `last_seen_at`：最近一次在输入中出现的时间。
- `age_days`：以首次发现时间计算的候选年龄。
- `freshness_status`：0-3 天 `Fresh`、4-7 天 `Recent`、8-14 天 `Aging`、超过 14 天 `Archive`。

`Archive`、`replied`、`removed`、`locked`、`ignored` 和 `Ignore` 候选不会进入 Today's Opportunities。

去重优先级为规范化 URL、平台帖子 ID、标题与域名哈希。规范化会去掉 fragment 与 `utm_*`、`ref`、`trk`、`tracking`、`source`、`fbclid`、`gclid` 等追踪参数，不会删除路径里的帖子标识。

## Dashboard 解释

Dashboard 由 `dashboard-generator.mjs` 生成，显示：

- 自动新发现：本轮 RSS / 公开搜索实际加入的候选。
- 旧日志库存：来自 `social-outreach-log.csv` 的可行动候选。
- 人工入池与搜索导入：本地收集的真实公开 URL，单独标识来源。
- 新鲜度、平台采集状态、最近采集时间与最近一次自动成功发现。

当自动采集为 0 时，Dashboard 明确显示“今天没有发现新的已验证自动公开机会；系统当前处于旧日志筛选与人工导入模式”。不会把旧日志候选当成今天抓取的帖子。

## 评分、风险与人工审核

- High：同时出现明确采购场景和求助/风险信号。
- Medium：与采购或工厂沟通相关，但意图较弱。
- Low / Ignore：不作为今日行动。
- Reddit：默认 High risk，只允许 comment-first、无链接、无项目提及；人工先确认帖子未删除、锁定或过旧。
- Quora、LinkedIn、X：默认 Medium risk，只接受人工确认可访问且语境合适的公开 URL。

Suggested Comment 只基于公开标题和摘要生成，控制在 80-180 个英文词以内，不含链接、服务推销、`DM me`、网站引导或可靠性承诺。每条候选均需要人工审核后才能采取外部动作。

## 当前限制

2026-07-11 的 Reddit RSS dry-run 曾验证返回 10 个真实公开 URL，但 dry-run 不写入候选池；当前持久化自动候选为 0。该结果只证明 RSS 适配器可工作，不表示系统已经稳定地每日自动产出新候选。

公开 RSS 或搜索结果可能因区域化、访问限制或缺少相关公开内容而返回 0。当前自动来源为 0 时，系统不是实时社媒爬虫，而是旧日志筛选与人工/搜索结果导入模式。任何来源受限时都不会用虚构 URL、作者或互动数据填补结果。
