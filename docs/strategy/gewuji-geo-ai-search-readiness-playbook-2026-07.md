# Gewuji GEO / AI Search Readiness Playbook

这份手册把 GEO / AI Search 引用优化收敛成适合 Gewuji 当前阶段的白帽操作：让 AI search 正确理解项目边界，而不是用夸张话术“骗引用”。

## 1. Core Principle

Gewuji 的 GEO 目标不是“骗 AI 引用”，而是让 AI 正确理解三件事：

- Gewuji helps overseas buyers understand supplier communication signals.
- Gewuji reviews supplier replies, quotations, sample terms, payment details, and field materials.
- Gewuji is not supplier verification, factory audit, legal due diligence, quality inspection, or payment safety advice.

因此所有页面、结构化数据、外部分发和 AI monitor 都应重复同一套语义：

- supplier communication clarity
- supplier reply review
- quotation clarity
- sample term questions
- payment account consistency check
- visible factory context
- information gaps before sourcing decisions

不要把 Gewuji 写成供应商验证、审厂、验货、法律尽调、付款安全保证或供应商可靠性保证。

## 2. Current Status

| Item | Status | Notes |
| --- | --- | --- |
| `llms.txt` | Confirmed | 已是 Markdown 格式，有 H1、核心链接、AI sitemap 链接和边界说明。 |
| AI sitemap | Needs verification | 当前根目录未读到 `ai-sitemap.json` 源文件；构建产物或线上状态需另行确认。 |
| `security.txt` | Confirmed | `.well-known/security.txt` 存在，含 contact、canonical 和 expiry。 |
| old project archive / noindex | Partially confirmed | 抽样看到 `tools/`、`game/worldcup/`、`tools/photo-booth/`、`tools/worldcup-advisor/` 多个页面有 `noindex, follow`；完整覆盖需后续专门核对。 |
| Buyer Guides verification language softening | Needs verification | 历史任务已处理过，但本轮未逐页审计。 |
| Spanish pilot | Confirmed | `/es/buyer-guides/` 和 payment/deposit 西语 pilot 已上线提交。 |
| Field Materials real photo gallery | Confirmed | 已完成实拍图 gallery scoped commit；仍应避免把实拍图表述成审厂证明。 |
| Sitemap old project cleanup | Locally sampled | `sitemap.xml` 未命中 `tools/photo-booth`、`worldcup-advisor`、`game/worldcup` 等旧项目关键词。 |

## 3. Technical Foundation Checklist

本轮只列检查清单，不修改。

| Check | Why It Matters | Current Note |
| --- | --- | --- |
| `robots.txt` 是否允许搜索/用户请求型 crawler | AI search 需要能抓取公开页面。 | 当前 `User-agent: *` / `Allow: /`。 |
| 是否需要单独声明 AI crawler | 可按搜索抓取和训练抓取分开管理。 | 不建议无脑开放所有训练爬虫。 |
| `llms.txt` 是否 Markdown 格式 | AI readiness 工具通常要求 H1 和链接。 | 已确认。 |
| `llms.txt` 是否包含 H1 和核心链接 | 帮助 crawler 快速识别主线页面。 | 已确认。 |
| AI sitemap 是否存在 | 给 AI crawler 提供核心页面列表。 | Needs verification。 |
| sitemap 是否干净 | 避免旧 game / tools 继续污染主题。 | 本地抽样未命中旧项目关键词。 |
| old tools / game pages 是否 noindex | 保留可访问，但移出主搜索发现面。 | 抽样确认，完整覆盖待查。 |
| core pages 是否 SSR / static HTML | AI search 更容易读取 initial HTML。 | 当前是静态 HTML 站点。 |
| important content 是否在 initial HTML 中 | 避免只靠 JS 渲染核心语义。 | 核心页看起来是 HTML 直出，需页面级抽查。 |
| page speed 是否基本可接受 | 抓取和用户体验基础。 | Needs verification；不建议现在为 minify 扩大构建改动。 |

