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

- [x] **Task 17 Step 3（2026-10-04）**：用户确认文件计划后完成本地网关稳定性验证；正式网关补齐 shard ready / resume 元数据与每 30 秒 RSS / heapUsed 采样，重连与重复 ready 不增加采样器；补齐六种不可恢复关闭码，重复致命 / 停止后已排入事件回调仅通知一次，停止清理活动、排队、typing、采样器与应用监听器。新增 15 项 Mock / 假时钟测试，覆盖四种可恢复关闭、六种致命关闭、invalidated、活动请求跨重连不重发、24 小时模拟与 100 次恢复；30/30 套件、287/287 用例、根与四包类型检查、Bot 构建通过。未修改真实 Token / 系统网络或启动真实测试服务；真实断网与超过 10 分钟内存观察仍为 Task 15 Demo 历史证据，假时钟不证明真实 SDK 重连或内存无泄漏，已记录已知边界；Task 18 与 VPS 部署仍未授权。

- [x] **Task 18 Step 1 与独立 VPS 部署**：用户确认调整后的计划、无域名 / Playground 仅本人使用；实现 loopback 配置、Express Web 静态托管与正常退出，两个独立非 root systemd 服务和按职责 EnvironmentFile、手动一致性备份及运维文档。VPS 加固为 gemini-admin 公钥管理、禁止 root / 密码 SSH、仅开放 SSH，更新系统与内核至 7.0.0-38 并在上线前重启验证，安装官方校验 Node v24.21.0；Linux 构建保留本机之外生成的 lockfile，未修改仓库忽略政策。新增 7 项，本机 / Linux 31/31 套件、294/294 用例、类型检查与 Linux 三构建通过，生产审计 0 漏洞；修复符号链接影响 Bot 入口守卫的 systemd 路径。两个服务 enabled / active、Bot 真实 ready，SSH 隧道 Web 真实 Gemini 回复与服务备份重启后会话恢复通过；备份隔离解压全文件一致、本机异地副本校验通过。现有本地开发会话未迁移；Linux UI act / 系统 XFS CPUAccounting 警告及首次上线回滚、手动备份边界已记录。服务保持常驻，Step 2 ≥24 小时 / 上线后主机重启 / 双入口消息验收、Step 3 结项未实施。

- [x] **Task 18 Step 2（2026-10-06）**：用户确认文件计划后实现只读在线采集器、每分钟systemd采样与11项判定测试；上线后VPS重启，两应用自动恢复、原会话校验一致，Web新回复与Discord完整会话及用户确认通过。按用户允许的≤5秒自动恢复口径，原始样本与journal独立核对同boot / 两进程真实连续108506秒（30小时8分）、1781健康样本、HTTP与自动重启故障0；22次恢复总16.429573秒、最长1.698147秒，无未配对 / 超时 / 硬错误 / 采样缺口，原13个旧口径失败样本未改写。RSS末72.7 / 峰98.3 MiB，heapUsed末 / 峰23.4 MiB，低流量观察未见失控增长，不证明无泄漏或高负载容量。本机 / Linux32/32套件、305/305用例与类型检查通过，生产脚本单元摘要一致；停用验收timer与聊天回访，保留最终报告、原始journal与samples证据，两应用常驻。Step 3正式结项未启动。

- [x] **Task 18 Step 3 / Phase 4 正式结项（2026-10-06）**：用户指派并确认六文件计划后，逐项核对网关稳定在线、Discord文字对话闭环、限流与错误处理；引用Task 16–17真实频道和Mock证据、Task 18 Step 1私有部署与Step 2原始日志核对的30小时8分真实窗口。路线图补齐退出条件证据与边界，backlog勾选本步，status同步阶段 / 授权 / 测试基线，根AGENTS.md修正过期阶段摘要和ADR索引并单独提交。全量32/32测试文件、305/305用例及根 / 四包类型检查通过，台账逐文件逐用例映射一致，修正一个历史标题漏字；首轮沙箱HTTP监听EPERM后经批准重跑全量通过。未修改应用与测试代码、未改变现网或重复模型 / Discord调用；不把短暂自动恢复解释为网关完全无重连，不承诺高负载容量、无限期无泄漏、长断线消息送达或真实Token撤销已验证。Phase 4正式结项，Phase 5及其他后续任务未授权，等待指派。

