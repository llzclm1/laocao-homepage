# Scheduler Design

Autonomous Scheduler v1 只负责本地运行顺序。它不触发外部发布、不调用平台 API。

## Daily Run

建议时间：每天上午。

步骤：

1. 读取本地输入文件和现有 opportunity queue。
2. 生成或更新 opportunities。
3. 为高分 opportunity 生成内容生产包。
4. 执行边界审核。
5. 把可发布项标记为 `approval_required`。

## Weekly Report

建议时间：每周一。

步骤：

1. 读取 content status。
2. 读取 GEO prompt 检查结果。
3. 汇总 SEO / GEO / distribution 信号。
4. 生成 feedback report。
5. 写入 optimization queue。

## 不做的事

- 不自动创建页面
- 不自动发帖
- 不自动评论
- 不自动抓取登录墙
- 不自动处理客户线索
