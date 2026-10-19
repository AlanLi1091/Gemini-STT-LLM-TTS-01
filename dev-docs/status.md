# Status

## 当前阶段

Phase 1–4已结项；Phase 5 Part 1 Task 19与Task 20已完成并复核通过。Task 21 Step 1（含V1）已交付并经Claude复核通过（W1 / W2低风险登记为Step 2首个子步骤）；Web逐轮搜索意图、最终来源 / 独立降级提示、安全链接、刷新与回放已接通。Task 21 Step 2（Discord，含S2 / S3）及Task 22仍未授权。生产未装配搜索网络，Tavily用途许可 / 性能证据待补，N3真实验收与上线门槛未解除；K1及搜索代码未部署，现网保持v002-6f81048。

## 当前授权

- **本轮授权已完成（2026-10-19）**：用户指派 Claude 复核 GPT Task 21 Step 1（`30fbfa3` / `a02bb98`）并记录；复核通过，本机连续3次全量43/43文件742/742用例、类型检查及构建通过，危险渲染API扫描0匹配。W1（低，降级提示在正文后与“以下回复”不符）、W2（低，无状态分支发送search:true致请求无效）登记于backlog Task 21 Step 2首个子步骤；既有D12差异（停止保留片段、末条assistant无法重试）属P1-4 / R3，须在Task 21收尾人工验收前由用户决定是否授权。仅文档；本状态收尾提交后按累计提交数创建annotated tag。Task 21 Step 2、Task 22未授权。

- **本轮授权已完成（2026-10-19）**：用户确认22文件计划并指派“请开工”，完成Task 21 Step 1与首个子步骤V1。CONTROL只补U+2028 / U+2029，回归先红后绿；Web默认关闭逐轮开关、Tavily外发 / 保存告知、500 Unicode码点校验、已接受发送后复位、原模式与UUID重试复用落地。SSE done.search经可选ChatChunk→Hook→assistant，客户端结构校验覆盖SSE / 会话恢复 / 渲染；最终来源编号、纯文本标题摘要、new URL解析真实域名与HTTP(S) / 凭据 / 控制空白 / 长度校验、安全新窗口属性、无效URL仅标题域名，固定降级文案独立于正文。单done回放与旧会话兼容，来源最终加入遵守滚动守卫，停止后迟到done不展示来源。新增91项，最终第5–7轮连续3次43/43文件742/742用例、根及四包类型检查和三构建通过，台账逐文件计数一致；首轮沙箱37/43文件662/742用例，listen EPERM及关联超时80项完整登记tests.md，获准沙箱外后第2–7轮均通过；未修改部署测试或放宽断言。渲染API rg扫描0匹配，安全结论限定为本步应用渲染边界。交付提交`30fbfa3`（`feat: add per-turn web search and safe source display`）已推送origin/test；本状态收尾后按累计226创建并推送annotated tag `V0.0.2-build.226`，最终远端核验见主会话汇报。D12既有保留片段及末条assistant无法重试差异仅记录，P1-4 / R3未实施；全部上游Mock、无真实Key / 会话 / Tavily / Gemini / Discord / VPS访问、无新依赖或部署，生产无搜索网络。22文件范围完成，既有.zcodeignore保留不提交；完成后停止等待Claude复核，Step 2（含S2 / S3）、Task 22、Q4及其余项未授权，N3保留。

- **本轮授权已完成（2026-10-19）**：用户指派 Claude 起草并留档 Task 21 Step 1（含 V1 子步骤）GPT 提示词，新增 `dev-docs/prompts/task21-step1-gpt.md` 并记录 history。仅文档，不构成开工授权；Task 21 Step 1 以用户对GPT的实际指派为准，Step 2与Task 22未授权。

- **本轮授权已完成（2026-10-19）**：用户指派 Claude 复核 GPT Task 20 Step 3（`ba0ac12` / `0f4be63`）；复核通过，本机连续5次全量41/41文件651/651用例与类型检查通过。发现 V1（低，`CONTROL` 未含 U+2028 / U+2029，原样进入资料块并随来源持久化），已登记为 Task 21 前置；既有偶发失败定位为 `server/test/deployment-validation.test.ts:96`，Claude 单独循环40次未复现、根因未确认，另行立项。复核记录与登记见提交 `6e4bb48`（tag `V0.0.2-build.221`），本提交补同步status并按累计提交数创建annotated tag。仅文档；Task 21–22未授权。

- **本轮授权已完成（2026-10-19）**：用户确认Task 20 Step 3的威胁映射及13文件计划后开工；新增夹具复现NBSP / 全角空白URL被接受，用户补充确认server/search-context.ts后，仅将safeUrl拒绝字符集加入\s，规范化与持久化验证共用修复。最终14文件（含本状态）交付，8个既有测试文件新增83项，全量41/41文件651/651用例、根 / 四包类型检查及三构建通过。全量8轮中第3轮既有deployment-validation.test.ts的reevaluates old samples only with matching measured journal evidence without rewriting them在第96行eligible_24h断言预期true实际false，根因未确认；第4–8轮连续5次651/651通过，失败名 / 错误 / 临时完整输出位置与开发期夹具校正均记tests.md，未放宽断言或改部署脚本。修复与验证提交`ba0ac12`（`fix: reject whitespace source URLs and verify search security boundaries`）已推送origin/test；本状态收尾提交后按累计220创建并推送annotated tag `V0.0.2-build.220`，最终远端核验见主会话汇报。全部上游Mock / 临时存储，无真实Tavily / Gemini / Discord / VPS / Key或会话访问、不新增依赖或部署；生产装配仍无搜索网络。Step 3已勾选待Claude复核；Task 21（含S2 / S3）、Task 22、P1-4 / R3、Q4及其他范围未授权，N3保留；既有未跟踪.zcodeignore不提交。完成后停止等待Claude复核。

- **本轮授权已完成（2026-10-18）**：用户确认留档 Claude 起草的 Task 20 Step 3 GPT 提示词，新增 `dev-docs/prompts/task20-step3-gpt.md` 并记录 history；用户表示随后交给GPT。仅文档，不构成开工授权；Task 20 Step 3以用户对GPT的实际指派为准，Task 21–22未授权。

- **本轮授权已完成（2026-10-18）**：用户指派 Claude 复核 T1–T3 修复（`324b02e` / `04a88cd`）并确认记录；复核通过。T1：删除第三轮资料缩短、第二轮与select共用0.8安全阈值，Claude复现脚本在20轮历史、回复100 / 200 / 400字时均保留3条100字摘要并删除最旧历史（保留32 / 20 / 10条历史消息）；T2：读期间取消不扣额、写期间取消保留预留，后续请求均正常准入；T3：坏账本降级原因为ledger_unavailable。本机全量41/41文件568/568用例与类型检查通过；首次复跑出现1条偶发失败，其后16次（含并行负载）均未复现，输出未保留、用例未定位，登记为待观察的时间敏感偶发失败。仅修改backlog / history / status；本提交后按累计提交数创建annotated tag。Task 20 Step 3待用户指派，Task 21–22未授权。

- **本轮授权已完成（2026-10-18）**：用户指派T1–T3修复并确认15文件计划后修改；T1删除为完整历史挤压资料的第三轮fit，第二轮按无历史最小输入与select共用0.8安全阈值；T2取消只结束本地等待，tail保持串行并在IO结束后让后续请求重读准入，不永久关闭；T3新增ledger_unavailable，真实账本故障仍按N4关闭，额度拒绝保留admission_denied。新增9项，全量41/41文件568/568用例、根 / 四包类型检查、三构建、台账 / diff及15文件范围验证通过。修复提交`324b02e`（`fix: preserve search sources and recover admission after cancellation`）已推送origin/test；本状态收尾后按累计214提交创建并推送annotated tag `V0.0.2-build.214`，最终远端核验见主会话汇报。全部Mock / 临时存储，无真实搜索 / 模型 / Discord / VPS / 会话访问、不读取真实Key、不改部署文件、不新增依赖或部署。完成后等待Claude复核，Step 3仍未勾选 / 未开工，Task 21及其他范围未授权。

- **本轮授权已完成（2026-10-18）**：用户确认留档 Claude 起草的 T1–T3 修复 GPT 提示词，新增 `dev-docs/prompts/task20-step2-t1-t3-fix-gpt.md` 并记录 history。仅文档，不构成开工授权；T1–T3 修复待用户指派，Task 20 Step 3、Task 21–22均未授权。

