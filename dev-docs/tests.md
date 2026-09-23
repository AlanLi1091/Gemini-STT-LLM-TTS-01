# 测试套件与测试用例台账

> **维护规范**：
> 1. 本文档是本项目的自动化测试全景台账，完整记录所有测试文件（22 个套件）与具体测试用例（169 个断言项）。
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
| 9 | `src/test/settings.test.tsx` | Task 8 / Task 13 Step 2 | SettingsModal 弹窗交互、连接模式、表单校验与 Adapter 联动 | 8 | ✅ 通过 |
| 10 | `src/hooks/useChat.test.ts` | Task 3 / 9 / 10 | useChat Hook 领域逻辑状态机（流式驱动/中断/重试/生命周期） | 13 | ✅ 通过 |
| 11 | `src/test/error-and-usage-components.test.tsx` | Task 9 / Task 13 验收修复 | TokenUsageBadge 徽章与 ChatErrorBanner 错误横幅纯组件测试 | 16 | ✅ 通过 |
| 12 | `src/test/error-and-usage-integration.test.tsx` | Task 9 | 错误横幅展示/重试/设置联动及 Token 徽章端到端集成测试 | 3 | ✅ 通过 |
| 13 | `src/test/streaming-ui.test.tsx` | Task 10 | 流式打字机光标动效、停止生成按钮、顶栏联动禁用与 Smart Sticky Bottom 触底滚动守卫 | 8 | ✅ 通过 |
| 14 | `server/test/server-skeleton.test.ts` | Task 11 | Express 服务端骨架、双环境运行、根路径与健康检查响应 | 4 | ✅ 通过 |
| 15 | `core/test/sse-contract.test.ts` | Task 11 | 共享 SSE 事件、错误载荷与 sessionId 演进契约 | 4 | ✅ 通过 |
| 16 | `server/test/cors.test.ts` | Task 11 | CORS 白名单解析、允许/拒绝策略与预检链路 | 5 | ✅ 通过 |
| 17 | `server/test/chat-stream.test.ts` | Task 12 | SSE 流式管道、心跳、续传声明与中断级联 | 7 | ✅ 通过 |
| 18 | `server/test/chat-adapter-stream-source.test.ts` | Task 12 | Adapter 自动选择、Mock 降级与标准错误 SSE 透传 | 3 | ✅ 通过 |
| 19 | `src/test/remote-chat-adapter.test.ts` | Task 13 / Task 14 Step 3 | RemoteChatAdapter 的 SSE 消费、错误映射、AbortSignal 与 sessionId 模式 | 7 | ✅ 通过 |
| 20 | `src/test/app-remote-integration.test.tsx` | Task 13 Step 3 / Task 14 Step 3 | App 的后端 SSE 装配、会话恢复、归档清空与直连调试隔离 | 4 | ✅ 通过 |
| 21 | `server/test/json-session-storage.test.ts` | Task 14 Step 1 | JSON 会话文件、严格追加与并发写入串行化 | 5 | ✅ 通过 |
| 22 | `server/test/session-api.test.ts` | Task 14 Step 2 | 会话 API、全量上下文、归档语义与无状态兼容 | 4 | ✅ 通过 |
| **合计** | **22 个测试文件** | **Phase 1, 2 & Phase 3** | **全链路领域内核、共享适配器、UI 交互、服务端流式管道与会话持久化** | **166** | **⏳ 待 Step 2B 全量回归** |

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

#### Task 4: Mock 机器人响应引擎与思考态测试 > App 思考态交互与自动化流转测试
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

### 2.9 `src/test/settings.test.tsx` (8 项)
> **任务对应**：Task 8 / Task 13 Step 2 · SettingsModal 弹窗交互、连接模式、表单校验与 Adapter 联动


#### Task 8: 设置面板与模型切换组件行为测试
- [x] **① 无存储时点击顶栏“设置”按钮打开弹窗，显示默认 Mock 提供方与默认模型**
- [x] **② 保存配置写入 localStorage 且往返一致，顶栏副标题同步更新**
- [x] **③ 取消 / ESC / 点击遮罩丢弃草稿，不写入 localStorage**
- [x] **④ 切到 Gemini 且 API Key 为空时，行内提示并阻止保存**
- [x] **⑤ API Key 默认掩码 (password)，点击 eye 按钮切换为明文 (text)**
- [x] **⑥ 符合无障碍要求：具备 role="dialog"、aria-modal 与 aria-labelledby**
- [x] **⑦ settings 变更后 activeAdapter 依据 settings.provider / geminiApiKey / geminiModel 重新实例化**
- [x] **⑧ 后端服务模式隐藏并清除浏览器 API Key，且允许无 Key 保存**

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

