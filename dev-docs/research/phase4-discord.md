# Phase 4 Discord 最小网关预研

日期：2026-10-03。当前仅 Task 15 Step 2 获授权；本文件不定案 ADR-011，也不授权 VPS 部署或生产对话接入。

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
- Demo 放在现有 server 目录，是可单独运行的预研入口，不属于定案后的独立 Bot 分发单元；不提前实施 npm workspaces 或进程拓扑决策。
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

真实网关验收后再讨论 Bot 与 Express 的进程关系、运行时版本以及部署资源要求。当前不据 Mock 或本机 Node 兼容性推断 VPS 已满足要求。

实测边界：网络不可用时 SDK 连续发出 reconnecting 与 shard error 日志，恢复后可 resumed；Demo 没有增加自定义重试退避或日志节流，生产韧性与限流留给 Task 17。

运行记录：验收通过 `node --import tsx server/discord-demo.ts` 启动同一入口（规避 tsx CLI 在沙箱内的 IPC 限制）；首次沙箱内无法连接 Discord，经批准在沙箱外真实登录成功。运行命令由终端使用，Token 从本地 .env 加载，未输出。