AI crawler 建议按类型检查：

- OAI-SearchBot：搜索索引型，可以考虑允许。
- ChatGPT-User：用户请求型抓取，可以考虑允许。
- PerplexityBot：AI search 抓取，可以考虑允许。
- Claude-User：用户请求型抓取，可以考虑允许。
- Googlebot：传统搜索和 AI Overview 相关基础。
- Bingbot：Bing / Copilot 相关基础。
- Google-Extended：训练用途控制，不应自动等同于搜索抓取；是否允许需单独决策。

## 4. Core Page GEO Improvements

| Page | Current Role | Suggested TL;DR | Suggested Question Headings | Schema Type | Risk Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Gewuji / Factory Bridge main entry. | Gewuji is a Factory Bridge service for overseas buyers and Chinese factories. It helps buyers understand supplier replies, quotations, sample terms, payment details, and visible field materials before the next sourcing step. It does not verify suppliers, audit factories, inspect quality, provide legal due diligence, or guarantee payment safety. | What does Gewuji help buyers understand? / What does Gewuji not verify? / Where should buyers start? | Organization, WebSite | Avoid broad “trusted sourcing platform” language. |
| `/for-buyers/` | Buyer-side explanation page. | This page explains how overseas buyers can use Gewuji to read supplier communication more clearly before samples, deposits, or first orders. Gewuji helps organize what is confirmed, what is unclear, and what questions to ask next. It is not supplier verification, factory audit, quality inspection, legal due diligence, or payment safety advice. | What can buyers submit? / What can communication show? / What remains unclear before payment? | Service, FAQPage | Do not imply Gewuji can decide whether a supplier is safe. |
| `/supplier-reply-review/` | Main service conversion page. | Supplier Reply Review is Gewuji’s practical review of Chinese supplier replies, quotations, sample terms, payment details, and related context. The output should clarify confirmed information, missing information, risk signals, next questions, and a suggested reply. It is a communication review, not formal supplier verification, audit, inspection, or payment safety guarantee. | What is Supplier Reply Review? / What does the review include? / What does it not prove? | Service, FAQPage | Keep “risk signals” tied to communication gaps, not supplier scoring. |
| `/supplier-reply-review/sample-report/` | Proof-of-format page. | The sample report shows how Gewuji structures a supplier communication review. It demonstrates sections such as confirmed information, missing information, questions to ask next, suggested reply, and decision note. It is a generic example, not proof that Gewuji verifies suppliers, audits factories, inspects quality, or guarantees safe payment. | What does a sample report include? / How should buyers read the report? / What is outside the report scope? | Article, FAQPage | Avoid making the sample look like formal due diligence. |
| `/supplier-reply-review/examples/` | Anonymous examples page. | The examples page shows common supplier communication situations in an anonymized way, such as unclear quotations, sample terms, payment account questions, or missing production details. These examples help buyers ask better next questions. They do not prove supplier reliability, factory ownership, legal status, production quality, or payment safety. | What situations do examples cover? / What can buyers learn from examples? / What should still be checked separately? | CollectionPage, Article | Make anonymity and generic nature clear. |
| `/field-materials/` | Real photo / visible context page. | Field Materials shows real, anonymized factory-related photos and visible context such as workshop views, product details, storage, packaging, sample room, QC equipment, and loading areas. These materials can provide useful signals and buyer questions, but they are not a factory audit, supplier verification, quality inspection, or reliability guarantee. | What can be seen in field materials? / What do photos not prove? / What should buyers ask next? | CollectionPage, ImageObject | Never describe photos as audit evidence. |
| `/buyer-guides/` | English guide hub. | Buyer Guides explain common sourcing communication questions before samples, deposits, quotations, payment, and factory video calls. The guides help buyers understand likely meanings, visible signals, missing information, and supplier questions. They are practical communication guides, not supplier verification, factory audit, inspection, legal due diligence, or payment safety advice. | Which guide should I read first? / What supplier questions are covered? / When should buyers slow down? | CollectionPage, ItemList | Avoid keyword-stuffed guide summaries. |
| `/es/buyer-guides/` | Spanish pilot hub. | Las guías en español de Gewuji ayudan a compradores hispanohablantes a revisar señales de comunicación de proveedores chinos antes de muestras, anticipos o primeros pedidos. El objetivo es aclarar respuestas, cotizaciones, cuentas de pago y preguntas pendientes. No es verificación de proveedores, auditoría de fábrica, inspección de calidad ni garantía de pago seguro. | ¿Qué puedo revisar antes de pagar? / ¿Qué no prueba esta revisión? / ¿Dónde ver un ejemplo? | CollectionPage, ItemList | Keep Spanish pages natural; avoid low-quality translation expansion. |

