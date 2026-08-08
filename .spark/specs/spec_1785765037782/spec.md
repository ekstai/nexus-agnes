# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 服务端, 前端]

## 页面路由与导航

### 页面路由
| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 对话首页 | 应用主入口，AI对话交互核心页面 |
| `/settings` | 设置页 | 全局设置中心，主题/模型/插件/数据管理 |
| `/plugins` | 插件市场页 | 浏览、安装、管理插件 |
| `/profile` | 个人中心页 | 用户资料与数据导入导出 |

### 导航设计
- 导航机制：页面路由 + 侧边抽屉
- 导航项（侧边抽屉底部）：
  - 对话首页（默认，点击新建或切换对话）
  - 插件市场
  - 设置
  - 个人中心
- 移动端：从左侧滑出抽屉承载导航与对话历史
- 桌面端：左侧常驻边栏（约280px），右侧为内容区

## 业务组件
| 组件 | 来源 | 关联页面 | 对应功能点 |
|------|------|---------|-----------|
| Button | shadcn/ui | 全部页面 | 操作按钮 |
| Input / Textarea | shadcn/ui | 对话页/设置页/个人中心 | 文本输入 |
| Card | shadcn/ui | 插件市场/设置/个人中心 | 卡片容器 |
| Drawer / Sheet | shadcn/ui | 对话页 | 侧边抽屉 |
| Avatar | shadcn/ui | 侧边抽屉/个人中心 | 用户头像 |
| Switch | shadcn/ui | 设置页/插件管理 | 启用/禁用开关 |
| Tabs | shadcn/ui | 设置页 | 设置分组切换 |
| Dialog / AlertDialog | shadcn/ui | 全部页面 | 确认弹窗/详情弹窗 |
| ScrollArea | shadcn/ui | 对话页/侧边抽屉 | 可滚动区域 |
| Tooltip | shadcn/ui | 全部页面 | 操作提示 |
| Badge | shadcn/ui | 插件市场/对话页 | 状态标签 |
| DropdownMenu | shadcn/ui | 对话页/设置页 | 下拉菜单 |
| Separator | shadcn/ui | 全部页面 | 分隔线 |
| Progress | shadcn/ui | 个人中心/导入导出 | 进度展示 |
| Skeleton | shadcn/ui | 全部页面 | 加载骨架屏 |

## 数据模型

### 数据库设计

#### 对话表（conversation）
用途：存储用户的对话会话信息，包括标题、关联模型配置等。
核心字段：
- title: varchar (对话标题，自动生成或手动编辑)
- model_config_id: uuid (关联的模型配置ID，可为空表示使用默认)
- user_id: varchar (所属用户ID，平台用户体系)
- last_message_at: timestamptz (最后消息时间，用于排序)
关联关系：与消息表为一对多关系；与模型配置表为多对一关系

#### 消息表（message）
用途：存储每条对话消息的内容、角色、工具调用信息等。
核心字段：
- conversation_id: uuid (所属对话ID)
- role: varchar ['user', 'assistant', 'tool'] (消息角色)
- content: text (消息文本内容，Markdown格式)
- tool_calls: jsonb (AI发起的工具调用列表，assistant消息使用)
- tool_call_id: varchar (工具调用ID，tool消息使用)
- tool_name: varchar (工具名称，tool消息使用)
- status: varchar ['sending', 'success', 'error'] (消息发送状态)
- order_index: integer (消息在对话中的顺序索引)
关联关系：与对话表为多对一关系

#### 模型配置表（model_config）
用途：存储用户配置的多套AI模型API配置。
核心字段：
- name: varchar (配置名称，用户自定义)
- api_url: varchar (API地址，支持远程和本地服务)
- api_key: varchar (API密钥，加密存储)
- model_name: varchar (模型名称标识)
- model_type: varchar ['remote', 'local'] (模型类型：远程/本地)
- is_default: boolean (是否为默认配置)
- user_id: varchar (所属用户ID)
关联关系：与对话表为一对多关系

