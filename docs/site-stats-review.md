# 网站统计自动复盘任务

## 使用方式

每 3 天运行：

```sh
npm run stats:review
```

脚本会读取 `tools/site-stats-review/input/` 下的导出文件，并生成：

```text
outputs/stats-reviews/YYYY-MM-DD.md
```

目前支持文件名包含以下关键词的 CSV 或 JSON：

- GA4：`ga4`、`google`、`analytics`
- Clarity：`clarity`
- Cloudflare：`cloudflare`、`cf`

没有 API 权限时，把三家后台最近 3 天的数据导出后放到 `tools/site-stats-review/input/` 即可。原始导出文件已加入 `.gitignore`，避免误提交。

## 需要的 API Key / Token

可接 API 时建议准备：

- Google Analytics Data API：GA4 Property ID、Google Cloud Service Account JSON、只读 Analytics 权限
- Microsoft Clarity：Clarity Project ID、API Token
- Cloudflare Analytics：Account ID 或 Zone ID、API Token，权限至少包含 Analytics Read、Zone Read、Firewall Events Read

这些密钥放在 `.env.local`，不要提交到 Git：

```text
GA4_PROPERTY_ID=
GOOGLE_APPLICATION_CREDENTIALS=
CLARITY_PROJECT_ID=
CLARITY_API_TOKEN=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
```

## 本地脚本结构

```text
scripts/generate-stats-review.mjs       # 生成中文复盘报告
tools/site-stats-review/input/          # 放 GA、Clarity、Cloudflare 导出文件
outputs/stats-reviews/                  # 生成的 Markdown 报告
```

## 定时任务方案

当前仓库已提供本地命令，最小定时方案是每 3 天执行：

```sh
npm run stats:review
```

如果接入 API，把采集逻辑加到同一个脚本前半段即可：先拉最近 3 天数据，再复用现有报告生成逻辑。

## 报告输出格式

报告固定输出 7 段：

1. 总体结论
2. 真实访问判断
3. 三个平台数据对比
4. 来源渠道分析
5. 用户行为分析
6. 异常流量分析
7. 下一个 3 天建议

判断优先级：

- 真人访问：优先看 GA 用户/会话 + Clarity 录屏/滚动/点击
- 是否看懂页面：优先看 Clarity 滚动、停留、Rage clicks、Dead clicks、Quick backs
- 异常流量：用 Cloudflare 请求、Bot、安全拦截、国家/路径辅助判断
- Cloudflare 独立访客不直接当真实用户数

## 推送方式

已支持本地 Markdown 文件。后续可加：

- 邮箱：用现有邮件服务发送最新 Markdown
- 飞书：Webhook 推送报告摘要和文件路径
- 微信：企业微信机器人 Webhook

建议先跑 1-2 次本地 Markdown，确认字段和判断口径稳定后再加推送，避免把无效数据定时发出去。
