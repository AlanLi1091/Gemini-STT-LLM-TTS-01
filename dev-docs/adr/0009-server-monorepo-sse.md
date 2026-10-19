# ADR-009：Phase 3 服务端架构与代码共享组织（单仓三目录 + SSE 契约通道）

## 背景

领域内核需同时服务 Web 前端与 Node 服务端（Phase 4 扩展至 Discord 机器人）；需在 Monorepo Workspaces 与单仓多目录间权衡；既有 122 项测试需路径零漂移与 100% 稳定运行；持久化引擎须规避原生 C++ 二进制依赖以消除沙箱和本地跨平台编译风险（见 [`../risks.md`](../risks.md) 风险 10）。

## 决策

1. **代码组织结构**：采用单仓三目录（`core/` 领域内核、契约与适配器通用实现；`src/` Web UI 与 RemoteChatAdapter；`server/` Express 服务端、SSE 路由与存储层）。
2. **依赖与编译边界**：`core/` 持独立 tsconfig 确保无 React/DOM/Node 专属全局污染，`src/` 与 `server/` 经 tsconfig path alias（`@core/*`）引用，根 `package.json` 统一管理依赖；触发条件：Phase 4 若产生独立 Bot 运行进程或独立分发单元，升格为 npm workspaces。
3. **测试统一入口**：保持单一 `npm run test`，以 Vitest 双环境（web=jsdom / server=node）覆盖前后端全部用例，既有测试路径与 `dev-docs/tests.md` 台账零漂移。
4. **通信与存储**：确立 SSE（Server-Sent Events）为前后端唯一流式契约通道（包含 chunk / done / error 事件与 ~15s 心跳保活，不支持断点续传）；持久化引擎默认采用无原生依赖的 JSON 文件存储（每会话单文件，遵循 ADR-005 仅追加语义，`data/` 目录进 `.gitignore`），SQLite 降级为部署期可选插件。

## 影响

杜绝跨平台原生依赖故障；前后端适配器实现统一无冗余；以最小侵入性实现全栈服务化演进。

## Phase 4 衔接（2026-10-03）

[ADR-011](0011-discord-process-topology.md)已定案正式 Bot 独立进程经同机 Express API 接入；本 ADR 的 workspaces 触发条件仍有效。Task 16 Step 1 正式引入 Bot 时必须落实迁移，保持统一测试入口与既有语义。Task 15 最小 Demo 为预研入口，本次架构落档不执行迁移；具体文件清单须在该实施步骤前另行提交计划。

## P1-3：错误文案与日志边界（2026-10-12）

- 服务端负责错误脱敏：会话流源、低层 adapter 流源和 Mock 降级路径的 SSE `error.message` 仅使用按 code 固定的安全文案，不下发 SDK / 文件系统的原始 message、stack、URL 或密钥；SSE 事件结构及既有错误码保持不变。
- 存储 / 会话阶段（inspectRequest、appendTurnInputs、appendAssistantResponse）的普通失败使用 `UNKNOWN` +「会话读取或保存失败，请稍后重试。」，不进入 Gemini 分类器；计数与生成阶段才使用模型分类。保存 assistant 失败不发送 done，锁释放、幂等重试 / 回放及 ADR-013 计数降级不变。
- 通用文案：AUTH_ERROR「模型服务鉴权失败，请检查服务端配置。」；RATE_LIMIT「模型请求达到限额，请稍后重试。」；NETWORK_ERROR「网络连接失败，请稍后重试。」；MODEL_ERROR「模型生成失败，请稍后重试。」；UNKNOWN「服务暂时不可用，请稍后重试。」；ABORTED「本次请求已取消。」。
- REQUEST_CONFLICT、CONTEXT_LIMIT、会话不存在 / 已归档、生成超时、未返回完整回复与既有固定配置 / 长度提示保留；后者仅允许精确匹配本地固定字面量。预算拒绝保留既有模板，等待秒数只来自本地预算计算，任意适配器 ChatError 的 message 不能直接透传。
- 错误日志仅包含 stage（storage / count / model）、分类后 code、受枚举约束的 name / errno，以及整数 HTTP status（100–599）；从 ChatError.originalError / 网络 cause 提取白名单元数据，不序列化错误对象。省略 sessionId / requestId，避免非法会话 ID 带入路径；不记录 message、stack、用户输入、模型输出、Token、SDK 原始错误或完整 URL。日志写入失败不得改变流源或锁语义。
- Web 的 HTTP 错误与浏览器传输异常使用固定文案；横幅继续展示服务端安全消息，布局及交互不变。Bot 保持按 code 映射固定反馈，UNKNOWN 对应可读 BACKEND 提示。


## Phase 5 外部搜索与 SSE 扩展目标（2026-10-13）

依据 [ADR-015](0015-external-search-architecture.md)，以下在 Task 20–21 经单独授权后实现；当前共享 TypeScript 契约与源码保持原样。

- Express 编排模型无关 SearchAdapter、独立预算和每日账本；共享契约增加逐轮显式 search 意图，旧请求默认 false。Discord 用户身份由受信 Bot loopback 请求传入，频道 / 来源取持久化 origin，不能由浏览器请求或问题文本伪造。
- ADR-012 请求指纹同时核对正文与 search 模式；完成回放 / 冲突先于搜索与计数预算。扩展不自动授予 Bot 全链路幂等、自动重发或公网来源访问控制。
- done.data 保留 content / usage，扩展可选搜索状态及最多 3 条来源（provider、检索时间、编号、纯文本标题、URL、实际展示的最多 100 码点摘要）；持久化 assistant 使用同一元数据，刷新 / 完成回放还原同一展示。chunk 仍为 delta / accumulated，error 结构、约 15 秒心跳及无断点续传保持。
- 搜索状态区分未请求、成功、降级；失败原因限本地枚举，失败降级成功时来源为空。旧会话缺元数据正常读取且不补写历史，客户端缺字段按无来源展示；具体字段与映射由 Task 20 在共享契约中验证。
- 仅最终成功非空 assistant 一次保存后发送 done；存储失败不发送成功事件。来源摘要 / URL 不拼入后续模型历史；模型本轮只注入编号 / 标题 / 域名 / 摘要，完整 URL 不注入，原始响应 / 外发 query 不额外落盘。
- G2：搜索、解析、账本、来源存储、模型等全部新增错误路径（含 Mock）均经 safeStreamError 固定文案，不向横幅 / Bot 透传供应商原文。搜索降级提示独立于模型正文，K1 空回复不能被提示掩盖；搜索 429 只暂停搜索 60 秒。
- 日志只接受 storage / count / search / model 的受约束阶段和名称 / 原因、合法 HTTP 状态、耗时 / 数量等白名单元数据，不记录 Key、query、正文、stack、错误对象或完整 URL；正常来源链接经 URL 校验后作为元数据展示，不作为错误文本透传。
- 用户取消贯通搜索 / 计数 / 模型，本地等待与锁不受忽略 abort 的上游拖延，迟到结果不发事件、不保存。D12 中断产品语义已定，P1-4 / R3 实施仍另授权；不扩展当前单 Express / 单 JSON 写者拓扑。

## Task 20 Step 1（2026-10-18）

共享请求新增可选search布尔值，缺省false；done承载搜索状态 / 来源 / 固定降级说明，chunk仍仅正文。Discord身份从无Origin的loopback请求经内部选项传入，来源 / 频道取持久化origin，浏览器不能声明可信身份；缺身份降级。准入顺序及Mock实施边界见ADR-015末节。
