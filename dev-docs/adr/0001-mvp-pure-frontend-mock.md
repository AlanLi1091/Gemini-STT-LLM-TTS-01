# ADR-001：MVP 采用纯前端 Mock 机制

## 背景

低成本验证对话交互闭环。

## 决策

暂不接入云端服务，使用本地 Mock 与延时应答；本项目定位为长期保留的 Web Playground。

## 影响

降低初期依赖风险；经 ChatAdapter 接口可无缝切换真实 API。
