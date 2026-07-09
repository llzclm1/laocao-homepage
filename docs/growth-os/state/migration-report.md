# Growth OS 状态源迁移报告

迁移日期：2026-07-10

唯一生命周期状态源：`data/growth-os/state/content-lifecycle.json`

| 退役文件 | 归档位置 | 替代文件 | 影响模块 | 是否仍被读取 |
|---|---|---|---|---|
| `data/growth-os/content-status.json` | `data/growth-os/legacy/archive/content-status.json` | `data/growth-os/state/content-lifecycle.json` | 运行时、性能分析、导入校验、状态检查 | 仅历史检查 |
| `data/growth-os/social/content-lifecycle.json` | `data/growth-os/legacy/archive/social-content-lifecycle.json` | `data/growth-os/state/content-lifecycle.json` | 审核处理、审核队列、Dashboard 生成 | 仅历史检查 |
| `data/growth-os/social/social-content-status.json` | `data/growth-os/legacy/archive/social-content-status.json` | `data/growth-os/state/content-lifecycle.json` | 社媒生成、Dashboard、状态检查 | 仅历史检查 |

归档文件只作为历史检查材料，不参与状态冲突判断。`scripts/growth-os/state/state-consistency-check.mjs` 会扫描运行脚本；未来若新模块直接引用退役路径，会输出警告。
