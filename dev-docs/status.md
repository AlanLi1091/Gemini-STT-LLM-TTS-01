# Status

## 当前阶段

Phase 1–4 已完成并正式结项。Phase 5 Part 1 已启动预研：Task 19 Step 1于2026-10-12单独授权并完成；Step 2 / Step 3、Task 20–22及后续阶段仍未授权。

## 当前授权

- **本轮授权已完成（2026-10-12）**：用户指派 Claude 审核 Task 19 Step 1 并记录 K1、L1–L3、推送打 tag；审核通过，K1（非 MAX_TOKENS 空正文被静默保存）登记为未授权审计项，L1–L3 并入 Step 2 裁决输入（提交 `9db37db` 已推送 origin/test）。仅文档，未修改应用 / 测试代码；本状态收尾提交后按最终累计提交数创建 annotated tag。K1、Step 2 / Step 3 与 Task 20–22 均未授权。
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
- **最近交付 commit**：`9db37db` — `docs: record Claude Task 19 Step 1 review, K1 and L1-L3`（tag 见收尾）；Task 19 Step 1 预研 `4ab1344`（收尾tag `V0.0.2-build.180`）经 Claude 审核通过；前次正文修订 `2312399` — `docs: refine Phase 5 Part 1 tasks 19-22 from review findings`（tag 见收尾）；此前 P1 部署记录 `7f52533`（收尾tag `V0.0.2-build.176`）；VPS源码固定 `6f810486df9b99f9e32f777c394a4353e2109909`（来源tag `V0.0.2-build.174`），current指向 `/opt/gemini-chat/releases/v002-6f81048`。前置四项已修复、复核并部署；后续任务未授权。
- **当前测试基线**：本轮本机 / VPS Linux各36/36文件、462/462用例，根 / 四包类型检查及Web / Express cjs / Bot构建通过；无新增或修改测试代码。Linux复用现网lockfile并校验，生产依赖审计0漏洞；Web真实回复与刷新恢复、Discord用户确认及服务端元数据通过；既有React act警告记录保留，当前为上线冒烟，不宣称新版24小时验收。
- **当前功能验收**：Playground 仅连接后端服务；启动时恢复最近活动会话，无可恢复会话时创建新会话。发送仅提交本轮输入、`sessionId` 与稳定 `requestId`；失败重试复用同一 `requestId`，不重复保存输入，已完成回复直接回放（ADR-012）。服务端从完整持久化日志中选取有限上下文窗口送入模型，完整日志不变（ADR-013）。清空对话归档旧会话并切换至新会话。Discord 管理员可在指定频道以 `@Bot /reset` 归档并重置频道会话（ADR-014）。旧版直连设置迁移为后端模式并清除浏览器存储的 Key 字段。

## 下一步计划

Phase4已结项，Phase5 Part1仅Task19 Step1预研已完成。下一个待办为用户指派Task19 Step2关键裁决清单（含 L1–L3 补充输入）；K1 建议在 Task 20 前单独指派修复；Step3 / Task20–22、其他审计残余 / Part2 / Part3未授权，本轮交付后停止。

## 本轮验收与遗留

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
