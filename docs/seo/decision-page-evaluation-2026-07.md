# `/decision/` 页面评估：2026-07

本轮只评估是否需要新增 `/decision/`，没有创建页面，也没有修改现有页面。

## 结论

现在不建议新增 `/decision/`。

当前链路已经足够：

Buyer Guide -> Supplier Reply Review

辅助链路是：

Buyer Guide -> For Buyers -> Supplier Reply Review

新增 `/decision/` 目前会增加一个中间层，但没有足够证据证明买家需要多一个页面才能理解下一步。

## 为什么现在不需要

1. `/supplier-reply-review/` 已经承担 decision/service 角色。

页面直接回答：

- 什么时候使用。
- 可以发什么。
- report 包含什么。
- 不能证明什么。
- 下一步怎么提交。

2. `/for-buyers/` 已经是 buyer context 页面。

它可以继续作为 decision context，不需要另建空的 `/decision/`。

3. 新页面会分散主题信号。

当前 GSC 还在从 game / KPI / Blue Prince 往 supplier 主题迁移。此时多建一个抽象 `/decision/`，可能稀释 `/supplier-reply-review/` 的服务信号。

4. 当前问题是内链不足，不是页面缺失。

第一阶段已补 5 篇高意图 guide 到 `/supplier-reply-review/` 的链接。下一步应观察点击，而不是新增页面。

## 如果以后需要 `/decision/`

触发条件：

- Buyer guides 有 impressions 和点击，但用户不点 `/supplier-reply-review/`。
- 用户从 guide 进入服务页后跳出高，说明服务页过早进入转化。
- 出现大量“what should I do next / should I pay / should I pause”类 query。

页面定位：

- Buyer decision support hub。
- 帮买家判断：continue asking / request video / compare supplier / pause before payment / send for review。
- 不是服务页，不是审厂页，不是供应商可靠性判断页。

应该承接入口：

- Buyer guides 中偏信息型的页面。
- `/field-materials/` 中视频 / 照片信号解释。
- `/for-buyers/` 中 buyer context。

应该导向：

- `/supplier-reply-review/`
- 相关 buyer guide
- `/field-materials/`

不应该包含：

- guarantee supplier safety。
- formal audit。
- legal due diligence。
- quality inspection。
- supplier reliability guarantee。
- 大量泛泛咨询服务描述。

## 当前建议

短期不建 `/decision/`。

先做：

- 继续补 guide -> `/supplier-reply-review/`。
- 强化 `/for-buyers/` -> `/buyer-guides/` 和 `/supplier-reply-review/`。
- 观察 2-4 周 GSC / Clarity 数据。

如果 2-4 周后发现 guide 读者需要一个中间解释层，再考虑 `/decision/`。
