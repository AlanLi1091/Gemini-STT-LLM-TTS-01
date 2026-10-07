# Backlog

所有任务默认未授权。执行任何任务前，须由用户在 `dev-docs/status.md` 指派。

## Phase 3（已完成，未授权项不得开工）

### Task 13：前端 Playground 改连与架构平滑切换

- [x] **Step 2（设置面板适配）**：SettingsModal 扩展连接模式选择（“后端服务（推荐）”与“前端直连调试模式”）；选择后端模式时 API Key 输入区域隐藏或锁定并提示环境变量托管；直连模式去留于 Phase 3 结项时由用户决策。
- [x] **Step 3（集成装配与全量回归）**：在 App.tsx 接入 RemoteChatAdapter 闭环流式体验；确保现有 152 项用例语义零漂移，新增用例同步登记 `dev-docs/tests.md`。
- [x] **验收修复**：后端模式隐藏由服务端决定的 Provider 控件；鉴权错误按连接模式给出可执行指引；清理前端遗留的本地 Mock 文案。
- [x] **开发代理 CORS 验收修复**：Vite 同源 `/api` 代理不再向内部 Express 转发浏览器 Origin，避免空 `ALLOWED_ORIGINS` 在 ChatAdapter 前误返回 403；空 `GEMINI_API_KEY` 时可正常进入服务端 Mock 流式降级。
- [x] **本地双服务运行验收**：排除重复启动 Vite 自动递增并占用 3001 所造成的代理自循环 500；恢复 3000 Vite + 3001 Express 的正确拓扑，并完成接口及 APP 页面级 Mock 流式验收。

### Task 14：会话持久化与上下文管理

- [x] **Step 1（持久化存储层抽象与 JSON 文件引擎）**：定义 `SessionStorage` 接口（遵循 ADR-005 唯一 ID 与严格追加语义）；默认实现 JSON 文件存储引擎（每会话单文件，存 `data/` 目录进 `.gitignore`）；编写存储层单测。
- [x] **Step 2（会话操作 API 与多轮上下文拼接）**：实现会话获取与创建接口，支持 sessionId 寻址；上下文默认全量历史（截断策略推迟至 Phase 5）；清空对话定案为归档标记语义（Soft Delete / Archived），保持物理日志不可变。
- [x] **Step 3（前端单会话自动恢复与状态联动）**：Playground 启动时恢复最近会话；清空对话联动后端归档；补充持久化集成测试；前端不做多会话管理 UI（Phase 5 范围）。

### Phase 3 收尾实施

- [x] **Step 1（部署与直连决策）**：记录 ADR-010、更新预研与 ADR-006 状态，并登记未授权的 VPS 部署实施项。
- [x] **Step 2（前端直连模式整体移除）**：迁移旧设置、清除浏览器 Key，Playground 仅装配 RemoteChatAdapter；同步测试台账。
- [x] **Step 3（开发端口冲突缓解）**：Vite 开发脚本增加 `--strictPort`，更新风险 12。
- [x] **Step 4（本地 lockfile 政策）**：忽略 `package-lock.json`，在风险 10 固化未来受控环境生成政策。
- [x] **Step 5（Phase 3 正式结项）**：同步路线图、历史、状态及根目录索引，Phase 4 继续等待授权。

## Phase 4（Discord 文字接入，已完成、已结项）

