# Phase 5 Task 19：网络搜索预研与裁决

日期：2026-10-12（America/Vancouver）。状态：Step 1预研与探针已完成；Step 2（Part B）供应商比较与U1 / U2及D01–D14设计裁决已完成，详见第10节。展示 / 长期留存许可与性能证据仍待补；Step 3、Task 20–22未授权，回归与Git交付见status。

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

## 9. Claude 审核补充（2026-10-12）

Step 1 审核通过；以下为 Step 2 裁决输入补充，不改变上文证据。缺陷 K1 见[审计报告](phase4-code-security-audit.md#task-19-step-1-审核2026-10-12claude)。

- **L1 Discord 与展示 / 留存条款的冲突**：除无法渲染搜索建议 HTML 外，Discord 频道回复对其他成员可见（不只是提问者），且由 Discord 永久留存、超出本项目控制。Step 2 应先裁决 Discord 入口是否开放搜索，而不只是展示方式。
- **L2 延迟样本不代表生产**：7.40 秒在 `thinkingLevel=LOW`、输出上限1024、无系统指令、无历史的条件下测得；生产配置更重，F1（默认90秒生成总期限是否够用）仍留待 Task 22 实测。
- **L3 API 迁移风险**：官方搜索指南已优先示例 Interactions API；ADR-015 如选 generateContent 方案，须写明迁移风险及触发复核的条件。

## 10. Step 2 裁决清单（2026-10-12，Part B；裁决完成）

### 10.1 授权与既定裁决

用户明确要求继续Part B并确认四文件计划；本步只核查公开官方资料、提出选择并记录用户裁决，不注册账户、不调用搜索 / 模型API、不安装依赖、不修改应用、不写ADR-015。K1已经Claude复核通过，M1及VPS扫描未授权。

以下两项来自用户指定的Part B提示词，直接记录，不重新论证：

- **U1 已裁决**：不采用Gemini内置grounding，选“外部搜索API + 结果注入”；搜索层与模型无关，为Phase 7多模型保留边界。供应商限Tavily / Parallel Search二选一。
- **U2 已裁决**：Web / Discord双入口都开放搜索。

据此，第2 / 9节Google搜索建议展示与留存要求保留为Step1历史研究，不再约束所选外部搜索实现；L1改为外部供应商的频道共享 / 留存核查，L3 Interactions迁移不适用，L2 / F1生产延迟仍须Task22实测。两项产品裁决不等于供应商已授权特定展示用途。

核查日期2026-10-12；费用为美元税前公开标价，账户余额未知，供应商延迟为官方描述而非本项目实测 / SLA。用户已逐项裁决U1 / U2与D01–D14，并确认按保留待补证据的方案收尾；下面保留原选项和建议依据，最终决定以10.7及每项用户裁决为准。工程配套参数不代表已经实施，供应商用途许可也未因用户设计裁决自动获得。

### 10.2 Tavily 与 Parallel Search 官方证据对比

| 项目 | Tavily Search | Parallel Web Systems Search |
| --- | --- | --- |
| API与生成 | `POST https://api.tavily.com/search`，Bearer Key；返回URL / title / content / score，可选usage；关闭include_answer和include_raw_content。[搜索接口](https://docs.tavily.com/documentation/api-reference/endpoint/search) | `POST https://api.parallel.ai/v1/search`，x-api-key；objective + search_queries，返回URL / title / publish_date / excerpts、warnings / usage。Search不生成最终答案，Responses / Task是其他产品。[接口](https://docs.parallel.ai/api-reference/search/search)、[Quickstart](https://docs.parallel.ai/search/search-quickstart) |
| 标价与单位 | 月1000免费credits；按量$0.008 / credit，套餐$0.0075–$0.005。basic / fast / ultra-fast为1 credit，advanced为2；明确关闭自动参数以免深度升档。[credits](https://docs.tavily.com/documentation/api-credits)、[depth](https://docs.tavily.com/documentation/api-reference/endpoint/search) | turbo / fast为$1 / 千请求；basic / advanced为$5 / 千请求，默认advanced，含10结果，超过10的新增结果另$1 / 千结果。[定价文档](https://docs.parallel.ai/getting-started/pricing)；官网月$5赠额、注册“最多$80”奖励，不能按人人获得$80计算。[官网定价](https://parallel.ai/pricing) |
| 摘要与结果上限 | basic / fast每chunk目标约500字符、advanced约800，最多3 chunks / source，并非硬字符上限；max_results上限20。[接口](https://docs.tavily.com/documentation/api-reference/endpoint/search) | v1 max_chars_total、advanced_settings.excerpt_settings.max_chars_per_result可约束片段；默认10结果，公开模式上限20，更大请求会告警收缩。[高级设置](https://docs.parallel.ai/search/advanced-search-settings) |
| 全文 | include_raw_content提供清洗后的markdown / text，另有Extract；本方案已裁决均关闭。[接口](https://docs.tavily.com/documentation/api-reference/endpoint/search) | Search返回excerpts；全文用独立Extract，不把Extract费用当Search费用。[定价与产品](https://parallel.ai/pricing) |
| 延迟与期限 | 官方只给深度的相对延迟 / 相关性权衡，basic均衡、fast更偏延迟，不能宣称固定P95。[最佳实践](https://docs.tavily.com/documentation/best-practices/best-practices-search)；采用客户端AbortSignal和本地竞速兜底，无上游立即取消 / 不计费保证。 | 官方模式约turbo200ms / fast700ms / basic1s / advanced3s，非本项目实测；开启live fetch会增延迟。[模式](https://docs.parallel.ai/search/modes)、[高级设置](https://docs.parallel.ai/search/advanced-search-settings)；同样需要本地期限与AbortSignal。 |
| 域名 / 时间 | include / exclude domains、相对日期或起止日期；country软提升、language可软提升或严格过滤。[接口](https://docs.tavily.com/documentation/api-reference/endpoint/search) | include / exclude域名或路径前缀，after_date起始日期；include存在时exclude忽略，turbo不支持路径前缀。location为国家代码；未在公开v1字段找到专用language或结束日期过滤。[source policy](https://docs.parallel.ai/resources/source-policy)、[高级设置](https://docs.parallel.ai/search/advanced-search-settings) |
| 中文证据 | 可提交中文query并指定语言软提升；中文召回 / 时效 / 错误率未实测，参数存在不等于质量保证。[最佳实践](https://docs.tavily.com/documentation/best-practices/best-practices-search) | 模式文档明确turbo只支持英文 / 日文，更广多语言建议basic / advanced；fast中文能力未得到同样明确保证，不能按fast低价和延迟代表中文质量。[模式](https://docs.parallel.ai/search/modes) |
| Node接入 | 官方SDK `@tavily/core`或直接HTTP；建议Node原生fetch，不新增依赖。[Quickstart](https://docs.tavily.com/documentation/quickstart) | 官方SDK `parallel-web`或直接HTTP；建议原生fetch，必须用v1契约，不混入旧v1beta字段。[Quickstart](https://docs.parallel.ai/search/search-quickstart) |

当单次最多3结果且无自动重试，按量Tavily basic约$0.008、Parallel basic约$0.005、fast约$0.001，不含把摘要交给模型的输入及生成费用。Parallel更便宜，但不能忽略下面的条款和中文能力差异；不是仅凭单价定案。

### 10.3 展示 / 留存 / 隐私核查（L1）

**Tavily**：平台条款明确集成Customer Applications的例外，并在§3.5讨论组织外终端用户；同时§2 / §3.2写内部业务用途。不能把第三方用户条款直接推断成“任意Discord成员共享、平台永久留存、来源 / 摘要无限期保存均已许可”。未找到明确输出保留天数或供应商署名格式；无明确要求不等于免除原网站版权和现有声明。应就本项目用途取得明确澄清；建议显示来源标题 / 域名 / 原链接，不建结果数据库。[平台条款§2、3.2、3.5、9](https://www.tavily.com/terms)

Tavily隐私政策说明query可能用于改进，必要时外发第三方搜索索引，保留按用途必要性而非固定天数；平台条款还允许特定AI功能数据训练及第三方处理。不保证关闭include_answer便使全部查询零留存 / 不训练。[隐私政策](https://www.tavily.com/privacy)、[平台条款§6–9](https://www.tavily.com/terms)

**Parallel**：应看API的Customer Terms而非仅网站Terms。§2(b)限制单查询输出主要由一个End Customer使用，不提供给其他End Customers / 第三方；§4(b)及§2(c)还涉及存储 / 再利用、禁止建数据销售数据库和披露评测。这与共享Discord频道存在明确文本冲突，用户确认产品功能不能代替供应商许可。公开协议未给本项目普通对话结果明确保留天数或额外署名格式；现有权利声明不能随意删除。[客户条款§2、4](https://parallel.ai/customer-terms)

Parallel产品页宣称ZDR / no training，但客户协议§4(b)允许训练；隐私政策只对选EU residency的商业客户EU Search端点明确不保留请求 / 响应，普通端点未给固定内容留存天数。应确认账户、端点、合同的实际适用条件，不能推定普通免费账户自动ZDR。[产品页](https://parallel.ai/products/search)、[客户条款](https://parallel.ai/customer-terms)、[隐私政策](https://parallel.ai/privacy-policy)

**选型结果与待补证据**：用户已选Tavily basic + 原生HTTP；频道共享与持久化用途仍须明确澄清后才宣称满足上线条件。Parallel比较及其限制保留为选择Tavily的依据，不再作为本轮待选项。此处只识别文本约束，未代用户接受服务条款、未联系供应商、未扩大候选列表。条款未澄清前仍可定其他产品语义和做Mock设计，但不能把供应商 / 留存权限写成已解决。

### 10.4 逐项裁决（选项保留，最终结果见10.7）

#### D01 供应商与Node接入

**用户裁决（2026-10-12）**：「我看了Tavily确实更好一点就用这个吧」——供应商定为Tavily。用户随后明确回复「采用」，确认basic档位 + 原生HTTP接入（不新增依赖），只请求摘要、关闭全文和供应商答案生成；选择供应商不等于已完成展示 / 留存用途澄清。以下比较保留为决策依据，Parallel不再作为本轮待选供应商。

- A：Tavily basic；中文语言控制清晰、1 credit固定成本，需处理较广查询数据用途并确认共享 / 留存。
- B：Parallel basic / advanced；公开价较低，中文能力建议避开turbo，频道第三方共享限制须取得例外；fast的中文质量另列待补证。
- 建议A，直接HTTP；依据10.2 / 10.3，优先满足双入口共享用途，而非供应商宣传的基准成绩。条件是展示 / 留存用途澄清，不声称A已无条款障碍。若要官方SDK，新增依赖前另行完成P1-8；此步不安装。

#### D02 触发方式与命令共存

**用户裁决（2026-10-12）**：「采用显式触发」——确认A：Web每轮联网搜索开关默认关闭，Discord直接@Bot后使用`/search 问题`，保留`/reset`原精确匹配规则；普通对话不自动搜索。

| 选项 | 模型无关程度 | 费用 / 延迟 / 体验代价 |
| --- | --- | --- |
| A 显式触发 | 高，无模型函数调用 | 只在用户请求时外发查询，普通对话无额外往返；用户须主动选择 |
| B 每次请求 | 高 | 所有普通聊天也增加搜索费用 / 延迟，隐私外发面最大 |
| C 模型自主 | 低于A/B | 各provider工具协议不同，需要循环、更多预算；可能出现工具错误，K1只处理空正文，不能解决调用规划 |
| D 服务端规则 | 高 | 关键词 / 时效规则有误判，难解释为什么自动外发，需额外维护 |

建议A：Web每轮“联网搜索”开关默认关闭，Discord沿用直接@Bot后正文精确匹配`/search`加空格和非空问题。`/reset`仍按ADR-014清理后精确相等、先分流；`/reset xxx`不扩展重置行为，`/search /reset`只是搜索问题。孤立`/search`提示补问题、不消耗搜索 / 模型预算，不注册新的Discord Slash Command。协议统一传显式search标志和去命令后的问题，用户输入元数据记录该标志；普通文本仅提到“搜索”不触发。ADR-012同requestId的正文和search模式都参与冲突检查，避免同输入换模式被当成旧请求回放；旧请求默认不搜索。增加元数据的实施属于Task20/21，本Step只裁决。

#### D03 抓取全文

**用户裁决（2026-10-12）**：「采用」——确认只请求Tavily摘要，关闭include_raw_content / include_answer，不抓网页全文、不调用Extract、不使用供应商生成答案。

- A：只用供应商摘要 / excerpts；应用只调用固定供应商端点，不对返回URL作服务器抓取、跳转解析或预览请求。
- B：供应商Extract或应用全文抓取；覆盖更完整，增加费用、长度、延迟，应用抓取还需SSRF（DNS / 重定向 / 私网 / 大小 / 类型）防护。
- 建议A；当前目标是最小搜索增强，供应商内部抓取不能等同本项目拥有全文再分发权。来源URL仍需协议和显示校验，但不新增服务端任意URL读取。

#### D04 注入格式与长度

**用户裁决（2026-10-12）**：「每条摘要最多100字」——单条摘要上限改为100字（按Unicode码点计数，含标点）；用户随后补充「摘要还要挂链接」：每条摘要展示其对应的原网页链接，保持一一对应；摘要上限100字仅约束摘要正文，链接与标题作为单独来源字段仍计入整体输入 / 展示长度限制。用户随后确认每轮最多3条来源，并回复「可以采用」确认非可信数据块隔离注入、不执行资料中的指令及D04 / D08其余长度边界。

- A：服务端结构化“非可信搜索资料”块；固定id、标题、URL、摘要，作为当前轮次的数据送给模型，system明确资料中的指令不得执行。
- B：原HTML / Markdown或放入system高优先级指令；实现短但扩大注入 / 展示混淆；不建议。
- 建议A：最多3来源，单条摘要最多100 Unicode码点（用户已裁决）、标题120码点、URL2048字符；整体含标记 / 来源 / 问题的最终输入受D05约束，响应读取上限256KiB，超限中止并降级，不先无限制读完再截断。构造数据块时转义隔离标记 / 控制字符，供应商文本不能成为role / system；元数据标题按纯文本。源内容限制只是减小风险，不能证明提示注入绝不成功；Mock攻击夹具须验证工具 / 服务端权限不因内容升级，真实验收不把模型“听话”当安全证明。

#### D05 ADR-013输入预算与校准

**用户裁决（2026-10-12）**：先要求「参与校准」，随后回复「采用」确认总输入8192、搜索资料最多2048估算tokens（含摘要 / 标题 / URL / 隔离标记），其余空间供系统、本轮问题和历史使用；按完整实际输入参与校准，撤回原“整轮跳过observe”的建议。

- A：保持总8192输入预算，为搜索资料块预留最多2048；系统开销 / 本轮问题 / 连续历史共用剩余6144，不截断本轮问题。
- B：直接在原窗口后追加搜索内容；简单但可能越过8192，破坏现有成本约束。
- C：提高总预算；保留历史更多但更贵，与当前授权目标不同。
- 建议A；注入块按当前provider的计数能力或保守本地估算限长，标题 / URL / 隔离标记也占预算，不把2048当“2048字符”。必要时缩短摘要 / 减来源 / 丢最旧整轮；最小本轮无法容纳时，搜索结果降级为空后重新按无搜索预算验证，本轮问题本身仍超限则CONTEXT_LIMIT。两次countTokens总数和3秒单次期限不增加；无计数能力保守降级，不承诺精确token上界。

按用户裁决，搜索轮次生成后的promptTokenCount参与校准；校准的估算基数必须对应最终实际发送的完整输入，包含系统开销、选中历史、本轮问题和实际注入的搜索资料（标题 / URL / 隔离标记均计入），不能将包含搜索的实际用量与仅对话基数比较。沿用现有系数只升不降、上限4的规则；不以“100字”直接推算真实token扣减量，usage缺失 / 无效时不校准，失败空回复仍按K1不校准。非搜索轮次继续原校准。此为完整输入校准语义，具体observe装配及SDK计数兼容在Task20实现并回归，本Step不改代码。外部摘要注入属于正常输入，不套用Google grounding的工具token计费排除规则。本次实现不改窗口。

#### D06 来源 / 正文留存及后续上下文

**用户裁决（2026-10-12）**：「采用」——成功回复一并保存最多3条100字摘要及对应原网页链接，刷新 / 回放保留一致展示；不保存原始搜索响应 / 外发query，后续模型只读对话正文、不重复注入这些摘要。长期留存用途仍以Tavily明确许可为前提，证据尚未补齐。

- A：仅成功最终assistant保存最小来源元数据（provider、检索时间、编号、纯文本title、URL、search状态）及本轮实际展示的≤100字摘要；保留摘要用于刷新 / 回放还原已裁决的“末尾摘要+链接”展示。原始长片段 / 响应 / 外发query不持久化，日志仍只追加。此为D07裁决后调整、已获用户确认的保存方案。
- B：只本轮展示来源；本机存储较少，但刷新 / ADR-012回放丢来源，已生成正文仍留存，Discord自身仍存消息，因此不能借B规避全部供应商条款。
- C：保存全文 / 摘要 / 查询并纳入后续上下文；更可审计但存储、费用和间接注入复用面更大，权限未证实。
- 建议A，**前提是供应商确认该展示 / 长期保存用途**；产品保存语义已定，但供应商许可仍待补证，不能宣称永久留存权限已经确认。后续模型只读取现有user / assistant正文，不再次拼来源列表或保存的100字摘要；正文里的搜索结论仍作为历史存在，需纳入用途确认。旧会话缺元数据正常兼容；成功回放携来源且不搜；失败降级后的成功回复也保存未搜索状态，回放不借机重搜。日志不改写原则与可能的有限供应商保留期限冲突时须先裁决保留机制，不在Task20悄悄清理。

#### D07 引用形式

**用户裁决（2026-10-12）**：先要求「摘要还要挂链接」，随后回复「可以采用」确认回复末尾展示每条检索摘要及对应原网页链接。Web在摘要旁显示来源链接，Discord使用转义纯文本摘要加`<原URL>`，不靠模型生成或猜测URL；每条摘要与URL均来自同一校验通过的供应商结果。

- A：末尾编号来源列表（Web由元数据渲染；Discord独立来源段）；链路简单，对长消息分段稳定。
- B：正文行内编号；定位更精细但外部Search无groundingSupports，模型给编号不能证明该句被来源支持，中文 / 分段偏移更复杂。
- 建议A：标为“本轮检索来源”，只展示本次实际返回且校验通过的链接；模型不生成任意URL。若正文保留[1]引用，必须限制为现有id，但仅验证编号存在，不宣称事实自动核验。

#### D08 Discord展示

**用户裁决（2026-10-12）**：「可以采用」——确认转义纯文本摘要 / 标题、显示真实域名、抑制提及和链接预览，及清单D04 / D08的其他长度边界。

- A：纯文本转义摘要（用户要求挂链接）/ 标题 / 实际域名 + `<原URL>`，最多3条，作为正文分段后的独立来源消息，沿用抑制提及 / 预览。
- B：Markdown隐藏目标或自动Embed；更漂亮但可能伪装目标 / 自动抓预览，易放大外部内容面。
- 建议A：标题最多80码点、域名按解析后的真实host展示，不用title伪装域名；allowedMentions清空，SuppressEmbeds及尖括号链接。URL仅http / https、禁止凭据 / 控制字符；超过Discord消息安全长度（建议1900 UTF-16单位）的单条URL不发可点击截断链接，只显示域名与“链接过长未展示”。正文按现有分段器，来源发送失败沿用一次固定反馈，不重发已发正文。刷新 / 重试展示原成功来源，不重复搜索。

#### D09 独立预算与费用

**用户裁决（2026-10-12）**：「采用」——全局4次 / 滚动60秒、Web保留2 / Discord合计最多2；全局30次 / UTC日、Discord合计最多10；Discord每用户1次 / 分钟和5次 / 日，每频道2次 / 分钟和10次 / 日。每轮最多一次，不自动重试；每日额度跨重启持久化，/reset不清额度。

- A：在P1-7 SourceRequestBudget基础上增加搜索专属全局 / 来源守卫、可信Discord用户 / 频道守卫及持久化每日账本，发请求前原子检查 / 扣额。
- B：只内存分钟计数；简单，但重启后每日额度重置，无法控制月费用。
- 建议A，默认值见10.5。入口先锁 / inspectRequest（完成回放及冲突先返回），再检查最小问题和本轮search意图，再协调生成与搜索准入；生成守卫拒绝时也不先消耗搜索。任何守卫拒绝不扣任何预算，实际已开始供应商请求则不退还（超时可能仍计费），无自动重试。429只暂停搜索预算60秒，不pause生成 / 计数；预算不足提示本轮未检索并转普通生成，而非把模型预算当搜索预算。

每日账本用UTC日期，重启不重置、/reset不清额度；进程间不支持并发副本，当前私有单实例边界明确。搜索尝试数与credit费用分别记账，Tavily锁定1-credit档；不得把“每次请求”错误解释成advanced的1 credit。可信Discord userId需通过现有受信Bot loopback请求扩展传入，channel取持久化origin；缺失身份时禁用Discord搜索并提示，不从问题正文解析身份、不开放给浏览器伪造Discord来源。当前SSE / Bot chat请求没有这些字段，未来须改共享契约和入口测试，不声称现已支持用户限额，不扩展公网P2-*。

#### D10 搜索期限与Bot120秒边界

**用户裁决（2026-10-12）**：「采用」——搜索8秒、生成90秒、两次计数共6秒，默认总104秒；搜索+生成+2次计数的配置总和必须≤115秒，Bot保持120秒。

- A：搜索独立8秒、生成仍90秒、两次计数各3秒；固定配置关系 `搜索期限 + 生成总期限 + 2 × 计数期限 ≤ 115秒`，本建议8+90+6=104秒。
- B：搜索20秒且保留90秒生成；20+90+6=116超界，不能接受，须把生成期限降至89秒以内；进一步减少回复余量。
- C：延长Bot120秒；改变既有协议，不建议在本步采用。
- 建议A：首chunk生成期限60秒≤总生成90秒；搜索所有读取 / 解析在同一8秒预算内，AbortSignal加本地Promise竞速，忽略abort的供应商不能占锁。服务端按单调时钟记录剩余时间，不在重试 / 阶段切换后重置整体时限；适配器清理不阻塞。Bot120秒还覆盖会话resolve、网络、存储；配置算术不证明这些IO总能及时完成，Task22必须验证真实端到端，余量不足则缩短阶段预算。存储期限 / 部分持久化副作用不能在本步假定已解决（P1-5 / P1-4另行授权）。

#### D11 失败降级

**用户裁决（2026-10-12）**：「采用」——搜索失败、超时或额度不足时明确告知本轮未完成联网检索，转普通生成；用户取消停止。搜索429只暂停搜索额度60秒，不暂停普通生成或计数。

- A：预算不足、无来源、超时、网络 / 供应商错误时无搜索生成，明确说明“本轮未完成联网检索，以下回复未使用实时搜索。”；最多一次生成，不用无上限重试。
- B：搜索失败整轮失败；透明但可用性差，用户拿不到普通回答。
- 建议A，降级状态独立于模型正文保存 / 展示，不能把固定说明当成成功模型正文绕过K1；模型也失败则返回原固定错误、不存assistant、不发done。用户取消不转普通生成、不再发费；供应商401 / 403不泄露细节，记录受约束状态并提示服务端配置检查。以独立搜索状态字段表达失败，不能用模型429语义混淆搜索429。

#### D12 P1-4 + R3中断回复与来源

**用户裁决（2026-10-12）**：「采用」——仅保存最终成功回复及摘要 / 链接；停止或中途失败时Web移除未完成临时回复，保留已保存user输入，同requestId重试复用输入。此处只定语义，P1-4 / R3实施仍须另行授权。

- A：只成功最终assistant保存正文和来源；停止 / 超时 / 中途失败后不保存半截assistant或成功来源，Web移除未完成临时气泡并保留失败user的重试入口。
- B：持久化非空半截assistant + interrupted标志与当轮来源；更符合用户已见内容，但新增完成态 / 重试或分支语义，会冲击ADR-012的“找到assistant就完成回放”。
- 建议A，保留已存user不删除、不把中断assistant伪装成功。Web同requestId重试复用user，搜索重新发起时重新扣搜索额度；普通新输入形成连续user仍按现有轮次规则。Bot当前非流式向频道发送最终正文，没有部分文本；仍不新增Bot自动重发 / 幂等（另行任务）。此项是ADR-015之前的**语义裁决**，P1-4 / R3的UI实现、持久化修改并未因本Step被授权；若选择B须单独排实现步骤，不能在Task20顺手扩展。

#### D13 密钥与查询隐私

**用户裁决（2026-10-12）**：「采用」——Key仅server.env；只外发当前问题、最多500字，不发历史 / 身份信息，告知用户查询交给Tavily；展示 / 长期留存许可、中文质量及生产延迟继续列待补证据，本Step不发真实调用并按此收尾。

- A：选定供应商Key仅进server.env，原生HTTP调用；每次显式触发外发当前问题（去命令后、≤500码点），不发完整历史 / system / 用户ID / 频道ID。Web开关说明和Discord `/search`使用说明告知查询会交给供应商，回答 / 来源对频道成员可见并由Discord留存。
- B：自动生成含历史的查询；处理指代更好，但额外模型调用、费用和隐私外发。
- 建议A，超过500码点要求缩短不静默截断；首次使用说明不把费用默认值塞进普通对话。敏感查询不应外发，纯自动正则无法承诺识别全部敏感信息；根据供应商要求提供明确告知和可取消选择。第三方日志只存状态 / 耗时 / 数量，不存query / Key / URL。供应商改进、训练、留存限制见10.3；相应risk登记在Step3写risks.md，本Step不修改该文件，不承诺ZDR。若新增npm依赖，先P1-8复核；原生fetch不新增依赖但仍须mock安全验收。

#### D14 错误契约与脱敏（G2）

**用户裁决（2026-10-12）**：「采用」——所有新增错误经safeStreamError固定文案，日志只记录白名单字段；按保留待补证据的方案完成Part B收尾。

- A：所有新增搜索 / 解析 / 存储错误通过safeStreamError固定文案，来源状态也用受约束枚举，不下发供应商原文。
- B：保留供应商message帮助排障；可能含Key / URL / 输入内容，违背P1-3，不建议。
- 建议A；主流程错误按storage / search / model的受约束阶段记录（新增search阶段需在Task20明确实现），名称 / 状态 / 原因值枚举化，不记录正文 / stack；错误对象和字符串不落正文。共享来源链接是用户明确需要的来源元数据，与供应商异常中的任意URL不是同一处理路径，仍须白名单校验。K1固定MODEL_ERROR和既有超时 / 预算回归必须保留。

### 10.5 最终默认值与配套实现边界

| 默认值 | 建议 | 理由 / 代价 |
| --- | --- | --- |
| 供应商档位 | Tavily basic（已裁决）；auto_parameters=false、chunks_per_source=1（确保basic / 单段摘要的配套参数） | 每请求1credit；质量未知，不静默升advanced |
| 每轮搜索 | 1次、无自动重试、最多3来源（已裁决） | 费用可预测；复杂问题只一次可能不足 |
| Query | ≤500 Unicode码点，仅当前问题（已裁决） | 不外发历史；指代需用户补齐 |
| 摘要 / 注入 | 单条≤100码点（已裁决），资料块总≤2048估算tokens（已裁决） | 还要含title / URL / 标记；超限继续缩短，不能只靠字符上限 |
| 响应 | ≤256KiB（已裁决） | 防无限读取，过大降级 |
| 搜索 / 生成 / 计数 | 8秒 / 90秒 / 2×3秒，总104≤115（已裁决） | Bot保持120秒，IO仍需实测 |
| 来源分钟额度 | 搜索总4 / 滚动60秒；Web保留2，Discord合计最多2（已裁决） | 独立于生成10 / Web4和计数20 / Web8 |
| Discord细额度 | 每用户1 / 分钟、5 / UTC日；每频道2 / 分钟、10 / UTC日（已裁决） | 需要可信Bot身份字段，不能默认为现有契约已经支持 |
| 每日总 / 来源额度 | 全局30 / UTC日，Discord合计最多10，Web可用满剩余全局（已裁决） | 给Web至少20次空间；日账本必须跨重启持久化 |
| 搜索429暂停 | 搜索全来源60秒（已裁决） | 不暂停生成与countTokens |
| 来源UI | 最多3条、摘要100字+链接，Discord标题80码点 / 安全消息1900 UTF-16单位（已裁决） | 超长URL不截断成错误链接，原Web标题上限120 |
| 留存 | 成功assistant正文+最小来源及展示的100字摘要；不存原始长片段 / raw / query（已裁决，用途许可待补） | **以供应商用途许可为前提**，实际用途 / 保留期证据继续待补 |

费用例子：30次/日×30日=900次。免费额度未知时，Tavily basic搜索项最多按公开标价约$7.20 / 30日；Parallel basic约$4.50、fast约$0.90（每次≤10来源）；免费额度覆盖时搜索收费可能为0，模型输入 / 输出费用仍另算。日上限是请求预算，不是固定自然月上限（31天可930次），也不控制其他项目共用Key调用。本例假设每日账本真实持久化、无额外provider重试 / 自动升档，不声称本轮已有金额守卫。

### 10.6 待补证据与另行授权事项

1. **L1条款澄清**：明确频道多成员共享、本项目成功正文 / title / URL长期留存、Discord自身留存、模型历史再利用是否允许、是否需署名 / 指定期限；供应商账户适用合同及端点数据留存 / 训练条件。需要明确文本或供应商回复；本轮未发邮件 / 联系他人，若要我联系须用户单独指派。
2. **中文与生产延迟（L2 / F1）**：文档不足以证明中文质量 / 长历史性能。选定Tavily后的可选未来方案：6个公开中文查询各调用Tavily basic一次，共6搜索请求；无免费额度时约6×0.008=$0.048，仅搜索，若每条再调用模型，另计模型费并须另报费用。6请求不足证明稳定P95，也不证明完整生产长历史延迟；先澄清供应商是否允许保存 / 分享评测结果（两家条款均有评测披露限制）。本提议不是运行授权，当前真实调用0次。
3. **身份与幂等契约**：未来Task20/21明确search标志、Discord可信userId、请求冲突指纹及每日账本；不自动授权Bot全链路幂等或公网来源隔离。
4. **M1**：K1复核残余及VPS只读扫描仍未授权，不因搜索调研顺便处理。
5. **P1-4 + R3**：D12先定语义，实施需单独计划 / 指派；若供应商有限留存要求与不可改写日志不兼容，另定方案再写ADR-015。

### 10.7 裁决记录与交付状态

| 编号 | 用户决定 | 状态 |
| --- | --- | --- |
| U1 | 外部搜索API + 结果注入、搜索层与模型无关 | 已裁决（用户提供Part B文档） |
| U2 | Web / Discord双入口开放搜索 | 已裁决（用户提供Part B文档） |
| D01 | Tavily basic + 原生HTTP，不新增依赖；展示 / 留存用途澄清仍待补证据 | 已裁决，条款证据待补 |
| D02 | 显式触发：Web逐轮开关默认关闭，Discord `/search 问题`，保留 `/reset`原规则 | 已裁决 |
| D03 | 只摘要，关闭全文 / 供应商答案生成，不调用Extract | 已裁决 |
| D04 | 最多3条、摘要100字+链接、非可信数据块隔离；其他长度边界沿用本节建议 | 已裁决 |
| D05 | 总输入8192、搜索资料最多2048估算tokens（含全部字段 / 标记）；完整实际输入参与校准 | 已裁决 |
| D06 | 成功assistant保存最多3条100字摘要+对应链接，刷新 / 回放保留；后续不重复注入，不存raw / query | 已裁决，用途许可待补证据 |
| D07 | 回复末尾显示每条摘要及对应原网页链接 | 已裁决 |
| D08 | Discord转义纯文本摘要 / 标题、真实域名、抑制提及 / 预览，沿用长度边界 | 已裁决 |
| D09 | 已采用10.5分钟 / 每日 / 用户 / 频道限额；每轮一次不重试、每日账本跨重启且/reset不清 | 已裁决 |
| D10 | 搜索8秒+生成90秒+两次计数6秒=104秒，配置总≤115秒，Bot120秒 | 已裁决 |
| D11 | 失败 / 超时 / 搜索额度不足明确告知后普通生成；取消停止；搜索429只暂停搜索60秒 | 已裁决 |
| D12 | 仅最终成功正文 / 摘要 / 链接落盘，中断移除Web临时回复、保留user同标识重试；实施另授权 | 已裁决 |
| D13 | Key仅server.env，当前问题最多500字、告知交给Tavily，不外发历史 / 身份信息 | 已裁决 |
| D14 | 全部新增错误经safeStreamError固定文案，白名单日志 | 已裁决 |

本步回归36/36文件471/471用例、根 / 四包类型检查通过，代码与测试台账不变。用户逐项裁决和对100字摘要 / 参与校准 / 摘要挂链接的修订均已记录，最后明确确认保留用途许可 / 性能待补证据并完成收尾。U1 / U2及D01–D14设计裁决全部完成；没有尚待用户选择的设计项目，10.6所列供应商证据与另行实施授权尚未解决。Step2已勾选，按约定commit / push origin test、status收尾、annotated tag后停止。未写ADR-015、未实施P1-4 / R3、M1或Task20–22，未调用任何真实搜索 / 模型API。