- [x] **Codex 项目子代理配置（2026-10-06）**：用户确认文件计划与模型分配后，在 .codex/agents/ 新增五个独立 TOML 配置：code-explorer（gpt-6-luna / high）、implementer（gpt-6.1-sol / high）、test-writer（gpt-5.6-terra / high）、test-runner 和 git-ops（gpt-6-luna / medium）。限定授权与文件归属，由主会话协调计划和验收；仅 git-ops 执行授权 Git 写操作，默认只推 origin/test，不自行改写历史或打 tag。5/5 配置通过 TOML、必填字段、模型 / 推理强度 / 沙箱与授权指令静态校验；首次全量测试受沙箱 listen EPERM 限制，经批准重跑 32/32 套件、305/305 用例通过，根与四包类型检查通过。未修改应用 / 测试代码、根规范、Claude 配置或现网；本次没有实际启动自定义代理，运行时加载与角色执行尚未实测，应用测试台账与基线不变。

- [x] **P0-3 开发服务器默认 loopback（2026-10-06）**：用户单独指派并确认六文件计划，将根开发脚本 `--host=0.0.0.0` 改为 `--host=127.0.0.1`，保留固定 3000 端口与 strictPort。实际启动 `npm run dev`，监听地址、首页 HTTP 200 与隔离 Mock `/api` 代理验证 3/3 通过；验证进程已停止、3000 已释放。全量 32/32 套件、305/305 用例及根 / 四包类型检查通过，无新增用例；backlog 拆分三项 P0 并仅勾选 P0-3，原审计报告追加修复跟踪，风险 / 状态同步。不改变代理 Origin 行为、真实后端或 VPS；P0-1、P0-2 与其余审计项未授权，显式 host 覆盖仍是主动开启局域网访问的选项。

- [x] **P0-2 请求幂等与失败重试（2026-10-06）**：用户确认修订计划与 Claude 四项实现补充后，Web 使用稳定输入 UUID / requestId，模型失败后复用末尾输入，已保存回复优先回放 done / 用量而不重复调用模型或写入；所有会话请求共用立即拒绝的锁，存储串行队列内检查重复输入 / 回复与末尾关联。新增 REQUEST_CONFLICT 与固定 Web 提示、UUID getRandomValues 替代路径、严格的带标识请求校验，并新增 ADR-012。新增 22 项，32/32 文件、327/327 用例、根 / 四包类型检查与 Web / Express / Bot 构建通过，测试台账逐文件逐项匹配 JSON 结果。未修改真实数据或 VPS，模型 / Discord 均 Mock；旧文件 / Bot 请求保持兼容，Bot 幂等仅登记未授权项；P0-1、P1-4 与 P1-1 的其他路径未实施。

- [x] **Codex git-ops Tag 规则同步（2026-10-06）**：用户确认四文件计划后，将 .codex/agents/git-ops.toml 原“仅用户明确要求时打 tag”替换为根规范要求的每步自动交付 tag；必须等待主会话确认状态与全部收尾提交推送完成，使用最后提交、已确定版本 0.0.1 与 rev-list 累计数生成 annotated tag，仅单独推送该 tag，校验远端对象和 peeled 提交。同名不同目标 / 非 annotated tag 停止报告，不移动已推送 tag；Claude / Codex 不并发操作同一工作区。模型 GPT-6 Luna / medium 保留；TOML 与七项规则检查通过、32/32 文件及327/327用例与根 / 四包类型检查通过。仅配置与文档，无应用 / 测试 / 根规范改动，测试台账不变。

