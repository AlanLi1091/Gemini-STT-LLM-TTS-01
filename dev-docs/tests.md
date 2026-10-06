# 测试套件与测试用例台账

> **维护规范**：
> 1. 本文档是本项目的自动化测试全景台账，完整记录所有测试文件（32 个套件）与具体测试用例（305 个断言项）。
> 2. **铁律联动**：后续开发中，每次有新功能开发、重构或测试内容更新时，**必须同步在此台账中维护新增或修改的测试项**，保持与实际测试套件 100% 同步。

## 1. 测试套件概览看板

| 序号 | 测试文件 | 所属阶段 / 任务 | 覆盖核心目标 | 用例数 | 状态 |
| :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | `src/test/smoke.test.ts` | Task 1 | Vitest 基建与 jsdom 环境可用性 | 3 | ✅ 通过 |
| 2 | `src/test/chat-skeleton.test.tsx` | Task 2 | 聊天界面基础骨架（Header / MessageList / ChatInput） | 6 | ✅ 通过 |
| 3 | `src/test/chat-dispatch.test.tsx` | Task 3 | 用户输入管理与消息派发提交行为 | 4 | ✅ 通过 |
| 4 | `src/test/mock-engine.test.tsx` | Task 4 | Mock 响应引擎延时回复与思考态交互流转 | 3 | ✅ 通过 |
| 5 | `src/test/task5-interactions.test.tsx` | Task 5 | 体验细节（ADR-005不可变ID / IME防误发 / 清空会话 / 触底滚动） | 7 | ✅ 通过 |
| 6 | `src/test/chat-adapter-contract.test.ts` | Task 6 / 10 | ChatAdapter 通用契约测试套件（Mock & Gemini send/stream） | 14 | ✅ 通过 |
| 7 | `src/test/gemini-adapter.test.ts` | Task 7 / 10 | GeminiChatAdapter send & stream 单测（网络全Mock/错误转译/用量提取） | 29 | ✅ 通过 |
| 8 | `src/test/settings-storage.test.ts` | Phase 3 收尾 Step 2A | 旧直连配置迁移至后端模式并清除浏览器密钥 | 8 | ✅ 通过 |
| 9 | `src/test/settings.test.tsx` | Phase 3 收尾 Step 2B | 后端连接信息面板与旧设置迁移 | 4 | ✅ 通过 |
| 10 | `src/hooks/useChat.test.ts` | Task 3 / 9 / 10 | useChat Hook 领域逻辑状态机（流式驱动/中断/重试/生命周期） | 13 | ✅ 通过 |
| 11 | `src/test/error-and-usage-components.test.tsx` | Task 9 / Phase 3 收尾 Step 2B | TokenUsageBadge 与服务端错误指引组件测试 | 15 | ✅ 通过 |
| 12 | `src/test/error-and-usage-integration.test.tsx` | Task 9 / Phase 3 收尾 Step 2B | 错误横幅展示/重试及 Token 徽章集成测试 | 2 | ✅ 通过 |
| 13 | `src/test/streaming-ui.test.tsx` | Task 10 | 流式打字机光标动效、停止生成按钮、顶栏联动禁用与 Smart Sticky Bottom 触底滚动守卫 | 8 | ✅ 通过 |
| 14 | `server/test/server-skeleton.test.ts` | Task 11 | Express 服务端骨架、双环境运行、根路径与健康检查响应 | 4 | ✅ 通过 |
| 15 | `core/test/sse-contract.test.ts` | Task 11 | 共享 SSE 事件、错误载荷与 sessionId 演进契约 | 5 | ✅ 通过 |
| 16 | `server/test/cors.test.ts` | Task 11 | CORS 白名单解析、允许/拒绝策略与预检链路 | 5 | ✅ 通过 |
| 17 | `server/test/chat-stream.test.ts` | Task 12 | SSE 流式管道、心跳、续传声明与中断级联 | 7 | ✅ 通过 |
| 18 | `server/test/chat-adapter-stream-source.test.ts` | Task 12 / Task 17 Step 1 | Adapter 自动选择、Mock 降级与标准错误 SSE 透传 | 9 | ✅ 通过 |
| 19 | `src/test/remote-chat-adapter.test.ts` | Task 13 / Task 14 Step 3 | RemoteChatAdapter 的 SSE 消费、错误映射、AbortSignal 与 sessionId 模式 | 7 | ✅ 通过 |
| 20 | `src/test/app-remote-integration.test.tsx` | Task 13 Step 3 / Task 14 Step 3 / Phase 3 收尾 | App 的后端 SSE 装配、会话恢复、归档清空与旧配置迁移 | 5 | ✅ 通过 |
| 21 | `server/test/json-session-storage.test.ts` | Task 14 Step 1 / Task 16 Step 2 | JSON 会话、频道关联、重启恢复与严格追加 | 8 | ✅ 通过 |
| 22 | `server/test/session-api.test.ts` | Task 14 Step 2 / Task 16 Step 2 | 会话 API、频道上下文、归档与来源隔离 | 9 | ✅ 通过 |
| 23 | `server/test/discord-demo.test.ts` | Task 15 Step 2 | 配置、测试频道回显、连接事件、日志脱敏与退出清理（网络 Mock） | 14 | ✅ 通过 |
| 24 | `bot/test/gateway.test.ts` | Task 16 / Task 17 Step 1–3 | 正式网关、typing、错误、重连、长时模拟与资源清理（网络 Mock） | 42 | ✅ 通过 |
| 25 | `bot/test/message-entry.test.ts` | Task 16 Step 1 | 指定频道直接 @Bot、提及清理与消息过滤 | 14 | ✅ 通过 |
| 26 | `bot/test/backend-client.test.ts` | Task 16 Step 2 | 本机 HTTP / SSE、最终回复、错误、中止与重启解析 | 17 | ✅ 通过 |
| 27 | `bot/test/split-message.test.ts` | Task 16 Step 3 | 长回复完整分段、段落 / 换行优先、UTF-16 与 CRLF 边界 | 10 | ✅ 通过 |
| 28 | `bot/test/request-scheduler.test.ts` | Task 17 Step 1 | FIFO、跨频道、队满、用户冷却、失败恢复与退出 | 7 | ✅ 通过 |
| 29 | `server/test/request-budget.test.ts` | Task 17 Step 1 | 滚动请求预算、限流暂停与恢复 | 4 | ✅ 通过 |
| 30 | `bot/test/errors.test.ts` | Task 17 Step 2 | 固定安全反馈、Discord 错误分类与启动日志脱敏 | 4 | ✅ 通过 |
| 31 | `server/test/deployment.test.ts` | Task 18 Step 1 | 私有 loopback 配置、静态托管、SSE / API 隔离与文件边界 | 7 | ✅ 通过 |
| 32 | `server/test/deployment-validation.test.ts` | Task 18 Step 2 | 采集故障、重连中断、24 小时 / 新鲜度 / 证据缺口判定 | 11 | ✅ 通过 |
| **合计** | **32 个测试文件** | **Phase 1–4** | **全链路领域内核、共享适配器、UI 交互、服务端流式管道与会话持久化** | **305** | **✅ 100% 通过** |

