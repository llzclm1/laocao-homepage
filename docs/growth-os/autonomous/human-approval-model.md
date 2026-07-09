# Human Approval Model

Autonomous Mode 的核心限制：AI 可以生成，不能自动发布。

## Approval Flow

```text
AI generated
-> Review Queue
-> Human approval
-> Publish or reject
```

## 必须人工批准

- 新网站页面
- 已上线页面修改
- 社媒发布
- Quora / Reddit / LinkedIn 回复
- Newsletter / Substack 内容
- 任何外部互动

## `approval_required`

任何发布候选必须带：

```json
{
  "approval_required": true,
  "approved_by": null,
  "approved_at": null
}
```

## 禁止

- AI 自动无限创建页面
- AI 自动提交网站内容
- AI 自动发帖
- AI 自动私信
- AI 自动判断供应商可靠
- AI 自动生成保证结论