- [x] **P0-1 Step 1 有限上下文（2026-10-06）**：用户确认修订方案与 Claude 五项补充后，新增服务端窗口策略 / 纯测试，默认 8192 输入预算、20 历史轮与8192生成上限，保守字节估算 / 边缘计数、独立计数预算 / 超时 / 降级、内存校准上限4；历史 system 在窗口层过滤，core 原合并约定保留，失败重试输入仅一次、回放优先、超限新输入不落盘。SDK Developer countTokens 不支持 systemInstruction 经离线真实 SDK 探针确认（fetch0），采用 contents 计数与系统文本本地加计。MAX_TOKENS 正文提示一次 / 空正文错误且无空助手持久化，Web与Bot固定超限文案。新增ADR-013，配置示例与部署说明、台账 / 风险 / 状态同步；新增1文件28用例，33/33文件、355/355用例、根 / 四包类型检查与三构建通过。未访问现网 / 真实上游 / 数据；P0-1第二步重置未授权，整项保持未完成，其余审计项不扩展。

- [x] **Claude C1审计修复（2026-10-06）**：用户确认十文件计划后，修正P0-1计数前过早硬裁导致实际记忆一两轮的缺陷；候选按轮数保留，先最近8轮取样 / 宽松字节预筛，再按观测比率（可低于1）选择可加回的连续轮次，最多第二次计数核验。保留已验证安全窗口作为失败恢复路径，其他路径本地80%降级；字符估算区分ASCII / CJK / 其他Unicode，C2记忆变短取舍在ADR / 部署说明记录。新增9项，33/33文件364/364用例、类型检查和Web / Express构建通过；夹具8 / 11 / 9轮，模拟利用率87.8% / 88.1% / 92.4%，非线上实测。台账逐文件逐项一致；未访问VPS / 真实上游 / 数据，P0-1第二步仍未授权。

- [x] **C3–C5待办登记（2026-10-06）**：用户确认三文件计划后，在backlog独立登记C3不均匀历史窗口利用率、C4计数与生成频率配置关系、C5优先保留较大已验证安全窗口；三项均为低优先级、未授权、不阻塞当前验收，关联Claude复核报告。同步history / status，仅文档，未实现算法 / 配置 / 告警变更；全量33/33文件、364/364用例通过，测试台账与基线不变。P0-1第二步及后续阶段仍待指派。

- [x] **P0-1 Step 2 Discord会话重置（2026-10-06）**：用户确认文件计划后，增加管理员名单校验、精确 @Bot /reset、队列 / 冷却内权限分流与无模型命令处理；Bot解析后提交明确旧sessionId，服务端核对来源后锁内归档并复用resolve新关联，旧日志 / 其他频道保留、重复目标不归档替代会话。server/index与环境流源共用SessionService，Web归档与生成 / 重置共锁且冲突409；Bot固定冲突和未确认重置失败文案，超时 / 取消 / 迟到解析不自动重发或继续重置。新增ADR-014、管理员示例 / 部署说明与台账同步；新增23项，33/33文件387/387用例、根 / 四包类型检查与三构建通过。模型 / Discord为Mock，本机HTTP / 存储隔离；P0三项代码修复闭环，未部署VPS、未配置真实管理员 / 频道验收，P1 / C3–C5仍未授权。

- **2026-10-07 V0.0.2 VPS部署（正式发布待验收）**：用户确认计划；固定源码9b9a116已切至v002-9b9a116，管理员名单配置、本机 / Linux387/387回归、类型检查与三构建、备份校验、数据切版一致、服务健康和Web真实回复 / 刷新恢复通过。Discord三项验收与PR / tag仍待完成；未扩展P1或Phase 5授权，详见部署记录第11节。

