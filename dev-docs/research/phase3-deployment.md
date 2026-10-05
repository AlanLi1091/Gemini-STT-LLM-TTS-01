# Phase 3 收尾预研：Express 后端与 Playground 部署方案

> 状态：预研完成；用户已选定常驻 VPS（见 [ADR-010](../adr/0010-phase3-deployment-and-direct-connect.md)），本轮 Task 18 Step 1 与 VPS 私有部署已获授权并完成，见第 9 节。外部平台参数及价格为预研时点参考，**以官方文档和实际报价为准**。

## 1. 部署目标与形态

本预研回答是否需要把现有 Express 后端与 Playground 公开部署、适合部署到哪里，以及由此带来的存储、流式连接、密钥和运维代价。当前 Task 11–14 已完成后端 SSE、会话持久化和前端服务端模式；部署是后续产品使用场景的选择，不是当前功能验收的先决条件（见[历史归档](../history.md)、[路线图](../roadmap.md)）。

| 形态 | 做法 | 收益 | 代价 |
| :--- | :--- | :--- | :--- |
| 单体（优先评估） | Express 同时托管 Playground 的 `dist` 静态产物与 `/api`；浏览器访问同一 Origin | 域名、TLS 和访问路径集中；同源请求大幅简化 CORS | 需要补静态托管与前端路由回退，并统一构建、发布流程 |
| 前后端分离 | 前端静态站点与 Express API 分别部署 | 前端 CDN 与后端可独立发布 | 必须将前端**真实 Origin** 精确配置进服务端 `ALLOWED_ORIGINS`；还需管理两个发布入口与跨域排障 |

现有 CORS 中间件按 `ALLOWED_ORIGINS` 精确匹配 Origin，空值会拒绝任何带 Origin 的请求，包括浏览器可能发送的同源请求。单体实施时须让中间件正确接受真实同源 Origin，或将生产 Origin 精确配置进白名单；Task 13 的 Vite 代理修复属于本地开发链路，不能直接视为生产部署配置（见[历史归档](../history.md)与[风险 12](../risks.md)）。

## 2. 平台对比：Cloud Run 与 VPS

| 维度 | Cloud Run | 常驻 VPS |
| :--- | :--- | :--- |
| SSE 与超时 | 支持流式响应；请求超时默认 300 秒、可调至 3600 秒。长于设定值的请求仍会终止，需按生成时长配置 | 反向代理读超时可按业务需求放宽，同时设置合理上限并维护代理配置 |
| 启动与在线状态 | 可缩至零，低流量时可能冷启动；保持最小实例可降低冷启动，产生常驻费用 | 进程常驻，通常无按请求冷启动；需处理重启和故障恢复 |
| 运维 | 托管实例与扩缩容，日常主机运维较少；需管理部署、密钥、日志与限额 | 自行维护 systemd/pm2、TLS 证书、系统更新、反代与主机加固 |
| 粗略成本 | 按资源使用量计费；最小实例、卷、出网等另计，须按流量核算 | 入门 VPS 约 **$5/月量级**，仅作预算量级，存储、流量、备份和运维时间另算 |
| Phase 4 前瞻 | discord.js 网关是常驻长连接进程；若沿用 Cloud Run，需要另行设计常驻进程运行方式与费用 | 常驻算力天然契合网关运行模型；仅供未来决策参考 |

