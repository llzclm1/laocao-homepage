# Social Discovery Engine v1

这个模块把已有外联日志中的可回复候选整理为每天的人工行动清单。

## 当前能力

- Source: existing outreach logs
- Mode: candidate selection and ranking
- 筛选未回复且带有效 URL 的候选
- 按采购意图生成 High / Medium / Low，并给出 Suggested Comment
- 输出 Dashboard 的 Today's Opportunities
- Human review required

## 明确边界

- No social login
- No live crawling
- No auto-commenting
- No automatic platform actions
- 不实时抓取 Reddit 新帖子
- 不自动获取作者信息；来源没有作者时显示 `Not recorded`
- 不绕过平台限制，不调用平台发布接口

## 使用方式

Runtime 读取 `data/marketing/social-outreach-log.csv` 中已经记录的候选。只有包含真实 URL、标记为已识别且尚未回复的 Reddit、LinkedIn、Quora 或 X 记录才会进入排序。当前没有真实候选 URL 的平台不会生成占位卡片。
