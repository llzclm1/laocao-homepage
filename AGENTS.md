# 项目规则

## 世界杯更新动作保护

做性能、SEO、GEO、PageSpeed、样式、图片、缓存、构建或统计代码优化时，不得改动世界杯项目的更新动作。

受保护范围包括但不限于：

- `scripts/sync-worldcup-data.mjs`
- `scripts/sync-worldcup-odds.mjs`
- `tools/worldcup-advisor/worldcup-live-loader.js`
- `tools/worldcup-advisor/worldcup-status.js`
- `tools/worldcup-advisor/data/worldcup-2026.js`
- `tools/worldcup-advisor/data/worldcup-odds.js`
- 世界杯赛后数据同步、盘口数据同步、北京时间更新文案、定时任务和自动化触发逻辑

如确实需要修改上述范围，必须先明确说明原因、影响范围和验证方式，并等用户确认后再动手。

## 对外发帖/回复流程

所有海外平台发帖、评论、回答、私信、连接请求等对外内容，必须按以下流程执行：

1. 先选定目标平台和具体位置，只做读取、选题和草稿准备。
2. 到“需要写内容”阶段先停下，不直接写入平台输入框。
3. 把大致内容整理成可发给 ChatGPT 编辑的文本或 prompt，让用户确认/编辑。
4. 用户给回最终文本后，才可以填入平台输入框。
5. 点击最终发布、提交、发送、评论、私信、关注、连接、点赞等对外动作前，必须再次停下并等待用户明确确认。
6. 已纳入平台的发布和回复先暂存链接，半天批量更新一次 `docs/promotion/overseas-posting-log.md` 和对应跟踪文件；新平台首次发布除外。

## 浏览器规则

- 海外社媒网页、账号、表单和发布/回复操作统一使用 Safari。
- 不再默认使用 Chrome、Edge、内置浏览器或 chrome-direct；如果当前工具无法操作 Safari，先说明原因并停下。

## 海外社媒执行频率

- 当前已纳入的每个海外社媒平台，每天目标发 1-2 条内容。
- 回复不限次数；看到合适的真人问题或讨论就可以准备回复。
- 回复要求去 AI 味，简单直接，像真人经验分享，不写长篇模板。
- 新平台首次实际发布后必须立即补进 `docs/promotion/overseas-posting-log.md` 并纳入每日发帖、回复和回访范围。
- 频率规则不覆盖确认规则：所有发帖和回复仍必须先经过草稿、ChatGPT 编辑、用户确认、发布前二次确认。