---

## 2. 测试用例详细清单

### 2.1 `src/test/smoke.test.ts` (3 项)
> **任务对应**：Task 1 · Vitest 基建与 jsdom 环境可用性


#### Smoke Test Infrastructure
- [x] **should run basic assertion in vitest**
- [x] **should have dom environment available in jsdom**
- [x] **should support mocked scrollTo in jsdom**

### 2.2 `src/test/chat-skeleton.test.tsx` (6 项)
> **任务对应**：Task 2 · 聊天界面基础骨架（Header / MessageList / ChatInput）


#### Task 2: 聊天界面骨架单元测试 > Header 组件
- [x] **应渲染标题与状态标签**

#### Task 2: 聊天界面骨架单元测试 > MessageList 组件
- [x] **空列表时应展示空状态提示与 log 角色**
- [x] **有消息时应正确渲染用户与机器人消息气泡**

#### Task 2: 聊天界面骨架单元测试 > ChatInput 组件
- [x] **应渲染文本输入框、发送按钮及表单**
- [x] **disabled 状态下输入框与发送按钮应处于禁用态**

#### Task 2: 聊天界面骨架单元测试 > App 完整骨架挂载
- [x] **App 应同时装配 Header、MessageList 与 ChatInput 三大骨架区域**

### 2.3 `src/test/chat-dispatch.test.tsx` (4 项)
> **任务对应**：Task 3 · 用户输入管理与消息派发提交行为


#### Task 3: 用户输入与消息派发完整交互测试
- [x] **输入框为空时，发送按钮应禁用**
- [x] **输入纯空格时，发送按钮保持禁用**
- [x] **输入有效文字后发送按钮启用，提交表单后消息显示在列表中并清空输入框**
- [x] **使用键盘 Enter 提交表单可派发消息**

### 2.4 `src/test/mock-engine.test.tsx` (3 项)
> **任务对应**：Task 4 · Mock 响应引擎延时回复与思考态交互流转


#### Task 4: Mock 机器人响应引擎与思考态测试 > mockChatService 领域内核测试
- [x] **应在指定延时后生成问候类 Mock 回复**
- [x] **应在指定延时后生成兜底通用 Mock 回复**

#### Task 4: Mock 机器人响应引擎与思考态测试 > App 经后端 Mock 响应的交互测试
- [x] **用户发送消息后，立即进入思考态，输入框被禁用，并渲染思考动效指示器**

### 2.5 `src/test/task5-interactions.test.tsx` (7 项)
> **任务对应**：Task 5 · 体验细节（ADR-005不可变ID / IME防误发 / 清空会话 / 触底滚动）


#### Task 5 交互细节与体验优化全面测试 > ADR-005 消息模型不可变与稳定 ID 断言
- [x] **每条生成的消息持有非空的稳定唯一字符串 ID，且追加不篡改先前消息**

#### Task 5 交互细节与体验优化全面测试 > IME 组合态防误发测试
- [x] **中文输入法敲 Enter 选词（isComposing 为 true）时不得触发消息发送**
- [x] **Shift + Enter 应换行而不是发送消息**

