# AGENTS.md

本文档是本项目的最高行为规范与状态台账。任何指令与铁律冲突时，先指出冲突并请求确认，不得默默执行或默默拒绝。修改本文档本身也须先提议、经确认后单独 commit。

## 铁律（最高优先级）
1. **只做当前被指派的事**：仅执行用户本轮消息明确授权的任务，完成后立即停下汇报，等待下一条指令。
2. **Backlog ≠ 授权**：待办清单只是规划。未经指派不得开工；即使某事看起来是"显然的下一步"，也只能写进 Backlog 并提议。
3. **愿景 ≠ 授权**：项目愿景（§0）仅用于架构决策参考，不得据此提前实现未来阶段功能（包括 Discord、语音、多模型、后端）。
4. **先计划后动手**：任何文件创建或修改前，先在聊天区提交计划，经用户确认后执行。计划的合法形态 = 将修改的文件清单 + 每步一句话说明（可选：接口签名或 ≤10 行示意片段）。计划中禁止出现完整实现代码。
5. **单步闭环**：每步完成后依次执行：测试通过 → Git commit → 推送至 GitHub（git push） → 更新本文档状态区，然后停止。
   - **分支约束（最高级别）**：在未经用户明确书面授权合并或指定其他目标分支的情况下，**所有 `git push` 操作默认且仅限推送到 `test` 分支（即 `origin test`）**，严禁未经指令直接向 `main` 分支推送。
6. **代码的唯一去处是文件**：所有交付代码必须通过文件写入落盘。聊天区仅承载四类内容：计划、结果摘要、提问、提议。任何仅存在于聊天区的代码视为未交付，等同于没有干活。汇报时结论先行，不逐步外化推理过程；解释理由不超过 3 句，除非用户要求展开。

## 会话启动协议
每次新会话的第一步，依次执行：
1. 通读本文档全文。
2. 复述：当前阶段（§2）、铁律要点、当前授权（§1）、下一个待办任务（§5）。
3. 停止，等待用户指派。此时不得创建或修改任何文件。
若无法读取本文档（运行环境未加载），必须明确告知用户，不得凭记忆或猜测行事。

## 会话收尾协议
每次会话结束前，依次确认：
1. 状态区已同步更新（阶段 / 授权 / 已完成 / 待办 / ADR / 风险）。
2. `git status` 干净，不存在授权范围外的未跟踪文件或改动。
3. 全部测试通过，改动已有对应语义化 commit 并已推送至 GitHub 远端。
4. 当前授权（§1）已标记完成或明确遗留。
5. 完成汇报只包含：已修改文件列表 / 测试结果摘要（通过数与总数）/ commit hash 与 message / 遗留问题。

---

## 0. 项目愿景
- **最终形态**：一个支持角色扮演的聊天机器人：
  - 以 Discord Bot 为主要交互入口（文字 + 语音 STT→LLM→TTS 链路）
  - 模型后端可插拔（Gemini / 其他 LLM），统一通过 ChatAdapter 接口接入
  - 内置角色扮演系统（人设配置、上下文与记忆管理）
  - 保留 Web Playground 作为长期调试与演示控制台
- **使用场景（直播伴随）**：直播画面以主播自身内容为主（如游戏画面）；主播通过 Discord 语音通话唤醒 STT→LLM→TTS 全链路，bot 语音播给所有参与/观看直播的人；Discord 文字聊天仅启用 LLM 对话。直播时文字与语音同时需要，文字承载方式（Discord 频道 / 画面 Overlay / 其他）待 Phase 6 预研确定。
- **演进路径**：Web Mock MVP → LLM 接入 → 后端服务化 → Discord 文字接入 → 角色扮演系统 → 语音链路 → 多模型完善
- **远期方向（纯愿景，不进入 Phase 路线图，不构成执行授权）**：bot 角色三阶段演进——①语音助手（回应主播）；②直播伴侣（回复观众弹幕/评论）；③自主行为能力（对直播画面发表看法）。仅作为 Phase 5 之后架构决策的参考坐标。
- **约束声明**：愿景仅用于技术决策对齐（接口预留、目录结构等），不构成任何执行授权（见铁律 3）。

