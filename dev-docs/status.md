# Status

## 当前阶段

Phase 3 —— 后端服务化（已完成、已结项）。Phase 4 Task 15 Step 1–3 已完成：应用注册、最小网关预研与进程拓扑定案；Task 16–18 与 VPS 部署未授权。

## 当前授权

- **授权任务**：本轮 Task 15 Step 3 已完成，架构提交 `a3945a2` 已推送到 `origin/test`；新增 ADR-011、衔接 ADR-009、同步预研 / backlog / history。用户确认独立 Bot + 同机 Express API、Express 会话唯一写入者。本轮授权结束；后续 workspaces、正式 Bot 对话链路与 VPS 实施未授权。
- **VPS 现状**：已采购开通（Vultr Seattle、1核1G、Ubuntu 26.04，含 Auto Backup），仅完成开机，未做加固与部署；在加固完成前不得对公网启动任何项目服务。
- **最近功能 commit**：`1097970` — `feat(discord): add and validate minimal gateway demo`。
- **当前测试基线**：23/23 个测试套件、174/174 项用例通过（`npm run test`）；`npm run lint` 与 `npm run build` 通过；与 [`tests.md`](tests.md) 一致。
- **当前功能验收**：Playground 仅连接后端服务；启动时恢复最近活动会话，无可恢复会话时创建新会话。发送仅提交本轮输入与 `sessionId`，由服务端加载完整上下文；清空对话归档旧会话并切换至新会话。旧版直连设置迁移为后端模式并清除浏览器存储的 Key 字段。

## 下一步计划

等待用户授权 Task 16 Step 1（触发规则裁决、workspaces 迁移与正式 Bot 骨架）。@提及或全量监听仍待用户裁决，执行前须另交文件改动计划；VPS 部署仍须独立授权。

## 本轮验收与遗留

- **Step 3 架构验收**：ADR-011 落档与本地文档链接检查通过；23/23 套件、174/174 用例、lint、服务端严格类型检查和 build 通过。只改文档，测试台账基线不变。
- **Discord Demo 验收**：AlanChatBot 在线、general 回显、约 65 秒断网后恢复及回显通过；超过 10 分钟内存观察未见堆内存持续增长；SIGTERM 正常退出和再次登录通过。测试进程已停止，详见 [预研记录](research/phase4-discord.md)。
- **既有遗留**：未跟踪文件 `.zcodeignore` 为本轮开始前已有，未改动、未纳入提交；根 AGENTS.md 阶段摘要仍是 Phase 4 未启动，单独修订需另行提议确认。

## 职责交接记录

2026-09-30：分工更新——Phase 4 开发由 GPT-6.1 Sol 承接（写代码主力）；其余分工沿用 2026-09-22 记录。Phase 4 拆解已落档（Task 15–18），各项待授权。

2026-09-22：更新工作流模型分工——架构设计：GLM-5.3；写代码（主力）：GPT-6 Sol；自动化测试编写：GPT-5.6 Terra；跑测试套件/看日志：GPT-6 Luna；代码 review/验代码：GPT-6 Sol，关键处升级至 Opus 5.5；安全审计：Opus 5.5。

2026-09-17 18:39:03 PDT：因 Google AI Studio 持续出现且并非个例的 “Internal Error”，GPT-5.6 Sol 临时接替 Gemini 3.8 Flash 处理开发任务，并完成 Task 11 与 Task 12 的开发。自 Task 13 Step 1 起，为节省额度，开发任务改由 GPT-5.6 Terra 承接；GPT-5.6 Sol 持续负责 AI 自动化验收。待 AI Studio 恢复后，开发执行者再由 Gemini 3.8 Flash 承接。本记录仅描述职责交接，不扩大当前任务授权范围。

## 越权处理

凡不在当前授权范围内的文件改动，一律回滚，并记录到 `dev-docs/risks.md`。
