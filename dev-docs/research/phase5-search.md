# Phase 5 Task 19 Step 1：网络搜索方案与探针

日期：2026-10-12（America/Vancouver）。状态：官方资料、离线核查与最小真实探针已完成；回归与Git交付见status。用户已授权本 Step、文件计划与探针费用；Step 2 / Step 3、Task 20–22 未授权。

## 1. 证据边界

- 本机分支 test；应用默认模型 `gemini-3.8-flash`，已安装 `@google/genai` 2.27.0，依赖声明为 ^2.4.0。
- 只检查本机 .env 的 GEMINI_API_KEY 是否存在且非占位，不输出值，不加载 Discord Token、不访问真实会话或 VPS。
- 本轮使用官方网页、真实 SDK 离线探针与用户确认费用后的最小真实API探针。模型列表不证明grounding额度可用；本轮对3.8 Flash的成功生成另提供实际可用证据，不证明其他模型或未来配额。
- 临时脚本：`/private/tmp/gemini-task19-step1/probe.mjs`；输出预定为同目录 `result.json`，权限0600。脚本不进入应用、不新增依赖，结果只保留一次合成公共问题的正文、元数据字段名、来源主机 / 长度、引用索引和用量；不保存来源完整 URL 或搜索建议 HTML，不跟随跳转。

## 2. 官方核查

### 模型与 API

[模型页](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)列出 Search grounding 支持。公开资料层面未发现必须更换硬编码模型的理由；当前 Key 可用性仍待实测，不触发 P3-7 实施。

