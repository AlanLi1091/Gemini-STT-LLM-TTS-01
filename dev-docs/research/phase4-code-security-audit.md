# Phase 4 结项后代码与安全审计报告

- **日期**：2026-10-06
- **审计基线**：`test` 分支 `f98920d`（Phase 4 结项后，工作区干净）
- **审计者**：Opus 5.5（安全审计分工，见 `status.md` 职责交接记录）
- **性质**：只读审计与记录。本报告不授权任何修复；修复项见 `backlog.md`「审计修复」任务组，须用户逐项指派。

## 1. 结论摘要

在当前部署拓扑（Express 仅监听 127.0.0.1:3001、经 SSH 隧道访问、仅本人使用、Bot 仅限单一频道）下，**未发现可被外部直接利用的高危漏洞**，git 历史中亦未发现真实密钥泄露。但存在会影响实际使用的功能缺陷，其中 P0-2 与 P1-1、P1-3 已实测复现。

| 等级 | 含义 | 数量 |
| :--- | :--- | :--- |
| P0 | 现在必须修：影响当前真实使用或可低成本被滥用 | 3 |
| P1 | 尽快修：正确性 / 健壮性缺陷，当前可容忍但会累积问题 | 8 |
| P2 | 开放公网 / 多用户前必须修；当前私有拓扑下可接受 | 5 |
| P3 | 可后续：加固、运维与代码卫生 | 13 |

## 2. 审计范围

**已覆盖**：

- `server/`、`core/`、`bot/`、`src/` 全部非测试源码逐文件阅读。
- `deploy/` 下 systemd 单元、`backup.sh`、`validate-online.sh`、环境变量示例与 `deploy/README.md`。
- `package.json`（根与四个 workspace）、`vite.config.ts`、各 `tsconfig.json`、`.gitignore`、`.env.example`、`index.html`、`metadata.json`。
- `npm audit`（完整与 `--omit=dev` 两种口径）。
- git 全历史中 Gemini Key（`AIza…`）与 Discord Token 形态字符串检索：仅发现测试占位符，无真实密钥。
- 临时脚本对 `createSessionChatStreamSource` 的实测（脚本位于会话临时目录，未进入仓库）。

**未覆盖**（结论不涵盖这些面）：

- VPS 实际配置（sshd、UFW、文件 / 环境文件权限、已安装依赖版本）：仅依据仓库文档描述，未登录核对。
- 测试代码本身的断言有效性。
- 针对运行中服务的动态测试（模糊 / 畸形请求、并发压力）。
- 第三方依赖的源码级审查，以及 VPS 上 Linux lockfile 的实际解析版本。
- `dev-docs/adr/` 与 `dev-docs/research/` 中设计描述与代码的逐条对照。

## 3. P0：现在必须修

### P0-1 会话历史无上限，成本持续增长且最终导致频道永久失败

- **位置**：`server/chat-adapter-stream-source.ts:93`（`adapter.stream(session.messages, …)`）
- **问题**：会话模式下每轮把完整持久化历史发送给 Gemini，没有任何截断、摘要或 token 预算。Discord 频道绑定的会话不会自动轮换（只有被归档才新建）。
- **后果**：每轮 prompt token 线性增长，累计成本近似平方增长；历史超出模型上下文窗口后，该频道的每次请求都会失败，且用户侧无法自行恢复。
- **建议**：按 token / 条数设定上下文窗口（保留最近 N 轮或按预算截断），持久化日志仍保持完整（符合 ADR-005 仅追加约束）；为 Discord 会话提供轮换手段（如管理命令或阈值自动归档）。

### P0-2 重试会重复持久化用户消息（已实测）

- **位置**：`src/hooks/useChat.ts:214-227`（`retryFailedSend`）、`src/adapters/RemoteChatAdapter.ts:121-124`、`server/session-service.ts:36-50`
- **问题**：服务端在调用模型之前就追加了本轮 user 消息。模型失败（如 500 / 网络中断 / 上游 429）后点击重试，前端再次发送 `messages.slice(-1)`，即同一条 user 消息，服务端会再追加一次。
- **实测**：首轮模型抛 500、第二轮成功后，持久化结果为 `user:hi, user:hi, assistant:ok`。
- **后果**：持久上下文被污染（连续重复 user 消息），刷新页面后可见；与 P0-1 叠加放大成本。
- **建议**：重试走"仅重新生成"语义（不追加新输入），或在失败时让服务端标记 / 回收孤立的本轮输入；需与 ADR-005 仅追加约束一并设计（可参考 backlog 中消息树 / 重生成预研）。

