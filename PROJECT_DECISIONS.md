# Project Decisions

这份文件记录当前仍有效的项目决策。过期执行记录、账号历史和临时任务状态不放在这里。

## Core Positioning

Gewuji remains Factory Bridge + Supplier Reply Review.

The site should help:

- overseas buyers understand supplier replies, quotations, sample terms, payment details, and field materials
- Chinese factories explain real factory materials in buyer-understandable English

The service is deliberately narrower than supplier verification or factory audit.

## Product Boundary

Supplier Reply Review answers:

- what the supplier clearly confirmed
- what is missing or unclear
- what looks inconsistent in the communication
- what the buyer should ask next
- how to write a clearer reply

Supplier Reply Review does not answer:

- whether the supplier is real
- whether the supplier is reliable
- whether payment is safe
- whether quality is guaranteed
- whether the factory has been audited
- whether the supplier will deliver correctly

## Legacy Project Handling

Old game / tools / worldcup / photo booth pages are archive content.

Current decision:

- keep old project pages accessible
- add or keep `noindex, follow` where applicable
- remove old project URLs from the main sitemap / AI sitemap discovery path
- remove strong homepage / footer / nav discovery links
- do not delete old pages
- do not 301 old pages to the homepage
- do not SEO-optimize old project title / H1 just for warnings

## English `/en/` Handling

Old `/en/` language pages should redirect or point users toward canonical current pages when they duplicate the main site.

Do not create a parallel full English tree unless there is a clear page-by-page reason.

## Buyer Guides

Buyer Guides are long-tail SEO and buyer education pages.

They should:

- answer specific sourcing communication questions
- lead naturally to Supplier Reply Review
- link to Sample Report and Examples when relevant
- preserve service boundaries

They should avoid language that implies:

- supplier verification
- factory audit
- legal due diligence
- guaranteed safe payment
- guaranteed reliable supplier

## Field Materials

Field Materials must use real field photos, not AI images or stock-looking visuals.

Images must be checked for:

- semantic match with page copy
- clear faces
- customer names
- supplier names
- brand marks
- labels or packaging details that expose private information
- watermarks
- over-blurred or artificial-looking edits
- duplicate usage

Field Materials can explain visible signals and missing context. It cannot prove audit, verification, quality, safety, or supplier reliability.

## Spanish Pilot

Spanish is pilot first, not full-site translation.

Current published Spanish pilot:

- `/es/buyer-guides/como-revisar-un-proveedor-chino-antes-de-pagar/`

The Spanish directory should only list published Spanish pages. Do not add future Spanish topics to sitemap, hreflang, or directory cards before they are ready.

## GEO / AI Search Readiness

GEO / AI readiness means making Gewuji easier for search engines and AI systems to understand accurately.

Principles:

- state the service boundary clearly
- use consistent page summaries
- make examples and sample report easy to find
- avoid exaggerated AI-search growth claims
- avoid implying supplier verification or payment safety
- prefer durable page clarity over tricks

## Cloudflare / Security

Cloudflare handling should stay lightweight and manual where appropriate.

Current principles:

- use WAF rules for obvious sensitive path probes
- keep legitimate search and AI crawlers accessible
- do not block all bots
- do not block `robots.txt`
- do not treat scanner traffic as real buyer growth
- do not make DNS or account security changes from this repo
- delay HSTS preload until HTTPS and redirects are stable

## Technical Direction

The site should remain static, small, and low-dependency.

Do not add:

- SaaS backend
- account system
- payment system
- complex forms
- new frameworks
- automatic outreach tools

until real user submissions and manual delivery show the need.