#### Task 5 交互细节与体验优化全面测试 > 清空会话功能与状态干净测试
- [x] **点击清空对话按钮出现确认步骤，确认后重置会话并保持输入框干净聚焦**
- [x] **取消清空对话后，原有消息不丢失**

#### Task 5 交互细节与体验优化全面测试 > 无障碍与触底调度测试
- [x] **消息列表容器应具备 role="log" 和 aria-live="polite"**
- [x] **发送消息后调用滚动触底 scrollTo**

### 2.6 `src/test/chat-adapter-contract.test.ts` (14 项)
> **任务对应**：Task 6 / 10 · ChatAdapter 通用契约测试套件（Mock & Gemini send/stream）


#### ChatAdapter Contract: MockChatAdapter
- [x] **必须提供非空的唯一 id 与展示名称 name**

#### ChatAdapter Contract: MockChatAdapter > send (非流式契约)
- [x] **接收消息历史并返回合法的 ChatResponse，包含 content 与用量统计**
- [x] **当传入已中止的 AbortSignal 时，应立即抛出 code 为 ABORTED 的 ChatError**
- [x] **在异步执行过程中触发 AbortSignal，应正确中断并抛出 code 为 ABORTED 的 ChatError**

#### ChatAdapter Contract: MockChatAdapter > stream (流式契约)
- [x] **返回 AsyncIterable，逐步产出 ChatChunk，最终 chunk 标记 done: true 并提供累积内容与用量**
- [x] **当传入已中止的 AbortSignal 时，stream 应立即抛出 code 为 ABORTED 的 ChatError**
- [x] **在流式 chunk 产出过程中触发 AbortSignal，应成功打断并抛出 code 为 ABORTED 的 ChatError**

#### ChatAdapter Contract: GeminiChatAdapter
- [x] **必须提供非空的唯一 id 与展示名称 name**

#### ChatAdapter Contract: GeminiChatAdapter > send (非流式契约)
- [x] **接收消息历史并返回合法的 ChatResponse，包含 content 与用量统计**
- [x] **当传入已中止的 AbortSignal 时，应立即抛出 code 为 ABORTED 的 ChatError**
- [x] **在异步执行过程中触发 AbortSignal，应正确中断并抛出 code 为 ABORTED 的 ChatError**

#### ChatAdapter Contract: GeminiChatAdapter > stream (流式契约)
- [x] **返回 AsyncIterable，逐步产出 ChatChunk，最终 chunk 标记 done: true 并提供累积内容与用量**
- [x] **当传入已中止的 AbortSignal 时，stream 应立即抛出 code 为 ABORTED 的 ChatError**
- [x] **在流式 chunk 产出过程中触发 AbortSignal，应成功打断并抛出 code 为 ABORTED 的 ChatError**

### 2.7 `src/test/gemini-adapter.test.ts` (29 项)
> **任务对应**：Task 7 / 10 · GeminiChatAdapter send & stream 单测（网络全Mock/错误转译/用量提取）


#### GeminiChatAdapter Unit Tests (Task 7) > 辅助方法测试
- [x] **formatGeminiContents: 正确映射 user 为 user，assistant 为 model，过滤 system**
- [x] **resolveSystemInstruction: 合并配置项与历史中的 system 角色指令**
- [x] **resolveSystemInstruction: 无 system 角色及配置时返回 undefined**

#### GeminiChatAdapter Unit Tests (Task 7) > 辅助方法测试 > classifyGeminiError 错误分类器
- [x] **识别用户中断 ABORTED**
- [x] **识别鉴权与 Key 错误 AUTH_ERROR (401, 403, API_KEY_INVALID)**
- [x] **识别配额与频控错误 RATE_LIMIT (429, RESOURCE_EXHAUSTED)**
- [x] **识别网络错误 NETWORK_ERROR**
- [x] **识别服务端与模型拦截错误 MODEL_ERROR**
- [x] **未知异常归类为 UNKNOWN**

#### GeminiChatAdapter Unit Tests (Task 7) > GeminiChatAdapter 实例与属性
- [x] **初始化时设置正确的 id、name，默认模型为 gemini-3.8-flash**
- [x] **支持传入自定义模型名称**

#### GeminiChatAdapter Unit Tests (Task 7) > GeminiChatAdapter.send
- [x] **当未配置 apiKey 时，抛出 AUTH_ERROR 类型的 ChatError**
- [x] **当 apiKey 仅含空白字符时，send 抛出 AUTH_ERROR 且不发请求**
- [x] **当未配置 apiKey 时，stream 迭代抛出 AUTH_ERROR 类型的 ChatError**
- [x] **当传入已 aborted 的 signal 时，抛出 ABORTED 类型的 ChatError**
- [x] **正常调用：传递正确的参数，并正确提取 content 与 usageMetadata**
- [x] **当 SDK 抛出 401 鉴权异常时，转译为 AUTH_ERROR 的 ChatError**
- [x] **当 SDK 抛出 403 / PERMISSION_DENIED 异常时，转译为 AUTH_ERROR 的 ChatError**
- [x] **当发生 Headers non ISO-8859-1 code point 异常时，转译为友好的 AUTH_ERROR ChatError**
- [x] **当 SDK 抛出 429 配额异常时，转译为 RATE_LIMIT 的 ChatError**
- [x] **当 SDK 抛出网络异常时，转译为 NETWORK_ERROR 的 ChatError**