### P0-3 本地开发模式下局域网可直接滥用后端

- **位置**：根 `package.json` 的 `dev` 脚本（`vite --host=0.0.0.0`）、`vite.config.ts:184-193`
- **问题**：Vite 开发服务器监听所有网卡，并且其 `/api` 代理会主动移除 `Origin` 头再转发给 Express。
- **后果**：开发机所在局域网（家庭 / 公共 Wi-Fi）内任何人都可访问 `:3000/api/*`，消耗本机 `.env` 中的 Gemini Key，读写会话；代理请求源地址为 127.0.0.1 且无 Origin，可同时绕过 `/api/discord/sessions/resolve` 的"仅本机"检查。
- **建议**：开发脚本默认 `--host=127.0.0.1`，需要局域网调试时显式开启；可考虑代理改为改写而非删除 Origin。

## 4. P1：尽快修

### P1-1 客户端可写入 system / assistant 角色，无状态模式仍开放（已实测）

- **位置**：`server/chat-stream.ts:23-37`、`server/chat-adapter-stream-source.ts:86-92`
- **问题**：请求校验接受 `user` / `assistant` / `system` 三种角色。会话模式下这些消息会被原样持久化；省略 `sessionId` 的无状态模式允许提交任意伪造的完整历史。
- **实测**：提交 `{role:'system', content:'injected'}` 后，持久化日志出现 `system:injected`，并作为系统指令进入后续所有轮次。
- **建议**：会话模式只接受单条 `user` 消息；生产环境关闭无状态模式（或仅测试注入时启用）。

### P1-2 服务端 Gemini 调用无超时

- **位置**：`core/adapters/GeminiChatAdapter.ts:210-221`
- **问题**：只透传客户端 abort 信号，没有服务端超时。Bot 侧有 120 秒超时，Web 侧没有；上游挂起时 SSE 心跳会让连接无限保持。
- **建议**：服务端为每次上游调用设定总超时与首包超时，超时映射为 `NETWORK_ERROR` / `MODEL_ERROR`。

### P1-3 错误误分类与原始错误文本外泄（已实测）

- **位置**：`core/adapters/GeminiChatAdapter.ts:99-107`、`server/chat-adapter-stream-source.ts:125-129`、`src/components/ChatErrorBanner.tsx:41,51`
- **问题**：`classifyGeminiError` 把任何 `TypeError` 视为网络错误；存储层抛出的 `TypeError`（非法会话 ID、损坏的会话文件）因此被报告为 `NETWORK_ERROR`。上游与文件系统的原始 `message`（例如 `ENOSPC … '/var/lib/gemini-chat/<id>.json.tmp'`）原样下发并在 Web 横幅中展示。
- **实测**：`sessionId: '../x'` 返回 `{"code":"NETWORK_ERROR","message":"Invalid session id"}`。
- **建议**：存储 / 会话错误在调用模型前单独捕获并映射；下发给客户端的消息使用固定文案，原始错误只进服务端日志（脱敏）。

### P1-4 中途停止的部分回复只存在于前端

- **位置**：`src/hooks/useChat.ts:144-153`、`server/chat-adapter-stream-source.ts:93-107`
- **问题**：用户停止生成后，前端保留已显示的部分回复；服务端已持久化 user 消息但不保存部分 assistant 回复。服务重启或关闭时中断的请求同理。
- **后果**：刷新后界面与服务端上下文不一致；下一轮模型看不到用户已看到的半截回复，且出现连续 user 消息。
- **建议**：明确产品语义（持久化部分回复并标记中断，或前端在中断时同步移除），并与 P0-2 一起处理孤立输入。

### P1-5 JSON 存储健壮性不足

