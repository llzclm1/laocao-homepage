# Social Discovery v3 Phase A

Social Discovery v3 的第一阶段建立公开机会采集和健康观察骨架。系统自动采集和分析公开信息，但不自动执行任何社媒互动。

## 已实现范围

- Source Adapter：每个来源统一返回平台、来源名、采集方式、状态、时间、候选、错误和冷却规则。
- Reddit RSS：按 `sources.json` 中的 subreddit 清单逐个低频读取公开 Atom/RSS；每个 feed 单次最多请求一次。
- Search Provider：仅在合法环境变量配置后调用；未配置时返回 `Search provider not configured`，不伪造候选。
- 调度入口：`run-scheduled-discovery.mjs` 默认每日一次，并有六小时最低间隔；`--force` 只供人工使用。
- Source Health：记录来源状态、连续失败、最近成功运行、最近新候选和手动模式。

## Source Adapter

当前适配器位于 `scripts/growth-os/discovery/sources/`：

- `reddit-rss-source.mjs`：公开 subreddit RSS。
- `search-source.mjs`：通过 Provider 发现 Quora、LinkedIn、X 的公开具体帖子 URL。

每个适配器返回：

```json
{
  "platform": "reddit",
  "source_name": "reddit_rss:supplychain",
  "source_method": "reddit_rss",
  "collection_status": "success",
  "collected_at": "",
  "items": [],
  "errors": [],
  "rate_limit": { "max_requests_per_run": 1, "cooldown_hours": 12 }
}
```

403 或 429 会把该来源标为 `blocked` 并进入冷却，不会重试、绕过限制、使用 Cookie 或登录。

## 配置与运行

来源配置：`data/growth-os/social-discovery/sources.json`。

```bash
npm run discovery:scheduled
node scripts/growth-os/discovery/run-scheduled-discovery.mjs --dry-run --platform quora --source search
node scripts/growth-os/discovery/run-scheduled-discovery.mjs --force --platform reddit --source rss --limit 10
```

`--force` 只能由人工明确运行。系统不会自动安装计划任务。

可选的 Search Provider 环境变量：

```text
SOCIAL_DISCOVERY_SEARCH_PROVIDER
SOCIAL_DISCOVERY_SEARCH_ENDPOINT
SOCIAL_DISCOVERY_SEARCH_API_KEY
SOCIAL_DISCOVERY_SEARCH_RESULTS_FILE
```

密钥不写入仓库。Provider 期望返回 `items` 或 `results` 数组，元素包含公开 URL、标题、摘要、作者（可选）和发布时间（可选）。没有合法配置时，系统只运行 RSS、existing log、manual inbox 和 JSON/CSV import。

`com.gewuji.social-discovery.plist.example` 是 08:00 本地运行的模板。启用前需把 `PROJECT_ROOT` 替换为本机项目路径并确认 Node 路径；本轮未安装 launchd 任务。

## 运行数据

- `source-status.json`：采集来源状态的唯一运行状态。
- `collection-runs.json`：每次采集的来源数量、原始条目、验证条目、新增、重复、拒绝和错误数。
- `discovery-health.json`：Healthy、Degraded、Blocked 或 Manual Mode。
- `collection-state.json`：仅保留 v2.1 的 Reddit RSS dry-run 历史观察，不再作为来源状态源。

当前真实状态：RSS dry-run 曾返回 10 个公开 URL，但未持久化；自动新候选仍为 0。稳定自动采集尚未验证，连续三次真实间隔采集尚未完成。Dashboard 必须保持 `existing log + manual inbox + import` 模式提示，不得把旧库存或 dry-run 结果标为当天新发现。

Quora 与 LinkedIn 当前通过 `SOCIAL_DISCOVERY_SEARCH_RESULTS_FILE` 读取本地公开结果文件。该模式验证的是导入、筛选、审核队列和 Morning Brief 的链路，不代表每天都有稳定的在线自动发现。观察期需单独记录结果文件的更新时间、来源状态、候选数量和是否确实新增；在连续多日由上游刷新并验证前，不把这两个平台标为稳定自动采集。

## 平台边界

Social Discovery v3 automates public opportunity discovery and analysis.

It does not automate social engagement.

Human approval is required before every comment, reply, post, message, follow, or other external platform action.

不登录、不读取私信、不使用 Cookie、不绕过 robots、验证码、登录墙或访问限制，不使用代理池和浏览器模拟批量操作。

## 后续阶段

- Phase B：候选验证、新鲜度排序和回复模板重复风险。
- Phase C：人工状态回收与 Attribution。
- Phase D：每周策略反馈、完整回归测试和三次间隔采集观察。

本轮只完成 Phase A，Phase B 尚未开始，未自动进入后续阶段。
