# Task 21 Step 1 GPT 指派提示词（含 V1 子步骤）

2026-10-19 由 Claude 起草、用户确认留档。依据 backlog Task 21 前置与 Step 1、ADR-015 §1 / §2 / §5、ADR-007 / ADR-009 目标契约、审计报告第 7 节及 Task 20 实际代码（基线 `V0.0.2-build.222`）。本文件仅为提示词存档，不构成开工授权；以用户在会话中的实际指派为准。

```text
你是本项目的开发与测试执行方（GPT）。本轮任务：Phase 5 Part 1 Task 21 Step 1（Web Playground 搜索接入与来源展示），其中首个子步骤为修复 V1。本轮不做 Task 21 Step 2（Discord）。

## 0. 启动与流程（严格遵守 AGENTS.md / dev-docs/rules.md）
1. 通读 AGENTS.md、dev-docs/rules.md、dev-docs/status.md，再读：
   - dev-docs/backlog.md 的 Task 21 段（含「Claude Task 20 Step 3 复核前置」）
   - ADR-015 §1（入口与外发告知）、§2（来源过滤与展示）、§5（成功 / 降级 / 持久化与流式目标契约）以及 Task 20 各节修订
   - ADR-007、ADR-009 中 Phase 5 目标契约一节
   - dev-docs/research/phase4-code-security-audit.md 第 7 节（"无 XSS 面"结论）及第 263 行附近"Part 1 引入来源链接后须复核"的说明
   - 现有实现：core/contracts/search.ts、core/contracts/sse.ts、core/chat.ts、src/adapters/RemoteChatAdapter.ts、src/hooks/useChat.ts、src/services/sessionApi.ts、src/components/（MessageList / ChatInput / ChatErrorBanner 等）及 src/test/
2. 先只提交计划：文件清单，加上每个文件一句话说明，并写清下面第 2 节中需要你提出方案的设计点。等我确认后再动手，确认前不得创建或修改任何文件。
3. 按 TDD 实施：先写失败测试，再实现。
4. 单步闭环：全量测试、根目录及四个包的类型检查、三项构建全部通过后，勾选 backlog 的 Task 21 Step 1，并在 Task 21 前置一段注明 V1 已修复；同步 tests.md 台账和 history；然后 commit、push origin test、更新 status.md，再按累计提交数打 annotated tag（V0.0.2-build.<N>）并推送。完成后停止汇报，等待 Claude 复核。

## 1. 子步骤 1：V1 修复（服务端，先做）
- server/search-context.ts 的 CONTROL 正则补上 U+2028（行分隔符）和 U+2029（段分隔符）；JSON.stringify 不会转义这两个字符，现状下它们会原样进入模型资料块并随标题 / 摘要持久化。
- 在 Task 20 Step 3 的注入夹具中补回归：标题和摘要含 U+2028 / U+2029 时，资料块和规范化来源中都不再出现这两个字符，isSearchMetadata 校验仍通过，再次规范化结果不变。
- 只改这一处，不扩大到其他服务端逻辑。

## 2. 子步骤 2：Web Playground 接入（Step 1 主体）
按 ADR-015 已定内容实现；backlog Step 1 原文写于 Task 19 之前，比 ADR 少，交付时请同步修订原文使之与实际验收一致。

1. 触发方式（D02 / D13）
   - 在输入区增加逐轮"联网搜索"开关，默认关闭；发送一轮后是否自动复位请在计划中提出（建议发送后复位为关闭，避免无意外发）。
   - 开关旁提供简短说明：开启后本轮问题会发送给 Tavily 检索，检索来源会随回复保存；不承诺零留存。文案固定、不含费用数字。
   - 开启时请求带 search: true；关闭时不带该字段（服务端缺省为 false）。超过 500 字时在前端提示缩短，不静默截断；服务端仍以自己的校验为准。
   - 失败重试必须复用原 requestId 及原 search 模式（ADR-012 指纹包含正文与模式），不得在重试时因开关状态变化而改变模式。
2. 最终事件与领域流（ADR-007 / ADR-009）
   - 当前 RemoteChatAdapter 把 SSE done 映射为 core 的 ChatChunk（只有 delta / accumulated / usage / done），done.data.search 会被丢弃。请在计划中提出把搜索元数据传到 UI 的方案（例如在 core ChatChunk 的 done 分支增加可选 search 字段，或其他不破坏现有适配器契约的方式），并说明对 MockChatAdapter / GeminiChatAdapter 及既有契约测试的影响。
   - chunk 仍只传正文；来源只在最终 done 后出现，不在流中途显示。
   - 对 done.data.search 在客户端独立做结构校验（复用或对齐 core 的类型与 SEARCH_DEGRADATION_REASONS），校验失败按"无来源"展示，不抛出用户可见的原文。
3. 来源展示（D07 / ADR-015 §2）
   - 在对应 assistant 回复末尾显示"本轮检索来源"，按编号列出：纯文本标题、解析后的真实域名、对应摘要，以及链接。
   - 链接只允许 http / https：客户端必须用 new URL 独立重新校验协议、拒绝用户名密码和控制字符，不信任服务端或持久化数据；校验失败时只显示标题和域名，不渲染为链接。
   - 链接使用 target="_blank" 时必须带 rel="noopener noreferrer"；可见文本显示真实域名，不允许标题伪装成目标地址。
   - 标题、摘要一律作为 React 文本节点渲染，禁止 dangerouslySetInnerHTML、innerHTML、Markdown / HTML 渲染。
4. 降级提示（D11）
   - search.status 为 degraded 时，在该回复上方或下方单独显示固定文案 SEARCH_DEGRADED_NOTICE（来自 core），与模型正文视觉上分开；不把它拼进正文，也不显示 reason 的英文枚举原文（可按枚举映射为固定中文短语，或不显示原因）。
   - not_requested 或字段缺失时不显示任何搜索相关内容。
5. 刷新与回放
   - 页面刷新或恢复会话时，从 /api/sessions/:id 读取的 assistant 消息上的 search 元数据要还原同样的来源 / 降级展示；检查 src/services/sessionApi.ts 的会话校验，确保它不会剥离或因新字段拒绝消息，同时对 search 字段做与第 2 点相同的客户端校验。
   - ADR-012 完成回放（同 requestId 重发）只收到单个 done 时，展示与首次一致。
   - 旧会话没有 search 字段时正常显示，不报错。
6. 中断（D12，仅确认既有行为，不实施 P1-4 / R3）
   - 停止、超时、失败时不显示成功来源；既有"移除未完成临时回复、保留 user 重试"的行为不得改变。若发现与 D12 不一致，只在汇报中列出，不在本步修改。

## 3. 安全复核（审计第 7 节）
- 引入外部链接后，重新核对"前端无 dangerouslySetInnerHTML / innerHTML / eval，消息以 React 文本节点渲染，无 XSS 面"的结论：在汇报中给出 grep 结果与结论。
- 测试夹具至少覆盖：javascript: / data: / vbscript: / 协议相对 / 带凭据 / 含控制字符的 URL（包括直接注入到 done 事件和持久化会话中的篡改数据），含 <script>、<img onerror>、Markdown 链接、@everyone、双向文本控制字符的标题和摘要，超长 URL；断言不生成可点击的危险链接、不执行脚本、文本按原样作为纯文本显示。

## 4. 范围与约束
- 只用 Mock：Web 测试使用 Mock / 本地服务，不调用真实 Tavily、Gemini、Discord，不访问 VPS，不新增 npm 依赖，不改真实 server.env 或部署文件；生产装配继续不接入搜索网络（服务端在没有 searchAdapter 时降级为 unavailable，这是预期行为）。
- 不实施 Task 21 Step 2（Discord /search 解析、Bot 来源段、S2、S3），不实施 P1-4 / R3、Q4，不调查 deployment-validation 偶发失败，不变更版本号，不合入 main，不部署；不提交 .zcodeignore。
- 现有全部用例必须通过（当前基线为 41/41 个文件、651/651 条用例）。ADR-012 幂等 / 重试 / 回放、ADR-013 窗口、K1、P1 系列及 Task 20 全部回归不得退化。交付前连续跑全量测试至少 3 次；如出现失败，记录用例名和错误。

## 5. 交付汇报
- 改动文件清单。
- V1 修复与对应测试。
- 第 2 节各设计点的最终方案（尤其是 done.search 传到 UI 的方式、开关是否复位）。
- 审计第 7 节复核结论及 grep 结果。
- 新增用例数、全量结果及多次运行结果。
- backlog Task 21 Step 1 修订后的原文。
- commit 和 tag。
- 留给 Step 2 / Task 22 的事项，以及需要裁决的问题。
```
