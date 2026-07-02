# 外链风险处理原则

目前不要自动 disavow，也不要自动提交 Google Search Console 操作。

## 默认处理

在没有手动处罚前，优先让 Google 自动忽略垃圾外链。垃圾外链数量本身不等于站点已经受罚，也不等于需要立刻 disavow。

## 只有以下情况才考虑 disavow

1. Google Search Console 出现 unnatural links manual action。
2. 垃圾外链持续大量增长。
3. 这些外链是我们主动购买或主动制造的。
4. 站点收录或排名出现明显异常，并且和垃圾外链时间高度相关。
5. 多个 SEO 工具都显示风险很高。

## 禁止动作

- 不购买外链。
- 不群发垃圾评论。
- 不把垃圾外链当成成功。
- 不自动提交 disavow。
- 不把工厂桥梁写成审厂、法律尽调或质量验货服务。

## 复查节奏

- 每月复查一次 Ahrefs / GSC 外链变化。
- 如果发现垃圾域名集中爆发，先补入 `data/backlinks/backlink-audit-log.csv`。
- 如出现 GSC 手动处罚，再单独建立 disavow 候选清单，由人工确认后执行。
