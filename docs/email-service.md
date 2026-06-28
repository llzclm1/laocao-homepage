# gewuji.dev 邮件服务配置

目标先做两件事：

1. 公开联系邮箱统一为 `laocao@gewuji.dev`。
2. 网站咨询表单后续只做收集线索和通知，不接冷邮件群发。

## 收信

推荐先用 Cloudflare Email Routing：

- 地址：`laocao@gewuji.dev`
- 转发到：`llzclm@gmail.com`
- DNS：按 Cloudflare 提示添加 MX、TXT 记录

## 发信

对外正式发信用邮件服务商，不用静态网页直接发：

- SPF：按邮件服务商提供的 TXT 记录配置
- DKIM：按邮件服务商提供的 CNAME/TXT 记录配置
- DMARC：先用宽松策略观察

```txt
_dmarc.gewuji.dev TXT "v=DMARC1; p=none; rua=mailto:laocao@gewuji.dev"
```

## 网站表单

最小闭环：

```txt
页面表单 -> 后端接口 -> Supabase 保存 -> 邮件通知 laocao@gewuji.dev
```

冷邮件群发不要走主站接口，也不要用主域名邮箱直接大批量发。后续需要放大时，再单独配置子域名，例如 `mail.gewuji.dev`。
