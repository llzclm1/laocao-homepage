# GSC 早期曝光观察

这份文档用于记录 gewuji.dev 在 Google Search Console 中刚开始出现曝光时，应该如何判断信号，而不是急着大改页面。

## 当前基线

- GSC 属性：Domain property `gewuji.dev`
- 时间范围：过去 3 个月
- 点击次数：0
- 总曝光次数：10
- CTR：0%
- 平均排名：53
- 已知查询词示例：`role playing game key performance indicators`

## 早期判断

新站有曝光但没有点击是正常现象。平均排名 53 说明 Google 已经开始测试站点页面，但位置还比较靠后，暂时不能用 0 点击判断失败。

这个阶段重点不是追点击，而是观察：

- 哪些 query 开始出现。
- 哪些页面被 Google 展示。
- Google 如何理解页面主题。
- query 是否属于 games、factory、main、tools 中的目标项目。
- query 是否偏离站点主题。
- 哪些页面需要加强内容、标题、FAQ 或内部链接。

## 观察节奏

建议每周记录一次 GSC 早期信号。曝光量很低时，不需要每天改页面；先累积查询词和页面对应关系，等出现稳定方向后再做小幅优化。

## 人工检查位置

需要在 GSC 中手动查看：

- Performance 里的 Queries tab。
- Performance 里的 Pages tab。
- 对具体页面应用过滤后，再查看该页面触发了哪些 query。
- 对有曝光的页面做 URL inspection。
- 查看 sitemap status，确认 Google 是否成功读取 sitemap。

## 当前不做

- 不因为 0 点击删除页面。
- 不因为 query 奇怪就 noindex。
- 不在没有页面级证据前大改标题和内容。
- 不混淆 games、factory、main 三个项目的主题边界。