#### GeminiChatAdapter Unit Tests (Task 7) > stream 流式接口测试 (Task 10)
- [x] **缺少有效 API Key 时，直接抛出 AUTH_ERROR 的 ChatError，不调用 SDK**
- [x] **已中断的 AbortSignal 传入时，直接抛出 ABORTED 的 ChatError**
- [x] **空消息列表直接返回仅有 done: true 的空 chunk**
- [x] **正常流式调用：逐步输出 delta 与 accumulated，最后一个 chunk 带有 done: true 与 usageMetadata**
- [x] **流式生成过程中触发 AbortSignal：正确中止并抛出 ABORTED 错误**
- [x] **流式调用 SDK 抛出 403 / PERMISSION_DENIED 时转译为 AUTH_ERROR**
- [x] **流式迭代过程中抛出网络异常时转译为 NETWORK_ERROR**
- [x] **流式调用 SDK 抛出 429 配额异常时转译为 RATE_LIMIT**

### 2.8 `src/test/settings-storage.test.ts` (8 项)
> **任务对应**：Phase 3 收尾 Step 2A · 存量直连配置迁移至后端模式并清除密钥

#### Settings migration to server-only mode (ADR-010)
- [x] **空值与非对象均回退后端默认设置**
- [x] **存量直连与含 Key 配置均迁移到后端模式且丢弃 Key**
- [x] **非法连接模式回退后端模式**
- [x] **localStorage 为空时返回默认设置且不创建记录**
- [x] **后端设置正常写入并回读**
- [x] **读取旧版配置时覆写 localStorage，清除直连与密钥字段**
- [x] **损坏的 JSON 被清除并回退默认设置**
- [x] **运行时传入旧字段时保存仍只写入后端模式**

### 2.9 `src/test/settings.test.tsx` (4 项)
> **任务对应**：Phase 3 收尾 Step 2B · 后端连接信息面板与旧设置迁移

#### Phase 3 收尾：后端连接信息面板
- [x] **展示后端连接说明，且没有直连、模型或浏览器密钥控件**
- [x] **打开应用时迁移旧直连设置并从存储中清除密钥**
- [x] **关闭按钮、Esc 与遮罩均可关闭面板**
- [x] **面板保留对话框语义和标题关联**

### 2.10 `src/hooks/useChat.test.ts` (13 项)
> **任务对应**：Task 3 / 9 / 10 · useChat Hook 领域逻辑状态机（流式驱动/中断/重试/生命周期）


#### useChat Hook 领域逻辑测试
- [x] **应正确初始化空消息列表与空输入框**
- [x] **更新输入框文本应同步状态**
- [x] **空白或全空格输入不应发送，且返回 false**
- [x] **发送有效文本应追加消息并清空输入框**
- [x] **clearMessages 应正确清空消息列表**
- [x] **adapter.send 返回 usage 时应正确附着在 assistant 消息上（当 adapter 未实现 stream 时降级 send）**
- [x] **调用失败时应正确捕获 lastError 且不向消息队列插入伪造回复**
- [x] **lastError 的生命周期规范：新发送、手动关闭、清空会话应清除 lastError**
- [x] **retryFailedSend 守卫规则：无错误或末条不是 user 时拒绝执行，返回 false**
- [x] **retryFailedSend 成功时应清除错误、重新发起请求并追加 assistant 消息（日志严格仅追加，零截断）**
- [x] **流式生成时应逐步更新消息内容并在完成时将 isGenerating 置为 false**
- [x] **调用 stopGenerating 应立即打断流式传输，保留已上屏内容且不报错误**
- [x] **流式过程中抛出异常应正确捕获 lastError 并结束生成状态**

### 2.11 `src/test/error-and-usage-components.test.tsx` (15 项)
> **任务对应**：Task 9 / Task 13 验收修复 · TokenUsageBadge 徽章与 ChatErrorBanner 错误横幅纯组件测试


#### TokenUsageBadge 纯展示组件测试
- [x] **当 usage 为 undefined 时不应渲染任何 DOM**
- [x] **当所有 token 计数均为 0 或未定义时不应渲染**
- [x] **正确渲染 token 总量与 ARIA 辅助文本**
- [x] **当未传 totalTokens 时应自动求和 prompt + completion**

#### ChatErrorBanner 错误提示横幅组件测试
- [x] **当 error 为 null 时不应渲染**
- [x] **应正确匹配错误码 [AUTH_ERROR] 对应的标题文案**
- [x] **应正确匹配错误码 [RATE_LIMIT] 对应的标题文案**
- [x] **应正确匹配错误码 [NETWORK_ERROR] 对应的标题文案**
- [x] **应正确匹配错误码 [MODEL_ERROR] 对应的标题文案**
- [x] **应正确匹配错误码 [ABORTED] 对应的标题文案**
- [x] **应正确匹配错误码 [UNKNOWN] 对应的标题文案**
- [x] **AUTH_ERROR 应引导检查服务端配置，且没有浏览器设置入口**
- [x] **点击重试按钮应触发 onRetry 回调**
- [x] **点击关闭按钮应触发 onDismiss 回调**
- [x] **default 兜底分支测试**

