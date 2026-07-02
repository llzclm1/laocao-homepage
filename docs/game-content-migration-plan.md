# 游戏内容迁移建议

这份文档用于把格物集里的游戏相关内容从主站主题里拆出来，后续迁移或重做到独立游戏 SEO 实验站。

## 1. 适合迁移到独立游戏网站的页面

- `/game/worldcup/`：浏览器小游戏页面，已有完整入口和资源，适合迁移或复制到独立游戏站。
- `/game/worldcup-godot/`：Godot Web POC，适合作为技术预览保留，但不建议作为正式 SEO 页面直接迁移。

## 2. 适合重做而不是直接迁移的页面

- World Cup Advisor：现在是赛事信息工具，不是游戏站核心页面；如迁移，应重做成“World Cup game companion”类内容，而不是原样搬走。
- Godot POC：页面更像开发预览，建议重做成可玩的正式小游戏页后再收录。

## 3. 推荐独立游戏网站结构

- `/`
- `/what-game-is-this-finder/`
- `/find-game-by-description/`
- `/find-game-by-screenshot/`
- `/guess-the-game/`
- `/browser-game-finder/`
- `/games-like-roblox/`
- `/games-like-minecraft/`
- `/trending-browser-and-roblox-games-this-week/`
- `/new-games/`

## 4. 第一批游戏 SEO 页面

- What game is this finder
- Find game by description
- Find game by screenshot
- Guess the game
- Browser game finder
- Games like Roblox
- Games like Minecraft
- Trending browser and Roblox games this week
- New games

## 5. 避免互相稀释主题

- 格物集首页只保留一个低优先级 Lab / Tools 入口，不直接推荐游戏页。
- 游戏站可以在 About 或 footer 里轻量说明来自 Gewuji Lab，不反向把格物集写成游戏站。
- 游戏页不要放进格物集主导航。
- 迁移完成前保留旧 URL，后续再决定 noindex、从 sitemap 移除或 301 到独立游戏站。
