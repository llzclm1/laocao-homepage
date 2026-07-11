# Social Execution Workspace

Growth OS 的社媒候选使用人工执行闭环，不把候选排名直接当作当天任务。

## 唯一执行状态

候选原始信息来自 existing log、公开采集、人工入池或导入；它们只提供候选本体。候选的人工处理状态、回复链接和结果事件只写入 `data/growth-os/social-discovery/candidate-actions.jsonl`。

```text
Discovered -> Inbox -> Selected for Today -> Viewed -> Draft Prepared
-> Replied -> Outcome Pending -> Received Reply / Removed / No Response
-> Buyer Signal / Partner Signal / Closed
```

`Replied` 记录真实回复 URL 后立即进入 `Outcome Pending`，避免用单个 Done 状态混淆查看、草稿、发布和结果记录。

回复 URL 必须为 HTTPS、同一平台、不同于原帖，且不能是 `localhost`、`example.com` 或回环地址。重复提交同一 URL 不追加事件。页面只能把 URL 标为 `manual` 验证，不能把结构校验表述为自动确认内容或发布成功。

## 四个工作区

- Inbox：所有候选先在这里人工确认原帖可访问、仍可回复、主题匹配且风险可接受；可选择加入今天、稍后或忽略。
- Today：默认入口，最多 3 条已选择候选。依次打开原帖、准备草稿、人工发布、粘贴真实回复 URL。
- Results：只显示已发布回复，记录删除、收到回复、买家信号、合作信号、审核请求、付费机会或无回复。
- Reports：保留平台风险、Traffic Intelligence、SEO、内容生命周期、历史报告和系统健康。

## 边界

- 不自动把 existing log、RSS、人工入池或导入候选加入 Today。
- 不自动验证登录后内容，不自动发表评论、发布、私信或修改平台状态。
- Reddit 高风险候选必须由人工确认后才可加入 Today；Dashboard 只显示风险说明和下一步，不绕过平台限制。
- Business Signals 只从 Results 的人工结果动作和已有真实发布记录计算，不把普通点赞或候选数量当作商业信号。
