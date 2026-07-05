# Gewuji AI Prompt Monitoring

这份流程用于每周手动检查 Gewuji 是否出现在 AI 回答中，以及哪些页面更容易被引用。

## 每周测试范围

每周手动测试 20 个 prompt。

平台：

- ChatGPT
- Perplexity
- Gemini
- Google AI Overview if available

## 记录内容

每个 prompt 记录：

- Gewuji 是否出现
- 是否引用 Gewuji 页面
- 出现的是哪个 URL
- 竞品或其他来源是谁
- AI 回答缺少哪些内容
- 是否需要补充页面或改写已有页面

## 输出文件

记录到：

`data/geo/ai-prompt-monitoring-log.csv`

字段：

```csv
date,platform,prompt,gewuji_mentioned,gewuji_cited,cited_url,competitor_sources,answer_gap,next_action
```

## 判断规则

### DO NOTHING

适用情况：

- 页面刚发布
- GSC 已有 impressions 但 AI 暂未引用
- 回答缺口不明确

### IMPROVE EXISTING PAGE

适用情况：

- AI 回答中出现了同类来源，但 Gewuji 没出现
- 页面缺少 Quick Answer、FAQ、清单或边界说明
- AI 回答缺少的内容正好能由 Gewuji 补充

### IMPROVE INTERNAL LINKS

适用情况：

- AI 引用了弱相关页面
- 核心页面没有从首页、guide 或 checklist 获得足够入口
- 相关 guide 之间没有互链

### CREATE OR COMPLETE GUIDE

适用情况：

- prompt 已在 `data/geo/gewuji-prompt-matrix.csv`
- 当前只有占位页或没有完整正文
- 该 prompt 连续两周出现竞品引用

## 不记录为成功

- AI 只泛泛提到 China sourcing，但没有 Gewuji
- AI 引用旧页面但页面不对应问题
- AI 把 Gewuji 描述成审厂、验货、法律尽调或供应商可靠性保证服务