- **2026-10-07 V0.0.2 双入口验收通过**：用户确认Discord普通回复 / 管理员reset / 新会话回复；服务端核对旧会话归档、备份中原8条消息完整、新绑定2条消息，两服务active且NRestarts=0。五份记录提交test，随后按本轮授权PR合并main与annotated tag发布，远端结果由主会话核验汇报；源码未新增改动。

- [x] **Codex git-ops 当前版本号修正（2026-10-09）**：用户确认四文件计划后，将 `.codex/agents/git-ops.toml` 当前 tag 版本号从 0.0.1 改为 0.0.2，与 `dev-docs/rules.md` 已确定版本一致；同步 backlog / status，既有历史记录不改写。TOML 解析与版本断言通过，全量33/33文件387/387用例、根 / 四包类型检查通过；首次沙箱 HTTP 监听受限后经批准重跑通过，无新增测试，测试台账不变。交付推送 origin/test，最终 tag 按累计提交数核验；Phase 5及审计残余仍未授权，既有 `.zcodeignore` 保留。

- [x] **Phase 5 Part 1 任务拆解登记（2026-10-09）**：用户确认 GLM-5.3 提案，将 Part 1 网络搜索拆解为 Task 19（预研与架构定案，含真实探针、裁决清单、ADR-015）、Task 20（服务端实现：接入触发、独立预算超时与 ADR-013 协调、SSRF 与间接提示注入防护）、Task 21（Web / Discord 双入口来源展示与刷屏 / 提及 / 预览抑制）、Task 22（真实验收、VPS 切版与 Part 1 结项）登记至 backlog，同时移除已被覆盖的原 Part 1 预研占位项。仅文档规划：全量33/33文件387/387用例与根 / 四包类型检查通过，无新增测试，测试台账与应用源码不变。所有 Task 19–22 均未授权，须逐个指派；Part 2 / Part 3 预研与 P1 及其余审计项不在本轮范围。

- [x] **Phase 5 Part 1 审计前置登记（2026-10-10）**：Claude 复核 Task 19–22 与审计未修项后，用户确认方式 A：backlog 审计修复组新增「Phase 5 Part 1 前置」分组（P1-1、P1-2 + R2、P1-3、P1-7，均未授权），Phase 5 章节写明依赖顺序及 P1-4 + R3 / P1-8 的定案前裁决、P3-7 / P3-3 / P2-4 视裁决再定；审计报告追加前置复核一节。仅文档，未实施任何修复，测试台账与应用源码不变；对 Task 19–22 正文的审查意见另开一轮处理。

- [x] **P1-1 会话输入与生产无状态边界（2026-10-10）**：用户确认十二文件计划后，HTTP 默认只接受非空 sessionId 与单条非空 user；无标识 Bot 请求同样受限，allowStateless 仅代码显式测试注入，生产入口不启用。会话流源复用校验且移除无状态回退，在锁 / 存储 / 预算 / 模型前拒绝非法输入；共享低层契约与完整历史日志保留。新增7项回归，定向4/4文件65/65用例、全量33/33文件394/394用例、根 / 四包类型检查及 Web / Express / Bot 构建通过，台账同步；既有 React act 警告保留。仅本机隔离 HTTP / 存储与 Mock，上游 / Discord / VPS / 真实 data 未访问；P1-2 + R2、P1-3、P1-7 与 Task 19–22 未授权，既有 .zcodeignore 保留。

- [x] **Claude P1-1 复核与残余登记（2026-10-12）**：Claude 复核 P1-1 修复 `1ea6c50` / `e3267b9` 通过（全量33/33文件394/394用例、根 / 四包类型检查重跑通过），审计报告追加「P1-1 复核」一节；backlog 新增「Claude P1-1复核残余」分组登记 E1（Web 残留无状态分支，可并入 P1-6）、E2（服务端无状态工厂路径残留）、E3（修复前历史注入 assistant 消息），均为低优先级未授权。仅文档，未修改应用 / 测试代码，测试台账不变；P1-2 + R2、P1-3、P1-7 与 Task 19–22 仍未授权。

