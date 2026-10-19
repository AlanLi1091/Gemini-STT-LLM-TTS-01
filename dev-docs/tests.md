# 测试套件与测试用例台账

> **维护规范**：
> 1. 本文档是本项目的自动化测试全景台账，完整记录所有测试文件（43 个套件）与具体测试用例（742 个断言项）。
> 2. **铁律联动**：后续开发中，每次有新功能开发、重构或测试内容更新时，**必须同步在此台账中维护新增或修改的测试项**，保持与实际测试套件 100% 同步。

## 1. 测试套件概览看板

| 序号 | 测试文件 | 所属阶段 / 任务 | 覆盖核心目标 | 用例数 | 状态 |
| :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | `src/test/smoke.test.ts` | Task 1 | Vitest 基建与 jsdom 环境可用性 | 3 | ✅ 通过 |
| 2 | `src/test/chat-skeleton.test.tsx` | Task 2 | 聊天界面基础骨架（Header / MessageList / ChatInput） | 6 | ✅ 通过 |
| 3 | `src/test/chat-dispatch.test.tsx` | Task 3 | 用户输入管理与消息派发提交行为 | 4 | ✅ 通过 |
| 4 | `src/test/mock-engine.test.tsx` | Task 4 | Mock 响应引擎延时回复与思考态交互流转 | 3 | ✅ 通过 |
| 5 | `src/test/task5-interactions.test.tsx` | Task 5 | 体验细节（ADR-005不可变ID / IME防误发 / 清空会话 / 触底滚动） | 7 | ✅ 通过 |
| 6 | `src/test/chat-adapter-contract.test.ts` | Task 6 / 10 | ChatAdapter 通用契约测试套件（Mock & Gemini send/stream） | 16 | ✅ 通过 |
| 7 | `src/test/gemini-adapter.test.ts` | Task 7 / 10 | GeminiChatAdapter send & stream 单测（网络全Mock/错误转译/用量提取） | 42 | ✅ 通过 |
| 8 | `src/test/settings-storage.test.ts` | Phase 3 收尾 Step 2A | 旧直连配置迁移至后端模式并清除浏览器密钥 | 8 | ✅ 通过 |
| 9 | `src/test/settings.test.tsx` | Phase 3 收尾 Step 2B | 后端连接信息面板与旧设置迁移 | 4 | ✅ 通过 |
| 10 | `src/hooks/useChat.test.ts` | Task 3 / 9 / 10 | useChat Hook 领域逻辑状态机（流式驱动/中断/重试/生命周期） | 21 | ✅ 通过 |
| 11 | `src/test/error-and-usage-components.test.tsx` | Task 9 / Phase 3 收尾 Step 2B | TokenUsageBadge 与服务端错误指引组件测试 | 16 | ✅ 通过 |
| 12 | `src/test/error-and-usage-integration.test.tsx` | Task 9 / Phase 3 收尾 Step 2B | 错误横幅展示/重试及 Token 徽章集成测试 | 5 | ✅ 通过 |
| 13 | `src/test/streaming-ui.test.tsx` | Task 10 | 流式打字机光标动效、停止生成按钮、顶栏联动禁用与 Smart Sticky Bottom 触底滚动守卫 | 10 | ✅ 通过 |
| 14 | `server/test/server-skeleton.test.ts` | Task 11 | Express 服务端骨架、双环境运行、根路径与健康检查响应 | 4 | ✅ 通过 |
| 15 | `core/test/sse-contract.test.ts` | Task 11 | 共享 SSE 事件、错误载荷与 sessionId 演进契约 | 8 | ✅ 通过 |
| 16 | `server/test/cors.test.ts` | Task 11 | CORS 白名单解析、允许/拒绝策略与预检链路 | 5 | ✅ 通过 |
| 17 | `server/test/chat-stream.test.ts` | Task 12 | SSE 流式管道、心跳、续传声明与中断级联 | 28 | ✅ 通过 |
| 18 | `server/test/chat-adapter-stream-source.test.ts` | Task 12 / Task 17 Step 1 | Adapter 自动选择、Mock 降级与标准错误 SSE 透传 | 65 | ✅ 通过 |
| 19 | `src/test/remote-chat-adapter.test.ts` | Task 13 / Task 14 Step 3 | RemoteChatAdapter 的 SSE 消费、错误映射、AbortSignal 与 sessionId 模式 | 21 | ✅ 通过 |
| 20 | `src/test/app-remote-integration.test.tsx` | Task 13 Step 3 / Task 14 Step 3 / Phase 3 收尾 | App 的后端 SSE 装配、会话恢复、归档清空与旧配置迁移 | 19 | ✅ 通过 |
| 21 | `server/test/json-session-storage.test.ts` | Task 14 Step 1 / Task 16 Step 2 | JSON 会话、频道关联、重启恢复与严格追加 | 22 | ✅ 通过 |
| 22 | `server/test/session-api.test.ts` | Task 14 Step 2 / Task 16 Step 2 | 会话 API、频道上下文、归档与来源隔离 | 31 | ✅ 通过 |
| 23 | `server/test/discord-demo.test.ts` | Task 15 Step 2 | 配置、测试频道回显、连接事件、日志脱敏与退出清理（网络 Mock） | 14 | ✅ 通过 |
| 24 | `bot/test/gateway.test.ts` | Task 16 / Task 17 Step 1–3 | 正式网关、typing、错误、重连、长时模拟与资源清理（网络 Mock） | 50 | ✅ 通过 |
| 25 | `bot/test/message-entry.test.ts` | Task 16 Step 1 | 指定频道直接 @Bot、提及清理与消息过滤 | 14 | ✅ 通过 |
| 26 | `bot/test/backend-client.test.ts` | Task 16 Step 2 | 本机 HTTP / SSE、最终回复、错误、中止与重启解析 | 25 | ✅ 通过 |
| 27 | `bot/test/split-message.test.ts` | Task 16 Step 3 | 长回复完整分段、段落 / 换行优先、UTF-16 与 CRLF 边界 | 10 | ✅ 通过 |
| 28 | `bot/test/request-scheduler.test.ts` | Task 17 Step 1 | FIFO、跨频道、队满、用户冷却、失败恢复与退出 | 7 | ✅ 通过 |
| 29 | `server/test/request-budget.test.ts` | Task 17 Step 1 | 滚动请求预算、限流暂停与恢复 | 10 | ✅ 通过 |
| 30 | `bot/test/errors.test.ts` | Task 17 Step 2 | 固定安全反馈、Discord 错误分类与启动日志脱敏 | 7 | ✅ 通过 |
| 31 | `server/test/deployment.test.ts` | Task 18 Step 1 | 私有 loopback 配置、静态托管、SSE / API 隔离与文件边界 | 7 | ✅ 通过 |
| 32 | `server/test/deployment-validation.test.ts` | Task 18 Step 2 | 采集故障、重连中断、24 小时 / 新鲜度 / 证据缺口判定 | 11 | ✅ 通过 |
| 33 | `server/test/context-window.test.ts` | P0-1 第一步 | 轮次窗口、计数降级、超时与内存校准 | 32 | ✅ 通过 |
| 34 | `server/test/generation-timeout.test.ts` | P1-2 / R2 | 首包 / 总期限、取消、迭代等待与清理边界、启动配置（假时钟 / Mock） | 7 | ✅ 通过 |
| 35 | `server/test/chat-error-safety.test.ts` | P1-3 | 存储错误分类、上游脱敏、固定提示与白名单日志 | 34 | ✅ 通过 |
| 36 | `server/test/source-budget.test.ts` | P1-7 | 持久化来源防伪、Web保留额度、总守卫与计数 / 生成暂停 | 8 | ✅ 通过 |
| 37 | `server/test/search-adapter.test.ts` | Task 20 Step 1 | 固定端点、原生HTTP、限读、取消与离线Mock | 28 | ✅ 通过 |
| 38 | `server/test/search-context.test.ts` | Task 20 Step 1 | 来源过滤、Unicode上限、资料隔离与URL不入模型 | 35 | ✅ 通过 |
| 39 | `server/test/search-budget.test.ts` | Task 20 Step 2 | 配置、原子多守卫、故障关闭、并发与429隔离 | 17 | ✅ 通过 |
| 40 | `server/test/search-ledger.test.ts` | Task 20 Step 2 | UTC日账本、原子写、重启 / 换日与N4 | 10 | ✅ 通过 |
| 41 | `server/test/search-timeout.test.ts` | Task 20 Step 2 | 单调期限、取消、迟到结果与剩余预算 | 7 | ✅ 通过 |
| 42 | `src/test/search-metadata.test.ts` | Task 21 Step 1 | 客户端搜索结构与URL独立校验 | 45 | ✅ 通过 |
| 43 | `src/test/search-sources.test.tsx` | Task 21 Step 1 | 来源纯文本、安全链接与降级展示 | 16 | ✅ 通过 |
| **合计** | **43 个测试文件** | **Phase 1–5 / 审计修复** | **全链路领域内核、共享适配器、UI 交互、服务端流式管道与会话持久化** | **742** | **✅ 100% 通过** |

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

### 2.6 `src/test/chat-adapter-contract.test.ts` (16 项)
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

### 2.7 `src/test/gemini-adapter.test.ts` (42 项)
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

#### P0-1 第一步新增回归

- [x] **Developer API 计数不发送 systemInstruction 并透传 AbortSignal**
- [x] **计数拒绝无效结果且已中止请求不调用 SDK**
- [x] **send 的 MAX_TOKENS 正文附带一次提示并保留用量**
- [x] **stream 的重复 MAX_TOKENS 标志只在最终正文附带一次提示**
- [x] **MAX_TOKENS 无正文时 send 和 stream 都返回模型错误而非成功空回复**


#### P1-3 错误分类与安全文案回归

- [x] **普通 TypeError 和无网络 cause 的 fetch failed 不误报网络错误**
- [x] **fetch failed 的 ECONNREFUSED cause 保留网络分类**
- [x] **fetch failed 的 ENOTFOUND cause 保留网络分类**
- [x] **fetch failed 的 ECONNRESET cause 保留网络分类**
- [x] **fetch failed 的 ETIMEDOUT cause 保留网络分类**



#### K1 空正文失败回归

- [x] **send 在各种结束原因下拒绝缺失空白正文并保留原因元数据**
- [x] **stream 在各种结束原因下拒绝缺失空白正文且不产生 done**
- [x] **stream 无 chunk 时失败并从先前 chunk 保留结束原因**


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

