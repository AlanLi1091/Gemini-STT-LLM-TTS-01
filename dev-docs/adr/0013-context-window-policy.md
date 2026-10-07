# ADR-013：有限上下文窗口与计数降级

## 背景与授权

2026-10-06，用户确认 P0-1 第一步修订方案及 Claude 五项实现补充。长期 Web / Discord 会话原先每轮发送全部持久化历史，输入成本随历史增长。本步只限制模型视图，保留完整仅追加日志与 ADR-012 幂等语义；Discord 重置 / 归档锁为第二步，尚未授权实施。

## 预算与轮次

- 默认输入预算 8192 tokens、最多 20 个历史轮次加本轮输入、生成上限 8192（包含思考 tokens，不是可见正文额度）。配置范围与环境变量见 deploy/README.md。
- 一轮从 user 开始，包含其后连续 assistant；连续 user 分别成轮。先忽略历史 system 与没有前置 user 的孤立 assistant，窗口不以 assistant 开头。只选最近连续轮次，整轮删除最旧历史，不切单条正文。
- 服务端窗口层排除所有传入的 system 消息，只把 GEMINI_SYSTEM_INSTRUCTION 配置给 Gemini 适配器；不改变 core resolveSystemInstruction 原有合并行为，现有正向测试保留。日志中的 system 不删除 / 修改，P1-1 的输入角色限制与关闭无状态模式仍待独立授权。
- 构造窗口发生在新输入写入之前。已存在的失败输入从历史尾部拆出，作为本轮输入仅出现一次。先判断完成回放；回放不选窗口 / 计数 / 调用模型。超限新输入不落盘，旧失败输入超限不删除。

## 本地估算与精确计数

- 本地基数为 256 的固定开销，加配置系统指令 UTF-8 字节数，加每条消息的正文 UTF-8 字节数与 32 开销；乘默认系数 1.25 并向上取整。这是偏保守的工程估算，不是 tokenizer 或数学上界，不能声称所有输入必定不低估。
- 候选先限制历史轮数，并在本地估算超过全预算时裁剪整轮。低于或等于预算 80% 时直接生成；边缘区尝试 countTokens，精确计数只覆盖对话内容，另加配置系统与固定开销的本地估算。
- 最多两次计数 / 选择；进程级独立默认 20 次 / 分钟，每次默认 3 秒，透传 AbortSignal 并用本地超时竞速兜住不响应中止的计数器。计数不额外扣生成预算；计数 429 只暂停自己的预算。
- 精确超限时按本次观测比例裁剪最旧轮次再核对；计数失败 / 无计数能力 / 预算耗尽后退回本地估算不超过 80% 的更小窗口。最小本轮仍无法容纳或确认精确超限时返回 CONTEXT_LIMIT，要求缩短输入；用户取消不降级继续生成，计数鉴权错误直接反馈。
- 超过两次核对后，仍可回退至更小的本地窗口：因此策略有预算与调用次数边界，但不能把最后的估算路径描述为精确 token 保证。没有全量历史回退或自动摘要。
- 实际回复的 promptTokenCount 用于提高下一次估算系数；系数只升不降、最高 4，无效用量忽略，只保存于 policy 内存并记录不含正文的调整日志，进程重启恢复 1.25。Mock 不提供精确计数，走本地路径。

## SDK 兼容证据

本机已安装 @google/genai 的 dist/node/index.mjs 中，countTokensConfigToMldev 明确拒绝 systemInstruction / tools / generationConfig。离线真实 SDK 探针用占位 Key 并拦截全局 fetch：携带 systemInstruction 的 countTokens 在发起请求前抛出“only supported ... not in Gemini Developer API mode”，fetch 次数为 0。没有调用真实 API 或打印密钥。

据此 GeminiChatAdapter.countTokens 只发送 model、contents 和 abortSignal，不携带系统指令；配置系统文本由窗口层估算并加计。SDK Mock 回归明确核对请求结构。此证据确认本地 SDK 行为，不冒充 VPS SDK 版本或上游在线实测。

参考：[Gemini token 计数](https://ai.google.dev/gemini-api/docs/tokens)、[GenerateContent 思考与输出上限](https://ai.google.dev/gemini-api/docs/generate-content/thinking)。

## 输出截断与错误

- send / stream 检查首候选 MAX_TOKENS；有非空白正文时在最终内容末尾附加一次“回复已达到长度上限，内容已截断”，返回 done / usage，并持久化同一正文。重复流标志只提示一次，不自动续写。
- 提示属于保存正文，因此以后窗口中的模型会把它视作自己先前说过的话，这是本次明确接受的取舍，不新增前端元数据渲染体系。
- MAX_TOKENS 且无正文时返回固定 MODEL_ERROR，不产生成功空回复，也不保存空 assistant。非成功流的部分正文持久化仍属 P1-4，本步不处理。
- 输入超限使用既有 SSE error 结构与新增 CONTEXT_LIMIT；Web / Bot 都使用固定缩短输入提示，不透传任意服务端原文。

## 验证与范围

新增窗口纯测试、SDK / 来源层 / HTTP / UI / Bot 回归，覆盖不规则历史、长历史保留日志、历史 system 不锁死、重试输入只计一次、回放绕过计数、计数边缘 / 降级 / 取消 / 次数 / 超时、校准限幅、超限不写入、截断有 / 无正文。33/33 文件、355/355 用例、类型检查与 Web / Express / Bot 构建通过，测试台账逐项同步。

本轮只在本机使用隔离临时存储与 Mock 上游，没有部署 VPS 或访问真实会话数据、Gemini、Discord。P0-1 第二步重置与共享归档锁、P1-1 其他路径、P1-4、长期 JSON 文件增长与清理仍保持未实施；P0-1 整项不能因第一步完成就整体勾选。