### 2.12 `src/test/error-and-usage-integration.test.tsx` (2 项)
> **任务对应**：Task 9 / Phase 3 收尾 Step 2B · 错误横幅展示/重试及 Token 徽章集成测试


#### Task 9: 错误提示与用量记录 UI 集成测试
- [x] **当 assistant 消息包含 usage 时，消息列表内应正确渲染 TokenUsageBadge 徽章**
- [x] **当存在 lastError 时，顶部正确展示 ChatErrorBanner 错误横幅**

### 2.13 `src/test/streaming-ui.test.tsx` (8 项)
> **任务对应**：Task 10 · 流式打字机光标动效、停止生成按钮、顶栏联动禁用与 Smart Sticky Bottom 触底滚动守卫


#### Task 10 Step 3: 流式 UI 交互与端到端集成测试
- [x] **当 isGenerating 为 true 时，应在最后一条 assistant 消息末尾渲染打字机光标，而之前历史消息不应渲染光标**
- [x] **当 isGenerating 为 false 时，即使存在 assistant 消息也不应渲染打字机光标**
- [x] **当 isGenerating 为 true 时，发送按钮应替换为停止生成按钮，点击应触发 stopGenerating**
- [x] **当 isGenerating 为 true 时，顶部 Header 的操作应联动禁用**

#### Task 10 Step 3: 流式触底滚动与用户滚动守卫 (Smart Sticky Bottom)
- [x] **流式 content 变化且用户在底部区域时，应触发 scrollTo 吸底**
- [x] **用户主动上滑离开底部区域时，流式 chunk 更新不得强制吸底（用户滚动守卫生效）**
- [x] **用户滑回底部区域时，恢复自动吸底追踪**
- [x] **用户上滑期间发送新消息时，无条件 smooth 强制吸底并重置守卫**

### 2.14 `server/test/server-skeleton.test.ts` (4 项)
> **任务对应**：Task 11 · Express 服务端骨架、Node.js 运行环境、根路径与健康检查响应

#### Task 11 Step 1: 服务端 Express 骨架与双环境测试
- [x] **应当在真实的 Node.js 环境下运行测试（window 为 undefined）**
- [x] **GET / 应返回 200 状态码并输出服务信息与 @core 版本号**
- [x] **访问不存在的路由应当返回 404**

#### Task 11 Step 2: 健康检查接口
- [x] **GET /api/health 应返回 200 状态码与共享健康状态结构**

### 2.15 `core/test/sse-contract.test.ts` (5 项)
> **任务对应**：Task 11 Step 2 · 共享 SSE 协议与无状态到会话化的演进契约

#### Task 11 Step 2: 共享 SSE 契约
- [x] **chunk 事件应携带增量文本与累积文本**
- [x] **done 事件应携带最终文本与可选 Token 用量**
- [x] **error 事件应内嵌 ChatError 的 code 与 message**
- [x] **应声明 Task 13 无状态请求向 Task 14 sessionId 的兼容演进路径**
- [x] **应声明 15 秒默认心跳且明确不支持断点续传**

### 2.16 `server/test/cors.test.ts` (5 项)
> **任务对应**：Task 11 Step 3 · CORS 白名单与环境隔离

#### Task 11 Step 3: CORS 白名单与环境隔离
- [x] **应清理、过滤并去重 ALLOWED_ORIGINS 中的来源**
- [x] **无 Origin 的服务间请求应正常通过且不返回跨域许可头**
- [x] **白名单内来源应通过并返回精确的跨域许可头**
- [x] **白名单外来源应被拒绝并返回 403**
- [x] **白名单内来源的 OPTIONS 预检应返回 204 与允许的方法和请求头**

### 2.17 `server/test/chat-stream.test.ts` (7 项)
> **任务对应**：Task 12 Step 1 · 服务端 SSE 流式管道与生命周期管理

#### Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理
- [x] **应返回 SSE 响应头并依次输出 chunk 与 done 事件**
- [x] **流保持打开时应定期输出 SSE 心跳注释行**
- [x] **携带 Last-Event-ID 的断点续传请求应被明确拒绝**
- [x] **请求体不符合共享契约时应返回 400**
- [x] **尚未注入流源时应返回 503**
- [x] **上游异常应转换为标准 UNKNOWN error 事件且不泄漏内部错误**
- [x] **客户端断开连接时应中止上游 AbortSignal**

### 2.18 `server/test/chat-adapter-stream-source.test.ts` (9 项)
> **任务对应**：Task 17 Step 2 / Task 12 Step 2–3 · 服务端 Adapter 承载、自动降级与错误透传

#### Task 12 Step 3: Adapter 自动选择与统一错误透传
- [x] **有效服务端 Key 应选择 Gemini，并映射 chunk/done 与 AbortSignal**
- [x] **缺少、空白或不可见字符 Key 时应自动降级共享 MockAdapter**
- [x] **Gemini 错误应通过 SSE error 事件透传标准 code 与 message**

