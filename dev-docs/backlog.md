# Backlog

所有任务默认未授权。执行任何任务前，须由用户在 `dev-docs/status.md` 指派。

## Phase 3（进行中，未授权项不得开工）

### Task 13：前端 Playground 改连与架构平滑切换

- [x] **Step 2（设置面板适配）**：SettingsModal 扩展连接模式选择（“后端服务（推荐）”与“前端直连调试模式”）；选择后端模式时 API Key 输入区域隐藏或锁定并提示环境变量托管；直连模式去留于 Phase 3 结项时由用户决策。
- [x] **Step 3（集成装配与全量回归）**：在 App.tsx 接入 RemoteChatAdapter 闭环流式体验；确保现有 152 项用例语义零漂移，新增用例同步登记 `dev-docs/tests.md`。
- [x] **验收修复**：后端模式隐藏由服务端决定的 Provider 控件；鉴权错误按连接模式给出可执行指引；清理前端遗留的本地 Mock 文案。
- [x] **开发代理 CORS 验收修复**：Vite 同源 `/api` 代理不再向内部 Express 转发浏览器 Origin，避免空 `ALLOWED_ORIGINS` 在 ChatAdapter 前误返回 403；空 `GEMINI_API_KEY` 时可正常进入服务端 Mock 流式降级。

### Task 14：会话持久化与上下文管理

- [ ] **Step 1（持久化存储层抽象与 JSON 文件引擎）**：定义 `SessionStorage` 接口（遵循 ADR-005 唯一 ID 与严格追加语义）；默认实现 JSON 文件存储引擎（每会话单文件，存 `data/` 目录进 `.gitignore`）；编写存储层单测。
- [ ] **Step 2（会话操作 API 与多轮上下文拼接）**：实现会话获取与创建接口，支持 sessionId 寻址；上下文默认全量历史（截断策略推迟至 Phase 5）；清空对话定案为归档标记语义（Soft Delete / Archived），保持物理日志不可变。
- [ ] **Step 3（前端单会话自动恢复与状态联动）**：Playground 启动时恢复最近会话；清空对话联动后端归档；补充持久化集成测试；前端不做多会话管理 UI（Phase 5 范围）。

## 后续阶段预研（未授权，仅规划）

- [ ] **Phase 3 收尾预研**：部署方案（Cloud Run / VPS，显式声明不阻塞 Phase 3 退出条件）。
- [ ] **Phase 4 预研**：discord.js 选型验证与最小网关 Demo。
- [ ] **Phase 5 预研**：角色数据格式调研（自定义 schema vs Character Card V2）。
- [ ] **消息重发/重生成与分支导航（基于 ADR-005 消息树模型）**（Phase 5）。
- [ ] **Phase 6 预研**：语音链路方案对比（Gemini 原生音频 vs Whisper+TTS；Discord 语音通话直播主入口可行性与端到端延迟验证；Web 麦克风调试通道；直播文字伴随输出承载选型）。
- [ ] **模型动态发现与拉取（提议，未授权）**：支持通过 Gemini API（models.list）动态拉取当前 Key 可用的模型列表，替代硬编码配置。
