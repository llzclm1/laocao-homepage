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