- **本轮授权已完成（2026-10-18）**：用户指派 Claude 复核 GPT Task 20 Step 2（`8878af6` / `2bb7c81`）并要求结论写入status；本机全量41/41文件559/559用例与根 / 四包类型检查复跑通过，但复核**不通过**：**T1（高）** 编排第三轮 `fitSearchSources` 以“全部可选历史+资料≤80%”为目标且保留至少一条来源，资料先被缩到最小而旧历史不删——默认20轮历史、每轮回复100字时即只剩1条来源 / 1字摘要并被持久化展示；ADR-015 §3“先限资料……再删最旧完整历史”字面有歧义，应理解为资料先受2048上限，再由 select 删最旧历史，仅“本轮问题+资料”无历史仍放不下时才继续缩短资料；须删去第三轮缩短、澄清ADR并补长历史+搜索回归。**T2（中）** `SearchBudget.acquire` 在账本IO进行中被取消即设 `disabled=true`，单个用户停止便关闭全进程搜索直到重启，无日志且降级原因与额度不足同为 admission_denied；账本已串行、后续acquire会重读，无需永久关闭，须改为不关闭或IO结束后恢复并补回归。**T3（低）** 账本单次写入失败即关闭至重启（符合N4、可接受），但降级原因同为 admission_denied，建议增加独立本地枚举便于排查。T1 / T2以tsx脚本复现（scratchpad，不入Git）。仅修改status，未改ADR / 源码 / 测试 / 配置；本提交后按累计提交数创建annotated tag。Task 20 Step 3、Task 21–22均未授权。

- **本轮授权已完成（2026-10-18）**：用户指派Task 20 Step 2，依据已留档prompts确认22文件计划后开工；独立多守卫预算、先持久化扣额的UTC日账本 / N4关闭与人工恢复、8秒搜索 / 单调115秒阶段协调、2048资料预算和N1独立搜索校准已实现。新增48项，全量41/41文件559/559用例、根 / 四包类型检查、三构建、台账 / ADR链接 / diff与范围检查通过。交付提交`8878af6`（`feat: enforce search budgets deadlines and calibrated context`）已推送origin/test；本状态收尾后按累计208提交创建并推送annotated tag `V0.0.2-build.208`，最终远端核验见主会话汇报。仅Mock / 隔离临时账本，无真实Tavily / Gemini / Discord / VPS调用、不读取真实Key或会话、不改部署文件、不新增依赖或部署；生产装配不接搜索网络。Step 2待复核；Step 3、Task 21（含S2 / S3）及其余项未授权。

- **本轮授权已完成（2026-10-18）**：用户确认留档 Claude 起草的 Task 20 Step 2 GPT 提示词，新增 `dev-docs/prompts/task20-step2-gpt.md` 并记录 history。仅文档，不构成开工授权；Task 20 Step 2–3、Task 21–22均未授权。

- **本轮授权已完成（2026-10-18）**：用户指派 Claude 复核 S1 / S4 修复（`d5282ed` / `c13acce`）并确认记录；复核通过，本机全量38/38文件511/511用例与类型检查复跑通过，原复现脚本转为通过，无新发现。写入history。仅文档；本状态收尾提交后按累计提交数创建annotated tag。Task 20 Step 2–3、Task 21–22均未授权。

- **本轮授权已完成（2026-10-18）**：用户指派按Claude建议修复并确认9文件计划；S1在来源码点截断后再次trim，6项空白 / Unicode / 控制字符边界与2项HTTP保存 / 重启回放测试先红后绿；S4将ADR-012 / 013重复裁决正文替换为ADR-015链接。全量38/38文件511/511用例、根 / 四包类型检查及三构建通过，台账38/38映射、引用目标 / 去重及diff检查通过。交付`d5282ed`（`fix: trim truncated search sources before persistence validation`）已推送origin/test；本状态收尾提交后按最终累计202提交创建并推送annotated tag `V0.0.2-build.202`，最终核验见主会话汇报。全部上游Mock / 隔离临时存储，无真实搜索 / 模型 / Discord / VPS / 会话访问，未部署。S1修复待复核；S2 / S3留Task 21，Task 20 Step 2–3及后续未授权。

- **本轮授权已完成（2026-10-18）**：用户指派 Claude 复核 GPT Task 20 Step 1（`debea5b` / `8ed5600`）并确认记录；有条件通过，全量38/38文件503/503用例与类型检查本机复跑通过。S1（高，来源截断后结尾空白导致持久化校验失败、回复无法保存）须在Step 2开工前修复；S2–S4（低）分别归Task 21 / 文档修订。写入history与backlog Task 20前置。仅文档，未改ADR / 源码 / 测试 / 配置；本状态收尾提交后按累计提交数创建annotated tag。Task 20 Step 2–3、Task 21–22均未授权。

- **本轮授权已完成（2026-10-18）**：用户指派Task 20 Step 1并确认计划后继续开发；先同步ADR-012 / 013 / 015与ADR-009的Q1–Q3及Step边界，再按TDD完成共享搜索意图 / 来源契约、Tavily原生HTTP适配器（全Mock fetch）、离线Mock、服务端准入编排 / 可信身份 / 降级 / 取消、来源持久化与模式幂等回放。新增32用例，全量38/38文件503/503用例、根 / 四包类型检查、三构建与台账 / ADR链接 / diff检查通过。交付提交`debea5b`（`feat: implement mock-tested session search pipeline and source replay`）已推送origin/test；本状态收尾提交后按累计198提交创建annotated tag `V0.0.2-build.198`并推送，最终核验见主会话汇报。仅Mock，无真实搜索 / 模型 / Discord / VPS调用，无依赖或密钥配置改动，不部署；Step 2–3、Task 21–22与P1-4 / R3均未授权，N3门槛保留。

- **本轮授权已完成（2026-10-18）**：用户采纳 Claude 建议裁决 Task 20 前置 Q1（仅搜索轮次调整准入顺序）、Q2（日志阶段保留count）、Q3（Discord缺可信身份降级普通生成）及 Step 1 / 2 边界（Step 1 做资料块格式 / 隔离与固定上限Mock资料，2048子预算 / N1 / 账本 / 期限归Step 2），登记于backlog Task 20前置与history。仅文档；ADR正文修订留给Task 20 Step 1首个子步骤。Task 20–22均未授权。

- **本轮授权已完成（2026-10-13）**：用户指派 Claude 复核 GPT Task 19 Step 3（`3c07804` / `9a2ca66`）并确认记录；复核通过，Q1（准入顺序与ADR-012 / 013冲突，中）、Q2（日志阶段漏count）、Q3（Discord缺可信身份处理）、Q4（AGENTS.md / Task20 Step3文字过时）写入history，backlog Task 20登记前置（提交 `44fd3d4`）。仅文档，未改ADR / 源码 / 测试 / 配置；本状态收尾提交后按累计194提交创建annotated tag `V0.0.2-build.194`。Task 20–22均未授权。

- **本轮授权已完成（2026-10-13）**：用户指派 Task 19 Step 3并批准八文件计划；ADR-015、ADR-007 / ADR-009目标流式契约、roadmap / risks / backlog / history / status同步。仅文档，Tavily用途许可 / 性能待补，N1–N4及D12实施授权边界保留；不修改应用 / 测试 / 配置，不调用真实API，不部署。Task 20–22、P1-4 / R3实施、M1 / VPS扫描及其他残余未授权。交付提交 `3c07804`（`docs: finalize Task 19 Step 3 external search architecture`）已推送origin/test；本状态收尾提交后，按最终累计192提交创建annotated tag `V0.0.2-build.192`并推送，最终远端核验见主会话汇报。

- **本轮授权已完成（2026-10-12）**：用户指派 Claude 复核 Task 19 Step 2 裁决清单并委托决定 N1 / N2；复核通过，N1（搜索独立校准系数）、N2（不向模型注入 URL）、N3（Tavily 用途澄清前不得真实验收 / 上线）、N4（每日账本损坏时关闭搜索）写入预研第 11 节并同步 backlog（提交 `628320c` 已推送 origin/test）。仅文档；本状态收尾提交后按最终累计提交数创建 annotated tag。Task 19 Step 3 与 Task 20–22 均未授权。
- **Part B Task 19 Step 2授权已完成（2026-10-12）**：用户确认四文件计划并逐项裁决U1 / U2和D01–D14；Tavily basic + 原生HTTP、显式双入口、最多3条100字摘要+链接、总8192 / 搜索资料最多2048估算tokens并参与完整输入校准、成功回复保存摘要 / 来源及回放、预算 / 期限 / 降级 / 中断 / 隐私 / 固定错误均已定。用户明确确认将展示 / 长期留存许可、中文质量 / 生产延迟保留为待补证据后收尾。提交 `0466511`（`docs: record Task 19 Step 2 search provider and design decisions`）已推送origin/test；本状态收尾提交后按累计188提交创建annotated tag `V0.0.2-build.188`并推送，最终远端核验见主会话汇报。仅四文档、真实API调用0次，Step2已勾选；待Claude复核，Step3 / Task20–22、P1-4 / R3实施、M1 / VPS扫描及其他残余未授权。

