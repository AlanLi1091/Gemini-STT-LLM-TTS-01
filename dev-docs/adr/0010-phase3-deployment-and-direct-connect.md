# ADR-010：Phase 3 收尾部署方向与前端直连退役

## 背景

Phase 3 [部署方案预研](../research/phase3-deployment.md)已完成，对常驻 VPS 与 Cloud Run、单体与分离形态、文件存储及公开部署密钥边界作出比较。用户裁决部署平台为常驻 VPS、前端直连模式整体移除，并授权 Phase 3 收尾实施包；实际部署仍需另行授权。

## 决策

1. **部署方向**：未来部署以常驻 VPS 为平台，优先采用 Express 托管 Playground 静态产物的单体同源形态；实施拆解见[预研第 7 节](../research/phase3-deployment.md#7-结论推荐倾向与实施拆解提案)，本 ADR 不授权实施。
2. **会话存储**：延续 [ADR-009](0009-server-monorepo-sse.md) 的默认 JSON 文件引擎，`data/` 放在 VPS 持久磁盘上，保持单实例、单写者约束；备份与恢复演练留待部署任务。
3. **密钥**：`GEMINI_API_KEY` 只在服务端提供；VPS 的 `.env` 文件权限设为 `600`，不提交到 Git。
4. **前端连接**：整体移除浏览器直连及本地 API Key 输入、存储与装配路径，Playground 仅连接后端服务；[ADR-006](0006-frontend-direct-connect.md) 的前端直连实践由本决策取代。

## 影响

- 部署实施是未来独立任务，包含构建、静态托管、反向代理、TLS、备份与上线验收；本次不采购 VPS、不配置主机、不发布服务。
- Phase 4 的 discord.js 网关属于常驻长连接进程，所选 VPS 的常驻算力与其运行需求契合；Phase 4 工作仍须另行授权。
- [ADR-008](0008-model-list-defense.md) 中浏览器侧 Key 清洗、空 Key 拦截及设置变更触发浏览器 Gemini Adapter 重建，随前端直连路径退役；服务端 Key 清洗与空 Key 防御继续有效。ADR-008 的历史记录保留，不能再把其浏览器侧防御视为当前产品路径。
