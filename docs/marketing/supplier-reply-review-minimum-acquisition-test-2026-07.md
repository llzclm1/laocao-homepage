# Supplier Reply Review 最小获客验证方案

这份方案用于验证海外买家是否会因为付款前的供应商沟通问题进入网站、查看示例并发起真实咨询。所有成本、点击和转化结果均为待投放验证，不作预测。

## 当前转化路径问题

1. 首页已经能说明服务对象和付款前场景，但自然访问者仍需经过首页、服务页、邮件三个步骤才完成行动。
2. Supplier Reply Review 页面解释完整，但信息较长，广告访客的单一问题没有在首屏直接收口。
3. 服务输出明确，但 `Pilot review available` 没有明确价格或固定试用条件，当前只能验证询盘意愿，不能完整验证购买意愿。
4. 当前联系方式依赖邮件客户端，没有结构化表单完成状态，也无法确认邮件是否最终发送。
5. 示例报告能降低不确定性，但此前没有独立追踪 `sample_report_view`。
6. 现有 Clarity 点击事件不构成完整漏斗，缺少渠道、广告组、关键词和表单阶段关联。
7. 手机端可以打开邮件，但用户需要自己整理主题和背景，输入摩擦较高。

## 已执行的最小修改

- 新增广告专用页：`/supplier-reply-review/before-payment/`。
- 页面设置 `noindex, follow`，避免与现有服务页争夺自然搜索主题。
- 首屏只保留一个主要 CTA：`Start Supplier Reply Review`。
- 增加非敏感的四字段准备表单，并在提交后打开预填邮件。
- 表单不接收文件、银行信息、个人信息或供应商材料；文件只在用户邮箱中添加。
- 首页、服务页、示例报告和联系页补充统一行为事件。
- 保留现有服务边界，不加入 verification、audit 或 guarantee 承诺。

## 广告落地页信息结构

1. 问题：不确定供应商回复究竟确认了什么。
2. 使用时间：样品费、模具费、定金、尾款或首单前。
3. 可提交材料：reply、quotation、PI、payment terms、factory photos/videos。
4. 常见信号：公司名或收款名不一致、价格异常低、什么都答应、规格或交期含糊。
5. 输出：已确认信息、缺失信息、需要确认的信号、下一步问题、英文追问草稿。
6. 匿名示例：展示回复、信息缺口和追问方式。
7. 边界：不是验证、审厂、验货、法律尽调或结果保证。
8. 唯一行动：准备 Review Request 并打开邮件。

## Google Search Ads 最小结构

Campaign：`GOOG_Search_HighIntent_SupplierReplyReview_2026Q3`

投放设置：英语；US、UK、Canada、Australia；位置选项使用“身处目标地区的人”；Search Network only；关闭 Display expansion；仅 Exact 和 Phrase；初期不使用 Broad Match。

### 广告组 1：付款与账户信息

高意图：

- `[chinese supplier asking for deposit]`
- `"chinese supplier asking for deposit"`
- `[chinese supplier payment account mismatch]`
- `"supplier payment account mismatch"`
- `[check proforma invoice before payment]`
- `"proforma invoice before payment"`

落地页：`/supplier-reply-review/before-payment/?utm_source=google&utm_medium=cpc&utm_campaign=supplier_reply_validation&utm_content=payment_terms`

### 广告组 2：报价与回复不清楚

高意图：

- `[chinese supplier quotation review]`
- `"chinese supplier quotation review"`
- `[supplier reply unclear]`
- `"supplier reply unclear"`
- `"chinese supplier quote unclear"`

落地页参数：`utm_content=quotation_reply`

### 广告组 3：下单前问题

信息型小额测试：

- `[what to ask chinese supplier before ordering]`
- `"what to ask chinese supplier before ordering"`
- `[chinese supplier red flags]`
- `"check chinese supplier before payment"`

落地页参数：`utm_content=pre_order_questions`

### 暂不投放或加入否定意图

- `verify supplier bank account china`：服务不能验证银行账户。
- `is this chinese supplier legitimate`：主要寻找法律或真实性判断，当前服务不能给出结论。
- `china sourcing`、`sourcing agent china`、`find suppliers in china`：需求过宽。
- `factory audit china`、`quality inspection china`：服务类型不匹配。

## 否定关键词

按 Phrase negative 起步，并从真实 Search Terms 每日补充：

- free supplier list
- supplier database
- manufacturer list
- wholesale directory
- sourcing agent
- buying agent
- 1688 agent
- alibaba account
- alibaba login
- freight forwarder
- shipping agent
- customs broker
- factory audit
- supplier audit
- quality inspection
- pre shipment inspection
- lab testing
- certification service
- jobs
- salary
- career
- course
- training
- degree
- pdf download
- scammer list
- background check service

不要把 `sample`、`quotation`、`deposit`、`payment` 或 `red flags` 设为否定词。

## 英文广告文案

### 文案 1：付款前信息缺口

Headline：Before Paying a Chinese Supplier

Headline：See What Is Still Unclear

Description：Review one supplier reply, quotation or PI. Identify confirmed details, missing terms and practical follow-up questions.