Cloud Run 的超时、缩零与收费方式以[请求超时](https://cloud.google.com/run/docs/configuring/request-timeout)、[服务概览](https://cloud.google.com/run/docs/overview/what-is-cloud-run)为准；VPS 价格以所选供应商报价为准。Phase 4 参考不构成该阶段开发授权。

## 3. 存储矩阵：平台 × 引擎

现状是 `JsonSessionStorage` 将每个会话存为 `data/` 下的单个 JSON 文件；消息遵守 [ADR-005](../adr/0005-message-id-immutability.md) 的仅追加语义。Task 14 实现同会话写入**进程内**串行化，但没有跨进程或跨实例协调。[ADR-009](../adr/0009-server-monorepo-sse.md) 将 SQLite 定为部署期可选插件，当前并未实现。

| 平台 × 引擎 | 数据存续与并发条件 | `data/` 备份策略 |
| :--- | :--- | :--- |
| VPS × JSON（当前实现） | 挂载在持久磁盘时可跨进程重启保留；单进程写入模型与现有实现相符 | 定期备份整个 `data/`，保留异机或异地副本，定期演练恢复；备份需避免读取写入中的临时状态 |
| VPS × SQLite（可选，未实现） | 单写者数据库适合单实例；需要实现插件及迁移、锁与备份验证 | 备份数据库文件应使用 SQLite 一致性备份方式，不能把运行中的文件随意复制当作可靠快照 |
| Cloud Run × JSON（当前实现） | 默认实例文件系统易失，实例停止、缩零或重部署后会话可能消失；持久化须引入外部卷或存储方案并验证文件操作语义 | 未挂载持久存储时，实例内 `data/` 备份无法保证会话留存；挂载后按外部存储的快照、版本和恢复机制设计 |
| Cloud Run × SQLite（可选，未实现） | 默认实例文件系统同样易失；持久卷、SQLite 锁和文件语义需要单独验证，不能仅换引擎解决持久化 | 依托经验证的持久卷与 SQLite 一致性备份；恢复测试是上线条件 |

**推论与约束**：两种文件型引擎在当前架构下都没有跨实例写协调，因此只要沿用本地文件会话存储，部署拓扑必须限制为**单个有效写入实例**；Cloud Run 方案需以 `max-instances=1` 作为通用硬约束。该参数只是实例上限，**不能单独保证跨版本切流期间只有一个写入者**，也不能使实例文件持久；发布时还需处理旧版与新版并存、共享卷写入和流量切换。多实例需要改用具备共享存储与写协调的方案，作为 Phase 5 参考议题，不在本任务实施。Cloud Run 文件系统与实例规则见[容器运行契约](https://cloud.google.com/run/docs/container-contract)和[最大实例说明](https://cloud.google.com/run/docs/configuring/max-instances)；卷挂载可行性及具体语义须以[官方卷文档](https://cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts)核验。

## 4. SSE 运维清单

- [ ] 保留现有约 15 秒一次的 SSE 注释心跳 `: ping`（[ADR-009](../adr/0009-server-monorepo-sse.md)、[Task 12 记录](../history.md)）；同时核对链路各层空闲超时。
- [ ] 反向代理对 `/api/chat/stream` 关闭响应缓冲：Nginx 使用 `proxy_buffering off`，或确保应用现有的 `X-Accel-Buffering: no` 响应头被代理遵守。
- [ ] 对 SSE 路由设置足够的代理读取超时，并与平台请求超时及应用允许的最长生成时间一起核对。
- [ ] 对 SSE 响应关闭 gzip 等会延迟逐块输出的压缩与变换；保持 `text/event-stream` 和 `Cache-Control: no-cache, no-transform`。
- [ ] 明确客户端不得假定断点续传：现有 Task 12 契约对携带 `Last-Event-ID` 的请求返回拒绝；断线后只能发起新请求，不能从中间事件继续（见[测试台账](../tests.md)）。

## 5. 密钥与探针

`GEMINI_API_KEY` 仅注入服务端环境，不写入前端构建产物或 Git；这是 Task 12/13 的既有边界及[风险 3](../risks.md)要求。Cloud Run 倾向通过 Secret Manager 将密钥提供给服务环境变量，具体授权与版本管理见[官方密钥文档](https://cloud.google.com/run/docs/configuring/services/secrets)。VPS 可用服务端 `.env`，设文件权限为 `600`、不入 Git；仓库现有 [`.env.example`](../../.env.example) 可作变量名称参考，不包含真实密钥。

现有 `GET /api/health` 可作为启动探针的 HTTP 检查目标；它目前仅返回服务状态，不验证 Gemini 外部依赖或会话磁盘可写性，因此不能当作完整就绪检查。单体同源部署可基本绕开浏览器跨域问题，但仍须按第 1 节处理现有 Origin 白名单；分离部署则须准确配置 `ALLOWED_ORIGINS`。

## 6. 公开部署中的直连模式处置

[ADR-006](../adr/0006-frontend-direct-connect.md) 明确规定浏览器前端直连仅供本地 Playground 调试，**禁止在公开部署中使用**。这与 [Task 13 Step 2 的“直连模式去留”](../backlog.md)是同一待裁决事项，最终选择归用户。

| 选项 | 收益 | 代价与边界 |
| :--- | :--- | :--- |
| 整体移除 | 公开产物与维护路径最简单，避免浏览器密钥入口 | 本地直连调试能力消失；需修改设置迁移与相关测试 |
| 构建期裁剪 | 本地调试保留，公开构建剔除直连 UI、SDK 与运行路径 | 增加构建变体和产物检查，须验证公开包确实不含可用直连入口 |
| 保留代码、生产构建隐藏 UI | 改动较小，保留本地调试实现 | 仅隐藏 UI 不足以满足 ADR-006 红线：公开产物若仍可触发直连或读取浏览器密钥，仍不合规；须同时禁用生产运行路径并验证 |

## 7. 结论、推荐倾向与实施拆解提案

**是否部署**：若需要公开访问 Playground 或跨设备使用后端，应在用户完成平台及直连模式裁决后单独实施部署；若当前仍限本地调试，Phase 3 功能验收不要求上线。**部署形态**优先评估单体同源，以减少跨域和发布入口复杂度。

**平台推荐倾向**：低流量 Playground、当前有状态文件存储，加上 Phase 4 常驻网关的前瞻需求，使**常驻算力/VPS**成为主推荐；前提是接受主机、TLS、备份与安全运维责任。Cloud Run 更适合希望降低主机维护且接受会话易失的试运行；若要求会话持久，需引入外部卷或共享存储，并验证文件语义、备份和成本。这是预研建议，部署平台仍由用户裁决。

后续如获授权，可把实施拆为以下独立任务提案；此清单**只记录在预研文档，不写入 Backlog，也不在本次实施**：

1. 确定平台与部署拓扑，形成 ADR-010，并明确持久化与单写入实例策略。
2. 准备 Dockerfile 与生产构建流程；由 Express 托管 Playground 静态产物并处理前端路由回退。
3. 配置反向代理、TLS、SSE 超时及无缓冲传输；核对健康探针。
4. 整理生产环境变量模板与密钥注入方式；落实公开构建中的直连模式裁决。
5. 实施 `data/` 备份、异地保存及恢复演练；验证重启和发布切换时的会话连续性。
6. 进行上线前流式连接、冷启动或进程恢复、故障回滚的验收。

## 8. 边界声明

本预研**不阻塞 Phase 3 退出条件**：按[路线图](../roadmap.md)，Phase 3 的退出条件是 Task 11–14 完成、Node.js 服务承载领域内核、Playground 改连后端且原有测试语义零漂移、会话 JSON 文件持久化、密钥收拢至服务端环境变量；[Backlog 原条目](../backlog.md)亦明确“部署方案……不阻塞 Phase 3 退出条件”。正式结项仍待用户授权。

本任务只产出文档；不创建代码、Dockerfile、配置或 CI，不部署、不申请云资源、不选择最终平台、不修改直连模式，也不执行 Phase 3 正式结项或 Phase 4 工作。


## 9. Task 18 Step 1：私有 VPS 实施记录

用户确认文件计划并独立授权 VPS 加固 / 部署，进一步确认没有域名、Playground 仅本人使用。因此落实 ADR-010 的 Express 静态托管与 ADR-011 的独立 Bot / Express，以 SSH 隧道代替公网反向代理 / TLS；本步未开启公网 HTTP 服务。Task 18 Step 2–3 尚未实施。

### 实际拓扑与加固

- Vultr Seattle，149.28.13.41，Ubuntu 26.04.1 LTS x64，1 vCPU / 950 MiB 可用物理内存量级 / 25 GB 磁盘，原有约 2.4 GB swap 和 Auto Backup。
- 初始核查已启用 UFW、仅放行 22/tcp，但允许 root / 密码 SSH。建立 gemini-admin 并沿用现有授权公钥；独立连接验证 sudo 后，关闭 root / 密码 / 键盘交互登录，仅允许该管理用户与至 127.0.0.1:3001 的本地转发。管理用户有免密 sudo，不改变本机私钥。
- 升级 12 项系统包并安装新内核；应用启动前重启，确认 7.0.0-38-generic、SSH 管理入口与防火墙生效。应用上线后的主机重启自恢复测试仍属于 Step 2。
- 官方 Node v24.21.0 / npm 11.19.0，Linux x64 官方包经同源 SHA-256 校验；安装至 /opt/node，未复制 Mac node_modules 或 lockfile。
- 发行物 /opt/gemini-chat/releases/task18-20261005-01，current 符号链接指向它；构建在 Linux 进行，之后代码归 root 且应用不可写。Linux lockfile 保留在发行物，不解除仓库既有忽略规则。
- gemini-server 写入 /var/lib/gemini-chat（0700），gemini-bot 为独立账号，验证无法读取会话目录；两个 EnvironmentFile 均 root:root 0600。检查运行进程环境变量名称，确认 Gemini Key 只在 Express、Discord Token 只在 Bot，不输出值。
- 两个 systemd 单元 active / enabled，Restart=on-failure、15 秒间隔、5 分钟内至多 5 次，达到启动限制需修复后 reset-failed。Express 仅监听 127.0.0.1:3001，IPv4 / IPv6 公网仍仅 SSH。

### 代码与部署验证

- readServerConfig 默认 loopback、验证端口、可配置持久目录与独立 dist/web 静态目录；静态产物缺失拒绝启动。API 不进入页面回退，点文件 / 目录穿越与 Web 目录之外服务端 bundle 不提供。
- 服务端 SIGINT / SIGTERM 停止接收请求，最多等待 15 秒再关闭活动连接；SSE 保留既有断线中止语义。备份期间实测 server stopping / stopped 与 Bot stopped，无异常退出。
- 根默认 server:build 产物命名与 type=module 不适配实际 Node 启动，生产构建按 deploy/README.md 输出 server.cjs；没有修改既有根脚本。Web 构建仅清理 dist/web，保留两个服务端产物。
- Bot 初次启动因为 current 符号链接与 import.meta 真路径不一致，入口守卫未执行；修正 systemd 为在 WorkingDirectory 内调用 dist/bot.js。之后真实 shard ready / ready，备份恢复后再次 ready；未修改 Bot Token 或入口代码。
- 本机及受控 Linux 均 31/31 套件、294/294 用例，新增部署 7 项；两环境根与四包类型检查通过；Linux Web / Express / Bot 构建通过，裁剪为生产依赖后 npm audit --omit=dev 报 0 vulnerabilities。
- SSH 隧道仅监听 Mac 127.0.0.1:18080，真实页面完成 Gemini 回复“连接成功”（145 total tokens）；服务备份重启后页面刷新恢复同一轮对话。截图留在 /private/tmp/task18-playground.jpg，仅为本轮本机验收附件，不提交仓库。
- systemd 初次启动 / 手动修复与备份期间的正常停止不计为自动故障重启；最终两个单元 NRestarts=0。短时观察不证明长期内存稳定，Step 2 仍须真实 ≥24 小时。

### 备份与恢复证据

运行 deploy/backup.sh，停止两个服务后生成 /var/backups/gemini-chat/data-20261005T071538Z.tar.gz 与校验文件；权限 0600，服务自动恢复。备份解压至隔离临时目录，与现网全部持久文件一致，未覆盖 / 回退现网日志。经 SSH 下载至本机被 Git 忽略的 data/vps-backups，SHA-256 再次验证通过；本机副本与云端备份位于不同主机。现有本地开发会话未迁移至 VPS。

关键发行物 SHA-256：

| 文件 | SHA-256 |
| :--- | :--- |
| dist/server.cjs | 2817e5a454f22b42a9a4a67f26b952b74983d738eba3b94a80bba5695fcc2b9d |
| dist/bot.js | 7e3fb22a485869525626d94d3e4d042f8aa241259390d2f7b67d7b389e2cbda3 |
| Linux package-lock.json | 109d0970ac63dbbcd775f7631153581622630d80d42820f1356503fd0e4a985f |

验证上线九个源码 / 部署配置文件与本机逐文件 SHA-256 一致。运维入口、访问方式、发布回滚与恢复流程见 [deploy/README.md](../../deploy/README.md)。

### 遗留与范围

- 连续 ≥24 小时、上线后主机重启自恢复、Web 与真实 Discord 消息同时对话，以及 Phase 4 正式结项仍待后续步骤。本步仅验证 Bot 登录，不主动在 Discord 发送测试消息。
- Linux 新解析的依赖在既有 UI 测试中产生 React act 警告，全部断言仍通过；未越界改动历史 UI 测试。npm 报部分依赖安装脚本未授权，实际测试 / 三构建 / 运行通过，未额外放开脚本；后续发布用本 release Linux lockfile 与 npm ci 保持版本一致。
- systemd-analyze verify 返回成功，但系统自带 XFS 两个单元报告 CPUAccounting 已废弃；本项目两个单元未使用该配置，不修改无关系统单元。
- 此版本为首次部署，尚无上一发布版本可回滚；保留旧内核与云端控制台恢复入口。自动定时备份 / 保留周期未配置，手动一致性备份、异机副本和隔离恢复已验证；备份会暂停服务，长期验收中需记录计划停机。
- SSH 隧道是本人私有访问边界，不实现公网身份认证；未来开放公网需另行授权访问控制、TLS 与反向代理，不可直接把监听地址改为公网。
