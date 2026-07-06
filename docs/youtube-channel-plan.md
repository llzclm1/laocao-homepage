# Gewuji Supplier Review YouTube 频道计划

这份文档定义 Gewuji Supplier Review 的 YouTube 本地素材边界，只用于后续剪辑和验证，不代表已经创建频道、生成视频或上传内容。

## 频道定位

频道名称：

```text
Gewuji Supplier Review
```

频道一句话：

```text
Practical checks before paying Chinese suppliers.
```

核心定位：

```text
Practical China supplier review notes for overseas buyers before samples, deposits, tooling money, and first orders.
```

这个频道不是泛泛讲中国采购，而是服务已经在和供应商沟通、准备付款、准备打样或准备首单的小买家。

## 内容边界

不做：

- 不承诺供应商安全或订单结果
- 不说供应商已经验证安全
- 不声称覆盖正式第三方检查、法律责任或品质责任
- 不做供应商名单曝光或耸动风险标题
- 不曝光真实客户、工厂名、logo、订单号、图纸或私人细节
- 不伪造案例、工厂 footage 或平台数据
- 不做强销售、不引导私信、不写服务承诺

每条视频只表达：这些信号可以帮助买家发现不清楚的地方，并决定下一步该问什么。

## 目标观众

- 第一次从中国采购的海外买家
- Amazon / Shopify / DTC 小卖家
- 小型进口商
- Kickstarter / 硬件团队
- 正在准备样品费、定金、模具费或首单的买家
- 已经收到供应商报价、聊天回复或工厂视频，但不确定该信什么的人

## 内容支柱

1. Supplier reply review
   - 供应商回复里已经确认了什么
   - 哪些信息仍然模糊
   - 下一句该问什么

2. Before payment checks
   - 样品费
   - 定金
   - 模具费
   - 收款账户和公司名匹配

3. Factory video signals
   - 视频能看出什么
   - 视频不能证明什么
   - 视频通话时该要求对方展示哪些区域

4. Sample vs bulk
   - 样品到底证明什么
   - 包装、logo、材料和交期是否写清楚
   - 样品到大货之间可能变化什么

## Shorts 生产规格

- 画幅：1080x1920 vertical Shorts
- 帧率：30fps
- 导出格式：H.264 MP4
- 时长：30-45 秒
- 字幕：clean captions，高对比，单屏 1-2 行
- 旁白：英文，平静、直接、买家视角
- 背景：muted industrial background，垂直裁切，模糊或加深色遮罩
- 输出规划目录：`outputs/youtube/shorts-batch-01/`

本轮只规划文件名和剪辑说明，不生成真实 `.mp4`。

## 素材使用规则

优先使用现有本地图片作为匿名工业背景：

- `field-materials/nonwoven-line-02.jpg`
- `field-materials/fastener-workshop-01.jpg`
- `field-materials/machinery-facility-01.jpg`
- `field-materials/metal-parts-01.jpg`
- `field-materials/textile-workshop-01.jpg`
- `factory-assets/workshop-wide.jpg`
- `factory-assets/machine-detail.jpg`
- `factory-assets/parts-bin.jpg`

处理要求：

- 统一垂直裁切为 9:16
- 加 blur、dark overlay 或局部遮罩
- 不让真实标签、公司名、logo、脸、订单细节、图纸或私人信息可读
- 如需展示供应商回复，用通用 fake reply card，不使用真实聊天截图

## CTA 规则

只使用软 CTA：

- See the sample supplier reply review report on Gewuji.
- Compare your supplier reply against a checklist before paying.
- If you want to see how a review is structured, check the sample report.

可用描述链接：

- `https://gewuji.dev/supplier-reply-review/`
- `https://gewuji.dev/supplier-reply-review/sample-report/`
- `https://gewuji.dev/field-materials/`
- 相关 buyer guide URL

## 后续视频生成

如果后续要生成真实 `.mp4`，另开执行任务。优先使用本机已有 `ffmpeg`，不新增复杂视频工具链；生成前重新检查字幕、背景图片隐私和描述文案边界。
