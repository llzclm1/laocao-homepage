# Multilingual Buyer Guides Strategy

这份报告评估是否先用小语种 Buyer Guides 子目录获取早期 SEO 展示，同时避免污染 Gewuji / Factory Bridge 英文主线。

## Overall Decision

Go, but only as a narrow pilot.

Do not do a full multilingual site yet. The safer first step is a small Spanish Buyer Guides pilot under `/es/buyer-guides/`, with 3-5 genuinely localized articles, no translated service pages, and no language switcher from the homepage until quality is proven.

## Recommended First Language

Spanish.

Reasons:

- Spanish has large cross-border buyer coverage across Spain, Mexico, Colombia, Chile, Peru, Argentina, and US Hispanic search behavior.
- Many Spanish queries around Chinese suppliers, Alibaba, samples, deposits, and payment terms are practical rather than brand-heavy.
- Competition is usually lower than English for long-tail sourcing questions.
- Spanish has enough external distribution options: LinkedIn posts, Reddit/Quora-like Q&A, import/export groups, small business communities, and Spanish-language sourcing discussions.

Do not start with multiple languages. One language is enough to test whether Google accepts Gewuji as a practical buyer guide source beyond English.

## Why Not Full Multilingual Site Yet

Full multilingual is premature because:

- The current product validation priority is Supplier Reply Review, not language expansion.
- Homepage, service pages, Field Materials, and factory-side page still need tight positioning and boundary control.
- Translating the whole site increases maintenance cost and increases risk of inconsistent claims around verification, audit, inspection, and guarantees.
- A thin translated site can look like machine translation and harm trust.
- `/for-factories/` is intentionally Chinese; forcing it into Spanish/English equivalents would blur the current language structure.

Recommended approach:

- Keep `/` as English main homepage.
- Keep `/for-factories/` as Chinese factory-side page.
- Add only Spanish educational Buyer Guides if content quality is strong.

## Recommended URL Structure

Recommended pilot:

- `/es/buyer-guides/`
- `/es/buyer-guides/como-revisar-un-proveedor-chino-antes-de-pagar/`
- `/es/buyer-guides/preguntas-antes-de-pedir-muestras-a-china/`
- `/es/buyer-guides/senales-en-respuestas-de-proveedores-chinos/`

Avoid:

- `/es/` homepage in phase 1
- `/es/for-buyers/`
- `/es/supplier-reply-review/`
- `/es/field-materials/`
- automatic translation of every English guide

Reason:

The language pilot should be a content cluster, not a promise that the whole site is available in Spanish.

## First 3-5 Spanish Buyer Guide Topics

1. `Como revisar un proveedor chino antes de pagar`

   Focus: communication checks before deposit or sample fee. Keep boundaries clear: not formal verification, not audit, not payment safety guarantee.

2. `Preguntas antes de pedir muestras a un proveedor chino`

   Focus: sample basis, product version, packaging, lead time, customization, sample-to-bulk differences.

3. `Senales de riesgo en respuestas de proveedores chinos`

   Focus: vague replies, changing terms, unclear payment account, missing product details, unrealistic prices.

4. `Como comparar cotizaciones de proveedores chinos mas alla del precio`

   Focus: MOQ, materials, packaging, sample terms, tooling, lead time, included/excluded items.

5. `Que pedir en una videollamada con una fabrica china`

   Focus: workshop, sample room, packaging area, product details, visible context, what remains unclear.

Use ASCII slugs or percent-safe Spanish slugs without accents. Prefer ASCII for simpler URLs.

## SEO Risk

Main risks:

- Thin translation: Google may treat pages as low-value machine translated content if they simply mirror English pages.
- Search intent mismatch: Spanish buyers may use different terms than English buyers, especially around `proveedor chino`, `fabricante chino`, `muestras`, `anticipo`, `pago`, and `Alibaba`.
- Boundary drift: Spanish wording can accidentally imply supplier verification, audit, inspection, legal due diligence, or payment safety.
- Index bloat: adding many language pages before core English pages are stable can dilute crawl attention.
- Internal confusion: if `/es/` exists without a full Spanish site, users may expect all site pages to be Spanish.

Mitigation:

- Start with 3-5 pages only.
- Write native Spanish, not literal translation.
- Include clear boundary language in every article.
- Keep sitemap inclusion limited to published Spanish pages only.
- Do not add Spanish service pages until there is demand.

## GEO / AI Search Risk

AI search risk is manageable if Spanish pages are clearly labeled as Spanish buyer guides and do not enter the main service positioning too early.

Rules:

- Do not add Spanish pages to `llms.txt` in phase 1 unless the pilot becomes stable.
- Do not describe Gewuji as a Spanish-language site.
- If Spanish pages are added to `ai-sitemap.json`, mark them as `BuyerGuide` or `Article`, not service pages.
- Keep the core AI positioning in English: Factory Bridge + Supplier Reply Review.
- Avoid old topics, tools, game, photo booth, or lab references.

Recommended phase 1 AI sitemap handling:

- Optional: include `/es/buyer-guides/` only after the first 3-5 pages are high quality.
- Safer: keep AI sitemap focused on core English pages until Spanish pages get indexed and reviewed.