## 1. 当前授权
- **授权任务**：Task 13 Step 1：RemoteChatAdapter 实现与契约测试（已完成）
- **最近 commit**：cea4ab4 feat(web): add remote chat SSE adapter (Task 13 Step 1)
- **当前测试基线**：19/19 个测试套件、152/152 项用例通过（`npm run test`）
- **开发执行模型交接记录（2026-09-17 18:39:03 PDT）**：因 Google AI Studio 持续出现且并非个例的 “Internal Error”，GPT-5.6 Sol 临时接替 Gemini 3.8 Flash 处理开发任务；待 AI Studio 恢复后，GPT-5.6 Sol 的开发任务暂时终止，由 Gemini 3.8 Flash 继续开发。本记录仅描述开发执行者切换，不扩大当前任务授权范围。
- **越权处理**：凡不在当前授权范围内的文件改动，一律回滚，并记录到 §7 风险区。

## 2. 项目阶段
- **当前阶段**：Phase 3 —— 后端服务化（进行中）
- **当前目标**：Task 13 Step 1 RemoteChatAdapter 已完成，等待下一项明确授权。

## 3. 项目规划
### 3.1 产品设计（Phase 1 范围）
- **定位**：Web Playground —— 长期保留的调试与演示控制台，不是一次性原型。
- **MVP 核心功能**：
  - 对话消息流展示（用户/机器人消息气泡区隔、时间与角色标识）
  - 消息输入与快捷交互（文本框、发送按钮、Enter 快捷发送、空白防误触）
  - 本地 Mock 响应机制（模拟思考延时 Loading 与自动应答）
  - 基础体验优化（平滑滚动触底、响应式布局）

### 3.2 分阶段路线图
| Phase | 目标 | 退出条件 |
| :--- | :--- | :--- |
| **1** | Web Playground MVP（纯前端 Mock） | Task 1–5 完成，Mock 闭环可用，测试全绿（已完成） |
| **2** | LLM 接入 | ChatAdapter 接口（含流式签名）落地；Gemini adapter 流式/非流式通过测试；Playground 可切换真实模型；用量记录可见（已结项） |
| **3（下一阶段）** | 后端服务化 | Task 11–14 完成：Node.js 服务承载领域内核；Playground 改连后端且原有测试语义零漂移；会话 JSON 文件持久化；密钥收拢至服务端环境变量 |
| **4** | Discord 文字接入 | discord.js 网关稳定在线；文字对话闭环；限流与错误处理 |
| **5** | 角色扮演系统 | 角色配置（人设 Prompt / 开场白 / 记忆）可用；Character Card 兼容评估完成 |
| **6** | 语音链路 | STT→LLM→TTS 流式管道打通；主入口为 Discord 语音通话（直播场景），Web 麦克风保留为调试通道；直播场景文字+语音伴随输出可用（承载方式以预研结论为准） |
| **7** | 多模型完善 | ≥2 个真实 provider 可切换，配置化选择 |

### 3.3 技术架构规划
- **技术栈**：React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + Motion
- **测试框架**：Vitest + @testing-library/react + jsdom（TDD / 改动必测）
- **分层原则**：
  - **领域内核**（纯 TS，无 React、无浏览器 API 依赖）：消息模型、会话状态、适配器调用
  - **UI 层**：React Hook 仅做内核与视图的绑定
  - **适配层**：ChatAdapter（Phase 2 起）；后续 Transcriber / Synthesizer（Phase 6）
- **版本控制**：细粒度语义化 commit；`git status` 同时作为越权审计手段
- **开发与执行环境**：编码、测试与提交由 Google AI Studio 中的 Gemini agent 执行（沙箱限制见 §7 风险 7）；跨会话不保留对话记忆，状态恢复完全依赖本文档；计划审批与结果验收由用户负责。

