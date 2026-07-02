# 第一批干净外链执行计划

这份清单只用于准备第一批可手动执行的干净外链，不注册账号，不提交外链，不购买链接。

## 执行原则

- 先做个人资料页和公开资源页，少而干净。
- 只链接已经上线的页面：`/`、`/for-buyers/`、`/for-factories/`、`/field-materials/`。
- 锚文本自然，不堆关键词。
- 文案只表达沟通支持、资料整理、实地素材和买家可读性，不写审厂、法律、质检或结果承诺。
- 每次手动发布后，再补记到 `data/backlinks/backlink-audit-log.csv`。

## 第一批 5 个来源

| 平台 | 目标页面 | 推荐锚文本 | 文案文件 | 优先级 | 手动动作 |
|---|---|---|---|---|---|
| LinkedIn profile | `https://gewuji.dev/for-buyers/` | Gewuji Factory Bridge | `docs/profile-link-copy.md` | High | 更新简介或 Featured link，保存后记录来源 URL |
| GitHub profile | `https://gewuji.dev/` | Gewuji | `docs/github-readme-backlink-template.md` | High | 更新 profile README 或个人主页链接 |
| GitHub README resource repository | `https://gewuji.dev/field-materials/` | field materials for buyer trust | `docs/github-readme-backlink-template.md` | Medium | 新建或更新资源 README，发布后记录仓库 URL |
| About.me profile | `https://gewuji.dev/` | Gewuji | `docs/profile-link-copy.md` | Medium | 更新 profile bio 和 website link |
| Notion public checklist | `https://gewuji.dev/for-buyers/` | practical sourcing communication guide | `docs/notion-checklist-template.md` | Medium | 创建公开 checklist 页面，确认公开可访问后记录 |

## 平台执行建议

### 1. LinkedIn profile

- 适合放 `https://gewuji.dev/for-buyers/`。
- 适合的人群是海外买家、采购、品牌方、产品团队。
- 资料页只说清楚经验和项目方向，不像销售落地页。
- 如果 LinkedIn 支持 Featured 链接，可标题写 `Gewuji Factory Bridge`。

提交后记录：

- `sourceDomain`: `linkedin.com`
- `sourceUrl`: LinkedIn 个人主页或 Featured 项公开 URL
- `targetUrl`: `https://gewuji.dev/for-buyers/`
- `anchorText`: `Gewuji Factory Bridge`
- `category`: `clean`
- `action`: `keep`

### 2. GitHub profile

- 适合放 `https://gewuji.dev/`。
- GitHub profile README 保持品牌母站入口，不展开销售文案。
- 推荐锚文本：`Gewuji`。

提交后记录：

- `sourceDomain`: `github.com`
- `sourceUrl`: GitHub profile README URL
- `targetUrl`: `https://gewuji.dev/`
- `anchorText`: `Gewuji`
- `category`: `clean`
- `action`: `keep`

### 3. GitHub README resource repository

- 适合做一个轻量资源仓库，例如 supplier communication notes。
- 主推 `https://gewuji.dev/field-materials/`，因为资源仓库更适合解释实地素材和资料整理。
- README 可以同时保留少量相关链接到 `/for-buyers/`、`/for-factories/`。

提交后记录：

- `sourceDomain`: `github.com`
- `sourceUrl`: 公开仓库 README URL
- `targetUrl`: `https://gewuji.dev/field-materials/`
- `anchorText`: `field materials for buyer trust`
- `category`: `clean`
- `action`: `keep`

### 4. About.me profile

- 适合放 `https://gewuji.dev/`。
- About.me 作为个人入口，不要塞太多链接。
- 推荐主链接：`Gewuji`。

提交后记录：

- `sourceDomain`: `about.me`
- `sourceUrl`: About.me 公开个人页 URL
- `targetUrl`: `https://gewuji.dev/`
- `anchorText`: `Gewuji`
- `category`: `clean`
- `action`: `keep`

### 5. Notion public checklist

- 适合做一页公开 checklist，给海外买家在样品单前整理供应商问题。
- 主推 `https://gewuji.dev/for-buyers/`。
- Related links 可放 `https://gewuji.dev/field-materials/`。

提交后记录：

- `sourceDomain`: `notion.so`
- `sourceUrl`: Notion 公开页面 URL
- `targetUrl`: `https://gewuji.dev/for-buyers/`
- `anchorText`: `practical sourcing communication guide`
- `category`: `clean`
- `action`: `keep`

## 记录到 backlink log 的规则

手动提交成功后，在 `data/backlinks/backlink-audit-log.csv` 新增一行：

```csv
checkedAt,sourceDomain,sourceUrl,targetUrl,anchorText,sourceDR,isRelevant,isIndexed,spamSignals,category,action,notes
2026-07-02,linkedin.com,https://www.linkedin.com/in/your-profile/,https://gewuji.dev/for-buyers/,Gewuji Factory Bridge,,yes,unknown,,clean,keep,First-batch clean profile link. Recheck index status later.
```

如果刚发布时不确定是否被收录，`isIndexed` 写 `unknown`，下次复查再更新。