#### 插件表（plugin）
用途：存储已安装插件及其配置状态。
核心字段：
- plugin_key: varchar (插件唯一标识key)
- name: varchar (插件名称)
- description: text (插件描述)
- version: varchar (版本号)
- author: varchar (作者)
- category: varchar (分类：tool/search/dev/life)
- icon: varchar (图标名称或URL)
- installed: boolean (是否已安装)
- enabled: boolean (是否启用)
- config_schema: jsonb (插件配置项schema定义)
- config_values: jsonb (用户配置值)
- user_id: varchar (所属用户ID)
关联关系：无直接外键，通过plugin_key与前端插件注册表关联

#### 用户偏好表（user_preference）
用途：存储用户的主题偏好、个人资料等全局设置。
核心字段：
- theme: varchar ['liquid-glass', 'porous-glass', 'dark', 'aurora', 'minimal-white'] (当前主题)
- nickname: varchar (用户昵称)
- avatar_url: varchar (头像URL)
- font_size: varchar ['small', 'medium', 'large'] (字体大小)
- bubble_style: varchar ['rounded', 'square', 'cloud'] (气泡样式)
- user_id: varchar (所属用户ID，唯一)
关联关系：独立表，每用户一条记录

## 业务模型

### API 设计

#### 对话首页相关
**页面路径**: `/`
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 发送消息获取AI回复 | API + 前端直连 | 后端代理转发到用户配置的模型API |
| 消息列表渲染 | 前端 | 从本地状态/API获取，Markdown渲染 |
| 模型快速切换 | API | 切换当前对话使用的模型配置 |
| 对话历史侧边栏 | API | 获取对话列表、新建/删除对话 |
| 工具调用展示 | 前端 | 解析tool_calls并展示结果卡片 |
| 代码高亮 | 前端 | shiki渲染代码块 |

**所需 API**:
```typescript
// 获取对话列表 [领域模型: Conversation] [对应页面功能: 对话历史侧边栏]
GET /api/conversations
Response: { items: Array<{ id: string; title: string; lastMessageAt: string; modelConfigId?: string }>; total: number; }

// 创建新对话 [领域模型: Conversation] [对应页面功能: 新建对话]
POST /api/conversations
Request: { title?: string; modelConfigId?: string; }
Response: { id: string; title: string; createdAt: string; }

// 获取对话详情（含消息） [领域模型: Conversation + Message] [对应页面功能: 切换对话查看历史]
GET /api/conversations/:id
Response: { id: string; title: string; modelConfigId?: string; messages: Array<MessageDto>; }

// 删除对话 [领域模型: Conversation] [对应页面功能: 删除对话]
DELETE /api/conversations/:id
Response: { success: boolean; }

// 更新对话标题 [领域模型: Conversation] [对应页面功能: 重命名对话]
PATCH /api/conversations/:id
Request: { title: string; }
Response: { id: string; title: string; }

// 发送消息并获取流式回复 [领域模型: Message] [对应页面功能: 发送消息获取AI回复]
POST /api/chat/send
Request: { conversationId?: string; message: string; modelConfigId?: string; }
Response: stream<{ type: 'content' | 'tool_call' | 'done' | 'error'; data: any; }>
// 说明：后端代理转发到用户配置的模型API，支持SSE流式输出

// 执行工具调用 [领域模型: Message] [对应页面功能: 工具调用展示]
POST /api/chat/tool
Request: { conversationId: string; toolCallId: string; toolName: string; args: Record<string, any>; }
Response: { result: any; }
```

#### 设置页相关
**页面路径**: `/settings`
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 主题切换 | API + 前端 | 保存主题偏好到后端，前端CSS变量切换 |
| 模型配置管理 | API | 增删改查模型配置 |
| 插件管理列表 | API | 已安装插件列表与启用开关 |
| 数据导入导出 | API | 导出/导入全部用户数据 |
| 关于信息 | 前端 | 静态展示版本与开发者信息 |