## 4. 已完成事项
- [x] 初始化本地 Git 代码仓库
- [x] 确立 MVP 产品范围（纯前端本地 Mock 交互闭环）
- [x] 完成初版产品架构与实施路线图梳理
- [x] 编写 AGENTS.md v1（状态跟踪 / ADR / 风险 / DoD）
- [x] AGENTS.md v2 重构：铁律、启动/收尾协议、当前授权、项目愿景与 Phase 1–7 路线图（ADR-003 / ADR-004）
- [x] **Task 1**: 搭建单元测试基建（Vitest、Testing Library、运行脚本，commit: 8a59453）
- [x] **Task 2**: 聊天界面骨架构建（标题栏、消息容器、底部输入栏，commit: 98a3f11）
- [x] **Task 3**: 用户输入与消息派发逻辑（状态管理、消息追加、表单清空与校验，commit: 96a62be）
- [x] **Task 4**: Mock 机器人响应引擎（思考态加载动画、延时回复策略，commit: b432acf）
- [x] **Task 5**: 交互细节与体验优化（智能触底滚动、auto-expanding textarea、IME 防误发、清空对话、无障碍适配，commit: 10c0bbc）
- [x] **Task 6**: ChatAdapter 接口定义与契约测试套件，Mock 重构为 MockChatAdapter（commit: 0998e94）
- [x] **Task 7**: GeminiChatAdapter.send（非流式实现、role 映射、错误分类、Token 用量提取，单测 100% Mock 网络层，commit: f1722d5）
- [x] **Task 8**: 设置面板与模型切换
  - [x] **Step 1（存储与校验）**：定义 `AppSettings`、`settings.ts` 防御性存储与草稿模式校验（commit: 6e43820）
  - [x] **Step 2（设置弹窗与入口）**：构建 `SettingsModal` 弹窗（Provider/模型选择、密码框显隐切换、无障碍）并在 `Header` 挂载入口按钮（commit: fab6ecb）
  - [x] **Step 3（状态集成与单测）**：在 `App` 接入设置状态、动态 `useMemo` Adapter 工厂与组件级集成单测（commit: a9b0187）
- [x] **Task 9**: 错误展示与用量记录 UI
  - [x] **Step 1（模型扩展与 Hook 状态）**：`Message.usage?: ChatUsage`；`useChat` 捕获 `ChatError`、透传 `lastError`、零截断重试 `retryFailedSend`、Hook 单元测试（commit: 20e77ec）
  - [x] **Step 2（纯展示组件构建）**：`TokenUsageBadge`（Zap 图标/条件渲染/ARIA）与 `ChatErrorBanner`（6 种错误码+default兜底/重试与设置入口/alert），组件单元测试（commit: d14d0ce）
  - [x] **Step 3（挂载组装与全量回归）**：在 `MessageList` 挂载 Token 徽章，在 `App` 挂载错误横幅并联动设置弹窗，完成端到端集成测试与全量测试回归（commit: a5fecf9）
- [x] **Gemini 模型升级与测试闭环**：将默认与可选 Gemini 模型升级至 3.8-flash / 3.6-flash / 3.1-pro，全量同步 settings-storage 与 UI 测试（commit: 14b72bb）
- [x] **Task 10**: GeminiChatAdapter.stream + 中断（AbortController）+ 打字机 UI + stream 契约测试扩展
  - [x] **Step 1（适配器流式与中断）**：GeminiChatAdapter.stream 实现、AbortSignal 级联、契约测试与单测扩展（commit: 1282903）
  - [x] **Step 2（Hook 状态机与控制）**：`useChat` 流式驱动、`isGenerating` / `stopGenerating` 控制、`AbortController` 级联与中途打断单测
  - [x] **Step 3（UI 呈现与集成闭环）**：打字机光标动效、停止生成按钮与端到端回归（commit: 2040469）
