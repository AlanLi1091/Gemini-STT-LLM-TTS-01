# Status

## 当前阶段

Phase 3 —— 后端服务化（已完成、已结项）。Phase 4 Task 15 与 Task 16 Step 1 已完成；Task 16 Step 2 已完成：Bot 后端对话、频道持久化与来源隔离通过自动化及真实频道验收。Task 16 Step 3 已完成，Task 16 文字对话三步全部验收通过；Task 17 Step 1 已完成：频道串行、用户冷却及 Gemini 请求预算通过自动化与真实验收；Task 17 Step 2 已完成：错误反馈、流异常与请求恢复通过自动化及真实验收；Task 17 Step 3 已完成本地模拟验证与边界记录，Task 17 三步已完成；Task 18 与 VPS 部署未授权。

## 当前授权

- **授权任务**：Task 17 Step 3 已完成；功能提交 `64d8b12` 已推送至 `origin/test`，本轮授权结束。
- **VPS 现状**：已采购开通（Vultr Seattle、1核1G、Ubuntu 26.04，含 Auto Backup），仅完成开机，未做加固与部署；在加固完成前不得对公网启动任何项目服务。
- **最近功能 commit**：`64d8b12` — `fix(discord): validate gateway stability and bound lifecycle resources`。
- **当前测试基线**：30/30 个测试套件、287/287 项用例通过（`npm run test`）；根与四包 `npm run lint`、本步 Bot 构建通过（Web / Express 无代码变更）；与 [`tests.md`](tests.md) 一致。
- **当前功能验收**：Playground 仅连接后端服务；启动时恢复最近活动会话，无可恢复会话时创建新会话。发送仅提交本轮输入与 `sessionId`，由服务端加载完整上下文；清空对话归档旧会话并切换至新会话。旧版直连设置迁移为后端模式并清除浏览器存储的 Key 字段。

## 下一步计划

等待用户另行指派；下一个待办为 Task 18 Step 1，其 VPS 部署前置须独立授权。Task 18 与 VPS 部署仍未授权。

## 本轮验收与遗留

- **Task 17 Step 3 验收**：30/30 套件、287/287 用例、类型检查、Bot 构建及文档检查通过；新增 15 项事件注入 / 假时钟测试，验证可恢复关闭、六种致命关闭、重复回调、活动请求跨重连与模拟 24 小时 / 100 次恢复下资源清理。补齐致命关闭码、单次退出通知、shard / replayed 日志及 30 秒内存采样。功能提交 `64d8b12` 已推送至 `origin/test`；未启动真实 Bot / 后端测试进程，未修改真实 Token / 网络。模拟不证明真实 SDK 重连或长期内存稳定，真实断网与超过 10 分钟观察仍为 Task 15 Demo 历史证据，边界详见 [第 12 节](research/phase4-discord.md#12-task-17-step-3网关稳定性验证)。

- **Task 17 Step 2 验收**：30/30 套件、272/272 用例、类型检查与 Bot / Express 构建及文档检查通过。用户确认后端未运行时收到连接失败提示、Bot 在线；后端恢复后同一 Bot 记录 input handled，Discord 元数据确认失败提示之后发送非空回复（30 字符、无提及）。Discord 权限 / 消息失效与反馈失败由 Mock 验证，未修改真实 Token 或频道权限。测试进程已停止，完成标记与记录已同步，功能提交 `fab670b` 已推送至 `origin/test`。

- **Task 17 Step 1 验收**：29/29 套件、255/255 用例、根与四包类型检查、Bot / Express 构建及文档检查通过。用户确认五秒冷却提示；Discord REST 时间关系确认请求在长文结束前提交、对应回复在长文全部发送后。模型预算与上游 429 暂停由模拟测试验证，未人为消耗真实上游配额。禁用等待时频道释放顺序边界已修复并通过回归。Bot / 后端已停止，完成标记与记录已同步，功能提交 `374d055` 已推送至 `origin/test`。

- **Task 16 Step 3 验收**：27/27 套件、234/234 用例、根与四包类型检查及 Bot 构建通过；本地文档链接与 diff 检查通过。用户确认收到连续多条回复；网关 input handled，Discord REST 元数据确认 3 段长度 1947 / 1912 / 1856，首段回复原消息、后续为频道消息、无用户 / 角色提及；Bot 与后端已停止，完成标记与记录已同步，功能提交 `0f93dfb` 已推送至 `origin/test`。

- **Task 16 Step 2 验收**：26/26 套件、220/220 用例及类型检查、三项构建通过；用户截图确认连续直接 @Bot 获得对话回复，网关三次 input handled。前期无回复为同名角色提及，直接成员提及后成功。Bot Ctrl+C 后 stopped，后端已停止；完成标记与验收文档已同步，功能提交 `a4103f6` 已推送至 `origin/test`。

- **Task 16 Step 1 验收**：用户确认 general 普通文字无回复、直接 @Bot 收到入口确认消息；正式启动 ready、Ctrl+C stopped。typing 生命周期与过滤 / 错误 / 退出行为有 Mock 测试。当时测试进程已停止，Step 1 只确认收到消息；后端对话由本轮 Step 2 接入。
- **Step 3 架构验收**：ADR-011 落档与本地文档链接检查通过；23/23 套件、174/174 用例、lint、服务端严格类型检查和 build 通过。只改文档，测试台账基线不变。
- **Discord Demo 验收**：AlanChatBot 在线、general 回显、约 65 秒断网后恢复及回显通过；超过 10 分钟内存观察未见堆内存持续增长；SIGTERM 正常退出和再次登录通过。测试进程已停止，详见 [预研记录](research/phase4-discord.md)。
- **既有遗留**：未跟踪文件 `.zcodeignore` 为本轮开始前已有，未改动、未纳入提交；根 AGENTS.md 阶段摘要仍是 Phase 4 未启动，单独修订需另行提议确认。

## 职责交接记录

2026-09-30：分工更新——Phase 4 开发由 GPT-6.1 Sol 承接（写代码主力）；其余分工沿用 2026-09-22 记录。Phase 4 拆解已落档（Task 15–18），各项待授权。

2026-09-22：更新工作流模型分工——架构设计：GLM-5.3；写代码（主力）：GPT-6 Sol；自动化测试编写：GPT-5.6 Terra；跑测试套件/看日志：GPT-6 Luna；代码 review/验代码：GPT-6 Sol，关键处升级至 Opus 5.5；安全审计：Opus 5.5。

2026-09-17 18:39:03 PDT：因 Google AI Studio 持续出现且并非个例的 “Internal Error”，GPT-5.6 Sol 临时接替 Gemini 3.8 Flash 处理开发任务，并完成 Task 11 与 Task 12 的开发。自 Task 13 Step 1 起，为节省额度，开发任务改由 GPT-5.6 Terra 承接；GPT-5.6 Sol 持续负责 AI 自动化验收。待 AI Studio 恢复后，开发执行者再由 Gemini 3.8 Flash 承接。本记录仅描述职责交接，不扩大当前任务授权范围。

## 越权处理

凡不在当前授权范围内的文件改动，一律回滚，并记录到 `dev-docs/risks.md`。
