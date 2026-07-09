# Project Context

这份文件保存可以进入仓库的项目背景，避免把本地路径、账号、外部发布历史或临时操作记录写进 repo。

## Positioning

格物集 / Gewuji 当前定位是 Factory Bridge + Supplier Reply Review。

项目帮助海外买家理解中国供应商沟通材料，也帮助中国工厂把真实资料改写成海外买家更容易理解的英文销售沟通内容。

## Buyer Side

面向海外买家，Gewuji 处理的材料包括：

- supplier replies
- quotations
- sample terms
- payment details
- proforma invoice details
- factory photos and videos
- field materials

核心服务是 Supplier Reply Review：帮助买家看清供应商已经确认了什么、哪些信息仍不清楚、下一步应该问什么。

## Factory Side

面向中国工厂，Gewuji 帮助把工厂材料转成 buyer-understandable English sales communication。

适合处理的材料包括：

- factory introduction
- product page copy
- workshop photos
- process explanations
- sample and order capability notes
- outreach copy

目标不是包装成更夸张的工厂，而是把真实能力、工艺边界和订单适配信息讲清楚。

## Boundaries

Gewuji is not:

- supplier verification
- factory audit
- legal due diligence
- quality inspection
- payment safety guarantee
- supplier reliability guarantee

Gewuji should not imply:

- a supplier is verified
- a factory has been audited
- payment is safe
- product quality is guaranteed
- a supplier is reliable
- an order will be delivered correctly

Allowed framing:

- visible signal
- communication signal
- information gap
- unclear term
- next buyer question
- field material
- useful context

## Core Pages

Current core site pages:

- `/`
- `/for-buyers/`
- `/for-factories/`
- `/field-materials/`
- `/supplier-reply-review/`
- `/supplier-reply-review/sample-report/`
- `/supplier-reply-review/examples/`
- `/buyer-guides/`
- `/es/buyer-guides/`

## Current Strategy

The current strategy is a small static site plus manual service validation.

Priority:

1. Get real buyer material submissions.
2. Complete useful Supplier Reply Review reports manually.
3. Improve Buyer Guides, Sample Report, Examples, and Field Materials around that service path.
4. Use whitehat external distribution and GEO / AI readiness work to make the positioning easier to understand.
5. Keep old project pages archived away from the main discovery path.

## Repo Safety

Do not store in repo context files:

- local absolute paths
- personal accounts
- private platform links
- social publishing history
- customer names
- supplier names
- order details
- screenshots with private data
- tokens, cookies, passwords, sessions, or secrets