### 2.11 `src/test/error-and-usage-components.test.tsx` (16 项)
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
- [x] **AUTH_ERROR 时应提供“检查设置”按钮并能触发回调**
- [x] **后端模式的 AUTH_ERROR 应引导检查服务端配置，而不展示“检查设置”按钮**
- [x] **点击重试按钮应触发 onRetry 回调**
- [x] **点击关闭按钮应触发 onDismiss 回调**
- [x] **default 兜底分支测试**

### 2.12 `src/test/error-and-usage-integration.test.tsx` (3 项)
> **任务对应**：Task 9 · 错误横幅展示/重试/设置联动及 Token 徽章端到端集成测试


#### Task 9: 错误提示与用量记录 UI 集成测试
- [x] **当 assistant 消息包含 usage 时，消息列表内应正确渲染 TokenUsageBadge 徽章**
- [x] **当存在 lastError 时，顶部正确展示 ChatErrorBanner 错误横幅**
- [x] **点击错误横幅中的“检查设置”按钮，能够联动打开设置弹窗**

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

### 2.15 `core/test/sse-contract.test.ts` (4 项)
> **任务对应**：Task 11 Step 2 · 共享 SSE 协议与无状态到会话化的演进契约

#### Task 11 Step 2: 共享 SSE 契约
- [x] **chunk 事件应携带增量文本与累积文本**
- [x] **done 事件应携带最终文本与可选 Token 用量**
- [x] **error 事件应内嵌 ChatError 的 code 与 message**
- [x] **应声明 Task 13 无状态请求向 Task 14 sessionId 的兼容演进路径**

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

### 2.18 `server/test/chat-adapter-stream-source.test.ts` (3 项)
> **任务对应**：Task 12 Step 2–3 · 服务端 Adapter 承载、自动降级与错误透传

#### Task 12 Step 3: Adapter 自动选择与统一错误透传
- [x] **有效服务端 Key 应选择 Gemini，并映射 chunk/done 与 AbortSignal**
- [x] **缺少、空白或不可见字符 Key 时应自动降级共享 MockAdapter**
- [x] **Gemini 错误应通过 SSE error 事件透传标准 code 与 message**

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

### 2.20 `src/test/app-remote-integration.test.tsx` (4 项)
> **任务对应**：Task 13 Step 3 / Task 14 Step 3 · App 远端 SSE 装配、会话恢复与归档清空

#### Task 13 Step 3 / Task 14 Step 3: App 服务端会话装配
- [x] **默认后端模式创建会话，并携带 sessionId 流式展示回复**
- [x] **启动时恢复最近活动会话及其持久化消息**
- [x] **清空对话会归档旧会话、创建新会话并清除本地消息**
- [x] **前端直连 Mock 模式不请求后端服务**

### 2.21 `server/test/json-session-storage.test.ts` (5 项)
> **任务对应**：Task 14 Step 1 · JSON 文件会话持久化与 ADR-005 严格追加语义

#### Task 14 Step 1: JSON 会话存储层
- [x] **创建 UUID 会话，并为每个会话写入单独 JSON 文件**
- [x] **追加消息后可由新的存储实例完整读取，且保留顺序**
- [x] **拒绝覆盖已有消息 ID，保证日志严格仅追加**
- [x] **隔离不同会话，并对不存在的会话拒绝追加**
- [x] **串行化同一会话的并发追加，避免丢失消息**

### 2.22 `server/test/session-api.test.ts` (4 项)
> **任务对应**：Task 14 Step 2 · 会话 API、多轮全量上下文与归档语义

#### Task 14 Step 2: 会话 API 与多轮上下文
- [x] **创建、读取并归档会话；归档仅写标记而保留消息日志**
- [x] **按 sessionId 加载全量历史，并严格追加本轮输入与最终回复**
- [x] **归档后保留可读取日志，但拒绝继续追加会话轮次**
- [x] **未携带 sessionId 时保留无状态流式兼容**
