# 历史归档

本文件只增不改，归档所有已完成事项。

- [x] 初始化本地 Git 代码仓库。
- [x] 确立 MVP 产品范围（纯前端本地 Mock 交互闭环）。
- [x] 完成初版产品架构与实施路线图梳理。
- [x] 编写 AGENTS.md v1（状态跟踪 / ADR / 风险 / DoD）。
- [x] AGENTS.md v2 重构：铁律、启动/收尾协议、当前授权、项目愿景与 Phase 1–7 路线图（ADR-003 / ADR-004）。
- [x] **Task 1**：搭建单元测试基建（Vitest、Testing Library、运行脚本，commit: 8a59453）。
- [x] **Task 2**：聊天界面骨架构建（标题栏、消息容器、底部输入栏，commit: 98a3f11）。
- [x] **Task 3**：用户输入与消息派发逻辑（状态管理、消息追加、表单清空与校验，commit: 96a62be）。
- [x] **Task 4**：Mock 机器人响应引擎（思考态加载动画、延时回复策略，commit: b432acf）。
- [x] **Task 5**：交互细节与体验优化（智能触底滚动、auto-expanding textarea、IME 防误发、清空对话、无障碍适配，commit: 10c0bbc）。
- [x] **Task 6**：ChatAdapter 接口定义与契约测试套件，Mock 重构为 MockChatAdapter（commit: 0998e94）。
- [x] **Task 7**：GeminiChatAdapter.send（非流式实现、role 映射、错误分类、Token 用量提取，单测 100% Mock 网络层，commit: f1722d5）。
- [x] **Task 8**：设置面板与模型切换。
  - [x] **Step 1（存储与校验）**：定义 `AppSettings`、`settings.ts` 防御性存储与草稿模式校验（commit: 6e43820）。
  - [x] **Step 2（设置弹窗与入口）**：构建 `SettingsModal` 弹窗（Provider/模型选择、密码框显隐切换、无障碍）并在 `Header` 挂载入口按钮（commit: fab6ecb）。
  - [x] **Step 3（状态集成与单测）**：在 `App` 接入设置状态、动态 `useMemo` Adapter 工厂与组件级集成单测（commit: a9b0187）。
- [x] **Task 9**：错误展示与用量记录 UI。
  - [x] **Step 1（模型扩展与 Hook 状态）**：`Message.usage?: ChatUsage`；`useChat` 捕获 `ChatError`、透传 `lastError`、零截断重试 `retryFailedSend`、Hook 单元测试（commit: 20e77ec）。
  - [x] **Step 2（纯展示组件构建）**：`TokenUsageBadge`（Zap 图标/条件渲染/ARIA）与 `ChatErrorBanner`（6 种错误码+default兜底/重试与设置入口/alert），组件单元测试（commit: d14d0ce）。
  - [x] **Step 3（挂载组装与全量回归）**：在 `MessageList` 挂载 Token 徽章，在 `App` 挂载错误横幅并联动设置弹窗，完成端到端集成测试与全量测试回归（commit: a5fecf9）。
- [x] **Gemini 模型升级与测试闭环**：默认与可选模型升级至 3.8-flash / 3.6-flash / 3.1-pro（commit: 14b72bb）。
- [x] **Task 10**：GeminiChatAdapter.stream + 中断 + 打字机 UI + stream 契约测试扩展。
  - [x] **Step 1（适配器流式与中断）**：GeminiChatAdapter.stream 实现、AbortSignal 级联、契约测试与单测扩展（commit: 1282903）。
  - [x] **Step 2（Hook 状态机与控制）**：`useChat` 流式驱动、`isGenerating` / `stopGenerating` 控制、`AbortController` 级联与中途打断单测。
  - [x] **Step 3（UI 呈现与集成闭环）**：打字机光标动效、停止生成按钮与端到端回归（commit: 2040469）。
