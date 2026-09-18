# ADR-007：流式响应统一纳入 ChatAdapter 契约

## 背景

LLM 对话打字机体验必须依赖流式传输，且需要支持用户中途打断。

## 决策

1. adapter 统一 `stream(): AsyncIterable<ChatChunk>` + `AbortSignal` 中断。
2. 注明 ADR-005“禁止原地修改”限定于编辑重发场景，流式中末条消息 content 逐 chunk 更新不违反，日志数组仍仅追加。

## 影响

统一 Mock 与真实模型的流式协议；打字机动效与 token 统计接口规范化。
