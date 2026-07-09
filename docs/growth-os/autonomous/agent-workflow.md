# Agent Workflow

## Daily Flow

```text
Opportunity Agent
-> Research Agent
-> Content Agent
-> Review Agent
-> Publishing Agent
```

Daily run 只生成候选，不发布。

## Weekly Flow

```text
Monitoring Agent
-> Feedback Agent
-> Opportunity Agent
```

Weekly run 生成 SEO / GEO / content performance 报告，并把下一步建议写回队列。

## Agent Handoff

每个 agent 输出必须包含：

- `id`
- `status`
- `input_files`
- `output_files`
- `approval_required`
- `next_action`

## 状态流

```text
captured
-> researched
-> opportunity_scored
-> content_package_ready
-> review_approved
-> publishing_candidate
-> approval_required
-> page_published
-> distribution_draft
-> monitoring
-> optimization_candidate
```