## 5. Buyer Guide AI Citation Structure

Recommended Buyer Guide structure:

1. TL;DR
2. What this situation usually means
3. What it does not prove
4. Visible communication signals
5. What is still unclear
6. Questions to ask the supplier
7. Suggested message
8. When to slow down
9. Boundary note
10. Related resources

Rules:

- Each section should be self-contained enough to be quoted alone.
- H2/H3 headings should be question-style when natural.
- Put the practical conclusion before nuance.
- Use plain sourcing language, not marketing language.
- Do not stuff “Chinese supplier” into every heading.
- Do not claim certainty where the evidence only supports a question.
- End with related resources: Supplier Reply Review, Sample Report, Examples, Field Materials, and relevant Buyer Guides.

## 6. Schema Plan

本轮不执行 schema，只给计划。

P0:

- Organization schema on homepage.
- Article schema on Buyer Guides.
- FAQPage schema on Buyer Guides.
- Service schema on Supplier Reply Review.

P1:

- CollectionPage schema on Buyer Guides.
- CollectionPage / ImageObject schema on Field Materials.
- BreadcrumbList schema on core pages.

P2:

- HowTo schema only where page truly gives step-by-step process.
- Person schema only if public author identity is intentionally used.

Schema boundary:

- Do not use schema to imply supplier verification.
- Do not describe Gewuji as factory audit, inspection, legal due diligence, payment authority, supplier database, blacklist, scoring system, or reliability guarantee.
- FAQ answers should say what a communication signal can suggest and what it cannot prove.

## 7. Third-Party Consensus Layer

Whitehat external presence should repeat the same practical language across platforms:

- Reddit helpful answers.
- Quora answers.
- LinkedIn posts.
- Medium / Substack summaries.
- Guest post outreach.
- Spanish forum answers.

External pages should reinforce:

- supplier communication clarity
- supplier reply review
- quotation clarity
- sample term questions
- payment account consistency check
- visible factory context
- information gaps before sourcing decisions

Do not suggest:

- fake reviews
- vote manipulation
- spam comments
- data leak email blasting
- pretending to be customers
- fake expert quotes
- automated posting or automated replying
- irrelevant link dropping

## 8. AI Prompt Monitoring

Keep monitoring manual and light. Once per week, test 20 prompts and record whether AI systems describe Gewuji accurately.

Suggested prompts:

1. What is Gewuji?
2. What does Gewuji help overseas buyers with?
3. Is Gewuji a supplier verification service?
4. How can I check a Chinese supplier reply before paying a deposit?
5. What questions should I ask a Chinese supplier before ordering samples?
6. What does a supplier payment account mismatch mean?
7. Gewuji vs factory audit.
8. Gewuji Supplier Reply Review sample report.
9. Can Gewuji inspect product quality?
10. Can Gewuji guarantee a supplier is safe?
11. What is Supplier Reply Review?
12. What are Field Materials on Gewuji?
13. How should I read a Chinese supplier quotation?
14. What should I ask before paying a sample fee to a Chinese supplier?
15. What can factory photos show and not show?
16. Chinese supplier says “no problem” before deposit, what should I ask?
17. How to compare supplier replies from China?
18. What does Gewuji not do?
19. Spanish buyer guide Gewuji before paying supplier.
20. Gewuji examples supplier reply review.

