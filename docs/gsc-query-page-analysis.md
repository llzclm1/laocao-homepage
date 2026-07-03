# GSC Query 与页面分析规则

这份文档用于把 GSC 里出现的 query 和实际页面对应起来，判断 Google 当前如何理解 gewuji.dev。

## 每条 query 的判断顺序

1. 判断 query 属于哪个项目：
   - `games`
   - `factory`
   - `main`
   - `tools`
   - `unrelated`

2. 判断 query 是否符合目标：
   - 是否和页面主题一致。
   - 是否和站点当前定位一致。
   - 是否只是偶然匹配到某个词。

3. 判断对应页面是否正确：
   - 游戏 query 应优先对应 games 相关页面。
   - 工厂桥梁 query 应优先对应 buyers、factories、field materials 或供应商沟通页面。
   - 品牌 query 应优先对应主站首页或联系页。
   - 临时工具 query 应归到 tools 或 lab 页面。

4. 如果 query 和页面不匹配：
   - 先记录，不急着删页面。
   - 检查页面 title、H1、正文开头和内部链接是否让 Google 误解主题。
   - 需要时再做小幅标题、内容或内链调整。

5. 如果排名在 30-80：
   - query 相关时，可以补内容、FAQ 和内部链接。
   - query 不相关时，先 monitor。

6. 如果 query 完全不相关：
   - 先记录为 `monitor` 或 `ignore-for-now`。
   - 不要马上 noindex、删除或重定向。

## 记录模板

| query | page | project | intentType | averagePosition | action | notes |
| --- | --- | --- | --- | --- | --- | --- |
| role playing game key performance indicators | unknown | games | unclear | unknown | monitor | 需要在 GSC 里查具体页面 |

## 判断重点

早期只要 Google 开始给曝光，就先看方向是否正确。真正需要动手优化的，是相关 query 已经出现、页面对应正确、排名在 30-80 或 8-30 区间的页面。
