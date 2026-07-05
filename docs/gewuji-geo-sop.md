# Gewuji GEO SOP

这份 SOP 用于让 Gewuji / 格物集 Factory Bridge 的内容更容易被 ChatGPT、Perplexity、Gemini 和 Google AI Overview 读取、理解和引用，同时保持当前供应链服务定位。

## 项目定位

Gewuji / 格物集 Factory Bridge 不是 AI 工具站，不是审厂公司，不是验货公司，也不是法律尽调服务。

当前核心方向：

1. 面向国内工厂：帮助工厂重构对外宣传资料，让产品页、工厂介绍、开发信、车间照片和实拍素材，更符合海外采购商的阅读、判断和沟通习惯。
2. 面向海外采购商：提供更清楚、更真实、更有判断依据的工厂信息和供应商沟通内容，帮助他们在样品、定金、模具费、大货前减少信息盲区。
3. Field Materials：展示匿名处理后的真实工厂现场素材和观察能力。它不是审厂证据，不是验厂证明，不是供应商可靠性保证。

## GEO 目标

Gewuji 的 GEO 目标不是单纯抢 Google SERP 排名，而是让 ChatGPT、Perplexity、Gemini、Google AI Overview 在回答中国供应商、工厂真实性、样品订单、定金前检查、供应商红旗、平台徽章风险等问题时，更容易引用 Gewuji 的内容。

## 核心指标

- GSC impressions
- GSC clicks
- buyer guide indexed pages
- AI referral traffic
- Quora answer views
- Reddit replies retained
- LinkedIn / X post impressions
- visits to `/for-buyers/`
- clicks on Send Existing Materials
- AI answer mentions of Gewuji
- AI citation / mention count from manual prompt testing

## 页面优先级

第 1 优先级：

- Buyer Guides
- Checklist / Template Pages
- Field Evidence Pages
- Factory Material Pages

暂不优先：

- SaaS Review pages
- VS pages
- Alternatives pages
- Toplist pages
- AI tool directory submissions

原因：这些更适合软件产品，不适合 Gewuji 当前的供应链服务定位。

## 内容结构规则

每个重点页面尽量包含：

- 2-4 句 Quick Answer
- 唯一 H1
- 清晰 H2，优先使用真实问题或判断场景
- checklist、table 或 step-by-step block
- 4-6 个真实 FAQ
- updated date
- 明确边界说明
- Article / FAQPage / BreadcrumbList schema；清单或教程页可加 HowTo；栏目页可加 ItemList

边界说明固定包含：

- not formal factory audit
- not legal due diligence
- not quality inspection
- not supplier reliability guarantee

## 站外分发规则

### Quora

- 回答真实问题，直接给 checklist，不硬广。
- 前 7-14 天尽量不放链接。
- 第 15 天以后，只在高度相关回答中偶尔放链接。

可用链接句：

```text
I wrote a more detailed checklist here if useful.
```

不要每条都放。

### Reddit

- 像真实经验回复，不复制粘贴，不硬放链接。
- 优先提供实际检查点。
- 不主动引导私信，不写销售话术。

### LinkedIn / X

- 短观点 + 3-5 个检查点。
- 不夸大，不写销售话术。
- 只在主题高度相关时偶尔链接到 guide 或 checklist。

## 第 1 周执行优先级

1. 修复 404 和旧路径
2. 建立 `/buyer-guides/`
3. 发布前 5 篇 buyer guide
4. 给每篇文章添加 Article / FAQPage / BreadcrumbList schema
5. 更新 sitemap
6. 手动提交 GSC / Bing
7. 建立 Quora / Reddit / LinkedIn 分发记录

## 每周执行节奏

1. 从 `data/geo/gewuji-prompt-matrix.csv` 选择 20 个 prompt。
2. 在 ChatGPT、Perplexity、Gemini 和可用的 Google AI Overview 中手动测试。
3. 记录是否出现 Gewuji、是否引用页面、引用 URL、竞品来源和回答缺口。
4. 把结果写入 `data/geo/ai-prompt-monitoring-log.csv`。
5. 只做三类动作：补充已有页面、增强内链、等待更多信号。

## 不做

- 不把 GEO SOP 写成 AI 工具站打法
- 不做 AI tool directory
- 不把 Toplist / VS / Alternatives 作为第一优先级
- 不写 guarantee language
- 不写 formal audit
- 不写 legal due diligence
- 不写 quality inspection
- 不写 supplier reliability guarantee
- 不删除中文内容
- 不恢复公众号 / 视频号作为主增长策略