### 2.10 `src/hooks/useChat.test.ts` (21 项)
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

#### P0-2 / ADR-012 新增回归

- [x] **失败重试保留输入 UUID 且相同内容的新发送使用新 UUID**
- [x] **不支持 randomUUID 的非安全上下文使用 getRandomValues 生成 UUID**


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
- [x] **AUTH_ERROR 应引导检查服务端配置，且没有浏览器设置入口**
- [x] **点击重试按钮应触发 onRetry 回调**
- [x] **点击关闭按钮应触发 onDismiss 回调**
- [x] **default 兜底分支测试**

#### P0-1 第一步新增回归

- [x] **CONTEXT_LIMIT 显示缩短输入的固定提示而不暴露原文**


### 2.12 `src/test/error-and-usage-integration.test.tsx` (5 项)
> **任务对应**：Task 9 / Phase 3 收尾 Step 2B · 错误横幅展示/重试及 Token 徽章集成测试


#### Task 9: 错误提示与用量记录 UI 集成测试
- [x] **当 assistant 消息包含 usage 时，消息列表内应正确渲染 TokenUsageBadge 徽章**
- [x] **当存在 lastError 时，顶部正确展示 ChatErrorBanner 错误横幅**

#### P1-3 错误分类与安全文案回归

- [x] **横幅显示服务端 MODEL_ERROR 固定文案 模型生成失败，请稍后重试。**
- [x] **横幅显示服务端 UNKNOWN 固定文案 服务暂时不可用，请稍后重试。**
- [x] **横幅显示服务端 UNKNOWN 固定文案 会话读取或保存失败，请稍后重试。**


### 2.13 `src/test/streaming-ui.test.tsx` (10 项)
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

### 2.15 `core/test/sse-contract.test.ts` (8 项)
> **任务对应**：Task 11 Step 2 · 共享 SSE 协议与无状态到会话化的演进契约

#### Task 11 Step 2: 共享 SSE 契约
- [x] **chunk 事件应携带增量文本与累积文本**
- [x] **done 事件应携带最终文本与可选 Token 用量**
- [x] **error 事件应内嵌 ChatError 的 code 与 message**
- [x] **应声明 Task 13 无状态请求向 Task 14 sessionId 的兼容演进路径**
- [x] **应声明 15 秒默认心跳且明确不支持断点续传**

#### P0-2 / ADR-012 新增回归

- [x] **可选请求 UUID 与 REQUEST_CONFLICT 不改变 SSE 事件结构**


#### P0-1 第一步新增回归

- [x] **CONTEXT_LIMIT 使用既有 error 事件结构**



#### Task 20 Step 1（2026-10-18，Mock）
- [x] **显式搜索请求与最终来源不改变chunk和旧请求结构**

### 2.16 `server/test/cors.test.ts` (5 项)
> **任务对应**：Task 11 Step 3 · CORS 白名单与环境隔离

#### Task 11 Step 3: CORS 白名单与环境隔离
- [x] **应清理、过滤并去重 ALLOWED_ORIGINS 中的来源**
- [x] **无 Origin 的服务间请求应正常通过且不返回跨域许可头**
- [x] **白名单内来源应通过并返回精确的跨域许可头**
- [x] **白名单外来源应被拒绝并返回 403**
- [x] **白名单内来源的 OPTIONS 预检应返回 204 与允许的方法和请求头**

### 2.17 `server/test/chat-stream.test.ts` (28 项)
> **任务对应**：Task 12 Step 1 · 服务端 SSE 流式管道与生命周期管理

#### Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理
- [x] **应返回 SSE 响应头并依次输出 chunk 与 done 事件**
- [x] **流保持打开时应定期输出 SSE 心跳注释行**
- [x] **携带 Last-Event-ID 的断点续传请求应被明确拒绝**
- [x] **请求体不符合共享契约时应返回 400**
- [x] **尚未注入流源时应返回 503**
- [x] **上游异常应转换为标准 UNKNOWN error 事件且不泄漏内部错误**
- [x] **客户端断开连接时应中止上游 AbortSignal**

#### P0-2 / ADR-012 新增回归

- [x] **带标识请求要求严格 UUID 会话和单条非空 user 输入**


#### P1-1 新增回归

- [x] **无请求标识也拒绝伪造角色历史和空输入且不调用流源**
- [x] **默认拒绝缺失空白或非字符串会话且请求体不能开启无状态模式**
- [x] **显式测试注入允许无状态历史但仍拒绝会话角色注入**


#### P1-2 / R2 新增回归

- [x] **生成超时 SSE 错误保留固定安全文案**


#### P1-3 错误分类与安全文案回归

- [x] **真实模型流源的敏感 500 错误只序列化固定文案与安全日志**
- [x] **流源意外抛错的兜底日志仅记录白名单且保持现有 UNKNOWN 文案**



#### Task 20 Step 1（2026-10-18，Mock）
- [x] **拒绝非布尔搜索字段以及无状态搜索请求**
- [x] **只有无Origin本机请求可提供可信Discord身份且请求体的可信字段被忽略**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **非loopback连接%s不信任身份或伪造转发头**（4项）：公网IPv4、私网IPv4、IPv4映射IPv6、IPv6连接，X-Forwarded-For与请求体可信字段均不放行。
- [x] **非法Discord身份%j按缺失处理**（8项）：空串、16 / 21位、全角数字、末尾换行、数值、null、对象。

### 2.18 `server/test/chat-adapter-stream-source.test.ts` (65 项)
> **任务对应**：Task 17 Step 2 / Task 12 Step 2–3 · 服务端 Adapter 承载、自动降级与错误透传

#### Task 12 Step 3: Adapter 自动选择与统一错误透传
- [x] **有效服务端 Key 应选择 Gemini，并映射 chunk/done 与 AbortSignal**
- [x] **缺少、空白或不可见字符 Key 时应自动降级共享 MockAdapter**
- [x] **Gemini 错误应通过 SSE error 事件返回标准 code 与固定 message**

- [x] **Discord 子预算超限不调用 SDK 或追加输入且 Web 保留额度仍可用**
- [x] **上游 429 后暂停，期间不调用 SDK，到期可恢复**
- [x] **Mock 不消耗或受 Gemini 预算影响**
- [x] **已中止请求不消耗预算或调用 SDK**
- [x] **非法服务端预算配置在启动时拒绝**

- [x] **无状态模型流缺少结束事件时返回明确错误**

#### P0-2 / ADR-012 新增回归

- [x] **连续模型失败后重试复用唯一输入并最终只保存一条回复**
- [x] **回复已保存且后续有新轮次时仍回放 done 与用量而不调用模型**
- [x] **无回复且输入不在末尾时拒绝重试并保持原日志**
- [x] **同标识不同内容拒绝且不覆盖已完成回复**
- [x] **进行中同会话的同标识新标识及旧 Bot 请求立即冲突**
- [x] **未带标识的旧请求也持有会话锁且不同会话互不阻塞**
- [x] **停止后立即重发先冲突待上游退出后释放锁并可恢复**
- [x] **进程重建后复用无回复输入并可回放新保存的回复**
- [x] **已完成回放绕过暂停预算而新输入超限时不持久化**
- [x] **归档及已中止请求不调用模型且不产生新消息**


#### P0-1 第一步新增回归

- [x] **大量历史 system 不进入窗口且最近轮次生成后完整日志保留**
- [x] **失败重试的本轮输入在计数和模型窗口中都仅出现一次回放不再计数**
- [x] **超限新输入不落盘不调用模型且会话锁正常释放**
- [x] **MAX_TOKENS 空正文不保存助手消息有正文提示与持久化一致**


#### P0-1 第二步重置 / 共享锁新增回归

- [x] **环境工厂复用路由服务生成期间同一服务归档返回冲突**
- [x] **同时传入服务和存储拒绝避免产生两个不一致实例**


#### P1-1 新增回归

- [x] **直接调用拒绝非法会话输入且不读写存储不耗预算不调用模型**
- [x] **环境工厂会话模式不再回退到无状态模型流**


#### P1-2 / R2 新增回归

- [x] **Mock 降级路径同样受首包期限约束**
- [x] **SDK 首次调用挂起时也转换为固定首包超时错误**
- [x] **首个 chunk 后直到总期限仍无完成时返回固定超时错误**
- [x] **客户端中止挂起流时静默结束而不伪报超时**
- [x] **生成期限配置在有无 Gemini Key 时均于装配前拒绝**
- [x] **总超时释放忽略 abort 的真实会话锁，迟到回复不落盘且同标识重试复用输入**


#### P1-3 错误分类与安全文案回归

- [x] **SDK 403 包含伪造 Key 时 SSE 与日志均不泄露**
- [x] **Mock 降级流源的原始错误同样转换为固定 UNKNOWN**


#### P1-7 来源保留预算回归

- [x] **有无 Gemini Key 及注入预算时均拒绝非法保留配置**



#### K1 空正文失败回归

- [x] **各结束原因空正文不保存不发 done释放锁且同标识重试回放不暂停预算**



#### Task 20 Step 1（2026-10-18，Mock）
- [x] **成功保存来源且重启后完整回放不搜索不计数不扣生成额度**
- [x] **同标识搜索模式不同先冲突且不再次搜索或扣额度**
- [x] **生成额度拒绝前不搜索不计数不写入**
- [x] **系统和问题本地预检超限时不扣任何额度**
- [x] **超过500码点的搜索问题先拒绝且500个emoji不会按UTF16误拒绝**
- [x] **供应商失败降级为一次普通生成且不暂停生成预算**
- [x] **搜索准入拒绝和无结果均降级且生成额度只扣一次**
- [x] **Discord缺可信身份降级且可信身份可触发Mock搜索**
- [x] **取消忽略abort的搜索释放会话锁且迟到结果不生成不保存**
- [x] **资料放不下时降级重选且合计计数不超过两次**
- [x] **搜索后精确计数发现问题仍超限时不写入且不退款**
- [x] **搜索成功后模型空正文或保存失败不发成功来源**


#### Task 20 Step 2（2026-10-18，Mock）
- [x] **先持久化尝试与credit再搜索，回放和模式冲突不进搜索预算**
- [x] **搜索额度不足只扣一次生成额度并固定降级普通生成**
- [x] **搜索429暂停所有搜索来源而不暂停生成和计数**
- [x] **坏账本不中断普通生成、不清零且不调用供应商**
- [x] **搜索超时本地降级不等待迟到结果且不重搜重扣**
- [x] **取消搜索不降级生成但保留已持久化额度且释放锁**
- [x] **长URL只保留元数据且搜索用量不污染普通系数，空正文不校准**
- [x] **问题不合法、生成拒绝与缺可信身份均不扣搜索额度**