- **前轮审核授权已完成（2026-10-12）**：用户指派 Claude 复核 K1 并登记 M1；复核通过，审计报告追加「K1 复核」，backlog 登记低优先级残余 M1（提交 `e8bebd4` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。M1 修复与 VPS 只读扫描均未授权；用户已决定由 GPT 继续 Part B（Task 19 Step 2 裁决清单）。
- **Part A K1修复授权已完成（2026-10-12）**：用户指派Part A并确认13文件计划；所有模型结束原因的空正文失败、流源持久化前纵深检查、fixedHints与finishReason白名单日志及回归完成。提交 `f38a2e9`（`fix: reject empty model replies before completion and persistence`）已推送origin/test；本状态收尾提交后按累计184提交创建annotated tag `V0.0.2-build.184`并推送，最终远端核验见主会话汇报。K1待Claude复核、未部署；Part B须用户明确说「继续 Part B」才开始，Step 3 / Task 20–22及其他残余未授权。

- **前轮审核授权已完成（2026-10-12）**：用户指派 Claude 审核 Task 19 Step 1 并记录 K1、L1–L3、推送打 tag；审核通过，K1（非 MAX_TOKENS 空正文被静默保存）登记为未授权审计项，L1–L3 并入 Step 2 裁决输入（提交 `9db37db` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。K1、Step 2 / Step 3 与 Task 20–22 均未授权。
- **Task 19 Step 1授权已完成（2026-10-12）**：用户指派网络搜索预研，确认四文件计划及真实探针费用；方案对比、官方模型 / 价格 / 建议展示与留存条款、SDK / ADR-013边界及最小真实探针已落档。提交 `4ab1344`（`docs: research Phase 5 search options and verify grounding probe`）已推送origin/test；本状态收尾提交后，按累计180提交创建annotated tag `V0.0.2-build.180`并推送，最终远端核验见主会话汇报。Step 2 / 3和Task 20–22未授权，下一个待办为用户指派Task 19 Step 2；现网保持原发行物。

- **Task 19–22 正文修订授权已完成（2026-10-12）**：用户确认 Claude 修订计划，依据对 GLM-5.3 拆解的审查意见及残余 G2 / H3 / F1 补充 Task 19–22 正文（提交 `2312399` 已推送 origin/test）。仅文档，未开工任何 Task；本状态收尾提交后按最终累计提交数创建 annotated tag。Task 19–22 均未授权，下一个待办为用户指派 Task 19 Step 1。
- **P1 VPS部署授权已完成（2026-10-12）**：用户确认六份文档 / VPS文件计划，固定已复核源码6f81048（来源tag V0.0.2-build.174）部署到v002-6f81048；P1-1 / P1-2 + R2 / P1-3 / P1-7均已上线。本机 / Linux回归、备份 / 隔离恢复 / 旧消息保留、Web真实回复 / 刷新恢复、用户确认Discord正常均通过。交付记录提交 `7f52533`（`docs: record verified P1 VPS deployment`）已推送origin/test。本状态收尾提交并推送后，在最后提交按累计176提交创建annotated tag `V0.0.2-build.176`，最终远端核验见主会话汇报。版本号仍0.0.2，没有合并或推送main；Task19及其余项仍未授权，服务保持常驻。

- **P1-7 复核授权已完成（2026-10-12）**：用户指派 Claude 复核 P1-7 并记录低优先级残余、推送打 tag；复核通过，审计报告追加「P1-7 复核」，backlog 登记残余 H1–H3（提交 `545adaa` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。Phase 5 Part 1 前置四项均已完成并经复核；H1–H3 及其他残余与 Task 19–22 均未授权。
- **P1-7 修复授权已完成（2026-10-12）**：用户确认十七文件计划并指派执行；来源保留预算、持久化 origin 分组、对应预算全局 429 暂停及配置 / ADR / 回归 / 交付记录已完成。提交 `e762790`（`fix: reserve generation and count budgets for web sessions`）已推送 origin/test。本状态收尾提交并推送后，在最后提交按累计172提交创建 annotated tag `V0.0.2-build.172`；最终远端核验见主会话汇报。Part 1 前置四项代码修复全部完成，P1-7 待 Claude 复核，Task 19 仍未授权；未部署 VPS，其余项未授权。

- **P1-3 复核授权已完成（2026-10-12）**：用户指派 Claude 复核 P1-3 并记录低优先级残余、推送打 tag；复核通过，审计报告追加「P1-3 复核」，backlog 登记残余 G1 / G2（提交 `403ac26` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。G1 / G2、F1 / F2、E1–E3、P1-7 与 Task 19–22 均未授权。
- **P1-3 修复授权已完成（2026-10-12）**：用户确认二十一文件计划并指派执行，存储 / 会话分阶段分类、SSE 固定文案、白名单错误日志及 Web 浏览器错误固定文案已完成；实现 / 回归 / ADR / 交付记录提交 `2826331`（`fix: separate session failures and sanitize chat error responses`）已推送 origin/test。本状态收尾提交并推送后，在最后提交按累计168提交创建 annotated tag `V0.0.2-build.168`，最终分支 / tag远端核验见主会话汇报；等待Claude复核，未部署VPS。P1-7及P1-4 / P1-5 / P1-6 / P2-5、E1–E3、F1 / F2、Task19–22均未授权。