- [x] **测试全景台账建立（`dev-docs/tests.md`）**：全景梳理 13 个测试套件、122 项用例并确立维护规范，纳入通用 DoD。
- [x] **流式触底滚动与用户滚动守卫（Smart Sticky Bottom）**：全面迁移滚动 API 至 scrollTo/scrollTop；区分消息增量 smooth 触底与流式 content 高频 rAF auto 触底；实现 100px 守卫判定与上滑发送强制吸底，测试增至 122 项全绿（commit: e8e6711）。
- [x] **开发执行模型临时交接记录（2026-09-17）**：因 Google AI Studio 的重复性 “Internal Error” 导致其侧开发流程中断，GPT-5.6 Sol 临时接替 Gemini 3.8 Flash；待 AI Studio 恢复后暂停 GPT-5.6 Sol 的开发任务，由 Gemini 3.8 Flash 继续开发。
- [x] **Task 11**：后端服务骨架与契约基建搭建。
  - [x] **Step 1（三目录划分与双环境测试配置）**：落地 `core/`、`server/` 结构与 tsconfig 路径别名（`@core/*`）；配置 Express 骨架、Vitest 双环境（前端 jsdom / 服务端 node）、Supertest 依赖与服务端运行/构建脚本；同步拓展 `dev-docs/tests.md` 服务端条目。
  - [x] **Step 2（共享契约模块与健康检查接口）**：在 `core/` 落地共享 SSE 协议（chunk / done / error，error 内嵌 ChatError 的 code 与 message）；声明 Task 13 无状态向 Task 14 sessionId 演进路径；实现 `/api/health` 接口及 Supertest 单测（commit: 7e80fd6）。
  - [x] **Step 3（轻量安全防护与环境隔离）**：以 `ALLOWED_ORIGINS` 环境变量驱动精确匹配 CORS 白名单；配置 `.env.example` 与 `.gitignore` 环境/数据隔离规则；补齐允许、拒绝及预检链路测试（commit: 27e719b）。
- [x] **Task 12 Step 1**：服务端 SSE 流式管道、心跳、断点续传声明与中断级联（commit: 1bd0116）。
- [x] **Task 12 Step 2**：GeminiAdapter 服务端承载与 Key 收拢（commit: ef83d78）。
- [x] **Task 12 Step 3**：Mock 降级复用与统一错误透传（commit: c2c2dc6）。
- [x] **Task 13 Step 1**：RemoteChatAdapter 实现与契约测试（commit: cea4ab4）。
- [x] **Task 13 Step 2**：设置面板连接模式适配；默认推荐后端服务、后端模式隐藏浏览器 API Key 并说明由服务端环境变量托管、保留前端直连调试模式及旧设置迁移（commit: b2d3b53）。
- [x] **Task 13 Step 3**：Playground 按连接模式装配 RemoteChatAdapter；默认后端 SSE 流式体验、直连调试保留、Vite 本地 API 代理与 App 集成回归（commit: 01630b4）。
- [x] **Task 13 验收修复**：后端模式隐藏无效 Provider 控件；按连接模式引导鉴权错误；清理本地 Mock 残留文案并补充回归测试（commit: 731c749）。
- [x] **Task 13 开发代理 CORS 验收修复**：移除 Vite 内部 `/api` 代理转发的浏览器 Origin，避免空 CORS 白名单在适配器选择前误报 403；确认空 `GEMINI_API_KEY` 的 APP 流式 Mock 降级可用（commit: d9247a7）。
- [x] **Task 13 空 Key Mock 降级最终验收闭环（2026-09-20 至 2026-09-21）**：
  - 确认服务端 `.env` 的 `GEMINI_API_KEY` 为空，且 `createChatStreamSourceFromEnv` 应选择 `MockChatAdapter`；直接请求 3001 可收到完整 `[Mock 回复]` SSE，排除适配器选择缺陷。
  - 复现浏览器 403/401：携带 `Origin` 经 Vite `/api` 代理时，被空 `ALLOWED_ORIGINS` 的 CORS 中间件在进入 ChatAdapter 前拒绝；在 Vite 内部代理移除 `Origin` 后，带浏览器来源的请求恢复 HTTP 200（功能 commit: d9247a7）。
  - 重启过程中复现 HTTP 500：3000 已有 Vite 时再次运行 `npm run dev`，Vite 自动递增并占用 3001；3000 的 `/api` 随即代理到第二个 Vite，而 Express 后端未运行，形成错误代理链路。
  - 停止误占 3001 的第二个 Vite，并在 3001 正确启动 `npm run server:dev`；最终验证 `localhost:3000 → Vite /api proxy → Express:3001 → MockChatAdapter` 返回 HTTP 200、完整流式 Mock 回复与 Token 统计。
  - 自动化回归保持 20/20 个测试套件、157/157 项用例通过；`npm run lint` 与 `npm run build` 通过。
