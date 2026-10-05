# Phase 4 Discord 最小网关预研

日期：2026-10-03。Task 15 已完成，拓扑见 [ADR-011](../adr/0011-discord-process-topology.md)。Task 16 Step 1 已完成，用户裁决为仅直接 @Bot 触发；本轮 Task 16 Step 2 已完成，自动化与真实频道验收通过。Task 16 Step 3 本轮已完成并通过验收；本轮 Task 17 Step 1 已完成并通过验收；本轮 Task 17 Step 2 已完成并通过验收；Task 17 Step 3 已完成本地模拟验证；Task 18 与 VPS 实施仍未授权。

## 1. Step 1 操作记录

- Application / Bot：AlanChatBot。
- Application ID：1555096017412694066。
- 测试服务器：AI CHAT SERVER；文字频道：general。
- 用户提供的截图确认 Message Content Intent 已开启；Presence / Server Members Intent 关闭。
- Guild Install 启用，scopes 为 bot 与 applications.commands；权限为 View Channels、Send Messages、Read Message History。
- 入服截图确认 bot 已加入测试服务器，离线状态符合尚未启动网关程序的预期。
- 用户已确认本地 .env 配置成功；真实网关登录成功佐证 Token 与 Intent 可用。不读取、展示或记录实际 Token。
- Step 1 条件已满足，随本轮验收文档同步勾选完成。

## 2. 依赖与边界