- [x] **Web 与频道共用预算，超限不调用 SDK 或追加会话输入**
- [x] **上游 429 后暂停，期间不调用 SDK，到期可恢复**
- [x] **Mock 不消耗或受 Gemini 预算影响**
- [x] **已中止请求不消耗预算或调用 SDK**
- [x] **非法服务端预算配置在启动时拒绝**

- [x] **无状态模型流缺少结束事件时返回明确错误**

### 2.19 `src/test/remote-chat-adapter.test.ts` (7 项)
> **任务对应**：Task 13 Step 1 / Task 14 Step 3 · RemoteChatAdapter 实现、会话模式与契约测试

#### Task 13 Step 1: RemoteChatAdapter 的 SSE 消费与错误映射
- [x] **应以完整消息历史 POST 到服务端 SSE 端点**
- [x] **会话模式应携带 sessionId，且只提交本轮最后一条消息**
- [x] **应跨 ReadableStream 分段解析 chunk 与 done 事件及用量**
- [x] **应保留服务端标准错误码与消息**
- [x] **应将 HTTP 状态映射为统一 ChatError**
- [x] **应将网络失败映射为 NETWORK_ERROR**
- [x] **应将 AbortSignal 传递给 fetch 并在中断时抛出 ABORTED**

### 2.20 `src/test/app-remote-integration.test.tsx` (5 项)
> **任务对应**：Task 16 Step 2 / Task 13 Step 3 / Task 14 Step 3 · App 远端 SSE 装配、会话恢复与归档清空

#### Task 13 Step 3 / Task 14 Step 3: App 服务端会话装配
- [x] **默认后端模式创建会话，并携带 sessionId 流式展示回复**
- [x] **启动时恢复最近活动会话及其持久化消息**
- [x] **清空对话会归档旧会话、创建新会话并清除本地消息**
- [x] **旧直连配置迁移后仍只请求后端会话与流式接口**

- [x] **最近记录指向 Discord 会话时创建 Web 会话而不恢复频道历史**

### 2.21 `server/test/json-session-storage.test.ts` (8 项)
> **任务对应**：Task 16 Step 2 / Task 14 Step 1 · JSON 文件会话持久化与 ADR-005 严格追加语义

#### Task 14 Step 1: JSON 会话存储层
- [x] **创建 UUID 会话，并为每个会话写入单独 JSON 文件**
- [x] **追加消息后可由新的存储实例完整读取，且保留顺序**
- [x] **拒绝覆盖已有消息 ID，保证日志严格仅追加**
- [x] **隔离不同会话，并对不存在的会话拒绝追加**
- [x] **串行化同一会话的并发追加，避免丢失消息**

- [x] **频道关联并发解析保持唯一，重启后恢复同一会话**
- [x] **隔离不同频道，归档后关联新会话并保留原日志**
- [x] **拒绝无效频道和损坏关联文件，不静默创建替代会话**

### 2.22 `server/test/session-api.test.ts` (9 项)
> **任务对应**：Task 17 Step 2 / Task 16 Step 2 / Task 14 Step 2 · 会话 API、多轮全量上下文与归档语义

#### Task 14 Step 2: 会话 API 与多轮上下文
- [x] **创建、读取并归档会话；归档仅写标记而保留消息日志**
- [x] **按 sessionId 加载全量历史，并严格追加本轮输入与最终回复**
- [x] **归档后保留可读取日志，但拒绝继续追加会话轮次**
- [x] **未携带 sessionId 时保留无状态流式兼容**

- [x] **Bot 经真实 HTTP/SSE 多轮对话并按频道复用持久化上下文**
- [x] **解析 API 归档后切换会话，并显式区分 Web 来源**
- [x] **解析 API 拒绝无效频道和浏览器 Origin 请求**

- [x] **模型缺少结束事件不保存半截助手回复且后续请求恢复**
- [x] **模型中途抛错不保存半截助手回复且后续请求恢复**

### 2.23 `server/test/discord-demo.test.ts` (14 项)
> **任务对应**：Task 15 Step 2 · 最小网关 Demo（Task 16 Step 1 实现移至 bot/demo.ts，测试路径保留）；所有 Discord 网络调用均 Mock，不能替代真实网关验收。

- [x] **验证必需配置，错误信息不泄露 Token**
- [x] **使用服务端 Token 登录并回显测试频道消息，禁止回复触发提及**
- [x] **忽略其他频道消息**
- [x] **忽略机器人消息**
- [x] **忽略Webhook消息**
- [x] **忽略私信消息**
- [x] **忽略空白消息消息**
- [x] **长回显不超过 2000 字符且不截断代理对**
- [x] **回复失败后仍可处理下一条消息且日志不含错误原文**
- [x] **记录连接恢复与内存数据，停止后清理定时器和监听器**
- [x] **登录失败时清理资源并返回不含 Token 的操作指引**
- [x] **致命网关鉴权错误停止 Demo 并通知入口**
- [x] **会话失效时停止，SDK 错误原文不进入日志**
- [x] **退出信号在登录期间也能清理网关资源**

