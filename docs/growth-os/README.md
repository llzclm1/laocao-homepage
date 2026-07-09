# Gewuji Growth OS Phase 1

这套工作流解决一个问题：把 Gewuji 的想法先固定成可评估的机会，再进入内容、分发、监控和反馈闭环。

## 目标

Growth OS v1 是内部工作流，不是 SaaS，不是自动发帖工具，也不是批量 AI 内容系统。

流程：

```text
想法
-> 机会队列
-> SEO / buyer value 评分
-> 内容生产
-> 人工分发
-> GEO / GSC / 外部反馈监控
-> Buyer Intelligence 沉淀
```

## 固定入口

所有新想法先进入：

- `docs/growth-os/opportunities/queue.md`

通过评分后进入：

- `docs/growth-os/seo-opportunities/keyword-opportunity-table.md`

进入内容生产后使用：

- `docs/content-pipeline/README.md`

发布后进入人工分发队列：

- `docs/social/queue/README.md`

每周监控 AI 搜索和外部可见度：

- `docs/geo-monitoring/README.md`

结构化机会记录：

- `data/growth-os/opportunities.jsonl`

## 必填字段

每个机会必须记录：

- buyer question
- source
- intent
- existing page
- score
- decision
- next action
- owner / status
- boundary risk

## 状态

只使用这些状态：

- `captured`
- `scored`
- `approved`
- `brief_ready`
- `draft_ready`
- `human_review`
- `published`
- `distributed`
- `monitoring`
- `improve_or_stop`
- `rejected`

## 边界

禁止：

- 自动发帖
- 自动评论
- 批量 AI 文章
- 自动抓取登录墙
- 保存客户隐私
- 把 Growth OS 做成 SaaS

允许：

- 人工记录真实问题
- 人工确认机会
- 生成待审核 brief
- 生成待审核外部回复草稿
- 记录匿名反馈
- 用数据决定更新、合并、暂停或放弃内容

## 当前样例

第一条已进入流程的样例：

- buyer question: `questions before ordering samples from China`
- source: 现有 Buyer Guide brief
- status: `brief_ready`
- next action: 生成正式页面草稿或进入人工审核