- [x] **测试全景台账建立（TESTS.md）**：全景梳理 13 个测试套件、122 项用例并确立维护规范，纳入通用 DoD
- [x] **流式触底滚动与用户滚动守卫（Smart Sticky Bottom）**：全面迁移滚动 API 至 scrollTo/scrollTop；区分消息增量 smooth 触底与流式 content 高频 rAF auto 触底；实现 100px 守卫判定与上滑发送强制吸底，测试增至 122 项全绿（commit: e8e6711）
- [x] **开发执行模型临时交接记录（2026-09-17）**：因 Google AI Studio 的重复性 “Internal Error” 导致其侧开发流程中断，GPT-5.6 Sol 临时接替 Gemini 3.8 Flash；待 AI Studio 恢复后暂停 GPT-5.6 Sol 的开发任务，由 Gemini 3.8 Flash 继续开发。
- [x] **Task 11**: 后端服务骨架与契约基建搭建
  - [x] **Step 1（三目录划分与双环境测试配置）**：落地 `core/`、`server/` 结构与 tsconfig 路径别名（`@core/*`）；配置 Express 骨架、Vitest 双环境（前端 jsdom / 服务端 node）、Supertest 依赖与服务端运行/构建脚本；同步拓展 TESTS.md 服务端条目。
  - [x] **Step 2（共享契约模块与健康检查接口）**：在 `core/` 落地共享 SSE 协议（chunk / done / error，error 内嵌 ChatError 的 code 与 message）；声明 Task 13 无状态向 Task 14 sessionId 演进路径；实现 `/api/health` 接口及 Supertest 单测（commit: 7e80fd6）。
  - [x] **Step 3（轻量安全防护与环境隔离）**：以 `ALLOWED_ORIGINS` 环境变量驱动精确匹配 CORS 白名单；配置 `.env.example` 与 `.gitignore` 环境/数据隔离规则；补齐允许、拒绝及预检链路测试（commit: 27e719b）。
- [x] **Task 12 Step 1（服务端 SSE 流式管道与生命周期管理）**：实现 `/api/chat/stream` SSE 接口、15 秒心跳、不支持断点续传声明、客户端断开到上游 AbortController 的级联取消与完整测试（commit: 1bd0116）。
- [x] **Task 12 Step 2（GeminiAdapter 服务端承载与 Key 收拢）**：将通用聊天类型与 GeminiChatAdapter 迁入 `core/` 单一实现；服务端通过 `GEMINI_API_KEY` 注入并映射为 SSE 流源，前端直连调试复用同一实现；网络层测试 100% Mock（commit: ef83d78）。
- [x] **Task 12 Step 3（Mock 降级复用与统一错误透传）**：将 MockChatAdapter 迁入 `core/` 单一实现；无有效服务端 Key 时自动降级 Mock；Gemini 错误复用统一分类并通过 SSE error 事件透传标准 code/message；ChatErrorBanner 零改动通过既有测试（commit: c2c2dc6）。
- [x] **Task 13 Step 1（RemoteChatAdapter 实现与契约测试）**：实现 `RemoteChatAdapter`，通过 fetch + ReadableStream 消费服务端 SSE，支持标准错误映射与 AbortSignal；网络层全 Mock，不依赖真实后端进程（commit: cea4ab4）。

## 5. 待办事项
所有任务默认未授权。执行任何任务前，须由用户在 §1 指派。

### Phase 1（已完成）
- [x] **Task 1**: 搭建单元测试基建（Vitest、Testing Library、运行脚本）
- [x] **Task 2**: 聊天界面骨架构建（标题栏、消息容器、底部输入栏）
- [x] **Task 3**: 用户输入与消息派发逻辑（状态管理、消息追加、表单清空与校验）
- [x] **Task 4**: Mock 机器人响应引擎（思考态加载动画、延时回复策略）
- [x] **Task 5**: 交互细节与体验优化（自动触底滚动、键盘快捷键、IME防误发、清空对话）

### Phase 2（已完成）
- [x] **Task 6**: ChatAdapter 接口定义（send + stream 签名）+ 契约测试套件 + Mock 重构为 MockChatAdapter（同时实现 send/stream，行为不变，Phase 1 测试全绿）
- [x] **Task 7**: GeminiChatAdapter.send（非流式）：role 映射、错误分类、usage 提取；单测全 mock 网络层
- [x] **Task 8**: 设置面板与模型切换（Step 1 存储/校验 + Step 2 弹窗/入口 + Step 3 状态集成/单测全量完成）
- [x] **Task 9**: 错误展示与用量记录 UI（Step 1 模型与Hook + Step 2 纯展示组件 + Step 3 挂载组装与集成测试全量完成）
- [x] **Task 10**: GeminiChatAdapter.stream + 中断（AbortController）+ 打字机 UI + stream 契约测试扩展（Mock/Gemini 同跑，Mock 流式可在无 key 下演示）
  - [x] **Step 1（适配器流式与中断）**：GeminiChatAdapter.stream 实现、AbortSignal 级联、契约测试单测（已完成）
  - [x] **Step 2（Hook 状态机与控制）**：useChat 流式驱动、stopGenerating 控制与中途打断单测（已完成）
  - [x] **Step 3（UI 呈现与集成闭环）**：打字机光标动效、停止生成按钮与端到端回归