- [x] **Task 14 Step 1**：定义 `SessionStorage` 会话持久化边界，默认实现每会话单 JSON 文件的 `JsonSessionStorage`；创建会话分配 UUID，消息日志严格仅追加并拒绝重复 ID，同会话并发追加串行化；新增 5 项 Node 单测，回归 21/21 个套件、162/162 项用例通过。
- [x] **Task 14 Step 2**：提供会话创建、读取与归档 API；携带 `sessionId` 的流式请求按完整持久化历史调用模型，并严格追加本轮输入与最终回复；归档仅设置 `archivedAt`、保留物理消息日志并禁止新轮次；新增 4 项服务端集成测试，回归 22/22 个套件、166/166 项用例通过。
- [x] **Task 14 Step 3**：Playground 在服务端模式自动恢复最近活动会话，无可恢复会话时创建并记录新会话 ID；`RemoteChatAdapter` 的会话模式仅提交本轮输入与 `sessionId`；清空对话归档旧会话并切换至新会话，直连调试模式不调用会话 API；新增 3 项前端集成/适配器测试，回归 22/22 个套件、169/169 项用例通过。
- [x] **文档结构迁移 Step 1**：迁移协作规范、DoD 与当前状态（commits: 7ef7560, 0399fb3）。
- [x] **文档结构迁移 Step 2**：迁移路线图、待办、历史与风险台账。
- [x] **文档结构迁移 Step 3**：将测试台账移动至 `dev-docs/tests.md` 并修正相关引用。
- [x] **文档结构迁移 Step 4**：将 ADR-001 至 ADR-009 拆分至 `dev-docs/adr/`。
- [x] **文档结构迁移 Step 5**：将根目录 `AGENTS.md` 重写为文档索引，完成 `dev-docs/` 分层体系。
- [x] **Phase 3 收尾实施与正式结项**：用户裁决①未来部署平台为常驻 VPS（单体同源优先、JSON 文件置于持久磁盘、单实例单写者；实际部署未授权），②前端直连整体移除并清除浏览器 Key，③ Phase 3 正式结项且以 `--strictPort` 缓解风险 12，④本地 `package-lock.json` 纳入 `.gitignore`、未来部署需在受控 Linux/CI 环境生成干净版本。实施提交：ADR-010 与预研更新 `aa51b8f`；AGENTS ADR 索引 `faee1ca`；设置迁移 `d6a5660`；前端直连移除 `b0ad494`；端口修复 `1b5fff4`；lockfile 政策 `76eaaa1`。结项文档与 AGENTS 当前状态在随后两个独立提交中交付。回归 22/22 套件、160/160 用例，lint 与 build 通过。

- [x] **Task 15 Step 2 自动化部分（2026-10-03，完整步骤待实测）**：新增本地 Discord 指定频道回显 Demo、连接事件与内存日志、服务端配置说明和 14 项 Mock 测试；23/23 套件、174/174 用例通过。真实登录、回显、重连、内存观察尚未验收，不代表 Step 2 完成。
- [x] **Task 15 Step 1（2026-10-03）**：用户完成 AlanChatBot 注册、Message Content Intent 与 Guild Install 权限配置、邀请进入 AI CHAT SERVER；确认本地服务端环境已配置，后续真实网关登录通过，操作记录见 research/phase4-discord.md。
- [x] **Task 15 Step 2 完整验收（2026-10-03）**：AlanChatBot 在 AI CHAT SERVER 的 general 频道在线并回显；用户断网约 65 秒后网关 resumed，恢复后回显成功；进程运行超过 10 分钟，堆内存从 29.8 MiB 到 23.4 MiB；SIGTERM 正常退出、重启再次 ready，最终停止测试进程。23/23 套件、174/174 用例、lint、服务端严格类型检查与 build 通过。短测不替代 Task 17 / 18 的长期验证。
- [x] **Task 15 Step 3（2026-10-03）**：用户确认并落档 ADR-011，正式 Bot 独立进程通过同机 Express API 接入，Express 保持会话唯一写入者；衔接 ADR-009 的 workspaces 要求，明确 Task 16 的迁移、频道关联持久化与 Web / Discord 来源隔离。文档链接检查与 23/23 套件、174/174 用例、lint、服务端类型检查、build 通过；本步仅文档，Task 16–18 与 VPS 实施仍未授权。
- [x] **Task 16 Step 1（2026-10-03）**：用户确认文件计划并裁决仅 @Bot 触发；落实 src / server / core / bot 四个 npm workspaces，迁移最小 Demo、保留既有测试路径；实现指定频道直接提及的标准化输入、正式 Bot 入口、typing 刷新 / 清理、安全回复与网关退出中止。新增 25 项 TDD / Mock 测试，25/25 套件、199/199 用例、四包类型检查及 Web / Express / Bot 构建通过；用户确认真实频道普通文字无回复、直接 @Bot 收到入口确认反馈，Ctrl+C 正常停止。未接入 LLM / 会话存储，Step 2–3 与后续任务等待授权。

