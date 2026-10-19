# Task 20 Step 2 T1–T3 修复 GPT 指派提示词

2026-10-18 由 Claude 起草、用户确认留档。依据 Claude Task 20 Step 2 复核（不通过）结论及 backlog Task 20 Step 3 前的「Claude Task 20 Step 2 复核前置」（基线 `V0.0.2-build.210`）。本文件仅为提示词存档，不构成开工授权；以用户在会话中的实际指派为准。

```text
你是本项目的开发与测试执行方（GPT）。本轮任务：修复 Claude 对 Task 20 Step 2 复核中发现的 T1（高）、T2（中），并一并处理 T3（低）。本轮不进入 Step 3。

## 0. 启动与流程（严格遵守 AGENTS.md / dev-docs/rules.md）
1. 通读 AGENTS.md、dev-docs/rules.md、dev-docs/status.md，再读：
   - dev-docs/backlog.md 中 Task 20 Step 3 条目之前的「Claude Task 20 Step 2 复核前置」一段
   - dev-docs/history.md 中「Claude Task 20 Step 2 复核（不通过）」一条
   - ADR-015 §3 以及「Task 20 Step 1 前置裁决」之后 Step 2 的新增内容
2. 先只提交计划：文件清单，加上每个文件一句话说明，再写出 T1 修正后的资料 / 历史取舍顺序。等我确认后再动手，确认前不得创建或修改任何文件。
3. 按 TDD 实施：先写能复现问题的失败测试，再修复。
4. 单步闭环：全量测试、根目录及四个包的类型检查、三项构建全部通过后，同步 tests.md 台账、history 和 backlog（在 Step 2 复核前置一段注明 T1–T3 已修复，Step 3 仍不勾选、不开工）；然后 commit、push origin test、更新 status.md，再按累计提交数打 annotated tag（V0.0.2-build.<N>）并推送。完成后停止汇报，等待 Claude 复核。

## 1. T1（高）：长历史下搜索资料被缩到 1 条来源 / 1 字摘要
位置：server/chat-adapter-stream-source.ts 中搜索成功分支的第三次 fitSearchSources 调用（以 `[...eligible, ...withData(block)]`、`inputTokens * 0.8`、keepMinimumSource=true 为目标）。
现象：默认配置（20 轮历史、每轮回复约 100 字）下，资料被缩到 1 条来源、摘要只剩 1 个字，并且被持久化后用于展示；旧历史反而一轮都没删。
修正后的顺序：
1. 资料块先受 2048 估算 tokens 上限约束（第一轮 fit，保留）。
2. 不为了容纳完整历史而缩短资料：删除第三轮 fit，交给 select 按既有规则删除最旧的完整历史轮次。
3. 只有在不带任何历史时"本轮问题 + 资料"仍放不下，才继续缩短摘要 / 减少来源（第二轮 fit）。这一轮的目标阈值必须和 select 判断时使用的安全阈值一致（当前 select 用 inputTokens × SAFE_RATIO，即 0.8；第二轮 fit 现在用的是 inputTokens，两者不一致，会导致资料缩完后 select 仍判超限而整轮降级）。缩到没有可用来源时，按 context_limit 降级。
4. 本轮问题本身超限的处理不变：返回 CONTEXT_LIMIT，最多计数 2 次，生成额度只扣一次，准入顺序（Q1）不变。
文档：同步澄清 ADR-015 §3 原文"先限资料、必要时缩短摘要 / 减来源，再删最旧完整历史轮次"，改为上面的顺序表述，并写明是因 T1 修订。
回归测试（至少）：
- 默认配置、20 轮历史、每轮回复约 100 / 200 / 400 字时，3 条 100 字摘要的资料在 2048 上限内应完整保留（或只受 2048 约束），删除的是最旧的历史轮次；持久化的 search.sources 与实际注入的一致。
- "本轮问题 + 资料"在无历史时恰好超过安全阈值：资料被缩短后可以通过 select，不会被误判降级。
- 无历史时也放不下：按 context_limit 降级，普通生成，计数总数 ≤ 2。

## 2. T2（中）：单个用户取消会让全进程的搜索一直关闭
位置：server/search-budget.ts 的 acquire，catch 分支中 `if (ioPending) this.disabled = true;`。
现象：账本读写进行中，一个请求被取消后，后续所有请求的 acquire 都返回 false，直到重启；没有日志，降级原因与额度不足相同。
要求：
- 被取消的那次请求仍按原样返回 ABORTED。不得发起它的搜索；若扣额已落账，按"已预留、不退款"处理。
- 不得因此永久关闭搜索。账本操作已经由 tail 串行，后续 acquire 会等待上一个任务结束后重读账本，所以预留状态是确定的。删除这条关闭逻辑，或者改为等该 IO 任务结束后自动恢复。
- 不得破坏"同一时间只有一个写者"以及"先持久化扣额再发请求"。
回归测试（至少）：账本 read / write 期间分别取消一个请求后，另一个请求仍能正常准入；落账已完成时日计数正确，不重复扣、不漏扣。

## 3. T3（低，一并处理）：账本不可用的降级原因
- 在 core/contracts/search.ts 的 SEARCH_DEGRADATION_REASONS 中增加独立的本地枚举（建议名 ledger_unavailable），用于账本损坏、读取失败、写入失败导致搜索关闭的情况；额度不足仍用 admission_denied。
- 由此需要的接口调整（例如让 SearchBudget 返回拒绝原因而非 boolean）请写进计划。
- 持久化校验（isSearchMetadata）会随枚举自动接受新值；旧文件不受影响。
- 保持 N4：损坏或写入失败仍关闭搜索至重启，不自动重建账本，日志仍只记录白名单字段。
- 回归测试：坏账本、写入失败两种情况的 done.search.reason 均为新枚举值，额度不足仍为 admission_denied。

## 4. 范围与约束
- 只用 Mock：不调用真实 Tavily、Gemini、Discord，不访问 VPS，不新增依赖，不改真实 server.env 或部署文件，生产装配继续不接入搜索网络。
- 不实施 Step 3、Task 21（含 S2 / S3）、P1-4 / R3、Q4，不变更版本号，不合入 main，不部署；不提交 .zcodeignore。
- 现有全部用例必须通过（当前基线为 41/41 个文件、559/559 条用例）。K1、P1-1/2/3/7、ADR-012 回放、Step 1 / S1 / Step 2 已有回归不得退化。

## 5. 交付汇报
- 改动文件清单。
- T1 修正后的顺序说明，以及 ADR-015 §3 的修订原文。
- T1–T3 分别对应的新增测试。
- 新增用例数和全量结果。
- commit 和 tag。
- 需要裁决的事项（如有）。
```
