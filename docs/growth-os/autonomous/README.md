# Growth OS Autonomous Mode

这组文档定义 Gewuji Growth OS 的自动运行模式。当前目标是把人工流程升级为“可每天运行、但关键节点仍需人工批准”的系统。

## 目标

每天自动完成：

```text
发现海外采购问题
-> 分析商业价值
-> 生成 Opportunity
-> 生成内容生产包
-> 自动审核边界
-> 生成发布候选
-> 监控 SEO / GEO
-> 生成反馈报告
```

## Agent 列表

1. Opportunity Agent
2. Research Agent
3. Content Agent
4. Review Agent
5. Publishing Agent
6. Distribution Agent
7. Monitoring Agent
8. Feedback Agent

## 边界

Autonomous Mode 不能自动发布页面，不能自动发帖，不能调用外部平台执行动作。

必须保留：

- `approval_required`
- review queue
- human checkpoint
- local JSON / Markdown workflow

## 禁止定位

- supplier verification guarantee
- factory audit
- quality inspection
- payment protection
- supplier reliability guarantee