### Phase 3（进行中，未授权项不得开工）
- [x] **Task 11**: 后端服务骨架与契约基建搭建
  - [x] **Step 1（三目录划分与双环境测试配置）**：落地 `core/`、`server/` 结构与 tsconfig 路径别名（`@core/*`）；配置 Express 骨架、Vitest 双环境（前端 jsdom / 服务端 node）、Supertest 依赖与服务端运行/构建脚本；同步拓展 TESTS.md 服务端条目。
  - [x] **Step 2（共享契约模块与健康检查接口）**：在 `core/` 落地共享 SSE 协议（chunk / done / error，error 内嵌 ChatError 的 code 与 message）；声明 Task 13 无状态向 Task 14 sessionId 演进路径；实现 `/api/health` 接口及 Supertest 单测（commit: 7e80fd6）。
  - [x] **Step 3（轻量安全防护与环境隔离）**：CORS 白名单支持 `ALLOWED_ORIGINS` 环境变量；配置 `.env.example`（含 `GEMINI_API_KEY` 与 `ALLOWED_ORIGINS` 样例），`.env` 与测试数据进 `.gitignore`；补齐骨架链路测试（commit: 27e719b）。
- [x] **Task 12**: 服务端承载 Chat 调用与密钥收拢
  - [x] **Step 1（服务端 SSE 流式管道与生命周期管理）**：实现 `/api/chat/stream` SSE 接口，接入约 15s 心跳注释行保活（`: ping\n\n`）；显式声明不支持断点续传；实现客户端中断到服务端上游 AbortController 的级联取消链路与单测覆盖（commit: 1bd0116）。
  - [x] **Step 2（GeminiAdapter 服务端承载与 Key 收拢）**：将 `GeminiChatAdapter` 纳入 `core/` 共享实现，服务端通过 `process.env.GEMINI_API_KEY` 注入实例化；前端调试模式复用同实现不产平行代码；编写服务端环境变量注入与模型调用单测（100% Mock 网络层）（commit: ef83d78）。
  - [x] **Step 3（Mock 降级复用与统一错误透传）**：无 Key 访问时自动复用 `core/MockChatAdapter`；错误透传复用 `classifyGeminiError` 并通过 SSE error 事件携带标准错误码；以纯前端 ChatErrorBanner 零改动为架构对齐验证点（commit: c2c2dc6）。
- [ ] **Task 13**: 前端 Playground 改连与架构平滑切换
  - [x] **Step 1（RemoteChatAdapter 实现与契约测试）**：在 `src/adapters/RemoteChatAdapter.ts` 实现 `ChatAdapter` 接口，通过 `fetch` + `ReadableStream` 消费 SSE 事件并支持 AbortSignal 中断；单测 100% Mock 网络，不依赖真实后端进程（commit: cea4ab4）。
  - **Step 2（设置面板适配）**：SettingsModal 扩展连接模式选择（“后端服务（推荐）”与“前端直连调试模式”）；选择后端模式时 API Key 输入区域隐藏或锁定并提示环境变量托管；直连模式去留于 Phase 3 结项时由用户决策。
  - **Step 3（集成装配与全量回归）**：在 App.tsx 接入 RemoteChatAdapter 闭环流式体验；确保现有 135 项用例语义零漂移，新增用例同步登记 TESTS.md。
- [ ] **Task 14**: 会话持久化与上下文管理
  - **Step 1（持久化存储层抽象与 JSON 文件引擎）**：定义 `SessionStorage` 接口（遵循 ADR-005 唯一 ID 与严格追加语义）；默认实现 JSON 文件存储引擎（每会话单文件，存 `data/` 目录进 `.gitignore`）；编写存储层单测。
  - **Step 2（会话操作 API 与多轮上下文拼接）**：实现会话获取与创建接口，支持 sessionId 寻址；上下文默认全量历史（截断策略推迟至 Phase 5）；清空对话定案为归档标记语义（Soft Delete / Archived），保持物理日志不可变。
  - **Step 3（前端单会话自动恢复与状态联动）**：Playground 启动时恢复最近会话；清空对话联动后端归档；补充持久化集成测试；前端不做多会话管理 UI（Phase 5 范围）。