- [x] **P1-2 / R2 服务端生成超时（2026-10-12）**：用户确认十四文件计划并指派修复、推送test及tag；新增生成守卫，默认首包60秒 / 总90秒，配置正整数 / 相对期限 / 两次计数余量启动校验，Gemini与Mock及低层注入路径共用。next与超时 / 客户端取消竞速，abort合并传入adapter，不等待挂起return；本地流finally解锁，部分 / 迟到assistant不落盘，输入保留且同requestId重试复用，固定MODEL_ERROR且不暂停429预算。同步配置示例 / 运维说明、ADR-012和台账 / 审计 / backlog。新增11项，定向3/3文件49/49用例、全量34/34文件405/405用例、根 / 四包类型检查和三构建通过，台账逐项匹配；HTTP沙箱EPERM后经批准重跑，既有React act警告保留。未访问真实上游 / Discord / VPS / data，未修改Bot120秒期限、计数逻辑或其他审计任务；P1-3 / P1-7与Phase 5仍待指派，Claude复核待完成，既有.zcodeignore保留。

- [x] **Claude P1-2 复核与残余登记（2026-10-12）**：Claude 复核 P1-2 + R2 修复 `137a94b` / `8db43c8` 通过（全量34/34文件405/405用例、根 / 四包类型检查重跑通过），审计报告追加「P1-2 复核」一节；backlog 新增「Claude P1-2复核残余」分组登记 F1（超长回复可能触发90秒总期限）、F2（超时后上游可能仍在计费），R3 关联项补充超时触发路径，均为低优先级未授权。仅文档，未修改应用 / 测试代码，测试台账不变；P1-3、P1-7 与 Task 19–22 仍未授权。


## 2026-10-12：P1-3 错误分类与安全下发修复

- 用户确认二十一文件计划并指派执行；存储 / 会话错误分阶段映射UNKNOWN固定文案，收窄Gemini TypeError网络判定，会话 / 低层 / Mock SSE统一安全文案，计数与生成错误仅记录白名单元数据。
- Web HTTP / 浏览器错误固定文案，横幅布局与Bot业务代码不变；Bot UNKNOWN固定BACKEND反馈与日志已核验。保存assistant失败不发done，锁、幂等、回放、窗口、计数降级、429暂停与超时语义不变；ADR-009补充边界，审计报告、backlog及台账同步。
- 新增1文件40项，35/35文件445/445用例、根 / 四包类型检查、Web / Express / Bot构建通过；首次沙箱HTTP监听EPERM后获准重跑全量通过，台账逐文件 / 标题 / 数量一致。
- 未访问真实Gemini / Discord / VPS / 会话数据，未部署；既有React act警告与未跟踪.zcodeignore保留。待Claude复核；P1-7与其余审计项 / Phase 5任务未授权。Git提交 / tag见本轮status收尾与汇报。

- [x] **Claude P1-3 复核与残余登记（2026-10-12）**：Claude 复核 P1-3 修复 `2826331` / `e51f8be` 通过（全量35/35文件445/445用例、根 / 四包类型检查重跑通过），审计报告追加「P1-3 复核」一节；backlog 新增「Claude P1-3复核残余」分组登记 G1（Node fetch `UND_ERR_*` / TLS 网络故障归为 UNKNOWN 且日志缺 errno）、G2（Web 横幅信任服务端文案，Phase 5 新错误路径须经 `safeStreamError`），均为低优先级未授权。仅文档，未修改应用 / 测试代码，测试台账不变；P1-7 与 Task 19–22 仍未授权。


## 2026-10-12：P1-7 来源保留预算修复

