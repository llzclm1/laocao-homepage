# Growth OS Scheduler Install

本阶段只提供安装说明，不自动修改用户系统。

## 手动运行

```text
cd /Users/caocao/Documents/我的主页
node scripts/growth-os/runtime/run.mjs
```

## launchd 安装思路

1. 复制 `com.gewuji.growthos.daily.plist.example`
2. 改名为 `com.gewuji.growthos.daily.plist`
3. 确认 Node 路径
4. 放入 `~/Library/LaunchAgents/`
5. 手动加载

```text
launchctl load ~/Library/LaunchAgents/com.gewuji.growthos.daily.plist
```

## 卸载

```text
launchctl unload ~/Library/LaunchAgents/com.gewuji.growthos.daily.plist
```
