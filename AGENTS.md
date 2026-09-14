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
- **演进路径**：Web Mock MVP → LLM 接入 → 后端服务化 → Discord 文字接入 → 角色扮演系统 → 语音链路 → 多模型完善
- **约束声明**：愿景仅用于技术决策对齐（接口预留、目录结构等），不构成任何执行授权（见铁律 3）。

## 1. 当前授权
- **授权任务**：同步 Task 8 实施台账与 Task 9 分步规划至 AGENTS.md，待授权执行 Task 9 Step 1
- **最近 commit**：a9b0187 feat(settings): connect settings state, useMemo adapter factory, and component tests (task 8 step 3)
- **越权处理**：凡不在当前授权范围内的文件改动，一律回滚，并记录到 §7 风险区。

## 2. 项目阶段
- **当前阶段**：Phase 2 —— LLM 接入与 ChatAdapter 落地（开发中）
- **当前目标**：落地 ChatAdapter 架构并接入 Gemini 模型（Task 6–10），支持流式与用量展示。

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
| **1（当前）** | Web Playground MVP（纯前端 Mock） | Task 1–5 完成，Mock 闭环可用，测试全绿 |
| **2** | LLM 接入 | ChatAdapter 接口（含流式签名）落地；Gemini adapter 流式/非流式通过测试；Playground 可切换真实模型；用量记录可见 |
| **3** | 后端服务化 | Node.js 服务承载领域内核；Playground 改连后端；会话持久化；密钥管理落地 |
| **4** | Discord 文字接入 | discord.js 网关稳定在线；文字对话闭环；限流与错误处理 |
| **5** | 角色扮演系统 | 角色配置（人设 Prompt / 开场白 / 记忆）可用；Character Card 兼容评估完成 |
| **6** | 语音链路 | STT→LLM→TTS 流式管道打通（优先 Web 麦克风；Discord 语音频道视预研结论） |
| **7** | 多模型完善 | ≥2 个真实 provider 可切换，配置化选择 |

### 3.3 技术架构规划
- **技术栈**：React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + Motion
- **测试框架**：Vitest + @testing-library/react + jsdom（TDD / 改动必测）
- **分层原则**：
  - **领域内核**（纯 TS，无 React、无浏览器 API 依赖）：消息模型、会话状态、适配器调用
  - **UI 层**：React Hook 仅做内核与视图的绑定
  - **适配层**：ChatAdapter（Phase 2 起）；后续 Transcriber / Synthesizer（Phase 6）
- **版本控制**：细粒度语义化 commit；`git status` 同时作为越权审计手段

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

## 5. 待办事项
所有任务默认未授权。执行任何任务前，须由用户在 §1 指派。

### Phase 1（已完成）
- [x] **Task 1**: 搭建单元测试基建（Vitest、Testing Library、运行脚本）
- [x] **Task 2**: 聊天界面骨架构建（标题栏、消息容器、底部输入栏）
- [x] **Task 3**: 用户输入与消息派发逻辑（状态管理、消息追加、表单清空与校验）
- [x] **Task 4**: Mock 机器人响应引擎（思考态加载动画、延时回复策略）
- [x] **Task 5**: 交互细节与体验优化（自动触底滚动、键盘快捷键、IME防误发、清空对话）

### Phase 2（已规划，全部未授权）
- [x] **Task 6**: ChatAdapter 接口定义（send + stream 签名）+ 契约测试套件 + Mock 重构为 MockChatAdapter（同时实现 send/stream，行为不变，Phase 1 测试全绿）
- [x] **Task 7**: GeminiChatAdapter.send（非流式）：role 映射、错误分类、usage 提取；单测全 mock 网络层
- [x] **Task 8**: 设置面板与模型切换（Step 1 存储/校验 + Step 2 弹窗/入口 + Step 3 状态集成/单测全量完成）
- [ ] **Task 9**: 错误展示与用量记录 UI
  - [ ] **Step 1（模型扩展与 Hook 状态）**：`Message.usage?: ChatUsage`（复用既有类型，预留流式语义）；`useChat` 捕获既有 `ChatError`、透传 `lastError`（含清除时机生命周期）；实现限定失败场景且零截断的 `retryFailedSend()`；完成 hook 单元测试
  - [ ] **Step 2（纯展示组件构建）**：新建 `TokenUsageBadge`（Lucide Zap 图标、aria-label、条件渲染）与 `ChatErrorBanner`（全覆盖 6 种 `ChatErrorCode` + default 兜底、重试与设置入口、role="alert"）；完成组件单元测试
  - [ ] **Step 3（挂载组装与全量回归）**：在 `MessageList` 挂载 Token 徽章，在 `App` 挂载错误横幅并接入状态；完成端到端集成测试与全量回归测试（DoD: 100% 通过）；推送到 GitHub 远端
- [ ] **Task 10**: GeminiChatAdapter.stream + 中断（AbortController）+ 打字机 UI + stream 契约测试扩展（Mock/Gemini 同跑，Mock 流式可在无 key 下演示）

### 后续阶段预研（未授权，仅规划）
- [ ] **Task 11 (Phase 3)**: 后端框架与部署方案调研（Cloud Run / VPS）
- [ ] **Task 12 (Phase 4)**: discord.js 选型验证与最小网关 Demo
- [ ] **Task 13 (Phase 5)**: 角色数据格式调研（自定义 schema vs Character Card V2）
- [ ] **消息重发/重生成与分支导航（基于 ADR-005 消息树模型）** (Phase 5)
- [ ] **Task 14 (Phase 6)**: 语音链路方案对比（Gemini 原生音频 vs Whisper+TTS；Web 麦克风 vs Discord 语音频道）

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
- **风险 7**: 沙箱无凭证导致 GitHub 远端 Push 校验中断
  - **事件**：容器沙箱未预置 GitHub 交互式凭证/PAT，非交互执行 `git push` 报 `could not read Username`。
  - **应对**：确保本地具备完整语义化 commit 链路；待环境配置 PAT 或由用户在设置中授权同步。
- **风险 8**: @google/genai 浏览器兼容与版本变动
  - **应对**：锁定版本、SDK 类型不泄漏进领域内核。

## 8. 质量与交付验收标准
### 通用 DoD（所有 Phase 适用）
- [ ] 无 TypeScript 类型错误与 ESLint / 编译警告
- [ ] 改动均有对应测试，npm run test 100% 通过
- [ ] 单步交付：每个改动步骤有语义化 Git commit 并已推送至 GitHub 远端
- [ ] 本文档状态区已同步更新（含 §1 当前授权）
- [ ] git status 干净，无授权范围外文件
- [ ] 未引入未来阶段功能（铁律 3）

### Phase 1 专属验收
- [ ] 界面符合无障碍与响应式规范，无视觉或交互截断
- [ ] 触底滚动逻辑在 jsdom 下有测试覆盖