### 后续阶段预研（未授权，仅规划，去编号化）
- [ ] **Phase 3 收尾预研**：部署方案（Cloud Run / VPS，显式声明不阻塞 Phase 3 退出条件）
- [ ] **Phase 4 预研**：discord.js 选型验证与最小网关 Demo
- [ ] **Phase 5 预研**：角色数据格式调研（自定义 schema vs Character Card V2）
- [ ] **消息重发/重生成与分支导航（基于 ADR-005 消息树模型）** (Phase 5)
- [ ] **Phase 6 预研**：语音链路方案对比（Gemini 原生音频 vs Whisper+TTS；Discord 语音通话直播主入口可行性与端到端延迟验证；Web 麦克风调试通道；直播文字伴随输出承载选型）
- [ ] **模型动态发现与拉取（提议，未授权）**：支持通过 Gemini API（models.list）动态拉取当前 Key 可用的模型列表，替代硬编码配置。

## 6. 技术决策记录
- **ADR-001: MVP 采用纯前端 Mock 机制**
  - **背景**：低成本验证对话交互闭环。
  - **决策**：暂不接入云端服务，使用本地 Mock 与延时应答；本项目定位为长期保留的 Web Playground。
  - **影响**：降低初期依赖风险；经 ChatAdapter 接口可无缝切换真实 API。
- **ADR-002: 领域逻辑与 UI 分离（useChat）**
  - **背景**：避免消息状态与 React 视图紧耦合。
  - **决策**：消息状态与 Mock 逻辑封装于自定义 Hook。
  - **影响**：可进行纯逻辑级单测；为 ADR-003 的进一步解耦奠定基础。
- **ADR-003: 领域内核与传输层解耦，统一 ChatAdapter 接口**
  - **背景**：最终目标含 Discord 接入与多模型支持，消息内核必须可脱离浏览器与单一模型运行。
  - **决策**：消息模型、会话状态、适配器调用抽为纯 TS 领域内核；所有模型接入（Mock、Gemini 及后续）实现统一 ChatAdapter 接口；语音以 Transcriber / Synthesizer 同理扩展。
  - **影响**：Phase 4 Discord 侧可复用同一内核；接入新模型只需新增 adapter；前端工作在最终架构中不废弃。
- **ADR-004: AGENTS.md 引入行为约束机制（铁律 + 授权台账）**
  - **背景**：首次会话中 agent 出现越权行为（未建文档、未完成指派的 Git 初始化即开始前后端编码）。
  - **决策**：以铁律 + 启动/收尾协议 + 当前授权字段构成事前闸门，git status 审计作为事后兜底。
  - **影响**：越权可发现、可回滚；规范本身变更需单独 commit。
- **ADR-005: 消息标识与会话日志不可变约束**
  - **背景**：同类项目（DeepSeek Harness）中观察到重发消息导致状态污染（原消息丢失、回复残留、顺序错乱）。
  - **决策**：
    1. 每条消息持有生成时分配的稳定唯一 ID（UUID），禁止以内容或数组下标作为身份标识；
    2. 会话日志为仅追加的有序数组，React 渲染 key 一律使用消息 ID；
    3. 任何"编辑后重发/重新生成"统一定义为：截断目标消息之后的所有消息 + 追加新消息，禁止原地修改；
    4. 未来多版本分支预留为消息树模型（节点含 parent 指针），当前阶段不实现。
  - **影响**：从数据结构上消除整类状态污染 bug；Phase 3 持久化与 Phase 5 重生成直接复用。
- **ADR-006: 浏览器端直连与本地密钥管理**
  - **背景**：Phase 2 核心目标为低门槛验证真实 LLM 交互与流式体验，暂无独立后端服务。
  - **决策**：采用方案 A（前端直连 Gemini API）；API Key 通过设置面板输入、存 localStorage、不入 git 不进构建产物；仅限本地 Playground 调试，公开部署禁止，Phase 3 服务端化后替代。
  - **影响**：零后端依赖快速推进 Phase 2；用户自主掌控 key 安全边界。
