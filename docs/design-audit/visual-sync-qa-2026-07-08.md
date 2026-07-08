# Visual Sync QA

## Overall Decision

Needs Minor Revision

整体方向通过。首页和核心内页已经进入同一套银灰工业、Premium B2B consulting / Factory Bridge 视觉系统。主要问题不是方向错误，而是移动端排版和少量旧文案标签还需要精修。

## Homepage vs Inner Pages

问题：
- 首页和内页的 light glass navbar、黑白按钮、银灰背景已经统一。
- 内页没有复制首页多场景大 Hero，整体更克制，方向正确。
- 首页移动端 CTA 两个按钮并排时文字略挤，影响高级感。
- 首页 Hero 有真实工业图像，内页多数 Hero 仍偏纯文字，属于可接受差异，但 Field Materials 已补了工业图后更贴近首页。

建议：
- 移动端首页 CTA 改为上下排列或缩小按钮内边距。
- 后续只给少数核心内页增加轻量工业图，不要把首页大 Hero 复制到所有页面。

## For Buyers

Status:
Needs Minor Revision

Issues:
- 桌面视觉与首页一致性较好。
- 移动端 Hero 标题过大，占屏过多。
- 移动端 fixed navbar 会遮住 kicker 区域，首屏显得拥挤。
- CTA 清晰，保留了 1 个主 CTA 和 1 个辅助 CTA。

Suggested fixes:
- 移动端降低 `.bridge-page h1` 字号上限。
- 移动端增加 Hero 顶部 padding，避开 fixed navbar。

## Supplier Reply Review

Status:
Pass with Minor Notes

Issues:
- Hero 定位更清楚，已经不像 SaaS dashboard。
- CTA 清晰，主 CTA 是 Review a Supplier Reply，辅助 CTA 是 sample report。
- 页面后段仍有 FAQ 和多个 review 相关入口，但属于页面内容，不是首屏 CTA 噪音。

Suggested fixes:
- 后续可把 FAQ 视觉压低，避免核心转化页显得过长。

## Field Materials

Status:
Pass

Issues:
- Hero 文案和图像已经最接近首页方向。
- 工业图统一后，旧素材的水印和颜色跳脱问题已明显降低。
- 页面仍有较多文字型 evidence cards，但符合 Field Materials 的解释型定位。

Suggested fixes:
- 后续图库区可继续用同色系 WebP 替换旧水印素材。

## For Factories

Status:
Pass with Minor Notes

Issues:
- Hero 已从普通翻译服务转向 buyer-ready communication，方向正确。
- 中文正文与英文 Hero 混用，品牌感可以接受，但对中文工厂用户略有距离。

Suggested fixes:
- 后续可考虑 Hero 标题中英双语或中文主标题、英文副标签，但不要扩大内容。

## Buyer Guides

Status:
Pass with Minor Notes

Issues:
- Buyer Guide 文章页已继承新 navbar、typography、article header、CTA block 和 related links 样式。
- 文章页没有明显 SaaS / 外贸营销风格残留。
- 导航仍使用 Field Evidence、All Guides 等旧标签，不冲突但和首页 Field Materials 命名不完全统一。

Suggested fixes:
- 后续小批量统一 Buyer Guides nav 文案：Field Evidence 改为 Field Materials。
- 不建议批量重写文章内容。

## Mobile Check

Status:
Needs Minor Revision

Issues:
- 首页移动端 CTA 并排导致按钮文字拥挤。
- 内页移动端 navbar 不溢出，但占用两行后遮住或压近 Hero kicker。
- 内页 Hero 标题在 390px 宽度下过大，尤其 For Buyers。
- Cards 能正常单列，不窄；图片未明显变形。

Suggested fixes:
- 移动端 `.bridge-header` 可改为非 fixed 或增加 Hero 顶部 padding。
- 移动端 `.bridge-page h1` 字号下调。
- 首页移动端 `.hero-actions` 改为单列。

## Boundary Check

Status:
Pass

Issues:
- 未发现 supplier score、safe supplier、supplier guarantee 等正向承诺表达。
- supplier verification、factory audit、legal due diligence、quality inspection、payment safety 等词只作为 “not this service / cannot prove” 边界说明出现。
- 部分 Buyer Guides 标题仍使用 verify，这是 SEO 主题词，不是服务承诺；正文有边界说明。

Suggested fixes:
- 后续新增文案继续使用 communication signal review / visible information / information gaps / next questions。
- 避免把 Supplier Reply Review 写成 supplier verification。