- 用户确认十七文件计划并指派执行；生成总10 / Web保留4 / Discord6、计数总20 / Web保留8 / Discord12，Web可使用全部总额度，所有来源仍受总守卫；同一通用来源预算结构、独立实例、原子准入拒绝不扣额。
- 分组仅按持久化session.origin，旧会话按web，请求体不可伪造；不加单频道上限。模型429全局暂停生成、计数429只全局暂停计数；保留回放、冲突、窗口降级、超时不pause及幂等 / 锁语义；已发生窗口计数不因后续生成拒绝回滚。
- 环境示例与运维说明、ADR-012 / ADR-013、审计证据 / backlog / 测试台账同步；新增1文件17项，定向4/4文件80/80用例、全量36/36文件462/462用例、根 / 四包类型检查及三构建通过，台账逐项一致。沙箱HTTP监听EPERM后获准重跑全量通过。
- 前置四项代码修复完成，待Claude复核P1-7，Task19及其余项未授权；未访问真实Gemini / Discord / VPS / 会话数据，未查询真实账户配额，未部署；既有.zcodeignore保留。账户级429仍可能暂停Web，为已确认策略边界；Git提交与tag见status收尾及本轮汇报。

- [x] **Claude P1-7 复核与残余登记（2026-10-12）**：Claude 复核 P1-7 修复 `e762790` / `261b829` 通过（全量36/36文件462/462用例、根 / 四包类型检查重跑通过），审计报告追加「P1-7 复核」一节；backlog 新增「Claude P1-7复核残余」分组登记 H1（Discord 触发的计数 429 缩短 Web 记忆）、H2（保留额度比例未校验，属 C4 延伸）、H3（生成额度耗尽前仍先计数，Task 20 须先判定搜索预算），均为低优先级未授权。Phase 5 Part 1 前置四项均已完成并经复核。仅文档，未修改应用 / 测试代码，测试台账不变；Task 19–22 仍未授权。


## 2026-10-12：P1前置四项私有VPS部署完成

- 用户指派部署VPS并确认六份文档 / VPS文件计划；固定已复核源码6f81048（来源tag V0.0.2-build.174），新发行物v002-6f81048，版本仍0.0.2；P1-1 / P1-2 + R2 / P1-3 / P1-7已部署。
- 本机 / Linux各36/36文件462/462用例、根 / 四包类型检查及三构建通过，Linux复用现网lockfile，生产审计0漏洞。构建时旧服务运行，停两服务后一致性备份、5文件隔离恢复 / 切版启动前后SHA一致，本机受保护备份副本校验通过。
- 备份server.env后写入生成10 / 保留4、计数20 / 保留8与首包60秒 / 总90秒，其他配置 / 密钥保留；原子切current，先Express后Bot，active / enabled、ready、NRestarts=0，仅loopback监听；保留旧发行物和配置用于回滚，原会话日志与绑定不回滚。
- Web真实回复“P1部署成功”（193 total tokens）、刷新恢复通过；用户确认Discord正常，服务端成功处理1次 / 失败0，新活动会话user / assistant各1条，所有旧消息逐项保留。无sessionId400和../x固定存储UNKNOWN探针通过；没有强制真实429 / 超时或新增自动监控。
- 部署 / backlog / 台账 / 运维记录同步，交付提交和tag见status收尾。没有合并或推送main；Task19及其余残余仍未授权，既有.zcodeignore保留；服务保持常驻。本次是上线冒烟，不宣称新版本已有24小时在线验收。

- [x] **Task 19–22 正文修订（2026-10-12）**：用户确认 Claude 修订计划，依据此前对 GLM-5.3 拆解的 29 条审查意见（第 6 / 8 / 19 / 23 / 24 条因依赖顺序已登记、P1-1 / P1-2 / P1-3 修复或 status 已补记不再需要）及残余 G2 / H3 / F1，在 backlog Phase 5 章节补充：Task 19 探针费用确认与模型 / 条款 / 用量 / 链接核实、来源持久化与上下文 / 引用形式 / 命令共存 / Discord 额度 / 生成期限等裁决项、ADR-007 / 009 契约与 risks.md 同步；Task 20 来源持久化与回放、Mock 与中止传递、基于 SourceRequestBudget 的搜索预算与先判定、校准与密钥隔离、可选 systemd 私网阻断；Task 21 Web 协议白名单与 XSS 复核、Discord Markdown 转义 / 预览抑制 / 长度限制 / typing；Task 22 注入验收边界、真实耗时与部署配置 / 版本裁决。仅文档，未开工任何 Task，测试台账与应用源码不变。