- **ADR-007: 流式响应统一纳入 ChatAdapter 契约**
  - **背景**：LLM 对话打字机体验必须依赖流式传输，且需要支持用户中途打断。
  - **决策**：
    1. adapter 统一 `stream(): AsyncIterable<ChatChunk>` + `AbortSignal` 中断；
    2. 注明 ADR-005“禁止原地修改”限定于编辑重发场景，流式中末条消息 content 逐 chunk 更新不违反，日志数组仍仅追加。
  - **影响**：统一 Mock 与真实模型的流式协议；打字机动效与 token 统计接口规范化。
- **ADR-008: 模型列表演进策略与链路防御规范**
  - **背景**：模型版本更迭频繁，硬编码可能面临弃用（如 2.5 下线）；同时用户输入 API Key 存在粘贴空白、不可见字符以及设置变更后 Adapter 缓存未更新等隐患。
  - **决策**：
    1. 固化四重链路防御：零宽/不可见字符深度过滤、严格首尾 trim、空 key 前置抛出 AUTH_ERROR、Settings 变动严格驱动 useMemo 重建 Adapter；
    2. 当前以 Google 官方基线推荐清单（3.8-flash / 3.6-flash / 3.1-pro）作为稳定配置；
    3. 规划动态发现机制（models.list API）作为后续演进路线。
  - **影响**：规避因用户输入微瑕疵导致的 403/400 假性故障；保持与官方活跃模型的对齐。
- **ADR-009: Phase 3 服务端架构与代码共享组织（单仓三目录 + SSE 契约通道）**
  - **背景**：领域内核需同时服务 Web 前端与 Node 服务端（Phase 4 扩展至 Discord 机器人）；需在 Monorepo Workspaces 与单仓多目录间权衡；既有 122 项测试需路径零漂移与 100% 稳定运行；持久化引擎须规避原生 C++ 二进制依赖以消除沙箱和本地跨平台编译风险（风险 10）。
  - **决策**：
    1. **代码组织结构**：采用单仓三目录（`core/` 领域内核、契约与适配器通用实现；`src/` Web UI 与 RemoteChatAdapter；`server/` Express 服务端、SSE 路由与存储层）；
    2. **依赖与编译边界**：`core/` 持独立 tsconfig 确保无 React/DOM/Node 专属全局污染，`src/` 与 `server/` 经 tsconfig path alias（`@core/*`）引用，根 `package.json` 统一管理依赖；触发条件：Phase 4 若产生独立 Bot 运行进程或独立分发单元，升格为 npm workspaces；
    3. **测试统一入口**：保持单一 `npm run test`，以 Vitest 双环境（web=jsdom / server=node）覆盖前后端全部用例，既有测试路径与 TESTS.md 台账零漂移；
    4. **通信与存储**：确立 SSE（Server-Sent Events）为前后端唯一流式契约通道（包含 chunk / done / error 事件与 ~15s 心跳保活，不支持断点续传）；持久化引擎默认采用无原生依赖的 JSON 文件存储（每会话单文件，遵循 ADR-005 仅追加语义，`data/` 目录进 `.gitignore`），SQLite 降级为部署期可选插件。
  - **影响**：杜绝跨平台原生依赖故障；前后端适配器实现统一无冗余；以最小侵入性实现全栈服务化演进。

## 7. 风险与阻塞
- **风险 0（已发生，已缓解）**：agent 完成偏置导致越权执行
  - **事件**：首次会话中 agent 跳过文档与仓库初始化，直接编写前后端代码。
  - **应对**：v2 铁律与授权机制（ADR-004）；任务票式指派；保持工具逐条确认模式。
- **风险 1**: React 19 与测试库兼容性
  - **应对**：使用适配 React 19 的最新 Testing Library 与 Vitest，jsdom 环境。
- **风险 2**: 无头环境 DOM 滚动
  - **应对**：jsdom 中显式 Mock Element.prototype.scrollIntoView。
- **风险 3**: 密钥管理（Phase 3 起）
  - **应对**：token / API key 不入 git；.env + .gitignore；密钥仅存在于服务端。
