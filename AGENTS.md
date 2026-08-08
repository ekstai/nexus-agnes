# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 移动端优先的AI对话用户，追求精致体验与隐私安全，心理预期为高端App质感
- **核心目的**: 建立信任 + 引导沉浸对话 + 展示AI能力的可视化反馈
- **情绪基调**: 精致安心 / 流动灵动；避免廉价塑料感、信息过载焦虑

### 1.2 设计方向

- **Design Style**: Frosted Glass 毛玻璃 — 液态玻璃是产品核心记忆点，半透明悬浮感+深度阴影承载5种主题切换
- **Application Type**: Mobile-first Chat App — 决定沉浸式全屏布局与触控优先交互
- **Aesthetic Direction**: 光影折射驱动的界面呼吸感，材质即品牌

## 2. Color System (色彩系统)

**色彩关系**: 虹彩青蓝主色 + 低饱和灰紫底 + 深墨文字，所有色值通过HSL变量支持5主题热切换
**配色设计理由**: 液态玻璃需中性底色凸显折射光泽；青蓝兼顾科技感与亲和力，避免AI刻板紫
**主色推导**: primary取自液态玻璃高光色相(H:195)，关联发送按钮、激活态、工具调用高亮
**使用比例**: 70% 半透明中性层 / 20% 玻璃质感层 / 10% primary点睛；primary仅用于可行动元素

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                     |
| -------------------- | ----------------------- | ---------------------------------------- |
| `background`         | hsl(220 15% 96%)        | 液态玻璃默认底色，带微妙渐变流动感       |
| `card`               | hsla(220 15% 100% 0.65) | 消息气泡/设置卡片，backdrop-blur-md      |
| `foreground`         | hsl(220 20% 12%)        | 主文字，深墨色确保玻璃背景可读           |
| `muted-foreground`   | hsl(220 10% 48%)        | 次级文字/时间戳                          |
| `primary`            | hsl(195 85% 52%)        | 发送按钮/激活态/工具调用高亮             |
| `primary-foreground` | hsl(0 0% 100%)          | 主交互文字                               |
| `accent`             | hsla(195 85% 52% 0.12)  | hover/focus/骨架屏背景，低权重状态反馈   |
| `accent-foreground`  | hsl(195 85% 35%)        | accent上的文字/图标                      |
| `border`             | hsla(220 15% 80% 0.3)   | 玻璃边框，半透明模拟折射边缘             |

### 2.2 导航区配色

- **基调关系**: 复用主配色系统，通过`backdrop-blur-lg`+更高透明度区分层级
- **关键状态**: 激活态用`primary`填充+白色文字；hover用`accent`背景过渡200ms
- **边界与背景**: 非透明背景`hsla(220 15% 98% 0.8)`，底部1px半透明分隔线

### 2.3 语义颜色

| 用途     | Token          | HSL 值                  | 衍生逻辑                     |
| -------- | -------------- | ----------------------- | ---------------------------- |
| 成功/已安装 | `success`      | hsl(155 70% 42%)        | 绿色系，边框中饱和+背景低饱和 |
| 警告/禁用 | `warning`      | hsl(38 90% 50%)         | 橙黄系，仅大字号或深色变体    |
| 错误/删除 | `destructive`  | hsl(5 80% 55%)          | 红色系，清除数据等危险操作    |

## 3. Typography (字体排版)

- **Heading**: 'SF Pro Display', 'PingFang SC', system-ui, sans-serif
- **Body**: 'SF Pro Text', 'PingFang SC', system-ui, sans-serif
- **字体策略**: 优先系统原生字体栈确保移动端渲染性能；标题font-semibold/body font-normal形成层级；代码块强制'JetBrains Mono', monospace

## 4. Layout Strategy (布局策略)

- **导航意图**: 移动端左侧抽屉(85vw)呼出历史+全局入口；桌面端常驻280px侧边栏；至多一套导航，禁止Topbar+Sidebar并存
- **页面架构**: 沉浸式全屏聊天布局，对话页max-w-none全宽利用；设置/个人中心/插件市场max-w-3xl居中卡片流
- **响应式**: 移动端单栏全屏+底部固定输入区；桌面端左右分栏(历史常驻+对话区自适应)，输入区随窗口宽度伸缩

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角 `rounded-xl (0.75rem)` · 阴影 `shadow-[0_8px_32px_rgba(0,0,0,0.08)]` · 间距基调 spacious
- **识别签名**: 消息气泡`backdrop-blur-md`+内发光边框；主题切换300ms全局渐变过渡；工具调用卡片嵌入式展开动效
- **装饰策略**: 背景微粒子流动动画(液态玻璃专属)；无额外图标装饰，材质本身即视觉焦点
- **动效原则**: 发送/回复流式打字200ms ease-out；主题切换300ms cubic-bezier(0.4,0,0.2,1)
- **可及性**: 玻璃背景文字对比度≥4.5:1；复杂渐变背景加`bg-black/20`遮罩；所有交互元素有focus-visible环

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Card覆盖Default/Hover/Focus/Active/Disabled；玻璃组件hover增加`brightness-105`+阴影加深
- **层级清晰**: Primary按钮实心填充`primary`；Ghost按钮仅`accent`背景+`primary`文字；表单Focus态`ring-2 ring-primary/50`
- **一致性**: 所有卡片统一`backdrop-blur-md`+`border-white/20`；颜色只用Color System token，禁止硬编码

## 7. Image Direction (图片与视觉资产，按需)

- **Image Role**: 无强制图片需求，优先通过玻璃材质、光影折射和微粒子动画建立视觉记忆点
- **Image Art Direction**: 无
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用AI机器人插图、科技蓝光效素材库图、与玻璃质感冲突的扁平插画

## 8. 应避免 (Anti-patterns)

- ❌ 在液态玻璃主题上使用纯白实底卡片破坏通透感，必须保留backdrop-blur+半透明
- ❌ 桌面端添加Topbar导航与已有侧边栏形成双导航，违反概要设计单一枢纽原则
- ❌ 主题切换时仅变色不切换材质参数（blur/shadow/border），导致5种主题沦为换色皮肤