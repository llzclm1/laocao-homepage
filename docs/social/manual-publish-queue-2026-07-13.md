# 人工发布队列（2026-07-13）

本队列只整理现有真实草稿与可核对 URL，发布前必须人工复核；本轮不登录、不发布、不互动。

## 待人工发布

| 顺序 | 平台 | 草稿 | 长度 | 目标 URL | 审核结论 |
| --- | --- | --- | --- | --- | --- |
| 1 | LinkedIn | `data/social-agent/view.json` 中 `linkedin-quote-comparison` | 157 词 | https://www.linkedin.com/feed/?shareActive=true | 可人工发布；专业经验口径，无硬推广和外链 |
| 2 | X | `data/social-agent/view.json` 中 `x-quote-comparison` | 224 字符 | https://x.com/compose/post | 可人工发布；低于 280 字符 |
| 3 | Quora | `data/social-agent/view.json` 中 `quora-quote-comparison` | 226 词 | 尚无真实问题 URL | 暂停；选择真实公开问题并按上下文复核后才可发布 |
| 4 | Medium | `data/social-agent/view.json` 中 `medium-quote-comparison` | 815 词 | https://medium.com/new-story | 可人工发布；结尾保留 Gewuji Factory Bridge 署名与链接 |
| 5 | Substack | `data/social-agent/view.json` 中 `substack-quote-comparison` | 612 词 | https://substack.com/publish/post | 可人工发布；不包含未经证实的数据 |
| 6 | Facebook | `data/social-agent/view.json` 中 `facebook-quote-comparison` | 44 词 | https://www.facebook.com/ | 可人工发布；发布前人工选择合适公开页面或群组 |
| 7 | Reddit | 无当前可用草稿 | - | 暂无未发布且已核对的真实帖子 URL | 暂停；Trust Building Mode，不得伪造目标 |

## 去重与边界

- 六个平台的主动内容共用“报价范围先对齐”主题，但按平台保留一个版本，不再增加同主题草稿。
- LinkedIn、X、Medium、Substack、Facebook 的长度符合当前平台规则；发布入口 URL 只用于打开编辑器，不作为已发布证明。
- Quora 必须先选定真实公开问题 URL，再按问题上下文改写；主页 URL 只作为入口，不代表回复机会。
- Reddit 只做 Trust Building：无链接、无品牌名、无 CTA、无私信引导；没有真实目标 URL 时保持暂停。
- 发布后只记录真实直达 URL；平台首页、feed 或 compose URL 不作为已发布证明。
- 当前唯一 X 机会回复已压缩到 280 字符以内；它仍需人工打开原帖核对上下文，不属于主动发布队列。
