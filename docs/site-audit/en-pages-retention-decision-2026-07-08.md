# /en/ Pages Retention Decision

这份文档用于判断旧英文路径 `/en/` 和 `/en/field-materials/` 是否还应保留、更新、重定向或归档。本轮只做审计和建议，不执行页面修改。

## Background

当前主站信息架构已经调整为：

- `/`：英文主首页
- `/for-buyers/`：英文买家页
- `/supplier-reply-review/`：英文核心转化页
- `/field-materials/`：英文 Field Materials 页
- `/buyer-guides/`：英文内容集群
- `/for-factories/`：中文工厂侧页面

因此旧路径 `/en/` 和 `/en/field-materials/` 与当前英文主路径存在重复风险。

## Pages Reviewed

- `/en/`：`en/index.html`
- `/en/field-materials/`：`en/field-materials/index.html`

## /en/ Assessment

- 页面定位：旧英文首页 / 英文入口页，面向中国工厂和海外买家双边入口。
- 主要文案：`Factory Materials and Supplier Decision Gateway`，强调 Chinese factories、overseas buyers、supplier replies、quotes、field material signals。
- 当前视觉风格：使用 `warm-home` 内联样式，仍偏旧暖色入口页；不属于最新首页的 silver industrial / premium B2B / bridge-page 视觉系统。
- 旧命名：页面主体已改为 Field Materials，但 meta keywords 仍包含 `field evidence`。
- 与新版 `/` 重复：高。当前 `/` 已是英文主首页，且使用新版 Hero、Factory Bridge、Supplier Reply Review 和 Field Materials 信息架构。
- 语言 / lang / meta：`lang="en"` 正确；canonical 指向 `https://gewuji.dev/en/`，hreflang 中 `en` 也指向 `/en/`，与当前 `/` 作为英文主首页的事实冲突。

## /en/field-materials/ Assessment

- 页面定位：旧英文 Field Materials 样例页，展示匿名工厂素材、车间、设备、包装、实验室等素材。
- 主要文案：`Privacy-protected workshop, equipment, packaging, and production details`，偏中国工厂对外素材整理。
- 当前视觉风格：使用 `bridge-page bridge-page-en`，视觉比 `/en/` 更接近新版系统，但内容结构仍像旧素材图库页。
- 旧命名：显示文案已统一为 Field Materials；JSON-LD `about` 中仍有 `field evidence` 词。
- 与新版 `/field-materials/` 重复：高。新版 `/field-materials/` 已承担英文 Field Materials 信任页，并更符合海外买家信息判断语境。
- 语言 / lang / meta：`lang="en"` 正确；canonical 指向 `https://gewuji.dev/en/field-materials/`，hreflang `en` 也指向该页，而 x-default 指向 `/field-materials/`，容易形成重复或冲突。

## Internal Link Findings

发现仍有内部链接指向 `/en/`：

- `index.html`：首页语言切换 `href="en/"`
- `for-factories/index.html`：中文工厂页语言切换 `href="../en/"`

发现 `/en/field-materials/` 的内部入口：

- `en/index.html`：导航和结构化数据指向 `field-materials/`
- `en/field-materials/index.html`：自引用 canonical / hreflang / OG / JSON-LD

未发现新版核心英文页面主动把用户导向 `/en/field-materials/`。

## Sitemap Findings

当前 `sitemap.xml` 未收录：

- `https://gewuji.dev/en/`
- `https://gewuji.dev/en/field-materials/`

但 sitemap 中仍收录多个旧英文工具页，例如 `/en/tools/photo-booth/` 系列。该问题属于旧工具页分层处理，不属于本轮 `/en/` 决策范围。

## Duplicate / Conflict Risk

- `/en/` 与 `/` 都是英文入口，会让 Google 和用户混淆哪个是英文主首页。
- `/en/field-materials/` 与 `/field-materials/` 内容主题高度重叠，可能分散 Field Materials 页权重。
- `/en/` 当前仍由首页和中文工厂页语言切换链接进入，会继续把一部分用户带到旧视觉和旧信息架构。
- 两个页面各自 self-canonical，意味着搜索引擎会把它们当独立页面，而不是明确合并到当前 canonical 页面。

## Options

### Option A: Keep and update

保留页面，但给出明确独立定位。

- `/en/` 可改成历史英文入口或国际镜像页，但当前 `/` 已是英文主首页，因此不推荐。
- `/en/field-materials/` 可改成旧素材档案页或 factory-facing material library，但需要改定位、canonical / hreflang 关系和导航入口，维护成本偏高。

### Option B: Redirect to current canonical page

将旧路径合并到当前主路径：

- `/en/` → `/`
- `/en/field-materials/` → `/field-materials/`

适合当前情况：页面重复、没有独立 sitemap 收录价值、主站已有清晰英文页面。

### Option C: Noindex / archive

保留页面但不参与索引。

适合需要保留历史入口或内部查看时使用。但这仍会留下用户路径和维护负担，不如 redirect 干净。

### Option D: Remove from navigation only

只移除内部入口，不改页面。

这可以降低用户误入旧页面的概率，但不会解决 self-canonical、外部访问、重复内容和旧页面维护问题。

## Recommended Decision

### `/en/`

Recommended: Option B, redirect to `/`.

理由：

- 当前 `/` 已经是英文主首页。
- `/en/` 视觉和信息架构仍偏旧。
- `/en/` 继续 self-canonical 会分散英文首页信号。
- `/en/` 当前主要价值只是语言切换旧入口，重定向更清楚。

### `/en/field-materials/`

Recommended: Option B, redirect to `/field-materials/`.

理由：

- `/field-materials/` 已经是英文 Field Materials 主页面。
- `/en/field-materials/` 与其主题高度重复。
- 旧页没有出现在 sitemap 中，保留独立索引价值有限。
- 直接合并能减少重复维护和命名残留风险。

## Suggested Future Implementation Task

建议下一步单独执行一个 scoped task：

1. 不修改 sitemap.xml、robots.txt 或 URL 命名体系。
2. 在静态站现有机制中确认是否已有 redirect 页面或构建层 redirect 配置。
3. 只处理：
   - `/en/` → `/`
   - `/en/field-materials/` → `/field-materials/`
4. 同步更新内部链接：
   - `index.html` 中 `href="en/"` 改为当前合理语言入口，或移除旧 EN 入口。
   - `for-factories/index.html` 中 `href="../en/"` 改为英文买家入口 `/` 或 `/for-buyers/`，按页面语境选择。
5. 如果项目没有 redirect 机制，则先用最小 HTML meta refresh / canonical 方案或构建脚本支持方案二选一，避免一次性重构。
6. 验证：
   - `npm run build`
   - `git diff --check`
   - 检查 `/`, `/field-materials/`, `/for-factories/` 内部链接不再指向旧 `/en/` 入口。

本轮不执行 redirect、不 noindex、不修改页面、不修改 sitemap 或 robots。
