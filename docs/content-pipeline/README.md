# Content Pipeline

这里把已批准机会转成内容资产。第一阶段只管理人工流程，不生成批量文章。

## 输入

来自：

- `docs/growth-os/opportunities/queue.md`
- `docs/growth-os/seo-opportunities/keyword-opportunity-table.md`

## 输出

每个批准机会最多生成：

- SEO brief
- article draft
- FAQ
- schema proposal
- internal links
- Reddit reply draft
- LinkedIn post
- Quora answer

## 状态流

```text
approved
-> brief_ready
-> draft_ready
-> human_review
-> published
-> distributed
-> monitoring
-> improve_or_stop
```

## 人工审核清单

- 是否直接回答 buyer question？
- 是否有 direct answer？
- 是否有 quick checklist？
- 是否说明边界？
- 是否避免 supplier verification / audit / payment safety 承诺？
- 是否有自然 internal links？
- 是否能导向 Supplier Reply Review，而不是硬卖？

## 当前进入内容生产的机会

| ID | Content asset | Source | Target URL | Status | Next action |
|---|---|---|---|---|---|
| GO-001 | Buyer Guide: Questions Before Ordering Samples From China | `docs/seo/buyer-guide-brief-questions-before-ordering-samples-from-china-2026-07.md` | `/buyer-guides/questions-before-ordering-samples-from-china/` | `brief_ready` | Generate page draft or move to human review |
