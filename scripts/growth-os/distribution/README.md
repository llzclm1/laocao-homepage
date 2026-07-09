# Growth OS Distribution Module

本模块只生成社媒草稿，不登录账号、不调用发布 API、不自动发布。

运行：

```bash
node scripts/growth-os/distribution/social-content-generator.mjs
```

输出：

- `docs/social/content-pack/go-xxx/`

社媒内容的生命周期状态统一由 `data/growth-os/state/content-lifecycle.json` 管理。
