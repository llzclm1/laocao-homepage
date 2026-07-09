# Content Lifecycle Schema

唯一生命周期状态文件：`data/growth-os/state/content-lifecycle.json`。

每条记录以 `id` 关联机会和内容包，并拆分以下状态字段：

| 字段 | 说明 |
|---|---|
| `status` | 兼容展示用的当前主状态 |
| `lifecycle_stage` | `discovered`、`scored`、`research_ready`、`draft_ready`、`review`、`publish`、`monitoring`、`learning` |
| `review_status` | `not_started`、`pending`、`approved`、`rejected`、`revision_required` |
| `publish_status` | `not_ready`、`ready`、`published` |
| `monitor_status` | `not_started`、`monitoring` |
| `learning_status` | `not_started`、`learning` |

主状态流转遵循 `state-rules.json`。审核操作只通过 `review-actions.jsonl` 进入状态管理器，不直接改写内容文件。