## 2026-10-12：Phase 5 Task 19 Step 1 网络搜索预研

- 用户单独指派Step1并确认四文件计划及真实探针费用；新增research/phase5-search.md，对比Gemini grounding / Tavily / Brave，核查模型、价格、建议展示与留存条款、SDK / ADR-013边界。
- 真实Key列表62模型、目标3.8 Flash可用，count=55；仅两次生成，无搜索对照MALFORMED_FUNCTION_CALL无正文，grounding STOP / 1条查询 / 3条HTTPS跳转来源、长度187 / 203 / 199，首正文6657ms / 总7399ms，末chunk来源及4600字符建议HTML。工具 / 思考token字段缺失，不推断为0，不做有效对照差值。响应估算约$0.014585（1次查询收费假设），实际账单未知。
- 真实SDK离线3/3检查、全量36/36文件462/462用例、根 / 四包类型检查通过；沙箱首次HTTP监听EPERM、获准外部重跑通过。只改research / backlog / history / status，应用 / 配置 / 测试台账不变；未访问VPS / Discord / 真实会话，未调用第三方搜索。
- Step1已勾选；Step2 / 3和Task20–22未授权。既有.zcodeignore保留，按规范提交推送origin/test并在状态收尾后打V0.0.2 annotated tag，最终编号见主会话汇报。

- [x] **Claude Task 19 Step 1 审核登记（2026-10-12）**：Claude 审核 Task 19 Step 1 预研 `4ab1344` / `6d5d4aa` 通过（重算临时探针 / 结果 SHA256 一致，结果无 Key，真实调用与费用边界符合确认计划）。backlog 新增「Claude Task 19 Step 1审核发现」登记 K1（非 MAX_TOKENS 空正文被保存为空 assistant、Web 空气泡、Bot 静默不回复，建议 Task 20 前修复，未授权）；L1（Discord 可见性 / 留存与条款冲突，先裁决是否开放 Discord 搜索）、L2（延迟样本不代表生产）、L3（Interactions API 迁移风险）并入 Task 19 Step 2 裁决输入；审计报告与预研报告追加审核记录。仅文档，未修改应用 / 测试代码，测试台账不变。

## 2026-10-12：Part A K1空模型正文修复

- 用户单独指派Part A并确认13文件计划；Gemini send / stream统一拒绝空白正文，固定MODEL_ERROR「模型未返回有效正文，请稍后重新提问。」；MAX_TOKENS专用提示及有正文截断不变。会话 / 非会话流源增加纵深检查，不保存新空assistant、不发done、不校准失败空回复。
- fixedHints精确白名单及finishReason枚举日志已覆盖；其他adapter空done、锁释放、已存user保留、同requestId重试 / 成功回放、生成预算不pause与Bot固定可读反馈通过。历史空assistant不改写、不额外跳过窗口、已有回放保持；旧空回复回放仍可空气泡 / Bot静默。
- 新增9项，定向4/4文件151/151用例，全量36/36文件471/471用例、根 / 四包类型检查、Web / Express / Bot构建通过；先复现7失败再实现，台账逐项同步。只用Mock / 隔离临时JSON，未访问真实Gemini / Discord / 会话 / VPS、未部署。
- 同步ADR-013 / 审计证据 / tests / backlog / history / status，K1已勾选，待Claude复核。origin/test提交及状态收尾后annotated tag V0.0.2-build.<累计数>见主会话汇报；既有.zcodeignore保留。Part B须用户明确说「继续 Part B」，未开始任何后续任务。
