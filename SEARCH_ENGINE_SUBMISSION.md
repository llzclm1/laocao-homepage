# 搜索引擎提交清单

站点预设公开地址：

```text
https://llzclm1.github.io/laocao-homepage/
```

Sitemap 地址：

```text
https://llzclm1.github.io/laocao-homepage/sitemap.xml
```

Robots 地址：

```text
https://llzclm1.github.io/laocao-homepage/robots.txt
```

## 已在代码中添加

- `robots.txt`：允许搜索引擎抓取，并声明 sitemap。
- `sitemap.xml`：声明首页 URL。
- `index.html`：添加 canonical、description、Open Graph、Twitter Card、结构化数据。
- `8221b5ee5eb23147b8f2422b2cb6096e.txt`：IndexNow 验证文件。
- `scripts/submit-indexnow.mjs`：向支持 IndexNow 的搜索引擎提交首页 URL。

## 需要站点公开后再做

搜索引擎不能被代码强制收录，只能提高发现效率。网站必须先公开部署，且对应 URL 能直接访问。

### IndexNow

IndexNow 可通知 Bing、Yandex 等支持该协议的搜索引擎。站点公开可访问后运行：

```bash
npm run submit:indexnow
```

如果最终域名不是预设的 GitHub Pages 地址，先指定正式地址：

```bash
SITE_URL=https://your-domain.example/ npm run submit:indexnow
```

### Google

1. 打开 Google Search Console。
2. 添加并验证站点。
3. 在 Sitemaps 中提交：

```text
https://llzclm1.github.io/laocao-homepage/sitemap.xml
```

### Bing

1. 打开 Bing Webmaster Tools。
2. 添加并验证站点。
3. 在 Sitemaps 中提交同一个 sitemap 地址。

### Baidu

1. 打开百度搜索资源平台。
2. 添加并验证站点。
3. 在“资源提交 / Sitemap”中提交 sitemap。

### Yandex

1. 打开 Yandex Webmaster。
2. 添加并验证站点。
3. 在 Sitemap files 中提交 sitemap。

## 如果改用自定义域名

把下面几处的 `https://llzclm1.github.io/laocao-homepage/` 替换成正式域名：

- `index.html` 中的 canonical、og:url、结构化数据 url。
- `robots.txt` 中的 Sitemap 地址。
- `sitemap.xml` 中的 loc。
- 本文件中的提交地址。