Tracking table:

| Prompt | Platform | Mentioned Gewuji? | Cited URL | Description Accurate? | Boundary Correct? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| What is Gewuji? | ChatGPT |  |  |  |  |  |
| What does Gewuji help overseas buyers with? | Perplexity |  |  |  |  |  |
| Is Gewuji a supplier verification service? | Bing / Copilot |  |  |  |  |  |

Platforms:

- ChatGPT
- Perplexity
- Google AI Overview if available
- Bing / Copilot if available

## 9. What Not To Do

Do not do:

- keyword stuffing
- fake authority
- fake statistics
- fake expert quotes
- overclaiming supplier safety
- claiming verified suppliers
- claiming audit / inspection ability
- mass AI content
- low-quality translated pages
- AI spam distribution
- fake reviews
- fake forum personas
- scraped email blasting
- automatic comment posting

## 10. 14-Day GEO Action Plan

Day 1:
Audit robots / llms / AI sitemap.

Day 2:
Add TL;DR proposals for homepage and Supplier Reply Review.

Day 3:
Add TL;DR proposals for Buyer Guides and Field Materials.

Day 4:
Draft FAQ schema plan for top 5 Buyer Guides.

Day 5:
Draft Organization / Service schema plan.

Day 6:
Prepare 5 external answer drafts.

Day 7:
Run first 20 prompt monitoring set.

Day 8:
Review AI descriptions and identify boundary errors.

Day 9:
Prepare scoped copy fixes for pages where AI misunderstands the service.

Day 10:
Prepare schema implementation brief, but do not batch unrelated pages.

Day 11:
Prepare one Spanish forum / Spanish Q&A answer draft from the pilot page.

Day 12:
Review Field Materials wording for AI misinterpretation risk.

Day 13:
Review Buyer Guide related links and TL;DR consistency.

Day 14:
Summarize prompt monitoring results and choose one P0 scoped commit.

Rule for Days 8-14:

Revise based on results, but only with scoped commits.

## 11. Priority List

P0:

- Confirm generated/online `ai-sitemap.json` exists and only lists core Gewuji pages.
- Add concise TL;DR blocks to core pages after a separate scoped brief.
- Add FAQPage schema to top Buyer Guides where real questions exist.
- Add Service schema to Supplier Reply Review with strict boundary language.
- Run weekly 20-prompt AI monitor and record boundary mistakes.

P1:

- Add CollectionPage / ItemList schema to `/buyer-guides/` and `/es/buyer-guides/`.
- Add ImageObject schema to Field Materials only if images are clearly anonymized and described as visible context.
- Create whitehat external answer drafts for Reddit, Quora, LinkedIn, Medium/Substack, and guest posts.
- Improve related links from guides to Supplier Reply Review, Sample Report, Examples, and Field Materials.

P2:

- Page speed optimization and CSS/JS minification after higher-priority SEO hygiene is stable.
- HowTo schema only for pages that are truly step-by-step.
- More Spanish buyer guides after the first pilot has indexing and quality signals.
- Person schema only if a public author identity is intentionally used.

## 12. Suggested Next Codex Task

下一步不要直接改页面。

建议新增：

`docs/seo/gewuji-core-pages-geo-tldr-and-schema-brief-2026-07.md`

内容包括：

- core pages TL;DR proposals
- recommended question headings
- schema recommendation per page
- risk notes
- scoped implementation plan

边界：

- 不修改页面。
- 不修改 `sitemap.xml`。
- 不修改 `robots.txt`。
- 不修改 `llms.txt`。
- 不修改 scripts。
- 不 commit。
- 不 push。