### 2.24 `bot/test/gateway.test.ts` (42 项)
> **任务对应**：Task 17 Step 1–3 / Task 16 Step 1–3 · 配置、网关稳定性与长回复发送，网络调用全 Mock。

- [x] **正式入口读取根目录环境配置并清理空白**
- [x] **缺少 Token 或无效频道时给出配置指引**
- [x] **只对标准化后的有效输入显示 typing 并发送入口反馈**
- [x] **过滤掉的消息不显示 typing 或发送反馈**
- [x] **处理期间刷新 typing，完成后停止刷新**
- [x] **typing 权限错误不阻断后续入口处理**
- [x] **处理与回复失败后仍可处理新消息，日志不泄露错误原文**
- [x] **停止时中止处理中请求且不再回复，清理 typing 与监听器**
- [x] **退出信号在登录过程中也能停止网关**
- [x] **登录失败返回安全指引并清理资源**
- [x] **记录恢复事件并在致命配置错误时停止**

- [x] **后端错误给出可读反馈并继续处理后续消息**
- [x] **长回复首段回复原消息，后续段发送到频道且全部抑制提及**

- [x] **等待前一段发送成功后才发送下一段**
- [x] **中途发送失败不重发或继续剩余段，并清理 typing**
- [x] **分段发送期间退出不再发送剩余段**
- [x] **空白最终回复不发送消息**

- [x] **前一轮完整回复发送完才开始下一轮 typing 和模型请求**
- [x] **冷却拒绝给出安全反馈且不调用后端**
- [x] **频道队满给出提示且不调用后端**
- [x] **退出时排队消息不开始处理或发送停止提示**
- [x] **拒绝无效环境限流配置**

- [x] **清理资源同步失败仍移除监听器且日志脱敏**
- [x] **错误提示等待期间退出不发送备用频道提示**
- [x] **原消息失效时备用频道提示一次且后续请求继续**
- [x] **错误回复与备用提示都失败不递归重试或卡住队列**
- [x] **部分段落发送失败只提示中断，不重发已发送段落**

- [x] **可恢复断线 1006 后继续处理且不重新 login**
- [x] **可恢复断线 4000 后继续处理且不重新 login**
- [x] **可恢复断线 4007 后继续处理且不重新 login**
- [x] **可恢复断线 4009 后继续处理且不重新 login**
- [x] **不可恢复关闭 4004 清理活动与排队请求**
- [x] **不可恢复关闭 4010 清理活动与排队请求**
- [x] **不可恢复关闭 4011 清理活动与排队请求**
- [x] **不可恢复关闭 4012 清理活动与排队请求**
- [x] **不可恢复关闭 4013 清理活动与排队请求**
- [x] **不可恢复关闭 4014 清理活动与排队请求**
- [x] **SDK invalidated 仅通知一次且停止后不再接收输入**
- [x] **全新 shard ready 与 resume 均可观测且不增加监听器**
- [x] **模拟 24 小时与 100 次重连后定时器及监听器保持有界**
- [x] **退出后已排入事件回调不再产生日志或致命通知**
- [x] **非致命断线不中止或重发已提交请求，恢复后仅回复一次**

### 2.25 `bot/test/message-entry.test.ts` (14 项)
> **任务对应**：Task 16 Step 1 · 用户裁决：只对指定频道内直接 @Bot 的有效正文触发。

- [x] **识别直接提及并保留消息、服务器、频道和用户标识**
- [x] **移除普通与昵称提及的全部出现并保留文本格式和其他用户提及**
- [x] **忽略普通文字**
- [x] **忽略其他用户提及**
- [x] **忽略角色提及**
- [x] **忽略全体提及**
- [x] **忽略仅 Bot 提及**
- [x] **回复产生的隐式提及不能替代正文中的直接 @**
- [x] **提及文本未经 Discord 确认时不触发**
- [x] **忽略其他频道消息**
- [x] **忽略私信消息**
- [x] **忽略机器人消息**
- [x] **忽略Webhook消息**
- [x] **Bot 身份尚未就绪时不处理消息**

### 2.26 `bot/test/backend-client.test.ts` (17 项)
> **任务对应**：Task 17 Step 2 / Task 16 Step 2 · 注入 fetch / ReadableStream 验证；真实本机 HTTP 集成见 2.22。

- [x] **跨 UTF-8 字节边界读取中文最终回复**
- [x] **读取未结束的 SSE 时超时会取消 reader 并清理请求**
- [x] **解析频道后只提交本轮输入，忽略心跳和 chunk，等待 done**
- [x] **新 Bot 实例重新解析服务端关联，不保存本地会话文件**
- [x] **服务端 error 转成可读错误，不自动重发聊天 POST**
- [x] **拒绝结束缺少 done**
- [x] **拒绝损坏 JSON**
- [x] **拒绝无效 done**
- [x] **HTTP 或网络失败给出固定指引且不暴露响应原文**
- [x] **中止和超时结束请求，不重试**
- [x] **只接受无凭据的本机后端地址**
- [x] **拒绝无效的会话解析响应**

