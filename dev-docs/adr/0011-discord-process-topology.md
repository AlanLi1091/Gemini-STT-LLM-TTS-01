# ADR-011：Discord 独立网关进程与 Express 单写者

日期：2026-10-03。状态：已接受（用户确认 Task 15 Step 3 计划）。

## 背景与证据

[Task 15 Step 2 预研](../research/phase4-discord.md)确认本地 discord.js 网关可登录、回显，并在用户断网约 65 秒后恢复；正常停止与重新启动通过，超过 10 分钟的内存观察未见堆内存持续增长。这证明独立运行入口可用，不能证明 VPS 资源充足或长期稳定。

现有 Express 已提供会话创建、获取、归档与聊天 SSE API，承载 Gemini 适配器及 JSON 会话存储。[ADR-010](0010-phase3-deployment-and-direct-connect.md)要求会话存储保持单实例、单写者；[ADR-009](0009-server-monorepo-sse.md)要求正式独立 Bot 进程引入时迁移 npm workspaces。

## 决策

1. **进程关系**：正式 Bot 与 Express 独立运行，在同一 VPS 上通过 loopback HTTP API 通信。Bot 建立到 Discord 的出站网关连接；Express 为 Web Playground 与 Bot 提供统一模型和会话服务。正式上线时分别使用 systemd 单元，部署另行授权。
2. **职责与密钥**：Bot 负责 Discord 触发判断、消息标准化、typing、回复与通道限流，只持有 Discord Token 与后端地址；Express 持有 Gemini Key，负责模型调用、上下文加载、会话生命周期和持久化。Bot 不直接装配 GeminiChatAdapter / JsonSessionStorage，不读写会话 data 目录；共享 core 的传输契约和纯领域类型。
3. **通信契约**：复用 `/api/health`、会话 API 与 `POST /api/chat/stream`。Bot 提交本轮 user 输入与 sessionId，消费 chunk / done / error 和心跳；初期仅在收到 done 后发送最终文字，不能把心跳或 chunk 当成完成回复。请求超时、退出时取消上游。SSE 不支持续传；网络中断后不自动重发聊天 POST，避免重复追加输入、调用模型或发送重复回复。失败反馈与重试策略在 Task 17 明确。
4. **频道会话关联**：每个 Discord 频道一个共享会话；用户在该频道中的消息共享上下文，不是每用户私有会话。Express 持久化来源标识、guildId / channelId 与 sessionId 的关联，创建或解析关联须原子化，保证 Bot 重启后恢复同一会话；Bot 仅可缓存关联，不作为唯一来源。归档后由 Express 创建并关联新的活动会话，保留旧日志。现有 API 尚无频道关联能力，须在 Task 16 Step 2 扩展存储与 API 并测试；不在本 ADR 中虚构已实现的端点。
5. **入口隔离与并发**：Discord 会话与 Playground 的最近会话恢复按来源隔离，Web 不得因 Bot 创建会话而恢复到 Discord 频道会话。Bot 在 Task 17 Step 1 实现同频道完整轮次串行排队；Express 单写者及存储追加锁本身不保证完整模型轮次顺序。跨入口不得共享可变会话，实际隔离与并发行为须有测试。
6. **本机通信边界**：生产配置使用显式 loopback 地址，Express 由反向代理承接允许的外部 Web 请求。当前 `server/index.ts` 未显式限定监听地址，CORS 也不是服务间身份认证；监听地址、反向代理与公开 API 访问控制须在独立部署任务落实。本决策不声称现有服务已加固，也不授权公开启动项目服务。
7. **代码组织**：Task 16 Step 1 正式引入独立 Bot 时，先落实 npm workspaces，划分 Web、Express、Bot 与共享 core 的依赖和编译边界，保留根目录统一 test / lint / build 入口和既有测试语义；具体目录迁移清单在该步执行前另交计划。Task 15 的 Demo 保持现有预研入口，不在本次文档步骤中重构代码或引入 workspace 配置。
8. **进程恢复**：Bot 故障可独立重启；Express 不可用时 Bot 给出可读提示，不降级为直接调用 Gemini 或写入 JSON。只运行一个活动 Bot 网关实例和一个 Express 写入实例；同机通信增加的调用链和两个进程的资源开销须在上线前验证。systemd 重启策略、退避、退出清理与长时稳定性分别在 Task 17 / 部署 / Task 18 验收。

## 备选方案与取舍

| 方案 | 优点 | 本次取舍 |
| :--- | :--- | :--- |
| Bot 与 Express 同进程 | 少一层 HTTP，统一启动 | 网关与 Web 生命周期耦合；不采用 |
| 独立 Bot 直接调用模型与文件存储 | 无内部 HTTP 消费逻辑 | 两个进程可能写同一 JSON 会话，违反单写者方向；不采用 |
| 独立 Bot 调用同机 Express | 会话与密钥职责清晰，进程可分别恢复 | 采用；须实现 API 消费、后端不可用处理及资源验收 |

## 实施顺序与退出条件

- Task 15 Step 3：本 ADR、关联文档与 backlog 落档，现有回归通过；本步不启动 Bot 或部署。
- Task 16 Step 1：用户先裁决触发规则；workspace 迁移、正式 Bot 骨架、通道适配与 typing，既有入口回归。
- Task 16 Step 2：Express 的频道关联持久化 / 原子解析 / 来源隔离，Bot 的 API 与 SSE 消费；重启恢复、多轮上下文、归档及入口隔离测试。
- Task 16 Step 3：Discord 最终回复分段；Task 17：轮次排队、冷却、配额守卫、错误及网关稳定性。
- 独立 VPS 部署任务与 Task 18：加固、loopback 和反向代理边界、服务托管、密钥按职责注入、资源与连续在线至少 24 小时验收。

以上为实施约束，不构成后续步骤授权。触发方式与部署授权时机仍待用户裁决；本 ADR 不扩大 Phase 4 至语音或角色功能。
