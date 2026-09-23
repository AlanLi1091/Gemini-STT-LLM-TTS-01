# 项目路线图

## 项目愿景

- **最终形态**：一个支持角色扮演的聊天机器人：
  - 以 Discord Bot 为主要交互入口（文字 + 语音 STT→LLM→TTS 链路）。
  - 模型后端可插拔（Gemini / 其他 LLM），统一通过 ChatAdapter 接口接入。
  - 内置角色扮演系统（人设配置、上下文与记忆管理）。
  - 保留 Web Playground 作为长期调试与演示控制台。
- **使用场景（直播伴随）**：直播画面以主播自身内容为主（如游戏画面）；主播通过 Discord 语音通话唤醒 STT→LLM→TTS 全链路，bot 语音播给所有参与/观看直播的人；Discord 文字聊天仅启用 LLM 对话。直播时文字与语音同时需要，文字承载方式（Discord 频道 / 画面 Overlay / 其他）待 Phase 6 预研确定。
- **演进路径**：Web Mock MVP → LLM 接入 → 后端服务化 → Discord 文字接入 → 角色扮演系统 → 语音链路 → 多模型完善。
- **远期方向（纯愿景，不进入 Phase 路线图，不构成执行授权）**：bot 角色三阶段演进——①语音助手（回应主播）；②直播伴侣（回复观众弹幕/评论）；③自主行为能力（对直播画面发表看法）。仅作为 Phase 5 之后架构决策的参考坐标。
- **约束声明**：愿景仅用于技术决策对齐（接口预留、目录结构等），不构成任何执行授权（见 `dev-docs/rules.md` 铁律 3）。

## 产品设计（Phase 1 范围）

- **定位**：Web Playground —— 长期保留的调试与演示控制台，不是一次性原型。
- **MVP 核心功能**：
  - 对话消息流展示（用户/机器人消息气泡区隔、时间与角色标识）。
  - 消息输入与快捷交互（文本框、发送按钮、Enter 快捷发送、空白防误触）。
  - 本地 Mock 响应机制（模拟思考延时 Loading 与自动应答）。
  - 基础体验优化（平滑滚动触底、响应式布局）。

## 分阶段路线图

| Phase | 目标 | 退出条件 |
| :--- | :--- | :--- |
| **1** | Web Playground MVP（纯前端 Mock） | Task 1–5 完成，Mock 闭环可用，测试全绿（已完成）。 |
| **2** | LLM 接入 | ChatAdapter 接口（含流式签名）落地；Gemini adapter 流式/非流式通过测试；Playground 可切换真实模型；用量记录可见（已结项）。 |
| **3** | 后端服务化（已完成） | Task 11–14 完成：Node.js 服务承载领域内核；Playground 改连后端且原有测试语义零漂移；会话 JSON 文件持久化；密钥收拢至服务端环境变量。收尾实施与正式结项完成。 |
| **4** | Discord 文字接入 | discord.js 网关稳定在线；文字对话闭环；限流与错误处理。 |
| **5** | 角色扮演系统 | 角色配置（人设 Prompt / 开场白 / 记忆）可用；Character Card 兼容评估完成。 |
| **6** | 语音链路 | STT→LLM→TTS 流式管道打通；主入口为 Discord 语音通话（直播场景），Web 麦克风保留为调试通道；直播场景文字+语音伴随输出可用（承载方式以预研结论为准）。 |
| **7** | 多模型完善 | ≥2 个真实 provider 可切换，配置化选择。 |

## 技术架构规划

- **技术栈**：React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + Motion。
- **测试框架**：Vitest + @testing-library/react + jsdom（TDD / 改动必测）。
- **分层原则**：
  - **领域内核**（纯 TS，无 React、无浏览器 API 依赖）：消息模型、会话状态、适配器调用。
  - **UI 层**：React Hook 仅做内核与视图的绑定。
  - **适配层**：ChatAdapter（Phase 2 起）；后续 Transcriber / Synthesizer（Phase 6）。
- **版本控制**：细粒度语义化 commit；`git status` 同时作为越权审计手段。
- **开发与执行环境**：编码、测试与提交由 Google AI Studio 中的 Gemini agent 执行（沙箱限制见 `dev-docs/risks.md` 风险 7）；跨会话不保留对话记忆，状态恢复完全依赖项目文档；计划审批与结果验收由用户负责。