- [x] **保留AUTH_ERROR分类且不泄露服务端原文**
- [x] **保留NETWORK_ERROR分类且不泄露服务端原文**
- [x] **保留MODEL_ERROR分类且不泄露服务端原文**
- [x] **HTTP 鉴权错误返回安全分类**
- [x] **读取 SSE 期间主动中止会取消 reader 且不重发**

### 2.27 `bot/test/split-message.test.ts` (10 项)
> **任务对应**：Task 16 Step 3 · 纯文本分段与完整重组契约。

- [x] **空文本没有分段**
- [x] **短文本及恰好 2000 字符保持原文**
- [x] **2001 字符拆成两段且不丢字**
- [x] **优先段落边界而不是更晚的单换行**
- [x] **没有段落边界时按最后一个换行切分**
- [x] **识别 CRLF 段落且不拆开 CRLF**
- [x] **硬切分不截断 emoji 的 UTF-16 代理对**
- [x] **无换行超长文本每段不超过上限且完整重组**
- [x] **保留段落分隔符、空格和首尾换行**
- [x] **开头只有换行时仍能前进而不产生空段**

### 2.28 `bot/test/request-scheduler.test.ts` (7 项)
> **任务对应**：Task 17 Step 1 · 时钟 / 任务注入验证，无真实模型配额消耗。

- [x] **同频道 FIFO 串行，其他频道可并行**
- [x] **队满拒绝且不占用被拒用户的冷却**
- [x] **用户冷却跨频道生效且到期恢复**
- [x] **失败释放频道并继续下一个请求**
- [x] **退出中止活动请求并拒绝等待及新请求**
- [x] **拒绝无效调度配置**

- [x] **禁用等待时已完成请求立即释放频道**

### 2.29 `server/test/request-budget.test.ts` (4 项)
> **任务对应**：Task 17 Step 1 · 时钟 / 任务注入验证，无真实模型配额消耗。

- [x] **滚动一分钟预算原子占位，边界恢复**
- [x] **上游限流开启暂停，到期后恢复**
- [x] **再次限流延长暂停且不缩短已有窗口**
- [x] **拒绝非法预算配置**

### 2.30 `bot/test/errors.test.ts` (4 项)
> **任务对应**：Task 17 Step 2 · 错误原文隔离与安全提示。

- [x] **后端错误不透传任意原文**
- [x] **识别 Discord 权限错误**
- [x] **识别已删除消息或不可用频道**
- [x] **未知错误和启动失败不泄露原文**


### 2.31 `server/test/deployment.test.ts` (7 项)
> **任务对应**：Task 18 Step 1 · 本地 HTTP 集成；上线环境另外实测。

- [x] **默认绑定 loopback 并保留本地 data 目录**
- [x] **接受显式端口、IPv6 loopback 与持久目录**
- [x] **拒绝公网监听与非法端口**
- [x] **静态产物缺失时拒绝启动**
- [x] **同源首页、静态资源与页面回退正常提供**
- [x] **API 与 SSE 不被静态回退覆盖且隧道 Origin 可访问**
- [x] **不提供点文件、目录穿越或 Web 目录外的服务端产物**


### 2.32 `server/test/deployment-validation.test.ts` (11 项)
> **任务对应**：Task 18 Step 2 · 真实采集器子进程与可控夹具；算法时间夹具不冒充实际 24 小时观察。

- [x] **records real health and gateway metadata without raw logs or secrets**
- [x] **does not pass when HTTP health is unavailable**
- [x] **does not pass when the process is inactive or metadata collection fails**
- [x] **accepts brief automatic recovery and records its measured duration**
- [x] **does not reuse gateway readiness from an old process**
- [x] **requires a complete real 24-hour span with fresh records**
- [x] **resets the window after a failed sample, missing interval or process restart**
- [x] **rejects stale records, changed host boot and malformed evidence**
- [x] **rejects slow recovery and errors even if the gateway subsequently resumes**
- [x] **reevaluates old samples only with matching measured journal evidence without rewriting them**
- [x] **keeps old interruption samples failed when journal evidence is missing**


## 3. Phase 4 结项回归（Task 18 Step 3，2026-10-06）

- 本轮全量回归32/32测试文件、305/305用例通过，根与四个workspaces类型检查通过；没有新增或修改测试代码，基线不变。
- 使用Vitest JSON结果逐文件比较用例title与本台账：32文件 / 305条逐项映射一致；修正Demo既有用例名“忽略空白消息消息”的台账漏字，保持与现有代码精确对应，不改测试实现。
- 首次沙箱运行因本机HTTP监听EPERM及相关超时失败；经批准在沙箱外重跑全量通过，没有跳过用例或修改断言规避限制。
- 三项退出条件与真实验收证据见[路线图结项核对](roadmap.md#phase-4-退出条件核对2026-10-06)。真实30小时8分窗口属于Task 18 Step 2；本轮未重复调用模型、发送Discord消息或改变现网配置。
- Step 2独立Linux32/32套件、305/305用例与类型检查、Step 1生产构建与审计结论沿用历史证据；本轮为文档结项，未把这些历史检查表述为重新执行。