- **P1-2 复核授权已完成（2026-10-12）**：用户指派 Claude 复核 P1-2 + R2 并确认记录计划；复核通过，审计报告追加「P1-2 复核」，backlog 登记低优先级残余 F1 / F2 并补充 R3 超时触发路径（提交 `4cd7d03` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。F1 / F2、E1–E3、P1-3、P1-4、P1-7 与 Task 19–22 均未授权。
- **P1-2 修复授权已完成（2026-10-12）**：用户确认十四文件计划并指派 P1-2 服务端上游超时及 R2 会话锁释放修复，代码 / 回归 / 配置 / ADR / 交付记录已完成；提交 `137a94b`（`fix: bound server generation timeouts and release session locks`）已推送 origin/test。本状态收尾提交后按最终累计164提交创建 annotated tag `V0.0.2-build.164`，最终分支 / tag 远端核验见主会话汇报；Claude 复核待完成，未部署 VPS。P1-3、P1-4、P1-7、E1–E3及 Task 19–22 未授权。
- **P1-1 复核授权已完成（2026-10-12）**：用户指派 Claude 复核 P1-1 并确认残余登记计划；复核通过，审计报告追加「P1-1 复核」，backlog 登记低优先级残余 E1–E3（提交 `9dc57d5` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。E1–E3、P1-2 + R2、P1-3、P1-7 与 Task 19–22 均未授权。
- **P1-1 修复授权已完成（2026-10-10）**：用户确认十二文件计划并指派 P1-1 修复，HTTP 默认会话单条 user 校验与流源防御已实现；提交 `1ea6c50`（`fix: enforce user-only session input and disable stateless chat by default`）已推送 origin/test。本状态收尾提交后按最终累计160提交创建 annotated tag `V0.0.2-build.160`，最终远端核验见主会话汇报。未部署 VPS；P1-2 + R2、P1-3、P1-7 与 Task 19–22 仍未授权。
- **前次文档授权已完成（2026-10-10）**：用户确认方式 A，将审计 P1-1、P1-2 + R2、P1-3、P1-7 登记为 Phase 5 Part 1 前置并写明依赖顺序，审计报告追加前置复核（提交 `a60ac1f` 已推送 origin/test）；仅文档，未实施任何修复。本状态收尾提交后按最终累计提交数创建 annotated tag。前置四项与 Task 19–22 均未授权；对 Task 19–22 正文的审查意见另开一轮处理。
- **前一轮授权已完成（2026-10-09）**：用户确认 GLM-5.3 提案，Phase 5 Part 1 网络搜索拆解为 Task 19–22 登记 backlog（提交 `a211f88`），收尾 tag `V0.0.2-build.156`。
- **更早授权已完成（2026-10-09）**：Codex git-ops 当前 tag 版本号已从 0.0.1 修正为 0.0.2；配置 / backlog / history 提交 `3c778a6` 已推送 origin/test，收尾 tag `V0.0.2-build.154`。
- **授权任务**：2026-10-07 V0.0.2 私有VPS部署、双入口与管理员重置验收完成；四份交付记录87b1617与状态提交8b5731c已推送origin/test，发布PR为[#5](https://github.com/AlanLi1091/Gemini-STT-LLM-TTS-01/pull/5)。本提交补充最终交付信息，随后按已确认计划合并PR并创建annotated tag `V0.0.2-build.149`（test最终提交累计数，非main合并提交计数）；最终远端PR / tag核验见主会话汇报。Phase 5、P1与其余残余仍未授权。
- **VPS 现状**：Vultr Seattle、1核1G、Ubuntu 26.04.1，内核 7.0.0-38、Node v24.21.0，Auto Backup 已开启；gemini-admin 公钥管理，禁用 root / 密码 SSH，UFW 仅开放 22/tcp。gemini-server / gemini-bot 两个非 root systemd 服务 active / enabled，Express 仅监听 127.0.0.1:3001，数据目录独立持久化。无域名、仅本人使用，通过 SSH 隧道访问 http://127.0.0.1:18080，详见 [运维说明](../deploy/README.md)。服务保持常驻。 当前发行物v002-6f81048，两个服务实际进程cwd均为该目录，NRestarts=0；server.env配置生成10 / Web保留4、计数20 / Web保留8及首包60秒 / 总90秒，bot.env和systemd单元未改。
- **最近交付 commit**：`ba0ac12` — `fix: reject whitespace source URLs and verify search security boundaries`，已推送origin/test；本状态收尾后tag `V0.0.2-build.220`。Task 20 Step 3待Claude复核；现网仍v002-6f81048，本轮无部署。
- **当前测试基线**：Task 21 Step 1全量43/43文件742/742用例（新增91），最终源码连续3轮通过；根 / 四包类型检查及Web / Express / Bot三构建通过，台账43文件逐项计数与JSON一致。全部7轮全量及首轮沙箱listen EPERM / 关联超时明细见tests.md；完整输出`/private/tmp/task21-full-<N>.json`及`.log`不入Git。HTTP测试获准沙箱外使用本机临时端口，所有外部上游Mock。22文件批准范围和diff检查通过；无真实API / Key / 生产数据 / VPS访问，现网仍462/462基线，服务端1.8mb既有大小标记保留。
- **当前功能验收**：Playground 仅连接后端服务；启动时恢复最近活动会话，无可恢复会话时创建新会话。发送仅提交本轮输入、`sessionId` 与稳定 `requestId`；失败重试复用同一 `requestId`，不重复保存输入，已完成回复直接回放（ADR-012）。服务端从完整持久化日志中选取有限上下文窗口送入模型，完整日志不变（ADR-013）。清空对话归档旧会话并切换至新会话。Discord 管理员可在指定频道以 `@Bot /reset` 归档并重置频道会话（ADR-014）。旧版直连设置迁移为后端模式并清除浏览器存储的 Key 字段。

## 下一步计划

Task 21 Step 1已经Claude复核通过（2026-10-19）；下一个待办为用户单独指派 Task 21 Step 2（首个子步骤修复W1 / W2）。原记录：停止，等待Claude复核Task 21 Step 1（交付30fbfa3及本状态收尾）；后续开发为用户单独指派Task 21 Step 2，包含Discord命令 / 来源展示与S2 / S3。D12既有UI片段和重试差异归P1-4 / R3，未顺带修改；deployment-validation第96行偶发失败根因未确认、另行立项，本轮沙箱EPERM失败与其不同。Task 22真实网络 / 延迟验收与上线受N3用途许可门槛约束；不真实验收、不部署，P1-4 / R3、M1 / VPS扫描、Q4及其他残余待另行授权。

## 本轮验收与遗留

- **Claude Task 21 Step 1 复核（2026-10-19）**：复核通过，W1 / W2登记于backlog，D12既有差异待用户决定。仅修改backlog / history / status，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **Task 21 Step 1 / V1（2026-10-19，待Claude复核）**：22文件，新增91项，43/43文件742/742用例最终连续3轮通过，类型 / 三构建 / 台账 / 安全扫描通过；V1与无效URL仅标题域名回退均有先红后绿证据。完整实现、安全与TDD映射、沙箱80项环境失败明细见tests.md；backlog已勾选并修订Step 1，history已追加。生产无搜索网络，D12差异、S2 / S3、N3 / Task 22及既有偶发失败保留，未跟踪.zcodeignore不提交。

- **Claude Task 20 Step 3 复核（2026-10-19）**：复核通过，连续5次全量651/651用例通过；V1登记于backlog Task 21前置，偶发失败用例已定位、根因未确认。仅修改backlog / history / status，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **Task 20 Step 3（2026-10-19）**：最终威胁→测试映射见tests.md的Step 3节；固定端点、不跟随跳转、不读取结果地址、资料角色 / 标记隔离、来源URL / 域名 / IDN / 元数据严格读取、取消 / 慢流 / 超量 / 迟到 / 不合作清理与锁、身份 / 回放 / 预算、上下文及固定错误白名单均有Mock证据。应用源码仅safeUrl空白过滤一行，新增两例先红后绿；其余改动为8测试文件与5文档。成功sources允许经校验的展示URL，错误诊断与日志不含供应商原文 / query / Key / stack。Mock不证明模型语义免疫、来源事实正确或OS文件权限隔离；Web / Discord渲染、真实端到端网络与期限仍待Task 21 / 22。全量第3轮既有部署用例失败已记账，未修改其断言或脚本。既有.zcodeignore保留未跟踪、不提交。

- **T1–T3修复（2026-10-18）**：15文件交付；T1默认20轮回复100 / 200 / 400字保留3×100字摘要、删除最旧历史，保存的来源与实际注入一致。无历史最小输入只按与select一致的安全阈值裁资料，不再为完整历史缩成一字；ADR-015 §3 / §8已澄清。T2read / write期间取消仍ABORTED且不搜索，后续请求等待原tail任务完成后重读；读取消不扣、写取消保留已落账预留，保持单写者 / 先落账。T3准入结果区分允许、admission_denied和ledger_unavailable；坏账本 / 写失败使用新原因，刷新 / 重启回放一致，额度不足保持原原因，实际IO故障仍关闭至重启。新增9项，全量568/568、类型 / 三构建 / 台账映射通过。全部Mock，不真实调用 / 部署；修复待复核，Step 3不勾选不开工，既有`.zcodeignore`未跟踪文件保留不提交。

- **Task 20 Step 2（2026-10-18）**：批准22文件范围交付。搜索全局 / Web保留 / Discord总额 / 用户 / 频道守卫原子检查、日attempts与credits分开持久化，先落账再请求；回放 / 冲突 / 非法问题 / 缺身份不扣搜索额度，降级不重复扣生成。搜索429只暂停搜索60秒，N4坏账本或读写失败关闭搜索、不清零且普通聊天可继续；已知账本消失 / 改写也关闭，人工恢复须保留额度证据。默认搜索8秒、生成90秒、两次计数各3秒合104秒≤115，搜索准入后用单调115秒协调上限贯穿阶段，首包60秒 / 总90秒从生成开始语义不变，存储副作用与端到端IO不作本步保证。资料2048估算tokens，先缩摘要 / 减来源后裁历史，实际展示摘要与注入一致；N1取共享 / 搜索系数较大值，只更新独立搜索系数（1.25→最多4），完整输入基数含系统规则 / 历史 / 问题 / 资料。新增48用例，全量559/559、类型 / 三构建 / 台账映射通过。配置10项及校验、人工恢复、提示词§2–5→测试映射见ADR-015 §8与tests。生产未装配搜索网络、不读取真实Key或改部署文件；本地Mock / 临时账本，无真实模型 / 搜索 / Discord / VPS调用。保守预留不等同实际账单；单Express / 单写者，分钟额 / 429暂停仅内存。Step 2待复核、Step 3与Task 21–22未启动；既有`.zcodeignore`保留不提交。

- **Claude S1 / S4 修复复核（2026-10-18）**：复核 `d5282ed` / `c13acce` 通过，clamp幂等且与持久化校验一致，8项新增回归覆盖单元与HTTP保存 / 重启回放；全量38/38文件511/511用例及根 / 四包类型检查本机通过。仅修改history / status，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **S1 / S4修复（2026-10-18）**：批准9文件范围；clamp清理控制字符、去首尾空白并按码点截断后再次trim，保证来源规范化稳定且可通过持久化校验。标题120 / 摘要100边界覆盖普通空格、制表符、不换行 / 全角空格、零宽 / 空控制字符及emoji / 中文。两项HTTP Mock验证成功保存 / done、刷新来源与重启回放一致、不重搜 / 不重新生成或扣额度。ADR-012 / 013只保留ADR-015前置裁决链接。新增8项，全量511/511、类型检查、三构建、台账及链接检查通过。只访问Mock / 临时JSON，不部署；S2 / S3及Step 2–3未开工，既有`.zcodeignore`未跟踪文件保留不提交。

- **Claude Task 20 Step 1 复核（2026-10-18）**：复核 `debea5b` / `8ed5600` 有条件通过，本机全量38/38文件503/503用例及根 / 四包类型检查通过；S1以tsx脚本复现（scratchpad，不入Git）。S1–S4写入history、backlog Task 20前置同步。仅修改backlog / history / status，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **Task 20 Step 1（2026-10-18）**：按批准计划共30文件（含本状态）；Q1只搜索轮次先生成准入，普通轮次保持原序；搜索模式参与指纹，旧请求缺省false，回放 / 冲突不搜索不扣预算。HTTP无Origin loopback合法Discord身份经内部选项传入，来源 / 频道仍取持久化origin，缺身份固定降级；不扩展公网鉴权。来源≤3、标题≤120码点、摘要≤100码点、URL≤2048字符、响应边读≤256KiB；仅模型资料编号 / 标题 / 域名 / 摘要，转义隔离标记 / 控制字符，完整URL仅元数据。注入资料与系统隔离规则参与总窗口，实际注入轮次跳过observe；降级重选共用最多两次计数，超限不追加输入、已扣额度不退。成功非空回复保存来源再发done，刷新 / 重启回放一致，后续历史只对话正文，旧日志不改写；取消不等待忽略abort上游、迟到结果不生成不保存。新增32测试，全量503/503、类型 / 三构建 / 台账映射通过；未触碰生产服务、真实数据、Key或网络API。生产无搜索适配器时明确降级，不自动发付费请求。Step 1待独立复核，Step 2 / 3及Task 21 / 22尚未授权。既有未跟踪`.zcodeignore`保留，不提交。

- **Task 20 前置裁决（2026-10-18）**：Q1–Q3及Step 1 / 2边界登记于backlog / history / status；未改ADR / 源码 / 测试 / 配置，未运行测试（无代码变更）；既有未跟踪 `.zcodeignore` 保留。

- **Claude Task 19 Step 3 复核（2026-10-13）**：复核 `3c07804` / `9a2ca66` 通过，确认仅八份文档变更、diff空白及ADR-015本地链接有效，ADR引用的现有代码基线一致；Q1–Q4写入history、backlog Task 20前置同步。仅修改backlog / history / status，测试台账不变、未运行测试（无代码变更）；既有未跟踪 `.zcodeignore` 保留。

- **Task19 Step3（2026-10-13）**：批准的八文档交付：新增ADR-015，同步ADR-007 / ADR-009、roadmap / risks / backlog / history / status。U1 / U2、D01–D14、N1–N4及SSRF / 提示注入威胁模型、最终事件来源 / 搜索状态、safeStreamError、D12中断实施边界均覆盖。Step3已勾选，全量36/36文件471/471用例、根 / 四包类型检查、本地链接 / 范围 / diff检查通过；首轮沙箱监听EPERM后获准外部重跑，无新增测试 / 构建 / 真实调用 / 部署。
- **Step3遗留**：Tavily用途许可与中文质量 / 生产延迟仍待补，N3真实验收 / 上线门槛保留。Task20–22、P1-4 / R3实施、M1 / VPS扫描、其他残余未授权；根AGENTS.md旧摘要未纳入本计划，既有.zcodeignore保留，现网仍v002-6f81048、K1未部署。交付提交3c07804已推送origin/test；本状态收尾提交后按累计192打V0.0.2-build.192 annotated tag并推送，最终远端核验见主会话汇报。

- **Claude Task 19 Step 2 复核（2026-10-12）**：复核 `0466511` / `be28dfe` 通过，确认仅文档变更、全量36/36文件471/471用例、根 / 四包类型检查通过；N1–N4 写入预研第 11 节，backlog Task 19 Step 3 / Task 20 Step 2 / Task 22 同步。仅修改 backlog / history / 预研报告 / status，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **Part B Task19 Step2（2026-10-12）**：四文件research/phase5-search.md / backlog / history / status同步。仅官方资料比较Tavily / Parallel，U1 / U2及D01–D14逐项用户裁决已完整记录，无待用户选择设计项；供应商用途许可及性能仍待补证据。Tavily basic / 原生HTTP、Web开关 / Discord /search、只摘要最多3条各100字+链接、非可信隔离与安全展示、8192 / 2048完整输入校准、成功摘要 / 来源持久化及回放、独立搜索分钟 / UTC日 / 用户 / 频道预算、8+90+6=104≤115秒、失败告知后普通生成 / 取消停止 / 搜索429只暂停60秒、最终成功落盘 / 中断移除临时回复 / 保留user重试、Key与query最小化 / 固定错误已定。全量36/36文件471/471用例与根 / 四包类型检查通过，基线 / 台账不变；未注册 / 加依赖 / 调用真实API / 访问会话 / Discord / VPS，未写ADR-015或实施后续任务。既有.zcodeignore保留，历史已追加、Step2已勾选；待Claude复核。

- **Claude K1 复核与 M1 登记（2026-10-12）**：复核 `f38a2e9` / `2a9ea12` 通过，重跑全量36/36文件471/471用例、根 / 四包类型检查通过；残余 M1（修复前历史空 assistant 原样作为空文本发给模型，如上游拒绝则会话在窗口内持续失败）登记为低优先级未授权项，本机 data 只读统计为0，VPS 未检查。仅修改 backlog / history / 审计报告 / status，测试台账不变；下一个待办为 GPT 执行 Part B（Task 19 Step 2）。既有未跟踪 `.zcodeignore` 保留。

- **Part A K1（2026-10-12）**：按确认计划修改13文件，SDK send / stream在任意结束原因下拒绝空 / 纯空白正文，新固定MODEL_ERROR文案经safeStreamError精确白名单下发；MAX_TOKENS原文案与有正文截断保持。会话 / 非会话流源在校准 / appendAssistantResponse前拒绝空done，不保存新空assistant、不发done。模型失败释放锁、保留user、同requestId重试复用输入成功，完成回放不调用模型 / 预算，空正文不pause；Bot既有MODEL_ERROR固定反馈通过。
- **K1验证**：新增9用例、先复现7失败后实现；定向4/4文件151/151用例、全量36/36文件471/471用例、根 / 四包类型检查与Web / Express / Bot构建通过。台账全36文件数量及四个变更文件标题全部核对一致。finishReason日志只接受枚举值、未知OTHER、缺失省略，不泄露正文 / Key / URL / stack。ADR-013 / 审计证据 / backlog / history / tests已同步，K1已勾选。
- **K1边界**：历史空assistant不删除、不改写、窗口不额外跳过，原轮次配对及ADR-012已有回放保持；旧空回复回放仍可能空气泡或Bot静默。适配器空输入不调用上游的快捷路径不变；已耗生成额度不回退。未访问真实Gemini / Discord / 会话 / VPS，未部署；现网仍旧源码6f81048。测试JSON结果/private/tmp/k1-test-results.json不入Git，既有.zcodeignore保留；Part B及其他残余未实施。

- **Claude Task 19 Step 1 审核（2026-10-12）**：审核 `4ab1344` / `6d5d4aa` 通过，重算探针 / 结果 SHA256 一致、结果无 Key、真实调用与费用边界符合确认计划；K1（非 MAX_TOKENS 空正文被保存为空 assistant、Web 空气泡、Bot 静默不回复）登记为未授权审计项，L1–L3 写入预研报告第 9 节并并入 Step 2 裁决输入。仅修改 backlog / history / 审计报告 / 预研报告 / status，全量36/36文件462/462用例、根 / 四包类型检查通过，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **Task 19 Step 1预研（2026-10-12）**：新增[搜索报告](research/phase5-search.md)，同步backlog / history / status。离线真实SDK3/3检查、全量36/36文件462/462用例、根 / 四包类型检查通过；首次沙箱HTTP监听EPERM后获准外部重跑通过，无新增测试，台账不变。
- **真实探针与边界**：已获费用确认，仅models.list1次（62模型）、countTokens1次（55）、生成2次。当前Key / gemini-3.8-flash grounding成功，1条查询 / 3条HTTPS跳转来源、长度187 / 203 / 199；首正文6657ms / 总7399ms、来源仅末chunk、建议HTML长4600。无搜索对照MALFORMED_FUNCTION_CALL无正文，未重试，不宣称有效对照差值；工具 / 思考token字段缺失，不推断为0。两次输入110 / 输出134，按1次收费查询估算$0.014585，实际账单与免费余额未知。外部API仅官方资料对比，Google展示 / 留存与Discord适配、ADR-013校准须在后续裁决。
- **范围与临时文件**：只改四份文档，未修改应用 / 配置、未访问VPS / Discord / 真实会话或第三方搜索。探针及脱敏结果位于/private/tmp/gemini-task19-step1，报告记录SHA256，不入Git；既有.zcodeignore保留。Step1已勾选，后续Step未授权。

- **Task 19–22 正文修订（2026-10-12）**：用户确认 Claude 计划，backlog Phase 5 章节补充各 Step 的核实项、裁决项与验收要求（29 条审查意见中 5 条不再需要，另并入 G2 / H3 / F1）；仅修改 backlog / history / status，未修改应用 / 测试 / 配置或现网，全量36/36文件462/462用例、根 / 四包类型检查通过，测试台账不变。Task 19–22 均未授权；既有未跟踪 `.zcodeignore` 保留。

- **P1前置四项VPS部署验收（2026-10-12）**：源码6f81048固定，版本0.0.2，发行物v002-6f81048已切换；本机 / Linux各36/36文件462/462用例、根 / 四包类型检查及三构建通过，生产审计0漏洞。构建期间旧服务运行；切版停Bot再停Express，备份data-20261012T181910Z.tar.gz及本机受保护副本SHA通过，隔离恢复 / 切版后真实验收前5文件SHA完全一致。所有旧消息、创建时间、归档标记逐项保留，Discord绑定未改。
- **本轮双入口与运维证据**：两服务active / enabled、Bot ready、NRestarts=0且进程cwd为新目录，Express仅127.0.0.1:3001。Web旧6条恢复、新增两条，真实回复“P1部署成功”（193 total tokens），刷新后8条恢复；用户确认Discord正常，input handled=1 / failed=0、活动频道新增user / assistant各1条，归档频道14条 / 2条未改。无sessionId请求400、../x返回固定UNKNOWN存储失败文案的无副作用探针通过；真实429 / 超时未强制触发。详细证据见部署记录第12节。
- **回滚与遗留**：旧发行物v002-9b9a116、root专属server.env.pre-p1-20261012T181909Z及应用备份保留；失败时恢复代码 / 配置，不覆盖会话日志。服务与本机18080 SSH隧道保持运行，本轮不新增自动监控、不执行主机重启或24小时观察；Task19及其他残余未授权，既有.zcodeignore保留。临时Web验收截图/private/tmp/gemini-p1-web.png不入Git；六份部署 / 状态文档已同步，本次没有源码变更。

- **Claude P1-7 复核与残余登记（2026-10-12）**：复核 `e762790` / `261b829` 通过，重跑全量36/36文件462/462用例、根 / 四包类型检查通过；残余 H1（Discord 触发的计数 429 缩短 Web 记忆）、H2（保留额度比例未校验，属 C4 延伸）、H3（生成额度耗尽前仍先计数，Task 20 须先判定搜索预算）登记为低优先级未授权项。Phase 5 Part 1 前置四项均已完成并经复核，四项修复均未部署 VPS；下一个待办为另开一轮审议 Task 19–22 正文审查意见，Task 19 仍须用户指派。仅修改 backlog / history / 审计报告 / status，无新增测试，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **P1-7 来源保留预算验收（2026-10-12）**：生成总10 / Web保留4 / Discord6，计数总20 / Web保留8 / Discord12，Web可使用全部总额度；所有守卫同步允许后才扣额，拒绝不占生成额度。来源只读持久化origin、旧会话按web，请求体不可伪造；计数来源通过调用参数传递，不加单频道上限。模型429全局暂停生成、计数429只全局暂停计数（各默认60秒），生成超时不pause；账户级429仍可能暂停Web，是已确认策略边界。
- **P1-7 验证与边界**：新增1文件17项，定向4/4文件80/80用例、全量36/36文件462/462用例、根 / 四包类型检查及Web / Express / Bot构建通过；台账逐文件 / 标题 / 数量一致，首次沙箱HTTP监听EPERM后获准重跑全量通过。回放 / 冲突、锁、幂等、输入写入位置、窗口降级、固定SSE提示与Bot冷却 / 排队不变，已发生窗口计数不因后续生成拒绝回滚。配置示例 / 运维 / ADR-012 / ADR-013 / 审计 / backlog / history已同步；未查询真实配额，未访问真实Gemini / Discord / VPS / 会话数据，未部署。既有.zcodeignore保留，P1-7待Claude复核，Task19及其余项未授权。

- **Claude P1-3 复核与残余登记（2026-10-12）**：复核 `2826331` / `e51f8be` 通过，重跑全量35/35文件445/445用例、根 / 四包类型检查通过；残余 G1（`UND_ERR_*` / TLS 网络故障归为 UNKNOWN 且日志缺 errno）、G2（Web 横幅信任服务端文案，Phase 5 新错误路径须经 `safeStreamError`）登记为低优先级未授权项。仅修改 backlog / history / 审计报告 / status，无新增测试，测试台账不变；Part 1 前置仅剩 P1-7，下一个待办为用户指派 P1-7。既有未跟踪 `.zcodeignore` 保留。

- **P1-3错误分类与安全下发验收（2026-10-12）**：会话流源标记storage / count / model，inspectRequest / appendTurnInputs / appendAssistantResponse普通失败返回UNKNOWN固定存储文案，不调用模型分类器；收窄TypeError网络判定，会话 / 低层 / Mock路径的SSE仅固定文案，日志只记录受约束的stage / code / name / errno / status，不记录message / stack / 正文 / Token / Key / URL，省略sessionId / requestId。Web HTTP / 浏览器错误固定文案，横幅及Bot业务代码不变，Bot UNKNOWN固定BACKEND提示与日志已验证；既有超时、冲突、窗口、计数降级、429暂停、保存失败不发done、锁释放和同标识重试 / 回放语义保持。新增1文件40项，35/35文件445/445用例、根 / 四包类型检查及三构建通过，台账逐项一致，首次沙箱HTTP监听EPERM后获准重跑全量通过。ADR-009 / 审计报告 / backlog / history已同步；仅Mock与隔离临时JSON存储，未访问真实Gemini / Discord / VPS / 会话数据，未部署。既有React act警告与未跟踪.zcodeignore保留，等待Claude复核，其余任务未授权。

- **Claude P1-2 复核与残余登记（2026-10-12）**：复核 `137a94b` / `8db43c8` 通过，重跑全量34/34文件405/405用例、根 / 四包类型检查通过；残余 F1（超长回复可能触发90秒总期限）、F2（超时后上游可能仍在计费）登记为低优先级未授权项，R3 补充超时触发路径。仅修改 backlog / history / 审计报告 / status，无新增测试，测试台账不变；下一个待办为用户指派 P1-3 或 P1-7。既有未跟踪 `.zcodeignore` 保留。

- **P1-2 / R2 修复验收（2026-10-12）**：默认首包60秒 / 总生成90秒，环境配置 / 两次计数余量启动校验；Gemini与Mock共用守卫，next独立竞速即使adapter忽略abort或return挂起也能退出，本地流finally解锁。超时固定MODEL_ERROR，客户端取消静默；部分 / 迟到assistant不落盘，已存输入保留、同requestId重试复用，超时不暂停模型预算，计数逻辑与Bot120秒不变。新增11项，真实SessionService / 隔离JSON日志、SDK / 模型Mock、假时钟及HTTP序列化回归通过；34/34文件405/405用例、根 / 四包类型检查与三构建、台账逐项核验通过。配置示例、运维说明、ADR-012、审计 / backlog / history同步。未访问真实上游 / Discord / VPS / data，不保证不响应abort的远端计算 / 计费已终止；Claude复核待完成，既有React act警告与未跟踪 `.zcodeignore` 保留，其他任务未授权。

- **Claude P1-1 复核与残余登记（2026-10-12）**：复核 `1ea6c50` / `e3267b9` 通过，重跑全量33/33文件394/394用例、根 / 四包类型检查通过；残余 E1（Web 残留无状态分支，可并入 P1-6）、E2（服务端无状态工厂路径残留）、E3（修复前历史注入 assistant 消息）登记为低优先级未授权项。仅修改 backlog / history / 审计报告 / status，无新增测试，测试台账不变；既有未跟踪 `.zcodeignore` 保留。

- **P1-1 修复验收（2026-10-10）**：HTTP 默认要求非空白 sessionId、单条非空白 user，覆盖无 requestId 的 Bot；缺失会话和伪造历史返回400。allowStateless 仅代码显式测试注入，生产入口不启用；会话流源在锁 / 存储 / 预算 / 模型前复用校验且移除无状态回退，非法直接调用返回固定 UNKNOWN，无副作用。新增7项、33/33文件394/394用例、根 / 四包类型检查及三构建通过，台账逐项一致；历史日志不改写。未访问真实 Gemini / Discord / VPS / data，现网仍为原版本，既有 React act 警告和未跟踪 `.zcodeignore` 保留；其余前置与 Phase 5 未授权。

- **Phase 5 Part 1 审计前置登记（2026-10-10）**：Claude 复核 Task 19–22 与审计未修项，用户确认方式 A。backlog 审计修复组新增「Phase 5 Part 1 前置」四项，Phase 5 章节写明依赖顺序、P1-4 + R3 / P1-8 定案前裁决及 P3-7 / P3-3 / P2-4 视裁决再定；审计报告追加前置复核一节。仅修改 backlog / history / 审计报告 / status，未修改应用 / 测试 / 配置或现网；全量33/33文件387/387用例、根 / 四包类型检查通过，无新增测试，测试台账不变。前置四项与 Task 19–22 均未授权；既有未跟踪 `.zcodeignore` 保留。

- **Phase 5 Part 1 任务拆解登记（2026-10-09）**：用户确认 GLM-5.3 提案后，backlog 新增 Phase 5 章节登记 Task 19（预研与架构定案：方案对比 / 真实探针、裁决清单、ADR-015）、Task 20（服务端实现：搜索接入与触发、独立预算超时与 ADR-013 协调、SSRF 与间接提示注入防护）、Task 21（Web / Discord 双入口来源展示）、Task 22（真实验收、VPS 切版与结项），并移除已被覆盖的原 Part 1 预研占位项。仅修改 backlog / history / status，未实施任何 Task，未触碰应用 / 测试 / 配置或现网；全量33/33文件387/387用例、根 / 四包类型检查通过，无新增测试，测试台账不变。Task 19–22 均未授权；Part 2 / Part 3 预研、P1 及其余审计项不在本轮范围；既有未跟踪 `.zcodeignore` 保留。

- **Codex git-ops 当前版本号修正（2026-10-09）**：仅修改 `.codex/agents/git-ops.toml` 的当前 tag 版本为0.0.2，并同步 backlog / history / status；TOML解析、版本断言与diff检查通过，全量33/33文件387/387用例、根 / 四包类型检查通过。首次沙箱HTTP监听EPERM后经批准重跑通过，无新增测试，测试台账与应用源码不变；既有未跟踪 `.zcodeignore` 保留。

- **V0.0.2 部署验收通过（2026-10-07）**：源码固定9b9a116，发行物 `/opt/gemini-chat/releases/v002-9b9a116` 已切换；本机 / Linux 33/33文件387/387用例、类型检查与三构建通过，Linux复用现网lockfile且生产审计0漏洞。备份data-20261008T021952Z.tar.gz校验通过，切版前全部3个数据文件校验一致；两服务active / enabled、Bot ready、仅loopback监听。管理员名单已配置；Web真实回复“新版部署成功”（199 total tokens）且刷新恢复通过。用户确认Discord三项验收，旧会话14条消息且备份中原8条完整保留、新绑定2条消息、两服务NRestarts=0。发布PR #5；最终tag预期V0.0.2-build.149，由主会话完成合并 / 远端核验汇报。旧发行物和root专属bot.env备份保留。

- **P0-1第二步（2026-10-06）**：管理员精确/reset权限分流、FIFO / 冷却、旧目标幂等归档 / resolve确认与共享SessionService已实现；生成 / Web归档 / 重置共锁，冲突409及Bot固定提示。新增23项，33/33文件387/387用例、类型检查三构建通过，覆盖失败自然恢复、旧日志 / 其他频道 / 重启、重复目标、取消与迟到解析、本机HTTP新上下文，见 [ADR-014](adr/0014-discord-session-reset.md)。P0-1两步及P0-2 / P0-3代码修复完成；管理员名单默认空，未部署VPS或真实Discord验收，取消不回滚归档、挂起锁仍属P1-2。C3–C5与其余任务未授权；.zcodeignore保留。

- **C3–C5登记（2026-10-06）**：backlog已独立记录不均匀历史利用率、计数 / 生成频率关系、优先较大已验证窗口；均为低优先级未授权，不阻塞当前验收。本轮仅修改backlog / history / status，未修改应用 / 测试 / 配置或现网；全量33/33文件364/364用例通过，无新增用例，测试台账不变。既存.zcodeignore保留。

- **Claude C1 / C2修复（2026-10-06）**：计数前硬裁改为候选保留 / 最近8轮取样，观测比率可低于1且允许加回连续轮次，最多两次计数核验，失败保留已验证安全取样或本地80%降级。三组模拟夹具保留8 / 11 / 9轮，利用率87.8% / 88.1% / 92.4%，计数1 / 2 / 2次；不代表真实Gemini token测量。新增9项33/33文件364/364用例、类型检查和Web / Express构建通过；C2计数不可用时记忆可能变短明确记录，原审计发现保留并追加修复证据。未修改P0-2语义、SDK计数兼容或现网，P0-1第二步仍未授权；既存.zcodeignore保留。

- **P0-1 第一步（2026-10-06）**：有限模型视图 / 完整日志保留，本地估算为主，边缘 contents 计数加系统文本本地估算，次数 / 超时有界，失败收缩而不回退全量；用量校准内存限幅并记录不含正文的调整。真实 SDK 离线探针确认 Developer countTokens 不支持 systemInstruction（fetch 0），核心历史系统合并函数保留。重试尾输入只计一次、完成回放先执行，超限新输入不落盘；MAX_TOKENS 有正文提示与日志一致，无正文不存空 assistant，Web / Bot 固定超限反馈。新增1文件28项，33/33文件355/355用例、类型检查三构建通过；见 [ADR-013](adr/0013-context-window-policy.md)。本地估算不是数学 token 上界，截断提示会进入后续窗口；未访问 VPS / 真实上游 / 会话数据。第二步 Discord 重置与归档锁未授权，P0-1 整项保持未完成；既存 .zcodeignore 保留。

- **Codex git-ops Tag 规则同步（2026-10-06）**：依据当前 AGENTS.md / rules.md，配置为每步全部提交（含状态收尾）推送后自动打 annotated tag 并单独推送；沿用版本 0.0.1，N 取最终目标累计提交数，核验同名 tag、远端对象和 peeled 提交。模型与并发 Git 边界保留；配置 / 七项规则检查通过，32/32 文件、327/327 用例与根 / 四包类型检查通过，无新增测试或应用变更。运行时子代理加载未实测；既存 .zcodeignore 保留，不提交。

- **P0-2（2026-10-06）**：稳定 UUID 请求标识、末尾输入复用、已完成回复优先回放、全会话锁与存储队列防重复输入 / 回复已实现；正文 / 顺序冲突立即拒绝，停止后上游退出前的重发显示固定 REQUEST_CONFLICT 提示。旧文件 / 无标识 Bot 兼容，重启后依持久化元数据复用或回放；UUID 替代路径与严格带标识校验有测试。新增 22 项、全量 327/327 及类型检查、三构建通过，详见 [ADR-012](adr/0012-request-idempotency-and-retry.md) 与测试台账。本轮未访问 VPS / 真实模型 / Discord / 真实会话数据；P0-1、P1-4 与其余审计项未授权，Bot 幂等仅登记未授权后续项。既存 .zcodeignore 保留，不纳入提交。

- **P0-3（2026-10-06）**：根开发脚本改为 `--host=127.0.0.1`，保留 `--port=3000 --strictPort`；实际 `npm run dev` 所有 3000 监听均为 `127.0.0.1`，首页 HTTP 200，隔离 Mock `/api` 代理正确转发并保留既有 Origin 行为，3/3 通过。全量 32/32 套件、305/305 用例与根 / 四包类型检查通过。验证进程已停止、3000 无监听；临时验证脚本未入库，没有新增测试用例，未访问真实模型、Discord、VPS 或真实会话数据。仅本项修复，P0-1 / P0-2 未授权；显式 host 覆盖仍可由使用者主动开启。

- **Codex 项目子代理配置（2026-10-06）**：五角色配置已创建于 `.codex/agents/`：code-explorer = GPT-6 Luna / high；implementer = GPT-6.1 Sol / high；test-writer = GPT-5.6 Terra / high；test-runner 与 git-ops = GPT-6 Luna / medium。只读探索、指定文件实现 / 测试、验证执行与 Git 交付分工，均要求继承当前授权；默认仅 git-ops 可推 origin/test。静态校验 5/5、全量 32/32 套件和 305/305 用例、根与四包类型检查通过；首次沙箱 listen EPERM 后经批准重跑通过。未实测自定义代理运行时加载或执行，未修改应用 / 测试 / 现网，测试台账不变；既存未跟踪 `.zcodeignore` 保留，不纳入交付。

- **Phase 4 结项后代码与安全审计（只读，2026-10-06）**：用户指派审计并确认记录计划；Opus 5.5 逐文件审阅 server / core / bot / src 源码与 deploy 配置，执行 npm audit 与 git 历史密钥检索。当前私有拓扑下未发现可被外部直接利用的高危漏洞；识别 P0 3 项、P1 8 项、P2 5 项、P3 13 项，其中 3 项已实测复现。报告见 [审计报告](research/phase4-code-security-audit.md)，修复项登记于 backlog「审计修复」组（未授权），风险台账新增风险 13。本轮只改文档，未修改应用 / 测试代码或现网配置，测试基线不变；VPS 实际配置与动态测试未覆盖。

- **Task 18 Step 3 / Phase 4 正式结项完成**：路线图三项退出条件逐项核对通过，真实与Mock证据边界保留；本轮全量32/32测试文件、305/305用例、根与四包类型检查通过，台账逐项一致，修正一个Demo既有标题漏字。首次沙箱HTTP监听EPERM后经批准重跑全量通过；未修改应用 / 测试代码或现网配置。根AGENTS.md阶段摘要和ADR索引按确认计划以`f98920d`独立提交，结项文档以`b8c28cf`提交，均已推送origin/test；本步已勾选，历史只追加，Phase 5未授权。

- **Task 18 Step 2 完成**：真实同boot与两进程连续108506秒（30小时8分），1781个健康样本，最大间隔61.24秒；有效故障与自动重启0。22次自动恢复合计16.429573秒、最长1.698147秒，符合用户允许的≤5秒口径，原13个失败样本保留；独立原始样本 / journal核对无未配对、旧进程或硬错误。RSS末72.7 / 峰98.3 MiB，heapUsed末 / 峰23.4 MiB，未见持续失控增长。主机重启自动恢复、原会话文件一致、Web新回复、Discord服务端证据与用户确认均通过；本机 / Linux32/32套件、305/305用例及类型检查通过。验收timer已disabled / inactive，聊天回访已PAUSED，最终新鲜报告与原始journal保存于VPS root专属目录；两应用常驻。功能提交`bf7391c`已推送至`origin/test`，本步已勾选并追加历史，Step 3结项见上项；详见[观察记录](research/phase3-deployment.md#10-task-18-step-2上线验收)。

- **Task 18 Step 1 验收**：本机 / Linux 31/31 套件、294/294 用例、类型检查、Linux 三构建与文档检查通过。新内核上线前重启与加固管理入口验证通过；两个服务 active / enabled，Bot 真实 ready，SSH 隧道 Web 真实模型回复“连接成功”，备份重启服务后刷新恢复会话。归档校验、隔离恢复逐文件对比与本机 data/vps-backups 异地副本通过；九个部署源码配置与工作区校验一致，运行进程密钥按职责隔离。功能提交 `65c4fb2` 已推送至 `origin/test`，发行物 task18-20261005-01 摘要见 [部署记录](research/phase3-deployment.md#9-task-18-step-1私有-vps-实施记录)。既有 UI 测试 React act 警告与系统 XFS CPUAccounting 弃用提示已记录，生产审计 0 漏洞。首次部署暂无上一发行物，备份暂为手动；Step 1完成时尚未进行的长时 / 上线后主机重启 / 双入口消息验收已由本轮Step 2通过。本机隧道和 VPS 常驻服务保持运行，既有本地开发会话未迁移。

- **Task 17 Step 3 验收**：30/30 套件、287/287 用例、类型检查、Bot 构建及文档检查通过；新增 15 项事件注入 / 假时钟测试，验证可恢复关闭、六种致命关闭、重复回调、活动请求跨重连与模拟 24 小时 / 100 次恢复下资源清理。补齐致命关闭码、单次退出通知、shard / replayed 日志及 30 秒内存采样。功能提交 `64d8b12` 已推送至 `origin/test`；未启动真实 Bot / 后端测试进程，未修改真实 Token / 网络。模拟不证明真实 SDK 重连或长期内存稳定，真实断网与超过 10 分钟观察仍为 Task 15 Demo 历史证据，边界详见 [第 12 节](research/phase4-discord.md#12-task-17-step-3网关稳定性验证)。

- **Task 17 Step 2 验收**：30/30 套件、272/272 用例、类型检查与 Bot / Express 构建及文档检查通过。用户确认后端未运行时收到连接失败提示、Bot 在线；后端恢复后同一 Bot 记录 input handled，Discord 元数据确认失败提示之后发送非空回复（30 字符、无提及）。Discord 权限 / 消息失效与反馈失败由 Mock 验证，未修改真实 Token 或频道权限。测试进程已停止，完成标记与记录已同步，功能提交 `fab670b` 已推送至 `origin/test`。

- **Task 17 Step 1 验收**：29/29 套件、255/255 用例、根与四包类型检查、Bot / Express 构建及文档检查通过。用户确认五秒冷却提示；Discord REST 时间关系确认请求在长文结束前提交、对应回复在长文全部发送后。模型预算与上游 429 暂停由模拟测试验证，未人为消耗真实上游配额。禁用等待时频道释放顺序边界已修复并通过回归。Bot / 后端已停止，完成标记与记录已同步，功能提交 `374d055` 已推送至 `origin/test`。

- **Task 16 Step 3 验收**：27/27 套件、234/234 用例、根与四包类型检查及 Bot 构建通过；本地文档链接与 diff 检查通过。用户确认收到连续多条回复；网关 input handled，Discord REST 元数据确认 3 段长度 1947 / 1912 / 1856，首段回复原消息、后续为频道消息、无用户 / 角色提及；Bot 与后端已停止，完成标记与记录已同步，功能提交 `0f93dfb` 已推送至 `origin/test`。

- **Task 16 Step 2 验收**：26/26 套件、220/220 用例及类型检查、三项构建通过；用户截图确认连续直接 @Bot 获得对话回复，网关三次 input handled。前期无回复为同名角色提及，直接成员提及后成功。Bot Ctrl+C 后 stopped，后端已停止；完成标记与验收文档已同步，功能提交 `a4103f6` 已推送至 `origin/test`。

- **Task 16 Step 1 验收**：用户确认 general 普通文字无回复、直接 @Bot 收到入口确认消息；正式启动 ready、Ctrl+C stopped。typing 生命周期与过滤 / 错误 / 退出行为有 Mock 测试。当时测试进程已停止，Step 1 只确认收到消息；后端对话由本轮 Step 2 接入。
- **Step 3 架构验收**：ADR-011 落档与本地文档链接检查通过；23/23 套件、174/174 用例、lint、服务端严格类型检查和 build 通过。只改文档，测试台账基线不变。
- **Discord Demo 验收**：AlanChatBot 在线、general 回显、约 65 秒断网后恢复及回显通过；超过 10 分钟内存观察未见堆内存持续增长；SIGTERM 正常退出和再次登录通过。测试进程已停止，详见 [预研记录](research/phase4-discord.md)。
- **既有遗留**：未跟踪文件 `.zcodeignore` 为本轮开始前已有，未改动、未纳入提交；根 AGENTS.md 过期阶段摘要已按本轮确认计划修订，单独提交。

## 职责交接记录

2026-10-06：用户确认 Codex 五角色固定模型分工，详见本轮验收项与 `.codex/agents/`；Claude 既有 bug-reviewer / security-auditor / git-ops 配置保留。主会话负责授权、方案、分派、整合与验收；同一工作区 Git 交付一次仅由一侧负责。此记录不扩大任务授权范围。

2026-09-30：分工更新——Phase 4 开发由 GPT-6.1 Sol 承接（写代码主力）；其余分工沿用 2026-09-22 记录。Phase 4 拆解已落档（Task 15–18），各项待授权。

2026-09-22：更新工作流模型分工——架构设计：GLM-5.3；写代码（主力）：GPT-6 Sol；自动化测试编写：GPT-5.6 Terra；跑测试套件/看日志：GPT-6 Luna；代码 review/验代码：GPT-6 Sol，关键处升级至 Opus 5.5；安全审计：Opus 5.5。

2026-09-17 18:39:03 PDT：因 Google AI Studio 持续出现且并非个例的 “Internal Error”，GPT-5.6 Sol 临时接替 Gemini 3.8 Flash 处理开发任务，并完成 Task 11 与 Task 12 的开发。自 Task 13 Step 1 起，为节省额度，开发任务改由 GPT-5.6 Terra 承接；GPT-5.6 Sol 持续负责 AI 自动化验收。待 AI Studio 恢复后，开发执行者再由 Gemini 3.8 Flash 承接。本记录仅描述职责交接，不扩大当前任务授权范围。

## 越权处理

凡不在当前授权范围内的文件改动，一律回滚，并记录到 `dev-docs/risks.md`。