- **位置**：`server/storage/json-session-storage.ts:113-115, 197-203, 104-105`
- **问题**：
  - 写入后不 `fsync` 文件与目录；VPS 使用 XFS，掉电后可能出现零长度文件，`readSession` 会因 JSON 解析失败让该会话永久不可用。
  - 每次追加都整份读写会话文件，复杂度随历史增长。
  - 写入或重命名失败时遗留 `.tmp` 文件，无清理。
  - Discord 绑定指向的会话文件丢失或损坏时，`resolveDiscordSession` 持续抛错，该频道永久失败，需要人工修复。
- **建议**：写入后 `fsync`（文件 + 目录）；失败清理临时文件；绑定目标异常时可降级为新建会话并记录告警；长期考虑追加式日志或 SQLite。

### P1-6 Web 启动 / 清空失败后界面卡死且无提示

- **位置**：`src/App.tsx:74-80, 104-112`
- **问题**：恢复会话失败时只 `console.error`，`isSessionReady` 保持 false，输入框永久禁用，没有错误横幅或重试入口；"清空对话"在归档成功、新建失败时同样卡住。
- **建议**：显示可读错误并提供重试按钮。

### P1-7 Web 与 Discord 共用全局模型预算

- **位置**：`server/request-budget.ts`、`server/chat-adapter-stream-source.ts:147-150`
- **问题**：`RequestBudget` 是进程级全局 10 次 / 分钟。Discord 只有每用户 5 秒冷却和每频道 3 条排队，多个频道成员持续发言即可占满预算，并在上游 429 后触发 60 秒全局暂停，Web 端一起被锁。
- **建议**：按来源（Web / Discord）或按频道分配子预算，或为本人 Web 保留配额。

### P1-8 依赖审计口径不一致

- **问题**：完整 `npm audit` 报告 `proxy-addr`（express 依赖，严重）与 `source-map-js`（构建期依赖，高危），`--omit=dev` 却报告 0 漏洞。当前代码未启用 `trust proxy`，`proxy-addr` 漏洞不可利用；`source-map-js` 仅用于构建。但 status 中"生产审计 0 漏洞"的结论依赖了可能不完整的口径。
- **建议**：在受控 Linux 发布环境复核 workspace 依赖的审计口径并升级；保持 `trust proxy` 关闭。

## 5. P2：开放公网 / 多用户前必须修

当前私有 loopback + SSH 隧道拓扑下可接受；若未来授权公网暴露、反向代理或多用户，以下项为前置条件。

- **P2-1 所有 API 无身份认证**：安全性完全依赖网络边界；VPS 上任何本地进程或用户都可调用全部接口。
- **P2-2 无 Host 头校验、无安全响应头**：存在 DNS 重绑定面（当前跨源 POST 已被 Origin 白名单拦截，会话 ID 不可枚举，影响有限）；缺 CSP、`X-Frame-Options`、`X-Content-Type-Options`；暴露 `X-Powered-By: Express`。
- **P2-3 会话来源隔离只在前端**：`src/services/sessionApi.ts:42` 拒绝 Discord 会话，但服务端 `GET /api/sessions/:id`、`/archive`、`/api/chat/stream` 对 Web / Discord 会话一视同仁；经 SSH 隧道转发的请求来源同为 127.0.0.1，可通过 `/api/discord/sessions/resolve` 的本机检查（`server/app.ts:83-88`）。
- **P2-4 缺少输入规模限制**：`messages` 数组条数、空数组、空字符串内容、单会话总大小均无上限（仅 `express.json` 默认 100kb）；空 `messages` 可在不追加输入的情况下反复触发生成。
- **P2-5 会话 ID 校验过宽**：`/^[a-zA-Z0-9-]+$/` 允许 `discord-bindings` 等非 UUID 名称（目前读取会因格式校验失败返回 400，未泄露数据），超长 ID 触发 `ENAMETOOLONG` 返回 500。应改为严格 UUID 校验。

## 6. P3：可后续

