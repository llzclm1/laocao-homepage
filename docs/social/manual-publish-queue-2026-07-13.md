# 人工发布队列（2026-07-13）

本队列只整理现有真实草稿与可核对 URL，发布前必须人工复核；本轮不登录、不发布、不互动。

## 待人工发布

| 顺序 | 平台 | 草稿 | 目标 URL | 状态 |
| --- | --- | --- | --- | --- |
| 1 | LinkedIn | `data/social-agent/view.json` 中 `linkedin-quote-comparison` | https://www.linkedin.com/feed/?shareActive=true | 待人工审核 |
| 2 | X | `data/social-agent/view.json` 中 `x-quote-comparison` | https://x.com/compose/post | 待人工审核 |
| 3 | Quora | `data/social-agent/view.json` 中 `quora-quote-comparison` | https://www.quora.com/ | 待人工选择真实问题 URL；未选择前不发布 |
| 4 | Medium | `data/social-agent/view.json` 中 `medium-quote-comparison` | https://medium.com/new-story | 待人工审核 |
| 5 | Substack | `data/social-agent/view.json` 中 `substack-quote-comparison` | https://substack.com/publish/post | 待人工审核 |
| 6 | Facebook | `data/social-agent/view.json` 中 `facebook-quote-comparison` | https://www.facebook.com/ | 待人工审核 |
| 7 | Reddit | `docs/social/manual-post-ready-reddit-reply-2026-07-09.md` | 暂无未发布且已核对的真实帖子 URL | 暂停；不得伪造目标，不得发布 |

## 去重与边界

- 六个平台的主动内容共用“报价范围先对齐”主题，但按平台保留一个版本，不再增加同主题草稿。
- Quora 必须先选定真实公开问题 URL，再按问题上下文改写；主页 URL 只作为入口，不代表回复机会。
- Reddit 只做 Trust Building：无链接、无品牌名、无 CTA、无私信引导；没有真实目标 URL 时保持暂停。
- 发布后只记录真实直达 URL；平台首页、feed 或 compose URL 不作为已发布证明。