依赖顺序：Task 15 → 16 → 17 → 18；Task 18 Step 1 的 VPS 前置部署已在本轮独立授权并完成（SSH 隧道私有访问）。进程拓扑已由用户确认，以 [ADR-011](adr/0011-discord-process-topology.md)定案为独立 Bot + 同机 Express API，Express 保持会话唯一写入者。触发方式已裁决为指定频道内直接 @Bot；Task 18 Step 1–3均已完成，Phase 4退出条件逐项核对见[路线图](roadmap.md#phase-4-退出条件核对2026-10-06)。

### Task 15：Discord 接入预研与架构定案

- [x] **Step 1（应用注册与 bot 上架）**：用户在 Discord Developer Portal 完成 Application/Bot 创建、开启 Message Content Intent、生成 Token 并邀请 bot 进测试服务器；Token 只进服务端环境变量；产出操作记录。
- [x] **Step 2（discord.js 最小网关 Demo）**：本地最小 bot——登录、监听消息、回显；观察断线重连与内存占用；确认 discord.js v14 与现有 Node 版本兼容；结论写入预研文档。
  - 已完成；23/23 套件、174/174 用例通过，真实登录、回显、约 65 秒断网后的恢复、超过 10 分钟内存观察、正常退出与重启通过，详见 [`research/phase4-discord.md`](research/phase4-discord.md)。
- [x] **Step 3（进程拓扑 ADR-011）**：用户确认独立 Bot + 同机 Express API、Express 会话唯一写入者；ADR 与关联文档已落档，文档链接、23/23 套件与 174/174 用例、类型检查及构建通过；Task 16–18 与部署仍未授权。

### Task 16：Discord 文字对话闭环

- [x] **Step 1（Discord 通道适配层抽象与 workspaces 迁移）**：按 ADR-009 / ADR-011 落实四个 npm workspaces 与依赖 / 编译边界，保留根统一入口；实现指定频道直接 @Bot 触发、消息标准化、正式 bot 骨架与 typing；TDD 与 mock 测试通过。
  - 25/25 套件与 199/199 用例、四包类型检查及 Web / Express / Bot 构建通过；用户确认普通文字无回复、直接 @Bot 收到入口确认反馈，Ctrl+C 正常停止。Step 1 当时尚未接入 LLM 或频道会话，后续接入见 Step 2。
- [x] **Step 2（对话链路接入）**：Bot 经同机 API 消费共享 SSE，提交本轮输入与 sessionId、done 后发送最终回复；Express 扩展按来源 / guildId / channelId 的会话关联持久化与原子解析，复用 SessionStorage；覆盖 Bot 重启恢复、多轮上下文、归档切换与 Playground 恢复的来源隔离，现有 API 不具备的能力须补齐；不自动重发失败聊天 POST。
  - 26/26 套件、220/220 用例、根与四包类型检查、Web / Express / Bot 构建通过；用户截图确认连续直接 @Bot 获得真实对话回复，网关 input handled；测试进程已停止，详见 [`research/phase4-discord.md`](research/phase4-discord.md#8-task-16-step-2后端对话与频道持久化)。
- [x] **Step 3（长消息分段）**：LLM 回复按 Discord 2000 字符上限分段发送；段落切分规则有测试覆盖。
  - 27/27 套件、234/234 用例、根与四包类型检查及 Bot 构建通过；真实频道发出 3 段（1947 / 1912 / 1856 字符），首段回复原消息、后续频道发送且无提及，验收后停止测试进程。

### Task 17：限流与错误处理

- [x] **Step 1（并发与排队）**：同频道请求串行排队、按用户冷却、Gemini 配额守卫；超限给用户可读提示。
  - 29/29 套件、255/255 用例、根与四包类型检查、Bot / Express 构建通过；用户确认五秒冷却提示，Discord 时间关系确认排队请求在长文结束前提交、回复在长文全部发送后；测试进程已停止。
- [x] **Step 2（错误处理与进程韧性）**：Gemini 调用失败 / Discord API 报错时进程不崩、给出可读反馈；错误路径有测试。
  - 30/30 套件、272/272 用例、类型检查及 Bot / Express 构建通过；用户确认后端断开提示且 Bot 在线，后端恢复后同一 Bot 正常发送回复，网关与 Discord 元数据佐证；模拟覆盖 Discord 发送 / 反馈失败、模型流异常和后续恢复，测试进程已停止。
- [x] **Step 3（网关稳定性验证）**：断网/令牌失效/长时间运行下的重连行为验证（本地可模拟），记录已知边界。
  - 30/30 套件、287/287 用例、根与四包类型检查、Bot 构建通过；新增 15 项，覆盖可恢复 / 致命关闭、活动请求、重复事件与假时钟 24 小时 / 100 次恢复的资源清理；真实 SDK 恢复与长期内存不由模拟证明，详见 [`research/phase4-discord.md`](research/phase4-discord.md#12-task-17-step-3网关稳定性验证)。

### Task 18：常驻上线与 Phase 4 结项

- [x] **Step 1（VPS 部署前置）**：执行 VPS 部署线（本轮独立授权的加固、托管、systemd 等项），bot 与 Express 各自 systemd 单元上线；密钥经 `EnvironmentFile` 注入。
  - 私有 loopback + SSH 隧道，无域名 / 公网 HTTP；新内核与非 root 管理入口生效，Bot 真实 ready、Playground 真实回复与会话恢复、一致性备份 / 隔离恢复 / 本机异地副本通过；本机与 Linux 31/31 套件、294/294 用例通过，详见 [`research/phase3-deployment.md`](research/phase3-deployment.md#9-task-18-step-1私有-vps-实施记录)。
- [x] **Step 2（上线验收）**：连续在线 ≥24 小时、重启自恢复、Web Playground 与 bot 同时可用、全量测试回归。
  - 已完成：真实同 boot / 双进程连续 108506 秒（30小时8分），1781 个健康样本；22 次自动恢复合计16.429573秒、最长1.698147秒，符合用户允许的≤5秒口径，有效故障与自动重启0。上线后重启、Web / Discord真实回复和会话恢复、本机 / Linux32/32套件与305/305用例通过；原始证据保留，验收timer与聊天回访已停用，见部署记录第10节。
- [x] **Step 3（Phase 4 正式结项）**：路线图退出条件逐项核对（网关稳定在线 / 文字对话闭环 / 限流与错误处理），同步 `status.md` / `history.md` / `backlog.md` / `tests.md`。
  - 2026-10-06已完成：三项退出条件逐项关联真实与自动化证据，全量32/32测试文件、305/305用例、类型检查与台账映射通过；路线图与阶段文档同步，根AGENTS.md按确认计划独立提交。后续阶段仍未授权。

### 审计修复（2026-10-06 审计产出，未授权，须逐项指派）

依据 [`research/phase4-code-security-audit.md`](research/phase4-code-security-audit.md)；编号与报告一致。

- [ ] **P0-1（第一步完成，第二步未授权）**：会话上下文窗口与 Discord 会话轮换。
  - [x] **Step 1（2026-10-06）**：有限历史轮次 / 输入预算、本地保守估算与边缘精确计数、超时 / 配额降级、历史 system 排除、MAX_TOKENS 提示与超限固定反馈。新增 1 文件 / 28 用例，33/33 文件、355/355 用例、类型检查与三构建通过；完整日志不变，见 [ADR-013](adr/0013-context-window-policy.md)。
  - [ ] **Step 2（未授权）**：Discord 管理员 @Bot /reset 按“归档即重置”单独设计；共享 SessionService / 归档锁、权限与精确命令匹配等待指派。
- [x] **P0-2（2026-10-06 已修复）**：Web 输入 UUID 作为 requestId，失败重试复用输入，已完成回复回放 done / 用量；所有会话请求共用锁并立即拒绝冲突，存储队列防重复输入 / 回复与错序。新增 22 项，32/32 套件、327/327 用例、类型检查与 Web / Express / Bot 构建通过；决策见 [ADR-012](adr/0012-request-idempotency-and-retry.md)。
- [x] **P0-3（2026-10-06 已修复）**：开发脚本默认仅监听 127.0.0.1；实际监听 / 首页 / 隔离 Mock 代理验证 3/3、全量 32/32 套件与 305/305 用例、根与四包类型检查通过；验证进程已停止。
- [ ] **P1（尽快修）**：P1-1 限制会话模式仅接受 user 输入并关闭生产无状态模式；P1-2 服务端上游超时；P1-3 错误分类与原始错误脱敏；P1-4 中断回复持久化语义；P1-5 JSON 存储 fsync / 临时文件清理 / 绑定异常降级；P1-6 Web 启动与清空失败的提示和重试；P1-7 按来源拆分模型预算；P1-8 Linux 环境复核依赖审计口径。
- [ ] **P2（公网暴露 / 多用户前置条件）**：P2-1 API 认证；P2-2 Host 校验与安全响应头；P2-3 服务端会话来源隔离；P2-4 输入规模限制；P2-5 严格 UUID 会话 ID。
- [ ] **P3（可后续）**：报告第 6 节 P3-1 至 P3-13，随相关任务处理或单独排期；另含复核残余 R4（Vite 代理移除 Origin 后的本机简单 POST 面）。
- [ ] **复核残余关联项（未授权）**：R2 随 P1-2 验证会话锁随上游超时释放；R3 并入 P1-4 处理中途失败后的重试与连续 user 消息。

## 后续阶段预研（未授权，仅规划）

- [x] **部署实施（本人私有访问）**：本轮独立授权并随 Task 18 Step 1 完成 VPS 单体部署，采用 SSH 隧道；公网反代 / TLS 不适用于当前私有范围，未来开放公网须另行授权；实施拆解见 [`research/phase3-deployment.md` 第 7 节](research/phase3-deployment.md#7-结论推荐倾向与实施拆解提案)与 [ADR-010](adr/0010-phase3-deployment-and-direct-connect.md)。
- [x] **Phase 3 收尾预研**：部署方案（Cloud Run / VPS，显式声明不阻塞 Phase 3 退出条件）。
- [ ] **Phase 5 预研**：角色数据格式调研（自定义 schema vs Character Card V2）。
- [ ] **消息重发/重生成与分支导航（基于 ADR-005 消息树模型）**（Phase 5）。
- [ ] **Phase 6 预研**：语音链路方案对比（Gemini 原生音频 vs Whisper+TTS；Discord 语音通话直播主入口可行性与端到端延迟验证；Web 麦克风调试通道；直播文字伴随输出承载选型）。
- [ ] **模型动态发现与拉取（提议，未授权）**：支持通过 Gemini API（models.list）动态拉取当前 Key 可用的模型列表，替代硬编码配置。

- [ ] **Bot 请求幂等接入（未授权）**：基于 Discord 消息 ID 设计稳定请求标识；当前 UUID 契约需单独确定映射或扩展，Bot 本轮保留不自动重发和无标识请求兼容。同时处理复核残余 R1：超时 / 取消后下一条撞上 `REQUEST_CONFLICT` 时的可读提示或处理策略。

## 协作工具配置

- [x] **Codex 项目子代理配置（2026-10-06）**：用户确认五角色文件计划与模型分配；新增 code-explorer（GPT-6 Luna / high）、implementer（GPT-6.1 Sol / high）、test-writer（GPT-5.6 Terra / high）、test-runner 与 git-ops（GPT-6 Luna / medium）。配置静态校验 5/5、全量 32/32 套件与 305/305 用例、根与四包类型检查通过；运行时加载尚未实测。审计修复与后续阶段仍未授权。

- [x] **Codex git-ops Tag 规则同步（2026-10-06）**：用户确认四文件计划；每步全部提交及状态收尾推送后，在最后提交上自动创建并推送 annotated tag，版本保持 0.0.1、编号取目标提交累计数；核验分支、tag 对象与 peeled 提交，不覆盖已有 tag。配置 / 七项规则检查、32/32 文件、327/327 用例与类型检查通过。