- **P3-1** 公开仓库 `deploy/README.md` 中写明 VPS 公网 IP，建议改为占位符（仅 SSH 公钥登录，风险低）。
- **P3-2** 管理账号 `gemini-admin` 免密 sudo：本机私钥泄露即等于 root。
- **P3-3** systemd 加固可补充 `MemoryMax`（1G 主机）、`ProtectProc=invisible`、`PrivateDevices`、`SystemCallFilter=@system-service`、`LockPersonality` 等。
- **P3-4** 备份无轮换与磁盘告警；异地副本未加密。
- **P3-5** `server/index.ts:22` 启动失败只打印固定文本，丢失错误码，排障困难（可只打印 `error.code`）。
- **P3-6** `bun.lock` 入库而 `package-lock.json` 被忽略，锁文件策略不一致，`bun.lock` 可能过期误导。
- **P3-7** `GeminiChatAdapter` 每次请求新建 `GoogleGenAI` 实例；模型名硬编码 `gemini-3.8-flash`，不可经环境变量配置。
- **P3-8** 同一会话被并发写入（如两个标签页同时发送）时，两轮 user / assistant 消息会交错持久化。
- **P3-9** 前端根 `tsconfig.json` 未开启 `"strict": true`，`src/` 未经严格类型检查（server / bot 已开启）。
- **P3-10** 开发模式 `StrictMode` 下恢复会话的 effect 执行两次，无最近会话时会多建一个空会话文件。
- **P3-11** 归档会话与空会话只增不减，无清理 / 保留策略。
- **P3-12** 根 `package.json` 的 `server:build` 脚本输出 `dist/server.js`，与部署文档规定的 `.cjs` 构建方式不一致，属过时脚本。
- **P3-13** `Header` 的 `disabled` 未考虑 `!isSessionReady`，会话加载期间"清空对话"仍可点击（当前不致错，状态判断不完整）。

## 7. 已确认无问题的点（供后续审计参考）

- 前端无 `dangerouslySetInnerHTML` / `innerHTML` / `eval`，消息以 React 文本节点渲染，无 XSS 面。
- CORS 中间件精确匹配白名单、拒绝 `Origin: null`、不允许凭证；跨源浏览器请求（含简单请求）均被 403 拦截。
- 静态托管拒绝点文件与路径中以 `.` 开头的段，`/api` 未命中返回 JSON 404，不回落 HTML。
- 会话文件名经正则约束，无路径穿越；写入采用临时文件 + 原子重命名。
- Bot 所有发送均设置 `allowedMentions: { parse: [], repliedUser: false }`，模型输出无法 @everyone / 角色。
- Bot 后端地址强制为无凭据的本机 HTTP；SSE 缓冲有 1 MiB 上限；日志不记录消息正文、Token 或 SDK 原始错误。
- 生产 systemd 以 `NODE_ENV=production` 运行，Express 默认错误处理不输出堆栈；两进程密钥按职责隔离，Bot 无法访问会话目录。
- git 全历史无真实密钥；`.env*`、`data/` 均被忽略。

## 8. 建议修复顺序

1. P0-3（一行脚本改动，成本最低）。
2. P0-2 + P1-4 + P1-1：统一设计"本轮输入 / 重试 / 中断"的持久化语义，一次解决。
3. P0-1：上下文窗口与 Discord 会话轮换。
4. P1-2、P1-3、P1-6：超时与错误路径。
5. P1-5、P1-7、P1-8。
6. P2 在任何公网暴露 / 多用户授权之前作为前置条件整体完成。
7. P3 随相关任务顺手处理或单独排期。

## 9. 修复跟踪

### P0-3（2026-10-06，已修复）

