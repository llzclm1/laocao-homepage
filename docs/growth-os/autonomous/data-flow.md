# Data Flow

## Input

Autonomous Mode v1 只读取本地文件：

- `data/growth-os/opportunities.jsonl`
- `data/growth-os/state/content-lifecycle.json`
- `docs/content-pipeline/`
- `docs/social/queue/`
- `docs/geo-monitoring/`

未来可增加人工导入文件：

- `data/growth-os/source-questions.jsonl`
- `data/growth-os/monitoring-results.jsonl`
- `data/growth-os/distribution-results.jsonl`

## Output

```text
source question
-> opportunity item
-> content package
-> review result
-> publishing candidate
-> distribution draft
-> monitoring result
-> feedback item
```

## Data Rule

不要保存私人客户名、邮箱、完整聊天记录、付款账号或平台登录数据。

只保存匿名问题、页面 URL、状态、分数、边界风险和下一步动作。
