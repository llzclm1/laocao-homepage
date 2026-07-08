# Gewuji Social Intelligence Agent

## 1. Agent 目标

每天扫描：

- Reddit
- Quora
- LinkedIn 公开内容
- YouTube 评论
- 行业论坛（可行时）

发现：

与以下主题相关的问题：

- China supplier
- China factory
- sourcing
- supplier quote
- sample order
- payment terms
- factory video
- MOQ
- manufacturing

---

## 2. 信息筛选

每条发现内容分析：

Question:

用户原问题

Platform:

来源平台

User Intent:

用户真正想解决什么

Purchase Stage:

采购阶段：

- research
- supplier selection
- sample
- payment
- production

Opportunity:

是否值得回复

Priority:

A/B/C

---

## 3. 回复生成

AI 生成三个版本：

### Reddit Style

特点：

像真实用户交流。

不营销。

先解决问题。

### LinkedIn Style

特点：

专业观点。

适合行业讨论。

### Quora Style

特点：

完整解释。

结构清晰。

---

## 4. 回复规则

必须：

先回答问题。

提供具体判断。

分享方法。

禁止：

- 直接推广 Gewuji
- 放链接
- 说自己有经验但没有
- 编造案例

如果自然相关：

可以提：

"I usually suggest checking..."

---

## 5. 格物集适合回复的问题类型

优先：

### Supplier Reply

Example:

Supplier only says:
"Yes, we can do everything."

回复方向：

Explain why specific confirmation matters.

---

### Payment

Example:

Supplier payment account differs from company name.

回复方向：

Suggest clarification questions.

---

### Sample

Example:

Before paying sample fee, what should I ask?

回复方向：

List sample scope questions.

---

### Factory Video

Example:

Can factory video prove supplier capability?

回复方向：

Explain visible vs unconfirmed information.

---

## 6. 每日输出报告

生成：

daily-social-opportunity.md

格式：

Date:

## Opportunity 1

Platform:

URL:

Question:

Why relevant:

Suggested reply:

Recommended action:

[ ] Reply

[ ] Ignore

[ ] Convert to Buyer Guide

---

## 7. 与其他 Agent 连接

Social Intelligence Agent

↓

Buyer Question Knowledge Base

↓

SEO GEO Agent

↓

Content Agent

↓

Supplier Review Agent

---

## 8. MVP 实现

第一阶段：

不自动登录平台。

不自动发布。

只做：

- 数据收集
- 问题筛选
- 回复草稿生成

人工每天 10 分钟确认。

---

## 未来扩展

可以增加：

- 热门问题趋势分析
- 竞品讨论监控
- 买家语言库
- Buyer Guide 自动选题