- **授权与改动**：用户单独指派并确认六文件计划；根 `package.json` 的 `dev` 脚本由 `--host=0.0.0.0` 改为 `--host=127.0.0.1`，保留 `--port=3000` 和 `--strictPort`。
- **运行验证（3/3）**：实际执行 `npm run dev`，用 `lsof` 核对所有 3000 监听条目均为 `127.0.0.1:3000`；本机 Playground 首页 HTTP 200；以临时 loopback Mock 后端覆盖 `VITE_API_PROXY_TARGET`，验证 `/api` HTTP 200、响应标识一致且既有 Origin 移除行为保留。临时脚本位于 `/private/tmp/p0-3-dev-validation.cjs`，未进入仓库；验证拥有的 Vite / Mock 进程已停止，3000 无监听。
- **回归**：全量 32/32 套件、305/305 用例与根 / 四个 workspace 类型检查通过；没有新增测试用例，测试台账不变。
- **边界**：此次仅改变默认开发入口；显式传入其他 `--host` 仍可开启局域网调试，须由使用者主动决定。未验证真实模型或浏览器交互，未访问 VPS、真实会话数据或 Discord；P0-1、P0-2 与其他审计项仍待单独授权。本节追加修复状态，第 1–8 节保留原审计基线与发现。

### P0-2（2026-10-06，已修复）

- **授权**：用户确认修订文件计划与 Claude 四项实现补充，增加 ChatErrorBanner 冲突固定提示；决策见 [ADR-012](../adr/0012-request-idempotency-and-retry.md)。
- **实现**：Web 新输入生成稳定 UUID（randomUUID 不可用时用 getRandomValues），会话 POST 携带同一 requestId。服务端复用无回复且仍在末尾的既有输入；先检查已保存回复再检查末尾，完成请求回放单个 done 和用量。标识 / 正文冲突或进行中请求立即拒绝；锁覆盖所有会话请求，finally 释放。存储队列内同时防同请求重复输入与回复，关联回复要求对应末尾输入；旧文件和无标识 Bot 请求保持兼容。
- **证据**：新增 22 项覆盖来源层四种状态、停止后立即发送、旧请求锁、不同会话并行、重启复用 / 回放、存储并发原子防重、HTTP 失败重试与刷新、Web 重试交互和 UUID 替代路径。全量 32/32 文件、327/327 用例、根 / 四包类型检查、Web / Express / Bot 构建通过；台账逐文件逐项匹配 Vitest JSON。
- **边界**：模型 / Discord 使用 Mock，HTTP 和 JSON 存储使用临时隔离数据，未访问 VPS 或现网。锁与写队列仍依赖单 Express / 单存储实例；无标识请求的重发、修复前已有重复日志、部分回复持久化和上下文预算不在本轮范围。停止后上游未退出前立即重发的冲突是已定义行为；后续发送可能留下连续 user 消息，属于 P1-4。

### P0-2 / P0-3 修复复核（2026-10-06，Claude）

- **结论**：两项修复正确，复核通过；未发现需要立即修复的问题，复核未修改代码。
- **范围与证据**：逐行审阅 `583bb84`（P0-3）与 `1bc7e4f..c9908d9`（P0-2）；重跑 6 个相关测试文件 68/68 用例与根 / 四包类型检查通过。全量回归与构建以交付记录为准，未重复执行。
- **补充要点核对**：先查已保存回复再查输入末尾（`inspectRequest`）；会话锁在标识判断前获取，覆盖无标识旧请求与 Bot；`REQUEST_CONFLICT` 固定文案及停止后立即重发测试；存储队列内同请求同角色去重、关联回复须紧随末尾输入。四项均有对应实现与测试。
- **残余项（均不阻塞验收）**：
  - **R1（低，Bot）**：Bot 请求超时 / 取消后，服务端须待上游退出才释放会话锁，同频道队列下一条可能收到 `REQUEST_CONFLICT`，Bot 将其归为通用"后端对话失败"。建议随 Bot 请求幂等接入一并提供可读文案或处理策略。
  - **R2（低，关联 P1-2）**：会话锁释放依赖上游响应 abort；服务端无上游超时期间，若上游挂起且 Web 连接保持，该会话持续返回冲突直至连接关闭。修复 P1-2 时须验证锁随超时释放。
  - **R3（低，归入 P1-4）**：流式中途失败且已显示部分回复时，末条为 assistant，重试按钮可见但不生效；服务端保留无回复输入，后续新消息形成连续 user。非 P0-2 回归。
  - **R4（P3，P0-3 残余）**：Vite 代理仍移除 Origin；开发者浏览器中的恶意页面可向 `127.0.0.1:3000/api` 发起无请求体的简单 POST（最多创建空会话），JSON 请求受预检阻挡。