### 文案 2：供应商回复

Headline：Supplier Reply Still Unclear?

Headline：Prepare Better Follow-Up Questions

Description：Separate what the supplier confirmed from what still needs a written answer before your next payment or order step.

### 文案 3：报价与 PI

Headline：Review a Chinese Supplier Quote

Headline：Clarify Terms Before Payment

Description：Organize MOQ, sample, packaging, payment and lead-time gaps. Receive an English reply draft to send back.

### 文案 4：账户名不一致

Headline：Payment Names Do Not Match?

Headline：Know What to Ask Next

Description：A communication review can highlight visible inconsistencies and missing explanations. It does not verify the supplier or bank account.

### 文案 5：边界明确

Headline：Understand the Reply Before You Pay

Headline：Supplier Communication Review

Description：For sample fees, tooling, deposits and first orders. Not a factory audit, inspection or supplier reliability guarantee.

## GA4 事件追踪

当前线上仅检测到 Cloudflare Web Analytics beacon，没有检测到 GA4 或 Clarity 标签。投放前必须在部署环境配置 `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`，重新构建后用 GA4 DebugView 验证事件；如需 Google Ads 转化回传，再配置 `NEXT_PUBLIC_GOOGLE_ADS_ID`。没有完成这一步时不要开始付费投放。

| Event | 触发 | 关键参数 | 用途 |
|---|---|---|---|
| `landing_page_view` | 广告页加载 | source、medium、campaign、content、term、page_path | 到站量 |
| `sample_report_view` | 示例报告加载或入口点击 | action_location、campaign | 深度兴趣 |
| `cta_click` | 主要 Review CTA 点击 | action_location、action_label | CTA 转化 |
| `form_start` | 第一次聚焦准备表单 | form_name | 表单摩擦 |
| `form_submit` | 提交准备表单 | form_name、submission_method | 邮件交接开始 |
| `contact_click` | 联系页主入口点击 | action_location | 联系意图 |
| `outbound_email_click` | 打开邮件动作 | action_location | 邮件渠道交接 |

UTM 规范：`utm_source=google|reddit|quora|linkedin`；`utm_medium=cpc|social|referral`；`utm_campaign=supplier_reply_validation`；`utm_content` 标识广告组或内容；Google Ads 保留自动标记并同时使用 UTM。

注意：`form_submit` 表示用户完成站内准备并打开邮件，不代表邮件已经发送。真实有效询盘必须人工核对收件箱，不能由 GA4 推断。

投放前验收：使用带完整 UTM 的测试 URL，依次触发广告页访问、示例报告、主 CTA、表单开始、表单提交和邮件打开；确认 DebugView 中事件只出现一次，且不包含表单输入、邮箱正文或文件信息。

## 10 天最小预算

- 建议上限：USD 15/天，10 天合计 USD 150。
- Campaign shared daily budget，不按广告组硬拆；让高意图词获得展示。
- 第 1—3 天只检查搜索词和明显误流量，不因零转化频繁改文案。
- 第 4—7 天删除误意图词，保留产生深度行为的 Exact/Phrase。
- 第 8—10 天判断是否存在真实提交信号。
- CPC、CTR、展示量和转化率均标记为“待投放验证”，不设虚构行业基准。

## 每日测试记录模板

| 日期 | 广告组 | 搜索词 | Match | 展示 | 点击 | 花费 | CTA | Sample View | Form Start | Form Submit | Email Click | 有效询盘 | 无效原因 | 调整 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| YYYY-MM-DD |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

有效询盘定义：用户提供或明确愿意提供 supplier reply、quotation、PI、sample/payment question，并且问题属于 communication clarity 范围。

## 继续、修改或暂停标准

### 继续

- 出现至少 1 个符合定义的真实询盘；或
- 尚无询盘，但出现多个不同用户的 `form_start`、`form_submit` 或邮件点击，且搜索词高度匹配。

继续时先优化提交与报价说明，不立即扩大关键词和预算。

### 修改

- 有高意图搜索点击和示例阅读，但没有 CTA：修改首屏问题、输出说明或 CTA 文案。
- 有 CTA 和 Form Start，但没有 Form Submit：缩短字段或解释隐私与下一步。
- 有 Form Submit/Email Click 但无邮件：改用可确认送达的表单服务前，先检查邮件客户端交接是否失效。
- 搜索词大多是审厂、验货、代理或供应商名单：加强否定词并收紧 Match Type。

### 暂停

- 花完测试预算后，没有高意图搜索词、没有深度行为，也没有有效询盘；或
- 大部分点击持续来自无法服务的 verification、audit、inspection、supplier list 意图。

暂停后不要立即换 KOL。先根据真实 Search Terms 判断是关键词不存在、表达不匹配，还是服务范围与需求不匹配。

## KOL 启动条件

只有在广告验证出可点击的问题、落地页已有材料提交、完成至少一个可匿名展示的真实 Review、明确价格或试用方式，并能使用专属 UTM 后再测试。优先小型 Amazon seller、hardware founder、Kickstarter、importer 和 China sourcing 教育创作者。
