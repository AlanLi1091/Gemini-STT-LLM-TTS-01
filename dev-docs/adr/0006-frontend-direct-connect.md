# ADR-006：浏览器端直连与本地密钥管理

## 背景

Phase 2 核心目标为低门槛验证真实 LLM 交互与流式体验，暂无独立后端服务。

## 决策

采用方案 A（前端直连 Gemini API）；API Key 通过设置面板输入、存 localStorage、不入 git 不进构建产物；仅限本地 Playground 调试，公开部署禁止，Phase 3 服务端化后替代。

## 影响

零后端依赖快速推进 Phase 2；用户自主掌控 key 安全边界。
