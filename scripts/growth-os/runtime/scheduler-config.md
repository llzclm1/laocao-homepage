# Growth OS Scheduler Config

## 默认计划

- 每天早上运行一次。
- 只运行本地 Growth OS。
- 不发布页面。
- 不发送社媒。
- 不提交 git。

## 命令

```text
node scripts/growth-os/runtime/run.mjs
```

## 日志建议

输出日志可放在：

```text
data/growth-os/runtime/runtime.log
```

## 调试

```text
node scripts/growth-os/runtime/run.mjs --dry-run
```