#### T1–T3修复（2026-10-18，Mock）
- [x] **T1: 默认20轮历史回复100字时保留3条100字资料并裁最旧历史**
- [x] **T1: 默认20轮历史回复200字时保留3条100字资料并裁最旧历史**
- [x] **T1: 默认20轮历史回复400字时保留3条100字资料并裁最旧历史**
- [x] **T1: 无历史的最小输入略超安全阈值时缩资料后成功而非整轮降级**
- [x] **T3: 账本写失败使用独立原因并继续普通生成且不调用搜索**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **Step3: 供应商角色指令只留在用户资料且模型输出不能触发额外能力**：真实Tavily适配器配Mock fetch，固定system规则、单用户资料块、不注入URL、无tools、模型伪工具命令只保存为正文，回放不重搜。
- [x] **Step3: 取消真实适配器的%s不生成不写盘且迟到响应仅清理**（2项）：fetch挂起 / 读取挂起，客户端取消、响应体清理、锁释放、零事件与空消息日志。

### 2.19 `src/test/remote-chat-adapter.test.ts` (21 项)
> **任务对应**：Task 13 Step 1 / Task 14 Step 3 · RemoteChatAdapter 实现、会话模式与契约测试

#### Task 13 Step 1: RemoteChatAdapter 的 SSE 消费与错误映射
- [x] **应以完整消息历史 POST 到服务端 SSE 端点**
- [x] **会话模式应携带 sessionId，且只提交本轮最后一条消息**
- [x] **应跨 ReadableStream 分段解析 chunk 与 done 事件及用量**
- [x] **应保留服务端标准错误码与消息**
- [x] **应将 HTTP 状态映射为统一 ChatError**
- [x] **应将网络失败映射为 NETWORK_ERROR**
- [x] **应将 AbortSignal 传递给 fetch 并在中断时抛出 ABORTED**

#### P0-2 / ADR-012 新增回归

- [x] **失败重发携带同一输入 UUID 并解析 REQUEST_CONFLICT**


#### P1-3 错误分类与安全文案回归

- [x] **HTTP 403 响应体和 statusText 均不进入错误文案**
- [x] **HTTP 429 响应体和 statusText 均不进入错误文案**
- [x] **HTTP 500 响应体和 statusText 均不进入错误文案**
- [x] **HTTP 400 响应体和 statusText 均不进入错误文案**
- [x] **fetch 拒绝使用固定 TypeError: failed to fetch https://example.test/?key=AIzaFAKE_FETCH_SECRET 文案**
- [x] **fetch 拒绝使用固定 Error: https://example.test/?token=private /private/path 文案**
- [x] **读取响应流失败不泄露浏览器异常原文**


### 2.20 `src/test/app-remote-integration.test.tsx` (19 项)
> **任务对应**：Task 16 Step 2 / Task 13 Step 3 / Task 14 Step 3 · App 远端 SSE 装配、会话恢复与归档清空

#### Task 13 Step 3 / Task 14 Step 3: App 服务端会话装配
- [x] **默认后端模式创建会话，并携带 sessionId 流式展示回复**
- [x] **启动时恢复最近活动会话及其持久化消息**
- [x] **清空对话会归档旧会话、创建新会话并清除本地消息**
- [x] **旧直连配置迁移后仍只请求后端会话与流式接口**

- [x] **最近记录指向 Discord 会话时创建 Web 会话而不恢复频道历史**

#### P0-2 / ADR-012 新增回归

- [x] **模型失败后点击重试复用输入标识且页面只显示一条用户消息**
- [x] **请求冲突横幅使用固定提示并保留重试入口**


### 2.21 `server/test/json-session-storage.test.ts` (22 项)
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

#### P0-2 / ADR-012 新增回归

- [x] **并发不同消息 ID 的同请求输入仅保存一次**
- [x] **并发同请求回复仅保存一次且重启后仍拒绝重复回复**
- [x] **关联回复缺少末尾输入或会话已归档时拒绝写入**
- [x] **无请求元数据的旧文件仍可追加且非法元数据不写入**



#### Task 20 Step 1（2026-10-18，Mock）
- [x] **旧消息仍可读取且读取操作不补写搜索字段**
- [x] **来源元数据重启恢复且返回对象与内部来源深拷贝隔离**
- [x] **拒绝不合法来源状态角色与不安全URL且日志不变**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **读取时拒绝磁盘篡改：%s**（7项）：危险协议、超过三条、超长URL、超长摘要、来源多余字段、元数据多余字段、伪造域名；isSearchMetadata及当前 / 新存储实例均拒绝，原文件不改写。

### 2.22 `server/test/session-api.test.ts` (31 项)
> **任务对应**：Task 17 Step 2 / Task 16 Step 2 / Task 14 Step 2 · 会话 API、多轮全量上下文与归档语义

#### Task 14 Step 2: 会话 API 与多轮上下文
- [x] **创建、读取并归档会话；归档仅写标记而保留消息日志**
- [x] **按 sessionId 加载全量历史，并严格追加本轮输入与最终回复**
- [x] **归档后保留可读取日志，但拒绝继续追加会话轮次**
- [x] **未携带 sessionId 时拒绝无状态请求且不调用模型**

- [x] **Bot 经真实 HTTP/SSE 多轮对话并按频道复用持久化上下文**
- [x] **解析 API 归档后切换会话，并显式区分 Web 来源**
- [x] **解析 API 拒绝无效频道和浏览器 Origin 请求**

- [x] **模型缺少结束事件不保存半截助手回复且后续请求恢复**
- [x] **模型中途抛错不保存半截助手回复且后续请求恢复**

#### P0-2 / ADR-012 新增回归

- [x] **失败重试和服务重建回放不重复写入且刷新日志保持唯一输入**


#### P0-1 第一步新增回归

- [x] **模型仅接收最近轮次但 GET 保留全部日志超限新输入不落盘**


#### P0-1 第二步重置 / 共享锁新增回归

- [x] **重置归档旧日志重复目标不归档新会话其他频道和重启关联不变**
- [x] **拒绝浏览器来源非法目标和跨频道目标且不改日志**
- [x] **生成期间 Web归档和频道重置返回409回复完成后可正常归档**
- [x] **重置归档写入期间生成和第二个重置也立即冲突**
- [x] **归档失败保持旧会话且释放锁允许随后重置**
- [x] **归档成功而新关联解析失败不宣称成功下一次解析自然恢复**
- [x] **Bot经真实本机HTTP重置后下一条聊天只包含新会话输入**


#### P1-1 新增回归

- [x] **有无请求标识的角色注入和伪造历史均不改变已有日志**
- [x] **共享生产装配在 Mock 降级时也拒绝无状态伪造历史**



#### Task 20 Step 1（2026-10-18，Mock）
- [x] **SSE与刷新及重新装配后的回放保留相同来源且不重新搜索**
- [x] **持久化Discord来源不接受浏览器伪造身份绕过降级**


#### S1 截断后空白修复（2026-10-18，Mock）
- [x] **title截断点为空白仍保存成功且重启回放不重搜**
- [x] **summary截断点为空白仍保存成功且重启回放不重搜**


#### Task 20 Step 2（2026-10-18，Mock）
- [x] **进程重装和reset不清Discord日额度且预算拒绝仍普通生成**


#### T1–T3修复（2026-10-18，Mock）
- [x] **坏账本使用ledger_unavailable且刷新重启回放保持一致**
- [x] **写入失败使用ledger_unavailable且刷新重启回放保持一致**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **%s不能经刷新或重启回放下发**（4项）：危险协议、超过三条、超长URL、多余字段；当前 / 新服务的GET与SSE返回固定错误，不重搜不生成、不改写坏文件，日志无路径 / 篡改正文。

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

### 2.24 `bot/test/gateway.test.ts` (50 项)
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

#### P0-1 第二步重置 / 共享锁新增回归

- [x] **管理员配置接受合法 ID 去重空配置禁用非法值启动拒绝**
- [x] **精确命令才重置大小写参数和普通提问仍走聊天**
- [x] **无管理员或非管理员命令只回复拒绝且不调用后端**
- [x] **拒绝重置仍计算用户冷却且反馈抑制提及**
- [x] **重置排在上一轮完整回复发送之后且随后聊天使用正常入口**
- [x] **重置失败不反馈成功且后续队列请求继续**


#### P1-3 错误分类与安全文案回归

- [x] **BACKEND 错误回复和日志均不包含原始存储文本**



#### K1 空正文失败回归

- [x] **后端 MODEL_ERROR 给出固定可读提示且后续请求正常处理**


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

### 2.26 `bot/test/backend-client.test.ts` (25 项)
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

#### P0-1 第一步新增回归

- [x] **CONTEXT_LIMIT 映射为缩短输入提示且不自动重发**


#### P0-1 第二步重置 / 共享锁新增回归

- [x] **先解析再重置明确目标仅新会话确认后返回成功且不调用模型**
- [x] **重置409用固定冲突提示500不透传原文且不自动重发**
- [x] **非法解析或重置响应不能宣称成功且不追加重试**
- [x] **取消和超时均中止重置不自动重发并清理定时器**
- [x] **解析已取消或网络失败时不继续发送重置**
- [x] **解析响应在取消后才到达时不会继续发送重置请求**


#### P1-3 错误分类与安全文案回归

- [x] **存储 UNKNOWN 映射可读 BACKEND 文案且忽略 SSE 原文**


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

### 2.29 `server/test/request-budget.test.ts` (10 项)
> **任务对应**：Task 17 Step 1 · 时钟 / 任务注入验证，无真实模型配额消耗。

- [x] **滚动一分钟预算原子占位，边界恢复**
- [x] **上游限流开启暂停，到期后恢复**
- [x] **再次限流延长暂停且不缩短已有窗口**
- [x] **拒绝非法预算配置**

#### P1-7 来源保留预算回归

- [x] **Discord 占满子额度后重复拒绝不扣全局额度，Web 用完保留额度**
- [x] **Web 可独占全部额度，混合来源总量仍受全局守卫**
- [x] **不同来源共享 pause，窗口恢复与再次暂停不缩短等待**
- [x] **默认来源为 web，通用来源键子额度拒绝时不会占用其他额度**
- [x] **默认配置保持生成10保留4与计数20保留8及60秒暂停**
- [x] **拒绝非法总额度保留额度和子额度，省略保留值不自动缩放**