- 本机 Node：v24.21.0；npm：12.0.2。
- 本次固定安装 discord.js 14.27.0；npm 官方元数据与安装包 engines 声明 Node >=18，本机满足要求。
- [discord.js 14.27.0 文档](https://discord.js.org/docs/packages/discord.js/14.27.0)、[npm 官方元数据](https://registry.npmjs.org/discord.js/14.27.0)。
- 安装结果：新增 21、移除 3、更新 47 个本地依赖包；无受控 lockfile 时 npm 会重新解析现有范围依赖，故本次执行全量回归。按既有政策不提交 package-lock.json。
- npm audit 报告 0 vulnerabilities；npm 提示部分安装脚本被阻止，当前测试和构建已可运行，未放开这些脚本。
- Task 15 实测时 Demo 放在 server 目录，作为预研入口，当时未实施 npm workspaces 或进程拓扑迁移；Task 16 Step 1 已将其迁移到 bot/demo.ts，见第 7 节。
- 仅在指定服务器文字频道回显所有非空的人类消息；忽略机器人、Webhook、私信及其他频道；此行为仅供 Demo 验证，不裁决 Task 16 的 @提及 / 全量监听方式。
- 回复关闭提及解析与回复提醒；超过 2000 UTF-16 code units 时截断并避免残留高代理字符，正式长回复分段留给 Task 16 Step 3。
- 不连接 Gemini、Express 或会话存储，不输出消息原文及 SDK 错误原文；不启动任何公网监听端口。

## 3. 本地操作

1. 在 Discord 的用户设置 → Advanced（高级）开启 Developer Mode（开发者模式）；右键 general 频道 → Copy Channel ID（复制频道 ID）。不要复制频道名称或服务器 ID。
2. 用本地编辑器打开项目根目录被 Git 忽略的 `.env`，保留已有配置，填写 `DISCORD_BOT_TOKEN` 与 `DISCORD_TEST_CHANNEL_ID`。Token 仅保存在本地服务端环境，不使用 VITE_ 前缀、不发送到聊天、不提交仓库。
3. 在项目目录执行 `npm run discord:demo`。日志应出现 ready 与 memory，Discord 成员列表中的 AlanChatBot 应在线。
4. 在 general 发送一条简短测试消息，预期收到 `[回显]` 回复；其他频道和机器人消息不应触发回显。
5. 记录初次 ready 的 rssMiB / heapUsedMiB；运行至少 10 分钟，并重复发送少量测试消息，再记录内存。此短测只能观察初步趋势，不证明长期稳定性。
6. 用户在本地短暂断开网络后恢复，观察 disconnected / reconnecting / resumed 或 shard ready，恢复后再次发送测试消息确认回显。不要为了短测重置真实 Token。
7. Ctrl+C 退出，预期 stopped；随后重新启动，应再次上线。

## 4. 当前验证结果

| 验证项 | 状态与证据 |
| :--- | :--- |
| 全量自动化 | 23/23 套件、174/174 用例通过；新增 Demo 14 项，Discord 网络均 Mock |
| 前端构建 | npm run build 通过 |
| 类型检查 | npm run lint 与 npx tsc -p server/tsconfig.json --noEmit 通过 |
| 缺配置启动 | Token 与频道 ID 显式置空时，仅显示配置指引，退出码 1，无真实网络调用 |
| 真实登录 / 回显 | 登录通过，出现 shard ready 与 ready；用户确认 Bot 在线、收到回显，日志 echo sent |
| 真实断线重连 | 用户断网约 65 秒；出现 reconnecting / shard error 后 resumed shard=0 replayed=1；用户确认恢复后收到回显，日志再次 echo sent |
| 真实内存观察 | 运行超过 10 分钟：初始 RSS 130.4 MiB / heapUsed 29.8 MiB，最后 RSS 19.8 MiB / heapUsed 23.4 MiB；采样堆峰值 30.3 MiB。短测未观察到持续增长，不构成长期稳定性证明 |
| 退出 / 重新启动 | SIGTERM 后 stopped，退出码 0；重启后 shard ready / ready 再次上线；测试结束后再次正常停止 |
| 完整 Step 2 | 本地预研与验收完成，后续生产韧性和长期稳定性验证仍属于 Task 17 / 18 |

现有 Express 集成测试首次在沙箱中因本地监听 EPERM 失败，经批准在沙箱外重跑全部通过。未修改现有测试来绕过环境限制。

## 5. 后续决策输入

真实网关验收已完成，Step 3 采用独立 Bot + 同机 Express API，由 Express 保持会话唯一写入者；理由与备选方案见 ADR-011。Task 16 Step 1 已按 ADR-009 迁移 npm workspaces；Express 的频道关联持久化与 Web / Discord 来源隔离仍待 Step 2 实现。当前不据 Mock、本机 Node 兼容性或短时内存采样推断 VPS 已满足要求。

实测边界：网络不可用时 SDK 连续发出 reconnecting 与 shard error 日志，恢复后可 resumed；Demo 没有增加自定义重试退避或日志节流，生产韧性与限流留给 Task 17。

运行记录：验收通过 `node --import tsx server/discord-demo.ts` 启动同一入口（规避 tsx CLI 在沙箱内的 IPC 限制）；首次沙箱内无法连接 Discord，经批准在沙箱外真实登录成功。运行命令由终端使用，Token 从本地 .env 加载，未输出。

## 6. Step 3 架构落档验证

2026-10-03：ADR-011 与 ADR-009 衔接、后续任务拆解同步完成；本步只改文档。5 个相关文件的本地 Markdown 链接无缺失，git diff --check 通过；现有 23/23 个套件、174/174 项用例全通过，npm run lint、服务端严格类型检查与 npm run build 通过。测试文件与用例未变，tests.md 台账继续保持原基线；本步没有实施 workspaces、频道关联 API 或部署。

## 7. Task 16 Step 1：workspaces 与 @ 触发骨架

文件计划及仅 @Bot 触发已获用户确认。本轮建立 src / server / core / bot 四个 npm workspaces，运行依赖按职责声明，根目录保留 npm run dev / server:dev / build / server:build / test / lint；新增 bot:dev / bot:build，各 workspace 可单独执行类型检查。既有 @core 路径别名与测试路径保留，根统一入口覆盖全部包。

最小 Demo 迁移至 bot/demo.ts，仍使用原有 npm run discord:demo，原 server/test/discord-demo.test.ts 路径保留、导入路径更新。当前手动使用 Node import 启动 Demo 的命令为 node --import tsx bot/demo.ts；上文旧路径是 Task 15 的历史实测记录。

网关骨架以可注入输入解析与处理函数实现 typing（立即发送，处理中每 7 秒刷新，完成 / 停止时清理）、回复提醒抑制、错误日志脱敏、重连事件及退出中止。正式入口 bot/index.ts 仅对配置频道内的直接用户提及触发，清除普通 / 昵称形式的 Bot 提及并保留正文格式；排除机器人、Webhook、私信、其他频道、无正文输入、角色 / 全体提及以及回复产生的隐式提及。Discord 的用户提及集合也须确认包含 Bot，不仅凭文本匹配触发。

Step 1 的处理函数只发送“已收到你的消息。文字对话功能将在下一步接入。”，不回显输入、不调用 Express / Gemini、不访问会话存储。真实模型对话与频道映射属于 Step 2。本步不增加排队或配额策略，留给 Task 17。

启动命令均从项目根目录运行，以保持现有 .env、data 与静态产物位置；复用 DISCORD_BOT_TOKEN 和 DISCORD_TEST_CHANNEL_ID，无需重新生成 Token。运行 npm run bot:dev 或先 bot:build 后 node dist/bot.js；构建产物为 ESM，discord.js / dotenv 保持外部依赖。不要同时运行正式 Bot 和最小回显 Demo，否则测试频道会出现两套行为。

| 验证项 | 结果 |
| :--- | :--- |
| 全量回归 | 25/25 套件、199/199 用例；新增入口 14 项、网关 11 项，先写失败测试再实现 |
| 类型检查 | 根与四个 workspace 的 npm run lint 通过，保留 core 测试的类型检查 |
| 构建 | Web、Express 与 Bot 构建通过；Bot 空配置构建产物启动给出指引、退出码 1 |
| 正式启动 | npm run bot:dev 出现 ready；用户确认普通文字无回复、直接 @Bot 收到入口确认反馈；Ctrl+C 正常停止 |
| 范围 | Step 1 验收完成；Step 2–3 及部署未启动 |

## 8. Task 16 Step 2：后端对话与频道持久化

Bot 每轮先 POST /api/discord/sessions/resolve（guildId / channelId），再 POST /api/chat/stream（sessionId 与本轮 user 输入）。Bot 不保存会话文件、历史或模型密钥；Express 加载完整历史，通过共享适配器输出 SSE。Bot 解析 UTF-8 与 LF / CRLF 帧，忽略心跳和中间 chunk，只在 done 后发送最终回复。缺 done、格式错误、服务端 error、网络错误给固定可读反馈，不自动重发聊天 POST；请求总超时 120 秒，退出或超时取消 fetch / reader 并清理 typing。

Express 为新 Web 会话写 origin.type=web，为频道会话写 origin.type=discord 与 guildId / channelId；旧版无 origin 的记录仍视为 Web。data/discord-bindings.json 关联服务器 / 频道与 UUID。单 Express 存储实例串行执行关联读取、创建、写回，并用临时文件 rename 更新索引；不同频道隔离，新实例恢复同一关联，归档后建立新会话并保留旧日志。关联文件损坏、目标缺失或来源不一致报错，不静默覆盖。该方案仍依赖 ADR-011 的单进程唯一写者，不提供跨进程锁；会话创建后、关联写回前崩溃可能留下未关联的空会话。

Playground 不恢复 Discord 来源的最近会话，转为创建 Web 会话；这是恢复入口的来源隔离，不是会话鉴权。内部解析路由要求无 Origin 且来自本机连接；未来部署时须避免通过公网反向代理开放该路由，当前未实施部署或新增鉴权系统。

项目根目录先运行 npm run server:dev，再运行 npm run bot:dev；复用现有 Token 与频道配置。DISCORD_BACKEND_URL 可选，默认 http://127.0.0.1:3001，仅允许无凭据的本机 HTTP 地址；无需修改已有 .env。后端沿用已有适配器选择规则，有效 Key 使用 Gemini，否则使用 Mock，不在 Bot 内配置模型。

| 验证项 | 结果 |
| :--- | :--- |
| 全量回归 | 26/26 套件、220/220 用例通过；新增 21 项，包含真实本机 HTTP / SSE 的两轮上下文集成 |
| 持久化与隔离 | 并发解析唯一、新存储实例恢复、归档切换、频道隔离、损坏关联报错、Playground 不恢复 Discord 历史均通过 |
| 类型与构建 | 根与四包类型检查、Web / Express / Bot 构建通过 |
| 真实频道 | 用户截图确认连续两条直接 @Bot 获得对话回复；网关记录三次 input handled。前期无回复是同名角色提及（REST 元数据为 1 个 role、0 个 user），直接成员提及后成功；Ctrl+C 后 Bot stopped，后端也已停止 |
| 范围边界 | 长回复分段属于 Step 3；本步超过 2000 字符只发送简短指引，完整回复保留在后端日志；并发排队与冷却属于 Task 17 |

本轮未新增或修改模型版本；截图中的模型自述不是具体模型身份的独立证明。本轮验收证明真实频道触发、后端生成与最终回复链路可用；多轮历史装配、重启关联恢复由自动化验证。测试台账同时补齐已有 SSE 心跳契约条目的历史漏记，实际新增用例仍为 21 项。

## 9. Task 16 Step 3：长回复分段

2026-10-04：用户确认文件计划并指派开发。splitMessage 将最终回复按每段至多 2000 UTF-16 code units 切分：优先窗口内最后一个非空段落边界（LF / CRLF），再选最后一个换行，无合适边界时硬切；不拆开代理对或 CRLF。纯函数保留原始空格和分隔符，拼接全部段可恢复全文，不插入编号、截断提示或代码围栏。跨消息的 Markdown 围栏不做重新配对，显示可能与单条文本不同。

网关仍在 SSE done 后开始发送。第一条非空段回复用户原消息，后续段发送到同一频道；逐段 await，全部禁止自动解析提及与回复提醒。Discord 不接受纯空白消息，发送层跳过纯空白段；有实质内容的段落完整发送。typing 持续至全部发送结束并清理；任何发送失败停止剩余段、不重发，日志保持脱敏；退出后不再提交剩余段，已经提交给 Discord 的请求可能仍完成。后端持久化日志仍保留完整最终回复，不因发送分段改变。此处仅保证单次回复内部顺序，跨请求串行排队属于 Task 17。

| 验证项 | 结果 |
| :--- | :--- |
| 自动化 | 27/27 套件、234/234 用例通过；新增分段 10 项、网关 4 项，替换原过长提示用例 |
| 边界 | 空文本、短文本 / 2000 / 2001、段落优先、换行、CRLF、emoji 代理对与超长完整重组均通过 |
| 发送 | 首段 reply / 后续 send、提及抑制、按序等待、失败停止及 typing 清理、退出停止剩余段、空白回复均通过 |
| 类型与构建 | 根与四包类型检查、Bot 构建通过；本步 Web / Express 代码未改动 |
| 真实频道 | 用户确认收到连续多条回复；网关 input handled；Discord REST 元数据确认 3 段长度为 1947 / 1912 / 1856，均不超过 2000；首段引用用户原消息、后续为频道消息，用户 / 角色提及数为 0；Bot 与后端测试进程已停止 |

## 10. Task 17 Step 1：频道调度、用户冷却与请求预算

2026-10-04：用户确认文件计划后实现。Bot 按 guildId / channelId FIFO 调度，每频道一个活动请求、最多三个等待请求；生成、错误反馈与全部回复分段发送均在活动请求内，轮到请求才开始 typing。不同频道可并行。按 Bot 用户 ID 跨频道冷却五秒，从接纳时计时；冷却 / 队满拒绝不调用后端，不消耗拒绝用户的新冷却。拒绝提示抑制提及，失败释放频道继续下一请求；退出中止活动请求、丢弃等待请求、清理调度状态，不再发送停止提示。

Express 的唯一 Gemini 流源在进入会话写入 / SDK 前占用共享滚动一分钟预算，覆盖 Web / Bot 与有 / 无 sessionId 请求。默认每分钟十次，预算不足返回 RATE_LIMIT SSE，不写入本轮输入。SDK 返回 RATE_LIMIT 后暂停新请求六十秒；到期恢复，不自动重试、不模拟真实上游配额耗尽。已开始的请求不因暂停被中止；预算保守按接纳的请求尝试计数，失败不退还。无有效 Key 的 Mock 不使用该预算。

根目录 .env.example 增加 DISCORD_MAX_PENDING=3、DISCORD_USER_COOLDOWN_MS=5000、GEMINI_REQUESTS_PER_MINUTE=10、GEMINI_RATE_LIMIT_COOLDOWN_MS=60000；现有 .env 无需新增，缺省即使用这些值。Bot 队列 / 冷却可设为零以禁止等待 / 禁用冷却；后端预算和暂停须为正整数；非法配置启动拒绝。测试未读取或输出实际 Token / Key。

此处为单 Bot / Express 进程内本地守卫，重启会清空队列、冷却与预算；不查询账户真实 RPM / TPM / RPD，不承诺消除所有上游限流，也不处理多进程配额同步。仅同频道 Bot 请求串行，Web 的独立会话恢复逻辑不变。队满、跨用户 / 跨频道、预算、上游暂停与退出边界由自动化验证，真实多人验收无需为测试新增账号。

| 验证项 | 结果 |
| :--- | :--- |
| 自动化 | 29/29 套件、255/255 用例；新增调度 7、预算 4、网关 5、服务端装配 5 项 |
| 队列 / 冷却 | FIFO、跨频道并行、冷却到期、队满不消耗冷却、失败继续、退出等待清理、完整分段后下一轮 typing 均通过 |
| 后端预算 | Web 与 Bot 共用预算、拒绝无 SDK / 会话追加、滚动边界、上游限流暂停与恢复、Mock 绕过、已中止请求不消耗均通过 |
| 类型 / 构建 | 根与四包类型检查、Bot 与 Express 构建通过 |
| 真实频道 | 用户确认五秒内连发收到冷却提示；Discord REST 元数据确认排队请求在长文结束前提交、对应回复在长文全部发送后，网关记录 admission failed 与 input handled；测试 Bot / 后端已停止 |

调度器自查补充：禁用等待（maxPending=0）时须先释放频道再向调用者发布完成，避免刚完成后立即提交新请求被误判队满；新增失败测试后修正，最终回归共 255 项。

## 11. Task 17 Step 2：错误反馈与请求恢复

2026-10-04：用户确认计划后执行。Bot 统一后端鉴权 / 限额 / 网络 / 模型 / 中止 / 超时 / 协议错误，以及 Discord 权限、原消息失效、频道不可用、发送失败和未知处理异常。对用户使用固定中文文案，日志仅输出安全类别与固定事件，不透传异常原文、响应原文或堆栈。启动失败也使用固定配置指引。

后端或处理失败先回复原消息，失败后最多尝试一次同频道提示；正常回复发送失败则直接尝试一次频道错误提示，不重发原回复或已发送段落。已发送若干段时告知发送中断与确认的段数，服务端完整回复保持不变；传输失败不能证明 Discord 没有接收消息，不据此承诺绝对无重复。提示再次失败只记安全日志，finally 清理 typing 并释放队列，后续请求继续；退出后不再提交备用提示。缺少发送权限时无法保证提示到达。同步或异步资源清理失败均不泄露原文，监听器仍移除。

Express 的无状态 / 会话流若在 done 前结束，返回 MODEL_ERROR；中途抛错沿用标准 SSE error。会话只保存本轮用户输入与成功 done 的最终助手回复，不保存半截助手内容；失败输入保留原日志语义，后续新请求可继续。Bot 不自动重发聊天 POST、模型调用或失败段落，不增加全局异常吞噬器。重连、令牌失效与长时间稳定性验证仍属于 Step 3。

| 验证项 | 结果 |
| :--- | :--- |
| 自动化 | 30/30 套件、272/272 用例；新增错误分类 4、网关 5、后端客户端 5、服务端无状态流 1、会话恢复 2 项 |
| 反馈 / 清理 | 原消息失效、提示与备用提示均失败、部分段中断、同步清理失败、提示期间退出、后续请求继续与脱敏均通过 |
| 后端 / 会话 | 鉴权 / 网络 / 模型错误分类、HTTP 鉴权、流读取中止取消、缺 done / 中途抛错无半截助手日志并恢复均通过 |
| 类型 / 构建 | 根与四包类型检查、Bot / Express 构建通过 |
| 真实验收 | 用户确认后端未运行时收到连接失败提示且 Bot 在线；启动后端后同一 Bot 记录 input handled，Discord 元数据确认失败提示之后发送了非空回复（30 字符、无提及）；未重启 Bot，最终 Bot / 后端测试进程已停止 |


## 12. Task 17 Step 3：网关稳定性验证

2026-10-04：用户授权本步并确认文件计划；验证采用本地 Client 事件注入与假时钟，所有新增 Discord 网络调用均 Mock，不修改真实 Token、Intent、频道权限或系统网络。真实断网约 65 秒后 resumed 与超过 10 分钟内存观察仍是 Task 15 Demo 的历史证据（第 4 节），本轮未重新进行正式 Bot 真实断网或真实长时在线验收。

### 实现与依据

- 连接日志包含 shardId，恢复日志包含 replayed 数；ShardReady 表示新会话握手成功，ShardResume 表示恢复成功。应用不额外调用 login 或重发聊天 POST，SDK 负责心跳、Resume / Identify 和重连。
- 补齐 4004 / 4010 / 4011 / 4012 / 4013 / 4014 不可恢复关闭码，给固定配置指引并停止；入口已有 onFatal 将退出码设为 1。重复 / 已排入回调仅通知一次，中止活动请求、取消等待、移除应用监听器并清理 typing 和内存采样。
- ClientReady 立即记录 RSS / heapUsed，之后每 30 秒采样；重复 ready 不增加采样定时器，定时器 unref，stop 清理。
- 关闭码依据 [Discord 官方 Gateway 状态码](https://docs.discord.com/developers/topics/opcodes-and-status-codes#gateway-close-event-codes)。本地安装的 @discordjs/ws 在 onClose 对上述六码不重连，其 InvalidSession（协议 opcode 9）分支可 Resume 或重新 Identify；协议 opcode 9 与 discord.js 的 Client invalidated 事件不同，应用仅把后者视为终止信号。

### 验证结果

| 验证项 | 结果及证据范围 |
| :--- | :--- |
| 可恢复断线 | 模拟 1006 / 4000 / 4007 / 4009 → shard error / reconnecting → resume 后可处理下一条消息，login 仅一次；仅验证应用事件处理，不验证 SDK 的实际网络恢复 |
| 活动请求跨重连 | 模拟断线不中止已提交请求，恢复后回复一次，后端处理函数与 login 均仅一次 |
| Token / 配置失效 | 六种致命关闭码分别覆盖活动、排队请求及重复回调；全部中止 / 取消，无后续回复；销毁与 onFatal 各一次，应用监听器恢复到启动前基线，定时器归零 |
| SDK invalidated | 通知一次，停止后新输入不处理，固定安全日志 |
| 重复事件 / 退出 | shard ready 与 resume 均可观测；重复 ready 不增加监听器，停止后捕获的事件回调无日志或致命通知 |
| 长时本地模拟 | 假时钟推进 24 小时，100 次恢复与 100 条输入后监听器保持固定；SDK 原有定时器加一个应用采样定时器，2881 次内存采样（首次 + 2880 个周期）；停止后定时器归零、应用监听器移除且不再采样 |
| 全量回归 | 30/30 套件、287/287 用例；新增 15 项，网关共 42 项；根与四包 npm run lint、Bot 构建通过 |

全量测试首次在沙箱中因本地 listen EPERM 失败，经批准在沙箱外通过；没有修改 HTTP 集成测试规避限制。

### 已知边界

1. 事件注入只验证正式 Bot 对 SDK 事件的响应；不证明真实断网、DNS / TLS 故障或 SDK 重连退避时长。1006 等可恢复关闭交由 SDK，应用不保证恢复时间；网络永久断开会持续不可用，当前无进程级自动重启策略。
2. 假时钟 24 小时不等于真实 24 小时，也不证明 RSS / 堆内存无泄漏；未测实际高负载、Discord 缓存增长、VPS 1 GiB 内存或 OOM。Task 18 的真实连续在线 ≥24 小时及 systemd 重启验收仍未授权。
3. Token 失效需人工修复服务端配置后重启；启动期登录失败使用已有安全指引与退出码 1。未轮换真实 Token，也未验证 Discord 实际撤销传播时间。
4. 网关恢复可能重放 Discord 事件，应用无跨重启消息去重或离线持久队列；发送失败仍遵循 Step 2 不自动重发策略，长断线期间的消息与 REST 送达不保证，断线时后端请求仍受已有 120 秒总超时约束。
5. 日志采样用于本地观察，不包含 Token、消息正文或 SDK 错误原文；尚无日志轮转 / 聚合与生产告警。退出中止客户端请求不保证撤销服务端已持久化输入，沿用现有会话语义。
