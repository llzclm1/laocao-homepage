# Autonomous Architecture

Growth OS Autonomous System v1 是本地优先的自动化架构。它自动生成候选和报告，但不自动发布。

## 系统结构

```text
Data Sources
-> Opportunity Agent
-> Research Agent
-> Content Agent
-> Review Agent
-> Publishing Agent
-> Distribution Agent
-> Monitoring Agent
-> Feedback Agent
```

## 数据源

- Google Search 手动导出的 query
- Reddit / Quora / LinkedIn 手动收集的问题链接
- AI Search 手动检查结果
- Supplier Questions
- Customer Conversations
- GSC / Cloudflare / 外部回复的手动记录

v1 不联网爬取，不登录平台，不调用真实 API。

## 输出

- `data/growth-os/opportunities.jsonl`
- `data/growth-os/content-status.json`
- `docs/content-pipeline/<go-id>/`
- `docs/social/queue/`
- `docs/geo-monitoring/`

## 控制点

任何进入网站页面、社媒发布、客户联系、外部平台互动的动作，都必须停在人工批准节点。
