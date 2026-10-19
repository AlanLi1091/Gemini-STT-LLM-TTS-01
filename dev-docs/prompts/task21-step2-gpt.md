# Task 21 Step 2 GPT 指派提示词（含 W1 / W2 子步骤）

2026-10-19 由 Claude 起草、用户确认留档。依据 backlog Task 21 Step 1 复核前置与 Step 2、ADR-015 §1 / §2 / §4 / §5、ADR-014、research/phase5-search.md D02 / D08 / D13 及 Bot 现有代码（基线 `V0.0.2-build.228`）。本文件仅为提示词存档，不构成开工授权；以用户在会话中的实际指派为准。

```text
你是本项目的开发与测试执行方（GPT）。本轮任务：Phase 5 Part 1 Task 21 Step 2（Discord 搜索接入与来源展示），其中首个子步骤为修复 W1 / W2。

## 0. 启动与流程（严格遵守 AGENTS.md / dev-docs/rules.md）
1. 通读 AGENTS.md、dev-docs/rules.md、dev-docs/status.md，再读：
   - dev-docs/backlog.md 的 Task 21 段（含「Claude Task 21 Step 1 复核前置」中的 W1 / W2 与 D12 说明、Step 2 条目）
   - ADR-015 §1（入口与命令共存、外发告知）、§2（Discord 展示）、§4（可信身份）、§5（降级与错误）；ADR-014（/reset）；research/phase5-search.md 第 10.4 节 D02 / D08 / D13
   - 现有实现：bot/index.ts（createBotInputHandler，/reset 精确匹配在第 34 行）、bot/message-entry.ts、bot/backend-client.ts（chat 的 SSE 解析、errorKind / errorMessage）、bot/gateway.ts（分段发送、typing、allowedMentions）、bot/split-message.ts、bot/errors.ts、core/contracts/sse.ts、server/app.ts 的 trustedDiscordUser，以及 bot/test/
2. 先只提交计划：文件清单，加上每个文件一句话说明，并写清下面标注"请在计划中提出"的设计点。等我确认后再动手，确认前不得创建或修改任何文件。
3. 按 TDD 实施：先写失败测试，再实现。
4. 单步闭环：全量测试、根目录及四个包的类型检查、三项构建全部通过后，勾选 backlog 的 Task 21 Step 2，并在 Step 1 复核前置一段注明 W1 / W2 已修复；同步 tests.md 台账和 history；然后 commit、push origin test、更新 status.md，再按累计提交数打 annotated tag（V0.0.2-build.<N>）并推送。完成后停止汇报，等待 Claude 复核。

## 1. 子步骤 1：W1 / W2（Web，先做）
- W1：SEARCH_DEGRADED_NOTICE 的文案是"本轮未完成联网检索，以下回复未使用实时搜索。"，但目前 SearchSources 把它渲染在正文之后。固定文案不改，把降级提示移到 MessageList 中正文之前（成功来源列表仍在正文之后），并补检查渲染顺序的回归。
- W2：src/adapters/RemoteChatAdapter.ts 的无状态分支也会发送 search: true，而服务端要求 search: true 必须带 sessionId，导致整个请求被判为无效。改为只在会话模式下发送，并补回归。
- 只改这两处。

## 2. 子步骤 2：Discord /search 解析（D02，bot/index.ts）
- 判断顺序：先按 ADR-014 判断精确的 /reset（去掉提及后的正文 trim 后等于 "/reset"），行为不变；/reset xxx 仍按普通对话处理，不扩展重置。
- 正文以 "/search" 开头、紧跟空白和非空问题时，按搜索请求处理，外发的问题是去掉 "/search" 和前导空白后的部分。"/search /reset" 是一个以 "/reset" 为内容的搜索问题。"/searchxyz" 这类没有空白分隔的写法按普通文本处理。
- 只有 "/search"（或后面只有空白）时：回复固定提示，要求补充问题，并简短说明用法和外发告知（D13：问题会发送给 Tavily 检索；回答和来源对频道成员可见，并由 Discord 保存）。不发送任何后端请求，不消耗搜索、生成或计数额度。
- S2：问题超过 500 个 Unicode 码点时，在 Bot 本地直接回复固定提示"联网搜索问题最多 500 个字符，请缩短后重试。"，不发送后端请求，不截断。请在计划中说明是否需要新增 FailureKind。服务端已有的校验保留不变。
- 普通文本即使提到"搜索"也不触发搜索；不注册新的 Discord Slash Command。

## 3. 子步骤 3：可信身份与共享契约（S3）
- 在 core/contracts/sse.ts 的 ChatStreamRequest 中加入可选的 discordUserId 字段，注释写明：服务端只接受不带 Origin 头的本机 loopback 请求中的合法值（17–20 位数字），浏览器无法借此声明可信身份。
- Bot 只在搜索请求中发送 discordUserId（取 Discord 消息作者 ID），普通对话不发送。频道仍由服务端取持久化 origin，Bot 不额外传 channelId。
- 服务端 server/app.ts 现有的 trustedDiscordUser 读取逻辑如需调整，只做与契约对齐的最小改动。

## 4. 子步骤 4：最终事件与来源段（D08，bot/backend-client.ts、bot/gateway.ts）
- backend-client 的 chat 在解析 done 时，同时读取 data.search，并做独立结构校验（与 Web 侧 parseSearchMetadata 的规则一致）；校验失败按"无来源"处理，不报错。handleInput 的返回值从 string 改为包含正文和可选搜索元数据的结构。请在计划中提出：校验函数放在哪里（例如把 Web 侧的展示校验下沉到 core，供 Web 和 Bot 共用，或其他方案），以及对现有 Web 代码的影响。
- 降级时：固定降级文案必须出现在正文之前（与 W1 一致）。请在计划中提出具体做法：作为单独的第一段消息，或作为第一段的首行；无论哪种都要计入长度限制。不显示 reason 的英文枚举。
- 搜索成功时：正文按现有 splitMessage 规则分段发送完毕后，再单独发送来源段，标题为"本轮检索来源"，每条包括：编号、标题（Markdown 转义，最多 80 码点）、解析后的真实域名、摘要（Markdown 转义，最多 100 码点）、用尖括号包住的原 URL（<https://...>）。
  - URL 由 Bot 用 new URL 独立重新校验：只允许 http / https，不带用户名密码，不含控制字符或空白；校验失败或单条 URL 会使该段超过安全长度时，只显示域名和"链接过长未展示"，不发送被截断后仍可点击的链接。
  - 每条来源消息不超过 1900 个 UTF-16 单位；allowedMentions 设为 { parse: [], repliedUser: false }，并带 MessageFlags.SuppressEmbeds 抑制链接预览；不使用 Embed，也不使用 [文字](链接) 这种隐藏目标的写法。
  - 最多 3 条来源。来源段发送失败时，按现有规则只给一次固定反馈，不重发已经发出的正文。
- "输入中"提示保持到开始回复为止（现有行为），不得因为来源段而延长或重复。
- Bot 不新增自动重发，也不新增全链路幂等（D12）。

## 5. 测试夹具（至少）
- /reset、/reset xxx、/search、"/search   "、/search /reset、/searchxyz、普通文本含"搜索"、/search 加 501 码点问题：各自的路由、提示和后端调用次数。
- 搜索请求带 search: true 和 discordUserId，普通请求两者都不带。
- 成功来源段：Markdown 特殊字符、@everyone / @here / <@id> / <#id>、[文字](链接)、反引号代码块、超长标题、超长 URL、javascript: / data: / 带凭据 / 含空白的 URL、IDN 域名；断言转义正确、无可点击的危险链接、带 SuppressEmbeds、allowedMentions 为空、每段不超过 1900 个 UTF-16 单位。
- 降级：固定文案在正文之前；not_requested 或无 search 字段时不显示任何搜索内容。
- 来源段发送失败只反馈一次，正文不重发；done 中 search 结构非法时正常发送正文、不发送来源段。

## 6. 范围与约束
- 只用 Mock：不连接真实 Discord，不调用真实 Tavily / Gemini，不访问 VPS，不新增 npm 依赖（discord.js 自带的 escapeMarkdown、MessageFlags 可以使用），不改真实 bot.env、server.env、systemd 或部署文件；生产装配继续不接入搜索网络。
- 不实施 P1-4 / R3（D12 差异仍待用户决定），不处理 Q4、deployment-validation 偶发失败，不变更版本号，不合入 main，不部署；不提交 .zcodeignore。
- 现有全部用例必须通过（当前基线为 43/43 个文件、742/742 条用例）。ADR-014 /reset、Task 16 分段、Bot 120 秒超时、K1、P1 系列、Task 20 及 Task 21 Step 1 回归不得退化。交付前连续跑全量测试至少 3 次；如出现失败，记录用例名和错误。

## 7. 交付汇报
- 改动文件清单。
- W1 / W2 的修复与对应测试。
- 第 2–4 节各设计点的最终方案（校验函数位置、降级文案放法、是否新增 FailureKind）。
- Discord 来源段的实际消息示例（Mock 输出，含转义后的效果）。
- 新增用例数、全量结果及多次运行结果。
- backlog Task 21 Step 2 修订后的原文。
- commit 和 tag。
- 留给 Task 21 收尾人工验收及 Task 22 的事项，以及需要裁决的问题。
```