- **风险 4**: STT→LLM→TTS 串行延迟（Phase 6）
  - **应对**：流式传输与管道并行化；先验证端到端延迟预算。
- **风险 5**: Discord API 限流（Phase 4）
  - **应对**：依赖 discord.js 内置限流处理；设计消息频率上限。
- **风险 6**: token 与 TTS 成本
  - **应对**：Phase 2 起记录用量；Playground 默认 Mock / 低成本模型。
- **风险 7**: AI Studio 沙箱无凭证导致 GitHub 远端 Push 校验中断
  - **事件**：执行环境为 Google AI Studio，其沙箱未预置 GitHub 交互式凭证/PAT，非交互执行 `git push` 报 `could not read Username`。
  - **应对**：确保本地具备完整语义化 commit 链路；待环境配置 PAT 或由用户在设置中授权同步。push 失败属已知环境限制，记录后继续推进，不视为步骤失败。
- **风险 8**: @google/genai 浏览器兼容与版本变动
  - **应对**：锁定版本、SDK 类型不泄漏进领域内核。
- **风险 9（已发生，已缓解）**: Gemini API 403 权限/环境异常与密钥清洗防御
  - **事件**：用户使用未启用付费/欠费/项目受限的 API Key 发起调用时返回 403 PERMISSION_DENIED。
  - **应对**：排查确认为环境/Key 权限问题；同时沉淀四重通用防御（不可见字符与空白清洗、空 key 拦截、强触发重构），确保前端链路无隐形故障。
- **风险 10（已发生，已缓解）**: 本地跨平台执行环境（macOS ARM64）与 Rollup 原生依赖适配
  - **事件**：本地 Apple Silicon (M 芯片) 环境运行 Vitest 时，因 node_modules 仅包含 x64 版本、缺少 `@rollup/rollup-darwin-arm64` 原生二进制可选依赖，导致测试引擎在收集测试前启动失败。
  - **应对与红线**：
    1. 属本地原生可选依赖缺失，仅限在本地机器依赖目录修复补齐（如 `npm i -D @rollup/rollup-darwin-arm64`）；
    2. **铁律红线**：严禁将特定平台的二进制依赖加入项目依赖、严禁将本地平台污染的 `package-lock.json` 或特定平台模块 commit / push 到 Git 仓库，确保 Linux CI/CD 与云端环境纯净；
    3. 修复后本地测试套件 13/13 全绿、118/118 用例通过，与 TESTS.md 台账完全一致。
- **风险 11（已发生，待 AI Studio 恢复）**: Google AI Studio 重复出现 “Internal Error” 导致 Gemini 3.8 Flash 侧开发流程中断
  - **事件**：用户反馈该错误持续出现且并非个例；Google AI Developers Forum 近期公开报告了 Gemini 3.8 Flash / AI Studio 的重复性 Internal Error（[2026-09-08 报告](https://discuss.ai.google.dev/t/repeated-an-internal-error-occurred-in-google-ai-studio-build-with-gemini-3-8-flash/181795)、[2026-09-14 报告](https://discuss.ai.google.dev/t/gemini-3-8-flash-down-an-internal-error-occurred-tool-calling-and-web-access-not-working/182668)）。
  - **应对与交接**：GPT-5.6 Sol 临时接替开发；待 AI Studio 恢复后，GPT-5.6 Sol 的开发任务暂时终止，由 Gemini 3.8 Flash 继续开发。该交接不改变 Phase 3 路线、任务边界或当前授权。

## 8. 质量与交付验收标准
### 通用 DoD（所有 Phase 适用）
- [ ] 无 TypeScript 类型错误与 ESLint / 编译警告
- [ ] 改动均有对应测试，npm run test 100% 通过
- [ ] 测试变更同步更新 TESTS.md 测试台账（保证 100% 映射一致）
- [ ] 单步交付：每个改动步骤有语义化 Git commit 并已推送至 GitHub 远端
- [ ] 本文档状态区已同步更新（含 §1 当前授权）
- [ ] git status 干净，无授权范围外文件
- [ ] 未引入未来阶段功能（铁律 3）

### Phase 1 专属验收
- [ ] 界面符合无障碍与响应式规范，无视觉或交互截断
- [ ] 触底滚动逻辑在 jsdom 下有测试覆盖
