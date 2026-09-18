# ADR-003：领域内核与传输层解耦，统一 ChatAdapter 接口

## 背景

最终目标含 Discord 接入与多模型支持，消息内核必须可脱离浏览器与单一模型运行。

## 决策

消息模型、会话状态、适配器调用抽为纯 TS 领域内核；所有模型接入（Mock、Gemini 及后续）实现统一 ChatAdapter 接口；语音以 Transcriber / Synthesizer 同理扩展。

## 影响

Phase 4 Discord 侧可复用同一内核；接入新模型只需新增 adapter；前端工作在最终架构中不废弃。