### 2.30 `bot/test/errors.test.ts` (7 项)
> **任务对应**：Task 17 Step 2 · 错误原文隔离与安全提示。

- [x] **后端错误不透传任意原文**
- [x] **识别 Discord 权限错误**
- [x] **识别已删除消息或不可用频道**
- [x] **未知错误和启动失败不泄露原文**


#### P0-1 第一步新增回归

- [x] **CONTEXT_LIMIT 不透传服务端原文且明确要求缩短输入**


#### P0-1 第二步重置 / 共享锁新增回归

- [x] **REQUEST_CONFLICT 使用固定可读文案不透传服务端原文**
- [x] **重置超时或协议失败明确未确认完成不暴露原始错误**


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


### 2.33 `server/test/context-window.test.ts` (32 项)
> **任务对应**：P0-1 第一步 / ADR-013 · 窗口算法与可注入计数器，网络无真实调用。

- [x] **过滤 system 与孤立 assistant 连续 user 分别成轮且不修改原数组**
- [x] **零历史轮数和只有本轮输入均以 user 开始**
- [x] **长历史从最旧整轮裁剪保留最近连续轮次和完整本轮正文**
- [x] **中文英文 emoji 和代码按字符类别及开销估算不将经验值当成精确 token**
- [x] **低于八成预算不调计数边缘区只计内容并加配置系统估算**
- [x] **精确超限后整轮缩减且每次选择最多计数两次**
- [x] **计数失败退回八成保守窗口没有计数能力也使用同一降级**
- [x] **计数次数预算独立耗尽后降级且不增加上游计数调用**
- [x] **计数超时会中止并降级即使计数器不响应 AbortSignal**
- [x] **用户取消计数不降级生成并清理超时定时器**
- [x] **最小输入精确或保守超限返回固定错误且不截断正文**
- [x] **非法参数及过大配置系统指令在启动拒绝**
- [x] **用量校准只提高系数有上限仅存内存且日志不含正文**
- [x] **计数鉴权失败不静默降级重复调用上游**


#### Claude C1 / C2 修复回归

- [x] **中文长回复 精确核验时保留接近预算的连续历史而非一两轮**
- [x] **中文双向长消息 精确核验时保留接近预算的连续历史而非一两轮**
- [x] **英文长回复 精确核验时保留接近预算的连续历史而非一两轮**
- [x] **首次安全取样后允许加回未参与取样的旧轮次并进行第二次核验**
- [x] **第二次计数失败时保留首次已精确验证安全的窗口**
- [x] **精确结果异常超限时不返回已确认超限的同一候选**
- [x] **宽松字节预筛限制计数负载且不截断本轮输入**
- [x] **约2500中文字符的本轮输入在本地估算路径仍可发送**
- [x] **第二次计数预算耗尽时复用首个安全窗口而不再请求上游**


#### P1-3 错误分类与安全文案回归

- [x] **计数 429 仅记录白名单字段并保持独立预算暂停和窗口降级**


#### P1-7 来源保留预算回归

- [x] **Discord 计数占满子额度后 Web 保留额度仍精确计数**
- [x] **交错计数不覆盖另一请求的来源参数**


## 3. Phase 4 结项回归（Task 18 Step 3，2026-10-06）