**所需 API**:
```typescript
// 获取用户偏好 [领域模型: UserPreference] [对应页面功能: 主题切换/外观设置]
GET /api/preferences
Response: { theme: string; nickname: string; avatarUrl?: string; fontSize: string; bubbleStyle: string; }

// 更新用户偏好 [领域模型: UserPreference] [对应页面功能: 主题切换/外观设置]
PUT /api/preferences
Request: { theme?: string; nickname?: string; avatarUrl?: string; fontSize?: string; bubbleStyle?: string; }
Response: { theme: string; nickname: string; avatarUrl?: string; fontSize: string; bubbleStyle: string; }

// 获取模型配置列表 [领域模型: ModelConfig] [对应页面功能: 模型配置管理]
GET /api/model-configs
Response: { items: Array<{ id: string; name: string; apiUrl: string; modelName: string; modelType: string; isDefault: boolean }>; }

// 创建模型配置 [领域模型: ModelConfig] [对应页面功能: 模型配置管理]
POST /api/model-configs
Request: { name: string; apiUrl: string; apiKey: string; modelName: string; modelType: 'remote' | 'local'; isDefault?: boolean; }
Response: { id: string; name: string; apiUrl: string; modelName: string; modelType: string; isDefault: boolean; }

// 更新模型配置 [领域模型: ModelConfig] [对应页面功能: 模型配置管理]
PUT /api/model-configs/:id
Request: { name?: string; apiUrl?: string; apiKey?: string; modelName?: string; modelType?: string; isDefault?: boolean; }
Response: { id: string; name: string; apiUrl: string; modelName: string; modelType: string; isDefault: boolean; }

// 删除模型配置 [领域模型: ModelConfig] [对应页面功能: 模型配置管理]
DELETE /api/model-configs/:id
Response: { success: boolean; }

// 测试模型配置连通性 [领域模型: ModelConfig] [对应页面功能: 模型配置管理]
POST /api/model-configs/:id/test
Response: { success: boolean; latency?: number; error?: string; }

// 获取已安装插件列表 [领域模型: Plugin] [对应页面功能: 插件管理]
GET /api/plugins/installed
Response: { items: Array<{ id: string; pluginKey: string; name: string; description: string; category: string; enabled: boolean; version: string }>; }

// 切换插件启用状态 [领域模型: Plugin] [对应页面功能: 插件管理]
PATCH /api/plugins/:id/enable
Request: { enabled: boolean; }
Response: { id: string; enabled: boolean; }

// 导出全部用户数据 [领域模型: 全部] [对应页面功能: 数据导入导出]
GET /api/data/export
Response: { version: string; exportedAt: string; data: { conversations: any[]; messages: any[]; modelConfigs: any[]; plugins: any[]; preferences: any; }; }

// 导入用户数据 [领域模型: 全部] [对应页面功能: 数据导入导出]
POST /api/data/import
Request: { version: string; data: { conversations?: any[]; messages?: any[]; modelConfigs?: any[]; plugins?: any[]; preferences?: any; }; merge?: boolean; }
Response: { success: boolean; imported: { conversations: number; messages: number; modelConfigs: number; plugins: number; }; }

// 清除所有数据 [领域模型: 全部] [对应页面功能: 数据管理]
DELETE /api/data/clear
Response: { success: boolean; }
```

#### 插件市场页相关
**页面路径**: `/plugins`
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 插件列表展示 | 前端 + API | 前端内置插件注册表 + 后端已安装状态 |
| 分类筛选/搜索 | 前端 | 本地筛选 |
| 插件详情 | 前端 + API | 前端注册表元数据 + 后端安装状态 |
| 安装/卸载插件 | API | 写入/删除插件记录 |
| 插件配置保存 | API | 保存插件配置值 |

**所需 API**:
```typescript
// 获取插件市场列表（含安装状态） [领域模型: Plugin] [对应页面功能: 插件列表展示]
GET /api/plugins/market
Response: { items: Array<{ pluginKey: string; name: string; description: string; category: string; icon: string; version: string; author: string; installed: boolean; enabled?: boolean; installId?: string; }>; }

// 安装插件 [领域模型: Plugin] [对应页面功能: 安装插件]
POST /api/plugins/install
Request: { pluginKey: string; }
Response: { id: string; pluginKey: string; name: string; installed: true; enabled: true; }

// 卸载插件 [领域模型: Plugin] [对应页面功能: 卸载插件]
DELETE /api/plugins/:id/uninstall
Request: { keepConfig?: boolean; }
Response: { success: boolean; }

// 获取插件配置 [领域模型: Plugin] [对应页面功能: 插件详情]
GET /api/plugins/:id/config
Response: { configSchema: Record<string, any>; configValues: Record<string, any>; }

// 保存插件配置 [领域模型: Plugin] [对应页面功能: 插件详情]
PUT /api/plugins/:id/config
Request: { configValues: Record<string, any>; }
Response: { success: boolean; configValues: Record<string, any>; }
```

