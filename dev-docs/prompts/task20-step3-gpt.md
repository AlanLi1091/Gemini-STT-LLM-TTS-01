# Task 20 Step 3 GPT 指派提示词

2026-10-18 由 Claude 起草、用户确认留档。依据 ADR-015 §2 / §6、backlog Task 20 Step 3 及 Step 1–2 / T1–T3 实际代码（基线 `V0.0.2-build.216`）。本文件仅为提示词存档，不构成开工授权；以用户在会话中的实际指派为准。

```text
你是本项目的开发与测试执行方（GPT）。本轮任务：Phase 5 Part 1 Task 20 Step 3（SSRF 与间接提示注入防护）。

## 0. 启动与流程（严格遵守 AGENTS.md / dev-docs/rules.md）
1. 通读 AGENTS.md、dev-docs/rules.md、dev-docs/status.md，再读：
   - ADR-015 全文，重点是 §2（来源过滤与模型输入）和 §6（威胁模型、对策与验证要求）的威胁表
   - dev-docs/backlog.md 的 Task 20 段（Step 3 条目及其前面的各段复核前置）
   - dev-docs/risks.md 的风险 14
   - 现有实现：server/search-adapter.ts、server/search-context.ts、server/search-budget.ts、server/search-timeout.ts、server/chat-adapter-stream-source.ts 及对应测试
2. 先只提交计划，内容包括：
   - 一张对照表：ADR-015 §6 的每一行威胁 → 现有覆盖它的测试（文件和用例名）→ 缺口 → 本步要新增的测试。
   - 文件清单，加上每个文件一句话说明。
   如果计划里需要改动非测试代码，要单独列出并说明是哪条测试暴露的缺陷。等我确认后再动手，确认前不得创建或修改任何文件。
3. 按 TDD 实施：先写测试；只有测试暴露出真实缺陷时才修改实现，修改须最小化。
4. 单步闭环：全量测试、根目录及四个包的类型检查、三项构建全部通过后，勾选 backlog 的 Task 20 Step 3，同步 tests.md 台账和 history；然后 commit、push origin test、更新 status.md，再按累计提交数打 annotated tag（V0.0.2-build.<N>）并推送。完成后停止汇报，等待 Claude 复核。

## 1. 本步定位
- 本项目已裁决不抓取结果网页（D03）：应用只访问固定的 Tavily HTTPS 端点，不读取结果 URL，不解析跳转，不生成预览。因此 Step 3 不新增抓取能力，也不做私网地址阻断或 systemd IPAddressDeny 部署改动。
- 本步的任务是把 ADR-015 §6 的验证要求变成完整的 Mock 攻击夹具和回归，证明这些边界成立。
- 同步修订 backlog 中 Step 3 条目原文（现在还是"如涉及服务端抓取"的条件写法），改为本步实际的验收内容，并注明"如将来新增全文抓取，须另行裁决 SSRF 防线"。

## 2. 必须覆盖的验证（对照 ADR-015 §6，已有覆盖的在计划中注明，缺的补上）
1. SSRF 边界
   - 结果 URL 指向 loopback、私网、link-local、元数据地址（如 169.254.169.254）、IPv6 本地地址、带端口或用户名密码时：应用对这些 URL 不发起任何网络读取（用计数 fetcher 断言只调用过固定端点一次）。带凭据的 URL 被过滤，其余只作为展示元数据。
   - 供应商端点返回 3xx 时不跟随（redirect: 'error'），按 provider_failure 降级，不访问 Location 指向的地址。
   - 请求只发往固定的 https://api.tavily.com/search，方法、头和参数固定；Key 不出现在日志、错误文案或 SSE 事件中。
2. 间接提示注入
   - 夹具：标题或摘要里含伪造的隔离标记（[[UNTRUSTED_SEARCH_DATA]] / [[END_UNTRUSTED_SEARCH_DATA]] 及变体）、role/system/assistant 伪装、"忽略以上指令"、要求泄露系统指令或历史、控制字符、零宽字符、双向文本控制字符、换行注入、URL 或 Markdown 链接。
   - 断言：资料块内无法闭合或伪造隔离标记；供应商文本不会变成独立的 system / role 消息；SEARCH_SYSTEM_RULE 始终存在；完整 URL（含摘要正文里的 URL）不进入模型输入；标题和摘要是纯文本。
   - 断言权限不升级：模型输出不会触发额外搜索、读文件或网络请求（每轮最多一次供应商调用）。注明测试只证明构造和权限边界，不证明模型语义上不受影响。
3. 来源元数据安全（服务端部分；Web / Discord 渲染属于 Task 21）
   - javascript:、data:、vbscript:、file:、协议相对 URL、带凭据、含控制字符或空白、超过 2048 字符的 URL 均被过滤；域名取自 URL 解析结果，标题伪装的域名无效；IDN 域名以解析后的 hostname 呈现。
   - 被篡改的持久化元数据（例如手工写入 javascript: URL、多于 3 条、超长、多出字段）在读取时被 isSearchMetadata 拒绝，不会通过回放或刷新下发。
4. 响应无界与上游不配合
   - 超过 256KiB、慢速分块、坏 JSON、results 结构异常、挂起不返回、忽略 abort 的上游、迟到结果：都在搜索期限内降级或终止；用户取消后不转普通生成、不持久化；会话锁正常释放；迟到结果不发事件、不写盘。
5. 身份伪造与重复收费
   - 浏览器请求（带 Origin 头）或非 loopback 请求声明 discordUserId 无效；Web 会话不能借 discordUserId 冒充 Discord 来源；userId 格式非法时按缺身份处理。
   - 同一 requestId 回放不重新搜索、不扣额；正文或模式冲突返回 REQUEST_CONFLICT 且不扣额；重启、跨 UTC 日、/reset 后日额度行为正确；坏账本时仍可普通聊天（ledger_unavailable）。
6. 上下文挤占与校准污染
   - 资料不超过 2048 上限；含长 URL 和英文摘要的资料不推高共享系数；搜索系数有上限；最小输入放不下时按 context_limit 降级。（Step 2 / T1 已有的回归可以直接引用，不必重复编写。）
7. 错误和日志脱敏
   - 以上所有路径中，SSE error 和 done 只含固定文案和本地枚举，不含供应商原文、URL、query、Key、stack；日志只含白名单字段。

## 3. 偶发测试失败观察
- Claude 在 T1–T3 复核时，曾出现 1 次未定位的偶发失败（之后 16 次未复现）。本步交付前请连续跑全量测试至少 5 次；如果出现失败，记录用例名和错误，并在汇报中说明。不要为了消除偶发失败而放宽断言。

## 4. 范围与约束
- 只用 Mock：不调用真实 Tavily、Gemini、Discord，不访问 VPS，不新增依赖，不改真实 server.env、systemd 单元或部署文件，生产装配继续不接入搜索网络。
- 不实施 Task 21（Web 开关、Discord /search、来源渲染，以及 S2 / S3）、P1-4 / R3、Q4，不变更版本号，不合入 main，不部署；不提交 .zcodeignore。
- 现有全部用例必须通过（当前基线为 41/41 个文件、568/568 条用例）。K1、P1-1/2/3/7、ADR-012 回放、Step 1 / S1 / Step 2 / T1–T3 的回归不得退化。

## 5. 交付汇报
- §6 威胁对照表的最终版（威胁 → 测试）。
- 改动文件清单；如果改了实现代码，说明是哪条测试暴露的缺陷。
- 新增用例数，全量结果，以及连续 5 次运行的结果。
- backlog Step 3 修订后的原文。
- commit 和 tag。
- 无法用 Mock 证明、留给 Task 21 / 22 的事项。
```