- [x] **Task 16 Step 2（2026-10-03）**：用户确认计划后接入同机 Express API / SSE；Bot 每轮解析服务器 / 频道关联并只提交本轮输入与 sessionId，等待 done 发送最终回复，错误反馈脱敏、120 秒超时与退出中止、不自动重发聊天 POST。Express 持久化来源元数据与频道 UUID 索引，单实例串行解析、重启恢复、归档切换并保留历史；Playground 拒绝恢复 Discord 来源，兼容旧 Web 会话。新增 21 项测试；26/26 套件、220/220 用例、根与四包类型检查及 Web / Express / Bot 构建通过，台账补齐既有心跳契约的历史漏记。用户截图确认连续直接 @Bot 获得真实对话回复，网关 input handled；前期无回复定位为同名角色提及，改用 Bot 成员提及后通过；Bot 与后端测试进程已停止。长回复分段留给 Step 3，并发队列与冷却留给 Task 17，均未开工。

- [x] **Task 16 Step 3（2026-10-04）**：用户确认计划后实现最终回复分段；每段至多 2000 UTF-16 code units，优先段落 / 换行，硬切避免截断代理对与 CRLF，分段拼接保留全文。首段 reply 原消息、后续 send 同频道，逐段 await、抑制提及，失败或退出停止剩余段、不重发并清理 typing；发送层跳过纯空白段，后端完整日志不变。新增分段 10 项、网关 4 项，27/27 套件、234/234 用例、根与四包类型检查及 Bot 构建通过。真实网关 input handled，Discord REST 元数据验证 3 段（1947 / 1912 / 1856 字符）、首段回复引用、后续频道消息、无提及；测试进程已停止。Task 16 三步完成，Task 17–18 与 VPS 实施仍未授权；跨段 Markdown 围栏重配不在本步范围。
  - 同日补充验收：用户明确确认收到连续多条回复，与 Discord 消息元数据验证一致。

- [x] **Task 17 Step 1（2026-10-04）**：用户确认文件计划后实现单 Bot 进程按服务器 / 频道 FIFO 调度、完整生成及分段发送串行、等待容量（默认三条）与跨频道用户冷却（默认五秒）；超限给抑制提及的可读提示，拒绝不调用后端，失败继续下一任务，退出丢弃等待并中止活动请求。Express 为 Web / Bot Gemini 调用统一滚动请求预算（默认每分钟十次），进入会话写入前检查，上游 RATE_LIMIT 后暂停六十秒，不自动重试；Mock 绕过，配置通过环境变量调整。新增调度 7、预算 4、网关 5、服务端装配 5 项，29/29 套件、255/255 用例、根与四包类型检查及 Bot / Express 构建通过；修复禁用等待时完成发布早于频道释放的边界。用户确认五秒冷却提示，Discord REST 时间关系确认排队请求在长文结束前提交、回复在长文全部发送后；预算 / 上游暂停由 Mock 验证，无人为配额耗尽。测试进程已停止，守卫为进程内本地策略、重启清空，不发现真实 TPM / RPD；Step 2–3、Task 18 与 VPS 实施仍未授权。

- [x] **Task 17 Step 2（2026-10-04）**：用户确认计划后统一 Bot 后端错误分类与固定安全反馈、启动日志脱敏；Discord 发送失败只尝试一次备用频道提示，原错误反馈也失败时不递归重试，部分段失败告知已发送段数并停止剩余段、不重发已发送内容；未知处理异常仍给安全提示，退出取消备用提示、同步 / 异步清理错误保持脱敏。Express 无状态 / 会话模型流缺 done 返回明确 MODEL_ERROR，中途抛错不保存半截助手回复，保留失败用户输入并允许后续请求恢复。新增 17 项测试，30/30 套件、272/272 用例、类型检查及 Bot / Express 构建通过。用户确认后端断开提示且 Bot 在线；恢复后同一 Bot input handled，Discord 元数据确认新非空回复在失败提示之后发送，Bot 未重启；最终测试进程已停止。Discord 权限等错误用 Mock 验证，未改真实 Token / 权限；缺发送权限时不能保证错误提示送达，应用不自动重发但传输歧义仍存在。Step 3、Task 18 与 VPS 实施仍未授权。