#### 个人中心页相关
**页面路径**: `/profile`
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 用户资料展示与编辑 | API | 昵称、头像等 |
| 使用统计 | API | 对话次数、插件数等 |
| 数据导入导出 | API | 复用设置页的导入导出接口 |
| 头像上传 | 平台能力 | 使用平台文件存储服务 |

**所需 API**:
```typescript
// 获取使用统计 [领域模型: 聚合] [对应页面功能: 使用统计]
GET /api/profile/stats
Response: { conversationCount: number; messageCount: number; pluginCount: number; storageUsed: string; }

// 注：头像上传使用平台内置文件存储服务（client-builtins-file-storage-service）
// 上传后将file_path保存到用户偏好的avatarUrl字段
```

## 前端架构设计

### 主题系统
- 基于 CSS 变量 + Tailwind CSS 实现5种主题切换
- 主题定义在 `client/src/themes/` 目录，每个主题导出一组 CSS 变量
- 通过 `data-theme` 属性切换主题，配合 `framer-motion` 做过渡动画
- 主题列表：
  1. `liquid-glass`（液态玻璃）：毛玻璃 backdrop-blur、半透明背景、渐变边框、深度阴影
  2. `porous-glass`（毛孔玻璃）：磨砂纹理、低饱和度、哑光质感、柔和漫反射
  3. `dark`（暗黑模式）：深色背景、高对比度、霓虹点缀
  4. `aurora`（极光渐变）：流动渐变背景、紫蓝绿色调、发光效果
  5. `minimal-white`（极简纯白）：纯白背景、细线条、极简扁平化

### 状态管理
- 使用 Zustand 管理全局状态：
  - `useConversationStore`：当前对话、消息列表、发送状态
  - `useThemeStore`：当前主题、主题切换
  - `usePreferenceStore`：用户偏好设置
  - `usePluginStore`：插件注册表、已安装插件状态
- 使用 React Query 管理服务端数据缓存与同步

### 插件系统架构
- 前端插件注册表：`client/src/plugins/registry.ts`，内置5个示例插件的元数据与执行器
- 插件接口定义：
  ```typescript
  interface AgnesPlugin {
    key: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    version: string;
    author: string;
    functionDefinition: { name: string; description: string; parameters: Record<string, any>; };
    execute: (args: Record<string, any>, config: Record<string, any>) => Promise<any>;
    configSchema?: Record<string, any>;
  }
  ```
- 预置插件：
  1. **计算器插件**：纯前端数学表达式计算，使用 math.js（或内置eval沙箱）
  2. **翻译插件**：调用翻译API（可配置翻译服务地址与key），前端调用后端代理
  3. **天气查询插件**：调用天气API获取指定城市天气
  4. **代码执行插件**：前端安全沙箱执行简单JS代码（使用 Function 构造器受限环境）
  5. **网页搜索插件**：调用搜索API返回搜索结果摘要

### AI 对话流
1. 用户输入消息 → 前端添加用户消息到列表 → 调用 `/api/chat/send`
2. 后端根据当前模型配置，代理转发到用户配置的 API 地址
3. 支持流式响应（SSE），前端逐字渲染
4. 检测到 tool_call 时，前端展示工具调用状态卡片
5. 调用 `/api/chat/tool` 执行插件，结果以 tool 消息形式追加
6. 将工具结果回传给模型，获取最终回复

### 响应式布局
- 移动端（< 768px）：单栏布局，侧边抽屉从左滑出，底部输入框固定
- 平板（768px - 1024px）：左侧边栏可折叠，对话区自适应
- 桌面端（> 1024px）：左侧常驻边栏（280px）+ 右侧对话区，设置页左右分栏

### 动画与交互
- 使用 framer-motion 实现页面切换、消息入场、主题过渡等动画
- 消息气泡入场：从下往上淡入 + 轻微缩放
- 主题切换：300ms 渐变过渡，颜色/透明度/阴影同步变化
- 侧边抽屉：滑入滑出 + 背景遮罩淡入淡出
- 按钮/卡片 hover：轻微上浮 + 阴影加深