[Generate Content 搜索文档](https://ai.google.dev/gemini-api/docs/generate-content/google-search)使用 `config.tools: [{googleSearch: {}}]`；返回 `groundingMetadata` 中的 `webSearchQueries`、`groundingChunks`、`groundingSupports`、`searchEntryPoint`。来源示例使用 Google 跳转地址，不能把 URL 的主机当作原网站主机。长度、字段缺失和流式到达位置需实测。

[新版搜索指南](https://ai.google.dev/gemini-api/docs/google-search)已优先示例 Interactions API，响应为 steps / annotations，与现有 models.generateContentStream 契约不同。本 Step 保留现有 Generate Content API 做探针，不进行 API 迁移。启用工具后由模型决定是否搜索及查询数量；提示“只搜索一次”不是硬额度控制。

### 费用与用量

[价格页](https://ai.google.dev/gemini-api/docs/pricing)：截至本次核查，3.8 Flash 标准输入 $0.75 / 百万 tokens，输出（含思考）$3.75 / 百万，优惠至2026-12-31；2027-01-01起分别 $1.50 / $7.50。API 免费层不提供 Google Search grounding。Gemini 3及以上共享每月5000次免费搜索，超出后 $14 / 1000次；免费余额与账户级实际配额未知。

搜索按实际执行的非空查询计费，而非每次生成计费；一次请求可能多次搜索。[查询计费说明](https://ai.google.dev/gemini-api/docs/google-search)明确该区别。应用本地次数预算不能保证账户美元上限。

[Generate Content 用量定义](https://ai.google.dev/api/generate-content)包含 `promptTokenCount`、`candidatesTokenCount`、`thoughtsTokenCount`、`toolUsePromptTokenCount` 和 `totalTokenCount`；可选字段缺失不能当成0。SDK具体字段解释与在线接口文字未完全统一，应保留原始各项数值并核对总量，不能用 total 减输入推算可见输出。[价格页工具说明](https://ai.google.dev/gemini-api/docs/pricing)在 Deep Research 节指出 Search Grounding 检索 tokens 排除在工具所述计费之外；这是工具定价说明，不足以把响应所有 token 字段直接当账单。真实费用最终仍需账单核对。

### 搜索建议与日志

[现行 Gemini API 附加条款](https://ai.google.dev/gemini-api/terms?hl=en)（生效2026-03-23，页面更新2026-04-28）要求向提问者展示 grounded reply 及关联 Search Suggestions；限制更改、缓存、自动收集来源及追踪链接。条款允许在所列用途下保存回复文本最长两年，但不应据此推断来源 URL / 建议 HTML 可永久保存；Google 对 grounding 输入 / 输出保留30天。

工程影响（推断，待 Step 2 / 3 裁决）：Discord 无法呈现建议 HTML，纯来源列表是否满足要求不能直接假定；永久仅追加日志及历史再入模型需先核查允许用途与保留政策。不能借来源跳转探测自动抓取全文。Web 的建议 HTML 展示需要隔离设计，不能直接把任意返回 HTML 注入现有正文组件。附加条款引用的[客户端指南](https://support.google.com/adsense/answer/10926790)也应纳入正式展示方案核查。

## 3. 两条路线对比

| 维度 | Gemini 内置 Google Search | 外部搜索 API + 结果注入 |
| --- | --- | --- |
| 接入 | 现有 SDK 增加工具；需扩展来源契约 | 独立请求搜索，再把限长结果作为数据交给 Gemini |
| 控制 | 模型决定内部查询次数，调用前难精确扣搜索次数 | 固定搜索请求数、结果数和超时更容易约束 |
| 成本 | 生成 token + 实际搜索查询费用 | 搜索请求费用 + 注入结果输入 tokens + 生成 tokens |
| 来源 | 自动返回支持段落与来源，可能用跳转链接 | 提供 URL / 标题 / 摘要；引用正确性需自行核实 |
| 时限 | 搜索与生成同一调用，纳入 P1-2 总期限 | 搜索独立期限，同时受整个请求剩余时间约束 |
| 安全 | 应用不必抓页面；仍有间接提示注入 | 若只用 API 摘要不增加应用任意 URL 抓取；全文抓取增加 SSRF 面 |
| 展示 / 存储 | 受 Google 搜索建议及保留条款约束 | 受供应商条款约束，须单独核查展示与持久化权利 |
| 配置 | 复用现有服务端 Key | 新服务端 Key、查询外发第三方；不交给 Bot |
| 降级 | 搜索失败不一定能在同一次生成中透明降级 | 搜索失败后可转无搜索生成，但必须记录未检索状态 |

外部候选（仅官方资料对比，未注册账户、未购买或实测）：

- [Tavily](https://docs.tavily.com/documentation/api-credits)：每月1000免费 credits；按量 $0.008 / credit，basic一次1 credit、advanced一次2 credits。[搜索接口](https://docs.tavily.com/documentation/api-reference/endpoint/search)提供 URL / 标题 / content、可选 raw_content、结果数与 usage。为控制费用，候选探针应明确 basic、关闭 auto_parameters、关闭全文与答案生成；是否选用须后续裁决。
- [Brave Search](https://api-dashboard.search.brave.com/documentation/pricing)：Search为 $5 / 1000请求，月赠 $5 credits；提供 URL 与文本片段。Answers是另一种生成产品，不与 Search 混算。账户开通及条款未实测。

初步工程判断：grounding接入较少，但双入口展示、来源持久化及内部搜索费用控制是关键不确定性；外部摘要搜索增加装配，却更容易控制搜索请求次数。现阶段不定案。

## 4. 本地离线证据与 ADR-013 影响

`node --check` 通过；占位 Key / 拦截 fetch 的真实 SDK 检查3/3通过，真实联网0次：

1. countTokens带tools在发送前拒绝，fetch次数0。
2. generateContent正确序列化googleSearch工具。
3. 模拟响应的来源结构和toolUsePromptTokenCount被SDK保留；该项只证明字段转换，不证明真实模型返回这些字段。

本机SDK的GoogleSearch类型未提供查询次数硬上限。现有GeminiChatAdapter仅映射prompt / completion / total，丢弃工具、思考、来源信息；ADR-013使用promptTokens提高估算系数。后续搜索轮次若用于校准，须区分注入内容与原会话文本，或排除搜索轮次；本Step不改适配器和窗口策略。

## 5. 已确认的最小真实探针计划

- 1次models.list请求（第一页100条，不自动翻页、不更换模型）；目标不存在则停止。
- 1次纯公共问题countTokens；不传tools或systemInstruction。
- 至多2次stream生成：无搜索对照1次、grounding1次；固定同一个公共Node.js版本问题，不读取任何会话。
- 每次maxOutputTokens=1024（含思考），thinkingLevel=LOW、90秒中止；每个HTTP请求只尝试一次、失败不重试。记录首chunk / 首正文 / 总耗时、finishReason、各usage字段，以及来源主机 / 长度、建议HTML长度、引用索引、元数据所在chunk。
- 若Key权限、计数或生成请求抛异常则停止；不自动改模型、升级账户、调用外部API或追加生成。生成返回非正常finishReason时记录失败；本次对照返回MALFORMED_FUNCTION_CALL，脚本继续执行原计划的唯一grounding请求，未重试对照。缺失来源按“本次未获得来源”记录，不用重复请求补齐。

估算（美元，税前，假设两次输入合计≤1000 tokens、输出含思考合计≤2048）：生成约≤$0.00843；grounding若1–3次查询且免费余额耗尽，另$0.014–$0.042，合计约$0.022–$0.051。若仍有免费搜索余额，约≤$0.00843。建议以$0.10作为本次预期预算确认；这是估算而非硬美元上限，内部查询数量不能由SDK强制限制，超时也不能保证上游立即停算。list / count未列出生成token收费，仍可能占用API配额，实际RPM / TPM / RPD不可从本地配置推出。

用户确认上述费用后运行；最初沙箱内list立即TypeError、生成次数0，沙箱外获准重跑最小探针。无账户升级、第三方搜索调用、自动翻页或额外生成。

## 6. 真实探针证据

开始时间2026-10-12T21:59:57.420Z（本地14:59:57 PDT）；SDK2.27.0、Developer API、model=gemini-3.8-flash。列表第一页返回62个模型且无下一页，目标支持generateContent / countTokens。官方grounding支持列表与当前Key模型列表交集包含3.8 Flash、3.6 Flash、3.5 Flash-Lite、3 Flash Preview、3.1 Pro Preview和2.5系列；只实测3.8 Flash，不据列表推断其他项可搜索。独立countTokens=55。

| 观测 | 无工具对照 | Google Search |
| --- | --- | --- |
| 首chunk | 2468ms | 6657ms |
| 首可见正文 | 无 | 6657ms |
| 总耗时 | 2503ms | 7399ms |
| chunk数 | 2 | 7 |
| finishReason | MALFORMED_FUNCTION_CALL | STOP |
| promptTokenCount | 55 | 55 |
| candidatesTokenCount | 34 | 100 |
| totalTokenCount | 89 | 155 |
| thoughtsTokenCount / toolUsePromptTokenCount | 均缺失 | 均缺失 |
| 来源元数据 | 无 | 仅第7个chunk出现 |

搜索样本记录1条webSearchQueries、3个groundingChunks和2个groundingSupports。3条来源均HTTPS，主机为vertexaisearch.cloud.google.com，URI长度分别187 / 203 / 199字符、标题均nodejs.org；没有跟随跳转验证最终落点。searchEntryPoint仅含renderedContent，HTML长度4600字符，未持久化HTML。两组引用索引分别[98,104)→来源[0,1]、[150,190)→来源[0,2]；本样本为英文ASCII，不证明中文字符 / 字节偏移算法。

本次搜索正文非空，内容讨论Node.js的LTS与Current版本；预研只验证链路和元数据，不将模型声称的版本当成独立事实验证。对照没有有效正文，不能用两组差值宣称搜索增量耗时或token增量；后续若需有效对照，应另行授权新调用，本轮不补跑。

两次生成可见输入合计110、候选输出合计134，按当前标准价对应约$0.000585；若记录的1次搜索全部计费，另$0.014，合计约$0.014585；若免费余额覆盖则约$0.000585。这是响应字段推算，未访问账单或余额，不能作为实际扣款凭证。工具token字段缺失，不能结论为“工具token为0”或证明所有内部检索用量可见；本样本total恰好等于prompt+candidates。内部检索对校准的影响仍需ADR-015明确隔离规则。

## 7. Step 1结论与后续裁决输入

- 当前Key与当前默认模型能够运行grounding，不需为了本次探针更换模型；保留P3-7为按裁决再定。
- 现有流式适配器会丢弃最终chunk来源，未来须扩展最终事件与幂等回放；必须容忍字段缺失，不能首正文出现即认定没有来源。
- 单样本7.40秒低于现有90秒期限；不是P95、负载测试、中文长历史或双入口验收，不据此排除F1。
- 真正限制双入口方案的是Google展示 / 留存要求与内部搜索查询费用；对照失败及工具token缺失也限制当前证据强度。外部API仅完成官方资料对比，无实际质量、延迟或权限证据。
- Step 2应裁决触发、入口、供应商、搜索额度、建议展示和来源 / 正文留存；Step 3须协调P1-4 + R3及ADR-012 / 013。这里仅提交预研结论，不替用户定案、不实施后续Task。

## 8. 验证与证据定位

- 全量36/36测试文件、462/462用例通过；根 / Web / server / core / bot类型检查通过。首次沙箱HTTP监听EPERM导致失败，获准沙箱外重跑通过；无新增应用测试，tests.md台账不变。
- 临时脚本SHA256：56bf0406c11a8fcc04034c54c656d403cdc40c3b61e68f5a725940b9daea4677；临时结果SHA256：017ed8862211423bd12cdf7c46e7f260663b9dbbb8ea1d70d44eb6fed9e7e205。临时文件不入Git，报告保留必要观测数字；若临时目录被清理，在线响应不能据此重现，新增真实调用仍需授权。