- 本轮全量回归32/32测试文件、305/305用例通过，根与四个workspaces类型检查通过；没有新增或修改测试代码，基线不变。
- 使用Vitest JSON结果逐文件比较用例title与本台账：32文件 / 305条逐项映射一致；修正Demo既有用例名“忽略空白消息消息”的台账漏字，保持与现有代码精确对应，不改测试实现。
- 首次沙箱运行因本机HTTP监听EPERM及相关超时失败；经批准在沙箱外重跑全量通过，没有跳过用例或修改断言规避限制。
- 三项退出条件与真实验收证据见[路线图结项核对](roadmap.md#phase-4-退出条件核对2026-10-06)。真实30小时8分窗口属于Task 18 Step 2；本轮未重复调用模型、发送Discord消息或改变现网配置。
- Step 2独立Linux32/32套件、305/305用例与类型检查、Step 1生产构建与审计结论沿用历史证据；本轮为文档结项，未把这些历史检查表述为重新执行。

## 4. P0-2 修复回归（2026-10-06）

- 新增 22 项，32/32 测试文件、327/327 用例通过；根与四包类型检查及 Web / Express / Bot 构建通过。
- 包括稳定 UUID 与替代生成、请求校验、四种幂等状态、全会话锁、停止后立即发送、写入队列原子防重与重启回放。
- 基于临时 Vitest JSON 结果核对本台账逐文件数量与逐项标题；HTTP 使用隔离临时会话目录，Gemini / Discord 均 Mock，不替代现网验收。

## 5. P0-1 第一步回归（2026-10-06）

- 新增 1 文件 / 28 用例：33/33 文件、355/355 用例通过，根 / 四包类型检查、Web / Express / Bot 构建通过。
- 真实 SDK 离线兼容探针确认 Developer countTokens 拒绝 systemInstruction，fetch 次数 0；本轮没有真实模型、Discord 或 VPS 调用。
- 计数 / 历史均使用可控夹具与隔离临时存储；台账逐文件数量与逐项标题对照 Vitest JSON，无跳过用例。

## 6. Claude C1 / C2 修复回归（2026-10-06）

- 新增9项，33/33文件、364/364用例，根 / 四包类型检查及Web / Express构建通过；Bot实现未修改。
- 三组近似计数夹具利用率87.8% / 88.1% / 92.4%，保留8 / 11 / 9历史轮次，计数1 / 2 / 2次；不是Gemini在线实测。
- 台账逐文件数量和逐项标题与JSON结果一致，包含加回历史、两次计数内核验、失败保留已验证窗口、降级与宽松字节负载边界。

## 7. P0-1 第二步回归（2026-10-06）

- 新增23项，33/33文件、387/387用例、根 / 四包类型检查与Web / Express / Bot构建通过。
- 覆盖管理员 / 精确命令 / 冷却 / FIFO、旧日志及频道关联、重复目标、共享归档锁、失败自然恢复、超时 / 取消 / 迟到响应及本机HTTP重置后新上下文。
- 模型 / Discord为Mock，数据为隔离临时目录；本轮不部署VPS或访问真实频道 / 凭据。台账与JSON逐文件数量和逐项标题一致，无新增测试文件。


#### Task 20 Step 1（2026-10-18，Mock）
- [x] **搜索系统规则参与本地与精确预算但不作为计数contents**
- [x] **降级重选共享计数上限且本地预检不调用计数**


#### Task 20 Step 2（2026-10-18，Mock）
- [x] **含资料的成功用量只提高搜索系数并限制上限4**
- [x] **搜索系数比较基数包含配置系统规则历史问题与实际资料**
- [x] **搜索估算取共享与搜索系数较大值普通选择不受搜索系数影响**
- [x] **搜索阶段已耗时后计数只等待整体剩余时间并清理计时器**

### 2.34 `server/test/generation-timeout.test.ts` (7 项)
> **任务对应**：P1-2 / R2 · 服务端生成超时与非协作迭代器退出

#### P1-2: 服务端生成超时守卫
- [x] **默认值保持首包60秒总计90秒，非法环境值在模型装配前被拒绝**
- [x] **首包期限中止忽略 signal 的上游，同时不等待挂起的 return**
- [x] **总期限不会被中间 chunk 重置，已完成 done 不留下计时器**
- [x] **客户端主动中止不是超时，且迟到拒绝被收敛**


#### Task 20 Step 2（2026-10-18，Mock）
- [x] **搜索加生成加两次计数默认104秒且超过115秒拒绝**
- [x] **搜索和计数消耗后的整体期限不在生成阶段重新开始**
- [x] **墙钟跳变不改变首包和总生成期限**

### 2.35 `server/test/chat-error-safety.test.ts` (34 项)
> **任务对应**：P1-3 · 存储 / 模型分类与服务端脱敏边界

#### P1-3 错误分类与安全文案回归

- [x] **非法会话 ID ../x 返回存储 UNKNOWN 且不泄露原文**
- [x] **损坏会话 JSON 返回存储 UNKNOWN 且不泄露路径**
- [x] **appendTurnInputs ENOSPC 使用固定文案且不发送 done**
- [x] **appendAssistantResponse ENOSPC 使用固定文案且不发送 done**
- [x] **存储阶段即使异常携带 429 或网络特征也不进入模型分类或暂停预算**
- [x] **上游状态 403 在两种流源中均使用固定文案和白名单日志**
- [x] **上游状态 429 在两种流源中均使用固定文案和白名单日志**
- [x] **上游状态 500 在两种流源中均使用固定文案和白名单日志**
- [x] **上游状态 undefined 在两种流源中均使用固定文案和白名单日志**
- [x] **上游 429 固定文案仍触发模型预算 pause**
- [x] **fetch failed ECONNREFUSED cause 保留 NETWORK_ERROR 和安全 errno**
- [x] **任意适配器 ChatError MODEL_ERROR 文本也不能直接下发**
- [x] **任意适配器 ChatError UNKNOWN 文本也不能直接下发**
- [x] **任意适配器 ChatError REQUEST_CONFLICT 文本也不能直接下发**
- [x] **任意适配器 ChatError CONTEXT_LIMIT 文本也不能直接下发**
- [x] **会话不存在和已归档的现有固定文案保持不变**
- [x] **锁冲突和上下文超限保持现有固定文案**
- [x] **日志拒绝异常 name errno status 中的敏感字符串且不展开 stack 或正文**


## 8. P1-3 修复回归（2026-10-12）

- 新增1文件40项，35/35文件445/445用例通过；根 / 四包类型检查与 Web / Express / Bot 构建通过。
- 覆盖非法 ID ../x、损坏 JSON、输入 / 回复写入 ENOSPC、保存失败不发 done 与锁释放后同标识重试、SDK 403 伪造 Key、429 预算暂停、fetch cause 网络分类、MODEL_ERROR / UNKNOWN 脱敏、低层 / Mock 流源、HTTP SSE 序列化、浏览器错误 / 横幅与 Bot 固定提示和日志；既有超时、冲突、窗口、归档与回放回归通过。
- Vitest JSON 结果逐文件数量与逐项标题对照台账一致；首次沙箱本机 HTTP 监听 EPERM 后获准重跑全量通过，未跳过测试。数据仅隔离临时目录，模型 / Discord 全 Mock；未访问真实 Gemini / Discord / VPS / 会话数据。


#### K1 空正文失败回归

- [x] **其他 adapter 的空白 done 在两种流源中均失败且同标识可重试**
- [x] **新固定提示精确下发而带原始文本的变体仍脱敏**
- [x] **finishReason 日志只接受已知枚举未知值归 OTHER且不泄露正文**
- [x] **历史空 assistant 的原日志窗口配对及已完成回放不改写**



#### Task 20 Step 1（2026-10-18，Mock）
- [x] **search阶段只记录白名单且保留count阶段**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **Step3: %s仅产生本地降级及白名单日志**（11项）：301 / 302 / 303 / 307 / 308 / 401 / 429、坏JSON、坏结构、超大响应、fetch异常；真实适配器配Mock fetch后仅provider_failure降级，一次生成，日志字段及值精确白名单，Key / query / URL / stack不泄漏。

### 2.36 `server/test/source-budget.test.ts` (8 项)
> **任务对应**：P1-7 · 持久化来源、生成 / 计数保留预算与暂停边界

#### P1-7 来源保留预算回归

- [x] **多个 Discord 频道共享六次额度且无法挤占 Web 四次保留额度**
- [x] **Web 可以使用全部全局额度，Web 加 Discord 总量不超过上限**
- [x] **请求体伪造 web 来源无法绕过持久化 Discord 来源，旧会话无 origin 按 web**
- [x] **Discord 上游429全局暂停生成，另一来源暂停期间不写输入且到期恢复**
- [x] **回放与两种冲突不调用预算或追加输入，重复预算拒绝不占用Web额度**
- [x] **Discord 生成超时不暂停预算且 Web 可立即使用保留额度**
- [x] **生产计数预算保留八次给 Web，Discord 用满十二次后仅本地降级**
- [x] **计数429全局暂停计数但不暂停任一来源生成并继续既有窗口降级**


## 9. P1-7 修复回归（2026-10-12）

- 新增1文件17项，36/36文件462/462用例通过；根 / 四包类型检查与Web / Express / Bot构建通过。
- 假时钟、Mock模型及隔离JSON存储验证Discord多频道共享额度、Web保留和使用全部总额度、总量上限、拒绝原子不扣额、持久化来源防伪、旧会话无origin、全局生成429、计数429仅暂停计数、计数保留 / 降级、交错计数来源、回放 / 两种冲突 / 超限无输入副作用、生成超时不pause和默认 / 非法配置启动校验。
- Vitest JSON逐文件数量与逐项标题映射一致；首次沙箱HTTP监听EPERM后获准重跑全量通过，没有跳过测试；既有Web / Bot / 幂等 / 窗口 / 超时 / 错误脱敏回归通过。未访问真实Gemini / Discord / VPS / 会话数据。


## 10. P1前置四项VPS部署回归（2026-10-12）

- 固定源码6f81048，本机与VPS Linux各36/36文件462/462用例、根 / 四包类型检查、Web / Express / Bot构建通过，无新增或修改测试代码，台账仍36文件462项。
- Linux复用现网lockfile，独立新发行目录运行全部Mock测试，不访问现网会话数据；生产依赖审计0漏洞。真实上线冒烟为Web回复“P1部署成功”及刷新恢复、用户直接@Bot确认Discord正常；服务端metadata证明旧消息保留、新增两条消息、两服务无重启。
- 无sessionId的HTTP400与非法ID ../x的固定UNKNOWN文案探针通过，不消耗真实模型额度或追加输入；真实超时 / 429未强制触发，相关异常仅Mock回归。完整证据与备份校验见phase3-deployment.md第12节，不宣称新版本已完成24小时观察。

### 2.37 `server/test/search-adapter.test.ts` (28 项)

> **任务对应**：Task 20 Step 1 · 全Mock，不调用真实供应商。

- [x] **只向固定端点发送当前问题且禁用答案全文与重定向**
- [x] **HTTP失败不重试且不读取供应商错误正文**
- [x] **响应流超过256KiB时停止读取**
- [x] **坏JSON返回本地错误且不泄露原始文本**
- [x] **取消挂起的响应读取可结束本地等待**
- [x] **Mock适配器可离线提供受限来源且已取消不工作**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **结果地址只作元数据且不会读取：%s**（11项）：loopback、10 / 172.16 / 192.168私网、link-local、元数据地址、IPv6 loopback / link-local / ULA、显式端口、带凭据；fetch只访问固定端点一次，凭据URL过滤。
- [x] **端点%s拒绝重定向且不读取Location或正文**（5项）：301 / 302 / 303 / 307 / 308，redirect:error、固定错误、不重试。
- [x] **拒绝异常results结构：%j**（6项）：null、数组、空对象、results为null / 对象 / 字符串。
- [x] 既有固定端点用例追加精确Content-Type与Authorization头断言，不增加用例数。

### 2.38 `server/test/search-context.test.ts` (35 项)

> **任务对应**：Task 20 Step 1 · 全Mock，不调用真实供应商。

- [x] **只保留最多三条安全来源并按Unicode码点限制标题与摘要**
- [x] **模型资料不包含URL路径参数并转义越界标记与控制字符**
- [x] **坏结果和超长URL不进入来源且不读取任何结果网页**


#### S1 截断后空白修复（2026-10-18，Mock）
- [x] **截断点为普通空格时来源仍通过校验且再次规范化不变**
- [x] **截断点为制表符时来源仍通过校验且再次规范化不变**
- [x] **截断点为不换行空格时来源仍通过校验且再次规范化不变**
- [x] **截断点为全角空格时来源仍通过校验且再次规范化不变**
- [x] **截断点为零宽控制字符时来源仍通过校验且再次规范化不变**
- [x] **截断点为空控制字符时来源仍通过校验且再次规范化不变**


#### Task 20 Step 2（2026-10-18，Mock）
- [x] **按实际隔离块估算先缩摘要后减来源且展示摘要与注入保持一致**
- [x] **最小资料仍超预算返回空来源并保持连续编号**
- [x] **最小来源仍超限时清空而不保留一字摘要绕过阈值**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **危险URL不进入来源或持久化元数据：%s**（14项）：javascript / data / vbscript / file、协议相对、凭据、普通空格 / tab / 换行 / NUL / DEL / NBSP / 全角空格、超2048字符；规范化及持久化校验共用过滤。
- [x] **域名只能来自URL解析且IDN使用解析后的hostname**：解析punycode域名、忽略标题域名伪装，拒绝存储伪造domain。
- [x] **供应商文本只能留在单个转义资料块内：%s**（6项）：双标记、零宽变体、HTML系统角色、JSON助手角色、控制 / 双向 / 换行、Markdown URL；固定三行及唯一首尾标记，控制字符清除、URL不注入、来源可持久化。

### 2.39 `server/test/search-budget.test.ts` (17 项)

> **任务对应**：Task 20 Step 2 · 上游Mock / 隔离临时账本。

- [x] **默认配置与额度层级校验不读取Key**
- [x] **Discord达到分钟子额后Web仍可用保留额度且拒绝不扣任何计数**
- [x] **用户与频道分钟守卫原子拒绝并且零Discord分钟份额合法**
- [x] **用户日额度跨分钟保留而换频道不能绕过**
- [x] **频道与Discord总日额度跨用户保留而Web可用剩余额度**
- [x] **全局日额度不可通过重建守卫绕过且UTC换日正常开启**
- [x] **并发请求串行检查后再写账本不会超额**
- [x] **429只暂停搜索所有来源60秒且日计数不退款**
- [x] **缺身份与预先取消均不写账本**
- [x] **账本读写失败关闭搜索且不自动恢复或清零**
- [x] **写入期间取消仍等待串行落账，后续请求保留预留并正常准入**
- [x] **已存在账本丢失或被改写时关闭搜索而不从空状态恢复**
- [x] **读操作期间取消不写入，后续请求重读后正常准入**
- [x] **单独频道日上限拒绝不消耗用户或全局额度**
- [x] **落账期间收到429或跨UTC日时不再发起该次搜索**


#### T1–T3修复（2026-10-18，Mock）
- [x] **read期间取消后其他请求等待同一串行任务并正常准入**
- [x] **write期间取消后其他请求等待同一串行任务并正常准入**

### 2.40 `server/test/search-ledger.test.ts` (10 项)

> **任务对应**：Task 20 Step 2 · 上游Mock / 隔离临时账本。

- [x] **首次ENOENT合法且读操作不创建账本**
- [x] **原子落盘并重启恢复尝试数和credits且不存query等内容**
- [x] **损坏账本保持原文且关闭搜索: {bad**
- [x] **损坏账本保持原文且关闭搜索: {}**
- [x] **损坏账本保持原文且关闭搜索: {"version":1,"day":"2026-02-30","total":{"attempts":0,"credits":0},"discord":{"attempts":0,"credits":0},"users":{},"channels":{}}**
- [x] **损坏账本保持原文且关闭搜索: {"version":1,"day":"2026-10-18","total":{"attempts":-1,"credits":0},"discord":{"attempts":0,"credits":0},"users":{},"channels":{}}**
- [x] **目录或非ENOENT读取错误不能当作首次启动**
- [x] **结构拒绝错账未来日期及额外内容但不受额度配置降低影响**
- [x] **rename失败保留原账本并禁止发起搜索**
- [x] **降低配置仍保留既有使用量且过期合法账本换日不带旧身份**

### 2.41 `server/test/search-timeout.test.ts` (7 项)

> **任务对应**：Task 20 Step 2 · 上游Mock / 隔离临时账本。

- [x] **搜索8秒后中止忽略abort的上游且迟到结果被丢弃**
- [x] **客户端取消维持ABORTED而非超时降级**
- [x] **阶段剩余预算不随墙钟或新阶段重置**
- [x] **整体剩余时间小于搜索期限时按剩余时间结束**

#### Task 20 Step 3（2026-10-19，Mock）

- [x] **慢速分块不刷新搜索期限且不等待永不结束的cancel**：实际Response流在3 / 6秒给片段，8秒终止、reader释放、不合作cancel不阻塞、计时器清空。
- [x] **超时后迟到的fetch响应仅取消响应体而不接受来源**：fetch忽略abort，8秒本地终止，迟到响应体取消、无重试。
- [x] **同步解析越过期限也拒绝结果而不依赖计时器先执行**：单调时钟越过8000ms，拒绝迟到结果。

## Task 20 Step 2 要求与测试映射（2026-10-18）

| 提示词要求 | 主要回归文件 |
| :--- | :--- |
| §2 原子搜索额度 / 来源保留 / 用户频道限额 / 429 | server/test/search-budget.test.ts；server/test/chat-adapter-stream-source.test.ts |
| §3 先落账再请求 / 重启 / UTC换日 / N4 / reset不清 | server/test/search-ledger.test.ts；server/test/search-budget.test.ts；server/test/session-api.test.ts；server/test/chat-adapter-stream-source.test.ts |
| §4 搜索超时 / 不合作上游 / 单调与整体剩余时间 | server/test/search-timeout.test.ts；server/test/generation-timeout.test.ts；server/test/context-window.test.ts；server/test/chat-adapter-stream-source.test.ts |
| §5 2048资料预算 / 优先缩资料 / N1与完整输入 / K1 | server/test/search-context.test.ts；server/test/context-window.test.ts；server/test/chat-adapter-stream-source.test.ts |

本轮新增48项，全量41/41文件559/559用例；旧511项保持通过（既有生成配置上边界断言按新增搜索预留关系更新）。生产未装配搜索网络、不加载搜索Key；无真实搜索 / 模型 / Discord / VPS访问。

## Task 20 Step 2 T1–T3修复映射（2026-10-18）

- T1：chat-adapter-stream-source.test.ts新增默认20轮×100 / 200 / 400字历史及3×100字资料回归，以及无历史略超安全阈值的收缩成功回归；search-context.test.ts修订错误的保留最小来源预期，既有无资料可用的context_limit降级 / 计数≤2测试保持。
- T2：search-budget.test.ts新增read / write期间取消后另一请求等待队列、正确恢复和日计数回归；同时修订两项“取消永久关闭”的错误预期，实际读写故障仍关闭的N4回归保留。
- T3：流源新增写失败原因回归，session-api.test.ts新增坏账本 / 写失败的原因持久化、刷新及重启回放回归；原额度不足 / 冷却仍断言admission_denied，ledger测试按判别联合适配。

本轮新增9项，全量41/41文件568/568用例通过；准入返回值改为判别联合，旧布尔断言按允许 / 额度拒绝 / 账本故障分别更新。无真实上游调用、VPS或部署。


## Task 20 Step 3：ADR-015 §6 最终威胁映射（2026-10-19）

本轮新增83项（568→651），8个既有测试文件扩展，无新增测试文件或依赖。下表文件均在server/test；本步只验证服务端Mock边界。

| §6威胁 | 测试文件与用例（含已有回归） | 证据范围 / 遗留 |
| :--- | :--- | :--- |
| SSRF：内网 / 跳转 / DNS | search-adapter.test.ts：结果地址只作元数据且不会读取、端点%s拒绝重定向且不读取Location或正文、只向固定端点发送当前问题且禁用答案全文与重定向；chat-error-safety.test.ts：Step3降级矩阵 | 只调用固定HTTPS端点一次、方法 / 头 / body固定、redirect:error；不解析结果DNS、不抓取结果网页。未来抓取须另行裁决。 |
| 间接提示注入 | search-context.test.ts：供应商文本只能留在单个转义资料块内；chat-adapter-stream-source.test.ts：Step3: 供应商角色指令只留在用户资料且模型输出不能触发额外能力 | 单个转义资料块、固定SEARCH_SYSTEM_RULE、供应商不新增角色、完整URL不入模型、无tools / 额外搜索、伪命令只作正文。证明构造与权限边界，不证明模型语义免疫；不是OS文件权限隔离证明。 |
| XSS / 伪装链接 / Discord提及预览 | search-context.test.ts：危险URL不进入来源或持久化元数据、域名只能来自URL解析且IDN使用解析后的hostname；json-session-storage.test.ts：读取时拒绝磁盘篡改；session-api.test.ts：%s不能经刷新或重启回放下发 | 服务端协议 / 凭据 / 控制与空白 / 长度 / 域名 / 严格元数据校验；客户端独立安全渲染、Discord提及预览与限长留Task 21。 |
| 无界响应 / 不合作上游 / 锁 | search-adapter.test.ts：响应流超过256KiB时停止读取、坏JSON返回本地错误且不泄露原始文本、拒绝异常results结构；search-timeout.test.ts：慢速分块不刷新搜索期限且不等待永不结束的cancel、超时后迟到的fetch响应仅取消响应体而不接受来源、同步解析越过期限也拒绝结果而不依赖计时器先执行；chat-adapter-stream-source.test.ts：Step3取消真实适配器、既有搜索超时本地降级不等待迟到结果且不重搜重扣 | 限读、绝对期限不刷新、取消无普通生成 / 无新消息、迟到只清理、锁释放。真实端到端延迟与网络实现留Task 22。 |
| 身份伪造 / 回放重复收费 / 重启reset | chat-stream.test.ts：非loopback连接%s不信任身份或伪造转发头、非法Discord身份%j按缺失处理、只有无Origin本机请求可提供可信Discord身份且请求体的可信字段被忽略；source-budget.test.ts：请求体伪造web来源、回放与两种冲突不调用预算；search-budget.test.ts：全局日额度不可通过重建守卫绕过且UTC换日正常开启、读写期间取消；session-api.test.ts：进程重装和reset不清Discord日额度且预算拒绝仍普通生成、T3账本失败回放 | Origin / 真实socket边界、不信任转发头、持久化来源决定身份、回放 / 正文及模式冲突不扣额、重启换日reset和N4。仍是私有本机信任边界，不是公网认证。 |
| 上下文挤占 / 校准污染 | search-context.test.ts：按实际隔离块估算先缩摘要后减来源且展示摘要与注入保持一致、最小来源仍超限时清空而不保留一字摘要绕过阈值；context-window.test.ts：含资料的成功用量只提高搜索系数并限制上限4、搜索估算取共享与搜索系数较大值普通选择不受搜索系数影响；chat-adapter-stream-source.test.ts：长URL只保留元数据且搜索用量不污染普通系数，空正文不校准、T1长历史 / 最小输入回归 | 复用Step 2 / T1既有验证，2048估算上限 / N1 / 计数≤2 / context_limit；估算不保证真实token数学上界。 |
| 保存回放一致性 / 错误泄漏 | session-api.test.ts：SSE与刷新及重新装配后的回放保留相同来源且不重新搜索、%s不能经刷新或重启回放下发；chat-adapter-stream-source.test.ts：搜索成功后模型空正文或保存失败不发成功来源；chat-error-safety.test.ts：Step3: %s仅产生本地降级及白名单日志、既有固定错误与日志白名单 | 最终保存后done、严格读取验证、异常值不进入error / 降级诊断或日志；合法成功sources允许校验后的URL，普通模型正文不适用错误脱敏禁词。 |

### TDD与失败观察

- 真实缺陷：`危险URL不进入来源或持久化元数据：%s`中NBSP（U+00A0）与全角空格（U+3000）两例先失败，错误为预期空来源却收到含空白URL的来源。用户补充确认后，仅在server/search-context.ts的safeUrl拒绝字符集加入\s，规范化与持久化校验共用修复；33项资料测试随后通过。
- 开发期夹具校正：`Step3: 供应商角色指令只留在用户资料且模型输出不能触发额外能力`最初错误预期service.getSession调用1次、实际0次；真实会话读取走inspectRequest，改为断言模型输出没有调用此额外入口，并检查无tools / 额外搜索 / 额外写入。
- 开发期夹具校正：`Step3: %s仅产生本地降级及白名单日志`的301 / 302 / 303 / 307 / 308 / 401 / 429最初把白名单name预期写成Error，实际是ChatError；改为精确断言既有白名单字段和值。
- 开发期夹具校正：`Step3: 取消真实适配器的读取挂起不生成不写盘且迟到响应仅清理`曾5000ms超时；ReadableStream默认提前pull，ready早于适配器持有reader，改用highWaterMark:0，使取消点严格发生在实际读取时。不延长超时、不放宽断言，随后通过。
- 全量第3轮出现既有用例失败：`server/test/deployment-validation.test.ts` → `Task 18 Step 2: online validation > reevaluates old samples only with matching measured journal evidence without rewriting them`，第96行`report.eligible_24h`断言为`AssertionError: expected false to be true // Object.is equality`。该轮650/651通过；根因未确认，不改该测试或deploy脚本，不宣称等同Claude此前未定位的偶发失败。完整JSON / 控制台输出保留在`/private/tmp/task20-step3-run3.json`和`/private/tmp/task20-step3-run3.log`。
- 源码及测试在以下8轮间未改动；第4至8轮连续5次全量通过，未放宽既有断言。根目录与Web / server / core / bot类型检查、Web / Express / Bot三项构建及git diff --check通过；既有React act提示和esbuild服务端包体大小标记仍在，不是新增诊断。

| 全量轮次 | 文件 | 用例 | 结果 |
| :--- | :--- | :--- | :--- |
| 1 | 41/41 | 651/651 | 通过 |
| 2 | 41/41 | 651/651 | 通过 |
| 3 | 40/41 | 650/651 | 既有部署证据用例失败，详见上文 |
| 4 | 41/41 | 651/651 | 连续通过1/5 |
| 5 | 41/41 | 651/651 | 连续通过2/5 |
| 6 | 41/41 | 651/651 | 连续通过3/5 |
| 7 | 41/41 | 651/651 | 连续通过4/5 |
| 8 | 41/41 | 651/651 | 连续通过5/5 |

8轮完整输出和机器结果位于`/private/tmp/task20-step3-run<N>.log`及对应`.json`，摘要如表。

### 验证边界

仅注入Mock fetch / 模型、临时JSON / 账本及本机HTTP；不调用真实Tavily / Gemini / Discord，不访问VPS、真实Key或会话，不改部署与生产搜索装配。Task 21安全渲染 / S2 / S3、Task 22许可 / 真实网络与延迟、P1-4 / R3、Q4保持原授权边界，N3未解除。


## Task 21 Step 1：Web来源展示与V1（2026-10-19）

本步新增91项（651→742），8个测试文件扩展或新增，其中新增2个文件。以下为本步逐项清单；概览及既有详细章节计数同步到最终JSON，历史验证记录保持原样。

### `server/test/search-context.test.ts`（本步新增2项，文件共35项）

- [x] Task 21 V1: Unicode 行与段分隔符 清除标题摘要中的分隔符 \u2028 并保持持久化不变量
- [x] Task 21 V1: Unicode 行与段分隔符 清除标题摘要中的分隔符 \u2029 并保持持久化不变量

### `src/hooks/useChat.test.ts`（本步新增6项，文件共21项）

- [x] Task 21: 逐轮模式与最终搜索来源 仅在done附着来源，单done回放也附着来源
- [x] Task 21: 逐轮模式与最终搜索来源 失败重试沿用原模式及原UUID
- [x] Task 21: 逐轮模式与最终搜索来源 搜索超500码点不发请求、不追加输入、不截断问题
- [x] Task 21: 逐轮模式与最终搜索来源 忽略chunk伪造来源且中途失败不附着成功来源
- [x] Task 21: 取消与迟到最终事件 停止后忽略不合作adapter迟到的done及成功来源，保留原片段
- [x] Task 21: chunk与最终done隔离 流式过程中不展示来源，done后才挂载，正文与元数据保持分离

### `src/test/app-remote-integration.test.tsx`（本步新增12项，文件共19项）

- [x] Task 21: Web联网搜索全流程（Mock） 默认关闭并告知外发与保存，开启发送后复位，下一轮不带search
- [x] Task 21: Web联网搜索全流程（Mock） 501码点被拦截且开关不复位，500个emoji可完整发送
- [x] Task 21: Web联网搜索全流程（Mock） 失败重试不随当前开关改变原模式 true 且复用UUID，单done回放来源
- [x] Task 21: Web联网搜索全流程（Mock） 失败重试不随当前开关改变原模式 false 且复用UUID，单done回放来源
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 javascript:alert(1)
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 data:text/html,evil
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 vbscript:evil
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 //evil.example
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 https://u:p@real.example
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 https://real.example/a\u000ab
- [x] Task 21: Web联网搜索全流程（Mock） 篡改done和持久化来源均不产生危险链接 https://real.example/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- [x] Task 21: Web联网搜索全流程（Mock） 刷新还原成功和降级展示，坏搜索字段与旧会话正常显示正文

### `src/test/chat-adapter-contract.test.ts`（本步新增2项，文件共16项）

- [x] ChatAdapter Contract: MockChatAdapter stream (流式契约) 搜索最终元数据为可选，普通模型流保持旧契约
- [x] ChatAdapter Contract: GeminiChatAdapter stream (流式契约) 搜索最终元数据为可选，普通模型流保持旧契约

### `src/test/remote-chat-adapter.test.ts`（本步新增6项，文件共21项）

- [x] Task 21: 搜索请求与最终元数据 只在原输入请求搜索时发送search:true（true）
- [x] Task 21: 搜索请求与最终元数据 只在原输入请求搜索时发送search:true（false）
- [x] Task 21: 搜索请求与最终元数据 chunk不携带来源，只有最终done携带来源
- [x] Task 21: 搜索请求与最终元数据 坏done.search不影响正文也不泄露原文 {"status":"degraded","reason":"SECRET","notice":"SECRET","sources":[]}
- [x] Task 21: 搜索请求与最终元数据 坏done.search不影响正文也不泄露原文 null
- [x] Task 21: 搜索请求与最终元数据 坏done.search不影响正文也不泄露原文 {"status":"succeeded","sources":[]}

### `src/test/search-metadata.test.ts`（本步新增45项，文件共45项）

- [x] Task 21: 客户端搜索元数据边界 接受成功来源并复制已知字段，不修改输入
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 unavailable 并固定文案
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 missing_identity 并固定文案
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 admission_denied 并固定文案
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 ledger_unavailable 并固定文案
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 no_results 并固定文案
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 provider_failure 并固定文案
- [x] Task 21: 客户端搜索元数据边界 接受共享降级原因 context_limit 并固定文案
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：undefined
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：null
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：undefined
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"unknown","sources":[]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"},{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"},{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"},{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":123,"index":2,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":-1,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"evil","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":123,"index":1,"title":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":null,"summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"succeeded","sources":[{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}],"raw":"private detail"}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"degraded","sources":[],"reason":"private detail","notice":"本轮未完成联网检索，以下回复未使用实时搜索。"}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"degraded","sources":[],"reason":"unavailable","notice":"private detail"}
- [x] Task 21: 客户端搜索元数据边界 无效结构按无来源处理：{"status":"not_requested","sources":[{"provider":"tavily","retrievedAt":123,"index":1,"title":"标题","domain":"forged.example","url":"https://real.example/path","summary":"摘要"}]}
- [x] Task 21: 客户端搜索元数据边界 未请求保持兼容
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：javascript:alert(1)
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：data:text/html,evil
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：vbscript:evil
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：//example.com/path
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://user:secret@example.com/
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u000ab
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u0009b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u0000b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u007fb
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u0085b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u2028b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u2029b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a\u202eb
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/a b
- [x] Task 21: 客户端搜索元数据边界 危险URL保留文本来源但不能点击：https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- [x] Task 21: 客户端搜索元数据边界 域名来自URL解析 https://例子.测试:8443/path
- [x] Task 21: 客户端搜索元数据边界 域名来自URL解析 http://real.example/path
- [x] Task 21: 客户端搜索元数据边界 无效地址不信任持久化域名

### `src/test/search-sources.test.tsx`（本步新增16项，文件共16项）

- [x] Task 21: 来源纯文本与安全链接 按编号展示标题摘要和解析域名，安全新窗口属性齐全
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 javascript:alert(1)
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 data:text/html,evil
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 vbscript:evil
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 //evil.example
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 https://u:p@real.example
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 https://real.example/a\u000ab
- [x] Task 21: 来源纯文本与安全链接 不渲染危险链接 https://real.example/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- [x] Task 21: 来源纯文本与安全链接 标题摘要作为原样文本节点 <script>alert(1)</script>
- [x] Task 21: 来源纯文本与安全链接 标题摘要作为原样文本节点 <img src=x onerror="alert(1)">
- [x] Task 21: 来源纯文本与安全链接 标题摘要作为原样文本节点 [点击](javascript:evil)
- [x] Task 21: 来源纯文本与安全链接 标题摘要作为原样文本节点 @everyone
- [x] Task 21: 来源纯文本与安全链接 标题摘要作为原样文本节点 \u202e反向\u202c
- [x] Task 21: 来源纯文本与安全链接 降级固定提示独立展示，不显示枚举或原文
- [x] Task 21: 来源纯文本与安全链接 旧消息和未请求不展示搜索内容 undefined
- [x] Task 21: 来源纯文本与安全链接 旧消息和未请求不展示搜索内容 {"status":"not_requested","sources":[]}

### `src/test/streaming-ui.test.tsx`（本步新增2项，文件共10项）

- [x] Task 21: 最终来源滚动 最终来源加入时遵守触底守卫 true，流中途无来源
- [x] Task 21: 最终来源滚动 最终来源加入时遵守触底守卫 false，流中途无来源

### TDD、全量与构建证据

- V1先红：`Task 21 V1: Unicode 行与段分隔符 > 清除标题摘要中的分隔符 %s 并保持持久化不变量`两项失败，预期标题 / 摘要为普通空格，实际保留U+2028 / U+2029。仅扩展CONTROL后35/35通过，规范化 / 资料块不含分隔符且持久化校验与幂等成立。原始输出：`/private/tmp/task21-v1-red.log`、`task21-v1-green.log`。
- Web先红：新增校验 / 组件测试因模块未实现失败；请求、Hook、App三文件17项行为断言失败（`/private/tmp/task21-web-red.log`、`task21-flow-red.log`），实现后首轮6/6文件155/155通过。新增滚动及可选契约 / 取消 / 最终事件隔离随后通过。
- 提示词复核补测：7项危险链接回退追加“无摘要”断言先红（预期不存在摘要、实际仍展示），改为无效URL只显示标题与解析域名后16/16通过，见`/private/tmp/task21-invalid-link-red.log`、`task21-invalid-link-green.log`；之后重跑最终版本三轮全量。
- 根目录及Web / server / core / bot类型检查通过，Web / Express / Bot三项构建通过。服务端esbuild 1.8mb包体大小标记为既有提示，无新增类型或编译诊断；git diff --check通过。

| 全量轮次 | 文件通过 | 用例通过 | 结果 |
| :--- | :--- | :--- | :--- |
| 1（沙箱） | 37/43 | 662/742 | 本机端口listen EPERM及关联超时，环境失败 |
| 2（获准沙箱外） | 43/43 | 742/742 | 通过 |
| 3（获准沙箱外） | 43/43 | 742/742 | 通过 |
| 4（获准沙箱外） | 43/43 | 742/742 | 通过；无效链接展示收紧前 |
| 5（最终版本） | 43/43 | 742/742 | 连续通过1/3 |
| 6（最终版本） | 43/43 | 742/742 | 连续通过2/3 |
| 7（最终版本） | 43/43 | 742/742 | 连续通过3/3 |

每轮完整日志及机器结果位于`/private/tmp/task21-full-<N>.log`及对应`.json`。沙箱外仅为本机临时HTTP端口解限，所有外部上游仍Mock；未放宽断言或改动部署测试。沙箱失败后单跑server-skeleton也复现3项listen EPERM，见`/private/tmp/task21-listen-check.log`。这与既有deployment-validation第96行eligible_24h偶发断言失败不同；本步不调查或宣称解决该偶发失败。

### 安全与验收映射

- 客户端结构校验：SSE、会话恢复及来源组件共用parseSearchMetadata；状态 / 原因枚举与core对齐，坏字段丢弃且不影响正文。URL单独重新new URL解析，HTTP(S)白名单、凭据 / 控制字符 / 空白 / 2048字符上限，域名始终取解析hostname（含IDN），不用供应商domain或标题作为目标文本。
- 危险协议、协议相对、凭据、控制字符和超长URL：单元及组件验证，App将篡改数据分别放入done和持久化会话，断言无危险可点击链接；无效URL只保留标题 / 域名，无法解析显示固定“域名无效”。
- `<script>`、`<img onerror>`、Markdown、@everyone、双向控制夹具按React文本节点展示；断言无script / img DOM节点，链接仅来自来源URL。安全链接target=_blank并带rel=noopener noreferrer；不加载来源预览。
- 审计第7节复核命令：`rg -n 'dangerouslySetInnerHTML|\binnerHTML\b|\beval\s*\(' src core --glob '!**/*.test.*'`，结果0匹配（rg退出1代表无匹配）；源码使用React文本节点加受校验href，本步未引入HTML执行入口或危险协议链接。结论仅针对应用渲染边界，不保证外部网页安全或来源事实正确。
- 开关默认关闭，已接受的新发送立即关闭；搜索超500 Unicode码点本地提示缩短、不截断，500个emoji完整发送；原user.searchRequested与原UUID保留，重试不读取当前开关。普通轮次不发送search字段。
- ChatChunk新增可选search，只有done消费；单done回放及刷新恢复相同展示，来源与固定SEARCH_DEGRADED_NOTICE均不拼进正文。Mock / Gemini无需生成元数据，兼容回归通过。
- D12既有差异：停止 / 超时 / 中途失败仍保留已上屏片段，末条assistant时旧重试守卫拒绝重试；保留user但不符合D12目标“移除临时回复、保留重试入口”。本步按指示只记录，不实施P1-4 / R3；新增来源仅随done附着，停止后迟到done被忽略，失败片段不附成功来源。
- 生产装配仍无搜索网络，未配置searchAdapter时unavailable降级为预期；无真实Tavily / Gemini / Discord / VPS / Key或会话访问，无依赖 / 部署改动。Step 2（含S2 / S3）、Task 22及N3许可 / 性能门槛保留。

### 沙箱全量失败用例明细（80项，非产品回归）


`server/test/chat-stream.test.ts`

- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 应返回 SSE 响应头并依次输出 chunk 与 done 事件：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 流保持打开时应定期输出 SSE 心跳注释行：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 携带 Last-Event-ID 的断点续传请求应被明确拒绝：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 请求体不符合共享契约时应返回 400：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 尚未注入流源时应返回 503：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 上游异常应转换为标准 UNKNOWN error 事件且不泄漏内部错误：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 生成超时 SSE 错误保留固定安全文案：listen EPERM: operation not permitted 127.0.0.1。
- Task 12 Step 1: 服务端 SSE 流式管道与生命周期管理 客户端断开连接时应中止上游 AbortSignal：Test timed out in 5000ms（端口环境受限的关联失败）。
- P1-1: HTTP 会话输入边界 无请求标识也拒绝伪造角色历史和空输入且不调用流源：listen EPERM: operation not permitted 127.0.0.1。
- P1-1: HTTP 会话输入边界 默认拒绝缺失空白或非字符串会话且请求体不能开启无状态模式：listen EPERM: operation not permitted 127.0.0.1。
- P1-1: HTTP 会话输入边界 显式测试注入允许无状态历史但仍拒绝会话角色注入：listen EPERM: operation not permitted 127.0.0.1。
- P0-2: 幂等请求校验 带标识请求要求严格 UUID 会话和单条非空 user 输入：listen EPERM: operation not permitted 127.0.0.1。
- P1-3: HTTP SSE 错误安全 真实模型流源的敏感 500 错误只序列化固定文案与安全日志：listen EPERM: operation not permitted 127.0.0.1。
- P1-3: HTTP SSE 错误安全 流源意外抛错的兜底日志仅记录白名单且保持现有 UNKNOWN 文案：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非loopback连接203.0.113.10不信任身份或伪造转发头：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非loopback连接10.0.0.2不信任身份或伪造转发头：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非loopback连接::ffff:192.168.1.2不信任身份或伪造转发头：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非loopback连接2001:db8::1不信任身份或伪造转发头：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份""按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份"1111111111111111"按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份"111111111111111111111"按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份"１２３４５６７８９０１２３４５６７８"按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份"333333333333333333\n"按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份333333333333333300按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份null按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 非法Discord身份{}按缺失处理：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 拒绝非布尔搜索字段以及无状态搜索请求：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索HTTP输入 只有无Origin本机请求可提供可信Discord身份且请求体的可信字段被忽略：listen EPERM: operation not permitted 127.0.0.1。

`server/test/cors.test.ts`

- Task 11 Step 3: CORS 白名单与环境隔离 无 Origin 的服务间请求应正常通过且不返回跨域许可头：listen EPERM: operation not permitted 127.0.0.1。
- Task 11 Step 3: CORS 白名单与环境隔离 白名单内来源应通过并返回精确的跨域许可头：listen EPERM: operation not permitted 127.0.0.1。
- Task 11 Step 3: CORS 白名单与环境隔离 白名单外来源应被拒绝并返回 403：listen EPERM: operation not permitted 127.0.0.1。
- Task 11 Step 3: CORS 白名单与环境隔离 白名单内来源的 OPTIONS 预检应返回 204 与允许的方法和请求头：listen EPERM: operation not permitted 127.0.0.1。

`server/test/deployment-validation.test.ts`

- Task 18 Step 2: online validation records real health and gateway metadata without raw logs or secrets：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation does not pass when HTTP health is unavailable：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation does not pass when the process is inactive or metadata collection fails：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation accepts brief automatic recovery and records its measured duration：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation does not reuse gateway readiness from an old process：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation requires a complete real 24-hour span with fresh records：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation resets the window after a failed sample, missing interval or process restart：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation rejects stale records, changed host boot and malformed evidence：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation rejects slow recovery and errors even if the gateway subsequently resumes：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation reevaluates old samples only with matching measured journal evidence without rewriting them：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 18 Step 2: online validation keeps old interruption samples failed when journal evidence is missing：Test timed out in 5000ms（端口环境受限的关联失败）。

`server/test/deployment.test.ts`

- Task 18 Step 1: 私有生产部署 同源首页、静态资源与页面回退正常提供：listen EPERM: operation not permitted 127.0.0.1。
- Task 18 Step 1: 私有生产部署 API 与 SSE 不被静态回退覆盖且隧道 Origin 可访问：listen EPERM: operation not permitted 127.0.0.1。
- Task 18 Step 1: 私有生产部署 不提供点文件、目录穿越或 Web 目录外的服务端产物：listen EPERM: operation not permitted 127.0.0.1。

`server/test/server-skeleton.test.ts`

- Task 11: 服务端 Express 骨架与契约基建 GET / 应返回 200 状态码并输出服务信息与 @core 版本号：listen EPERM: operation not permitted 127.0.0.1。
- Task 11: 服务端 Express 骨架与契约基建 Step 2: 健康检查接口 GET /api/health 应返回 200 状态码与共享健康状态结构：listen EPERM: operation not permitted 127.0.0.1。
- Task 11: 服务端 Express 骨架与契约基建 访问不存在的路由应当返回 404：listen EPERM: operation not permitted 127.0.0.1。

`server/test/session-api.test.ts`

- Task 20 Step 3: 篡改元数据的HTTP边界 危险协议不能经刷新或重启回放下发：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 3: 篡改元数据的HTTP边界 超过三条不能经刷新或重启回放下发：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 3: 篡改元数据的HTTP边界 超长URL不能经刷新或重启回放下发：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 3: 篡改元数据的HTTP边界 多余字段不能经刷新或重启回放下发：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 模型缺少结束事件不保存半截助手回复且后续请求恢复：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 模型中途抛错不保存半截助手回复且后续请求恢复：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 Bot 经真实 HTTP/SSE 多轮对话并按频道复用持久化上下文：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 14 Step 2: 会话 API 与多轮上下文 解析 API 归档后切换会话，并显式区分 Web 来源：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 解析 API 拒绝无效频道和浏览器 Origin 请求：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 创建、读取并归档会话；归档仅写标记而保留消息日志：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 按 sessionId 加载全量历史，并严格追加本轮输入与最终回复：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 归档后保留可读取日志，但拒绝继续追加会话轮次：listen EPERM: operation not permitted 127.0.0.1。
- Task 14 Step 2: 会话 API 与多轮上下文 未携带 sessionId 时拒绝无状态请求且不调用模型：listen EPERM: operation not permitted 127.0.0.1。
- P1-1: HTTP 持久化输入防护 有无请求标识的角色注入和伪造历史均不改变已有日志：listen EPERM: operation not permitted 127.0.0.1。
- P1-1: HTTP 持久化输入防护 共享生产装配在 Mock 降级时也拒绝无状态伪造历史：listen EPERM: operation not permitted 127.0.0.1。
- P0-2: HTTP 持久化重试 失败重试和服务重建回放不重复写入且刷新日志保持唯一输入：listen EPERM: operation not permitted 127.0.0.1。
- P0-1: HTTP 有限上下文 模型仅接收最近轮次但 GET 保留全部日志超限新输入不落盘：listen EPERM: operation not permitted 127.0.0.1。
- P0-1 Step 2: 频道重置与归档锁 重置归档旧日志重复目标不归档新会话其他频道和重启关联不变：listen EPERM: operation not permitted 127.0.0.1。
- P0-1 Step 2: 频道重置与归档锁 拒绝浏览器来源非法目标和跨频道目标且不改日志：listen EPERM: operation not permitted 127.0.0.1。
- P0-1 Step 2: 频道重置与归档锁 生成期间 Web归档和频道重置返回409回复完成后可正常归档：listen EPERM: operation not permitted 127.0.0.1。
- P0-1 Step 2: 频道重置与归档锁 重置归档写入期间生成和第二个重置也立即冲突：Test timed out in 5000ms（端口环境受限的关联失败）。
- P0-1 Step 2: 频道重置与归档锁 归档失败保持旧会话且释放锁允许随后重置：listen EPERM: operation not permitted 127.0.0.1。
- P0-1 Step 2: 频道重置与归档锁 归档成功而新关联解析失败不宣称成功下一次解析自然恢复：listen EPERM: operation not permitted 127.0.0.1。
- P0-1 Step 2: 频道重置与归档锁 Bot经真实本机HTTP重置后下一条聊天只包含新会话输入：Test timed out in 5000ms（端口环境受限的关联失败）。
- Task 20 Step 1: 搜索来源HTTP生命周期 SSE与刷新及重新装配后的回放保留相同来源且不重新搜索：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 1: 搜索来源HTTP生命周期 持久化Discord来源不接受浏览器伪造身份绕过降级：listen EPERM: operation not permitted 127.0.0.1。
- S1: 截断边界来源保存与回放 title截断点为空白仍保存成功且重启回放不重搜：listen EPERM: operation not permitted 127.0.0.1。
- S1: 截断边界来源保存与回放 summary截断点为空白仍保存成功且重启回放不重搜：listen EPERM: operation not permitted 127.0.0.1。
- Task 20 Step 2: 账本与会话生命周期 进程重装和reset不清Discord日额度且预算拒绝仍普通生成：listen EPERM: operation not permitted 127.0.0.1。
- T3: 账本故障原因持久化与回放 坏账本使用ledger_unavailable且刷新重启回放保持一致：listen EPERM: operation not permitted 127.0.0.1。
- T3: 账本故障原因持久化与回放 写入失败使用ledger_unavailable且刷新重启回放保持一致：listen EPERM: operation not permitted 127.0.0.1。