## hreflang Requirements

Current status:

- Homepage has `hreflang="en"` and `x-default` pointing to `/`.
- Field Materials has `hreflang="en"` and `x-default`.
- Old `/en/` redirects to `/`.
- Some legacy tool pages have hreflang, but they are outside the current main business path.
- Buyer Guide pages currently do not have hreflang alternates.

For Spanish Buyer Guides:

- Do not add site-wide hreflang until Spanish equivalents exist page by page.
- For each Spanish article that has a true English counterpart, add reciprocal hreflang:
  - English page: `hreflang="en"` to English canonical, `hreflang="es"` to Spanish page, `x-default` to English page.
  - Spanish page: same reciprocal set.
- If a Spanish page has no English equivalent, it can canonicalize to itself and skip hreflang alternates except optional `x-default` if appropriate.

Do not point Spanish canonical to the English page. That would tell Google the Spanish page is not the canonical content.

## Sitemap Requirements

Current status:

- `scripts/build-static-site.mjs` generates `dist/sitemap.xml` from a fixed list.
- Source `sitemap.xml` also exists and has historical old-tool entries.
- Build script currently has `publishedBuyerGuides` for English guide slugs.
- There is no `/es/` directory in `copyEntries`.
- Therefore, `/es/buyer-guides/` is not currently supported by build output unless the build script is updated.

Future implementation requirements:

- Add `es` to `copyEntries` when `/es/` pages exist.
- Add a separate `publishedSpanishBuyerGuides` list, not a catch-all directory crawl.
- Add only published Spanish URLs to generated sitemap.
- Do not hand-edit sitemap without confirming generated output.
- Keep Spanish sitemap priority lower than core service pages at first, for example `0.5-0.7`.

Do not modify `robots.txt` for this pilot.

## Content Quality Rules

Spanish pages must be original localized guides, not raw translation.

Rules:

- Use native Spanish buyer language.
- Keep examples practical and concrete.
- Include a boundary block on every page:
  - no es una auditoria formal
  - no es debida diligencia legal
  - no es inspeccion de calidad
  - no garantiza la seguridad del pago
  - no garantiza la fiabilidad del proveedor
- Avoid overclaiming:
  - do not say Gewuji verifies suppliers
  - do not say safe supplier
  - do not say guaranteed payment safety
  - do not say audited factory
- Use Spanish terms naturally:
  - proveedor chino
  - fabricante chino
  - cotizacion
  - muestras
  - anticipo
  - cuenta de pago
  - informacion visible
  - preguntas antes de pagar

Each page should include:

- one search-focused H1
- one short answer
- step-by-step checks
- example questions in Spanish
- what this cannot prove
- soft CTA to the English buyer context or Supplier Reply Review, only if the language expectation is clear

## External Distribution Rules

Use low-sales distribution:

- Spanish LinkedIn posts around buyer questions.
- Spanish-language sourcing/import/export communities.
- Quora/Reddit-style answers only where Spanish questions are real and specific.
- No bulk posting.
- No claims that Gewuji offers formal verification.
- No direct pitch unless context clearly asks for supplier communication review.

Anchor strategy:

- Link to a Spanish guide when answering a Spanish informational question.
- Link to `/supplier-reply-review/` only when user asks about reviewing an actual supplier reply and can work in English.
- Do not push Spanish users into a service flow if the service page remains English-only.

## Implementation Plan

Step 1: Content pilot

- Write 3 Spanish Buyer Guides.
- Use existing Buyer Guides layout and `styles.css`.
- Keep canonical self-referencing.
- Do not create `/es/` homepage.

Step 2: Build support

- Add `es` to `copyEntries`.
- Add `publishedSpanishBuyerGuides`.
- Add Spanish guide URLs to generated sitemap only.
- Add verification checks for `/es/buyer-guides/` and first published Spanish pages.

Step 3: hreflang

- Add reciprocal hreflang only for English-Spanish page pairs that truly match.
- Skip broad hreflang for pages without equivalents.

Step 4: AI/GEO

- Initially keep `llms.txt` unchanged.
- Decide later whether `ai-sitemap.json` should include `/es/buyer-guides/` after content quality is reviewed.

Step 5: Measurement

- Watch GSC impressions, indexed pages, query language, and whether Spanish pages attract relevant supplier/payment/sample queries.
- If queries are irrelevant or pages get no impressions, stop at 3 pages.
- If queries are relevant, expand to 8-10 Spanish guides.

## Suggested Next Codex Task

```text
发送给：格物集主线程 / Codex

请为 /es/buyer-guides/ 做第一批 Spanish Buyer Guides 内容方案，不创建页面。

范围：
- 只输出 docs/seo/spanish-buyer-guides-content-plan-2026-07-09.md
- 不修改网站页面
- 不修改 sitemap.xml
- 不修改 robots.txt
- 不修改 build 脚本
- 不 commit
- 不 push

内容：
1. 第一批 3 篇西语 guide 的 title / slug / meta description / H1
2. 每篇文章大纲
3. 西语边界说明标准句
4. 内链策略
5. 是否需要 hreflang
6. 后续实施文件清单
```
