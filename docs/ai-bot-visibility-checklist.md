# AI Bot 可见性检查清单

这份清单用于每周检查 `gewuji.dev`、`games.gewuji.dev`、`factory.gewuji.dev` 是否被 AI bot、Google 和搜索引擎抓到正确内容。

## 三个站点边界

- `gewuji.dev`：格物集主站 / 品牌母站，承载主品牌、项目入口、Lab / Tools 和联系信息。
- `games.gewuji.dev`：独立游戏网站项目，用于游戏 SEO 流量实验、game finder、guess game、browser games、games-like 页面。
- `factory.gewuji.dev`：格物集下的工厂桥梁项目，用于海外买家供应商沟通、中国工厂资料优化、field materials 信任资产。

## 每周检查

- AI bot 总请求数
- OpenAI 请求数
- Google AI 请求数
- Anthropic 请求数
- Meta 请求数
- 请求最多的路径
- 是否开始请求核心内容页
- 是否只请求 sitemap / robots
- 是否有 404 / 5xx
- 是否有重定向异常
- 哪些页面应加强内链

## robots.txt 检查

- 不屏蔽 Googlebot。
- 不屏蔽 GPTBot / OpenAI / Anthropic / Perplexity / Google-Extended，除非以后有明确策略。
- 保留 `Sitemap:` 地址。
- 不拦截 sitemap。

## sitemap 检查

### gewuji.dev

核心应包含：

- `/`
- `/tools/`
- `/for-buyers/`
- `/for-factories/`
- `/field-materials/`

观察项：旧工具和游戏页只作为 Lab / Tools 降级入口，不应重新进入首页核心叙事。

### games.gewuji.dev

核心应包含：

- `/`
- `/what-game-is-this-finder/`
- `/find-game-by-description/`
- `/guess-the-game/`
- `/browser-game-finder/`
- `/games-like-roblox/`
- `/trending-browser-and-roblox-games-this-week/`

观察项：trending 页面应链接 finder / games-like 页面，核心工具页之间应互链。

### factory.gewuji.dev

核心应包含：

- `/`
- `/for-buyers/`
- `/for-factories/`
- `/field-materials/`
- `/china-supplier-checklist/`
- `/supplier-red-flags-before-sample-order/`
- `/rfq-template-for-chinese-suppliers/`
- `/sample-order-email-template/`
- `/product-materials-for-overseas-buyers/`

页面边界必须明确：不是正式审厂，不是法律尽调，不是质量验货，不保证供应商可靠，不保证订单安全，不保证询盘或成交。

## AI / GEO 页面结构

核心页面每次更新时检查：

- 结论先行
- 清晰 H1
- 明确 H2
- FAQ
- 具体步骤
- 适合被 AI 摘录的短段落
- 页面边界说明
- 内部链接
- 页面最后的 related pages

## 本周观察记录

- Cloudflare 过去 7 天 AI bot 请求约 801，占总流量约 6.5%。
- Anthropic、Google、OpenAI、Meta 均有抓取。
- 违规为 0%。
- 主要请求集中在 `robots.txt`、`sitemap.xml`、首页和少量静态资源。
- 下一步重点：观察是否开始抓取 factory 核心内容页和 games 核心 finder 页面。
