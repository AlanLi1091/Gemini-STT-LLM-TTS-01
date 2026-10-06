# Task 18 Step 1：私有 VPS 部署

拓扑：仅一个 Express 写入进程与一个独立 Discord Bot；Web 与 API 同源。没有域名，仅本人使用；Express 只监听 127.0.0.1:3001，公网仅开放 SSH，不安装 Nginx / TLS。SSH 隧道提供加密传输。

## 主机与目录

- 管理账号 `gemini-admin` 使用现有 SSH 公钥；先验证登录和 sudo，再禁用 root、密码和键盘交互登录。公钥沿用 root 的 authorized_keys；私钥只留在 Mac。管理账号有免密 sudo，须保护本机密钥。
- SSH 配置 `/etc/ssh/sshd_config.d/00-gemini-hardening.conf`：只允许 gemini-admin，允许本地转发到 127.0.0.1:3001，关闭 agent / X11 转发。执行 sshd -t 后 reload；UFW 默认拒绝入站，仅允许 22/tcp（IPv4 / IPv6）。
- 官方 Node 24 Linux x64 安装到 `/opt/node`，下载同源 SHASUMS256.txt 并验证 SHA-256；升级时同样校验。
- 发布目录 `/opt/gemini-chat/releases/<release>`；`/opt/gemini-chat/current` 指向活动版本，代码归 root，应用不可写。
- `/var/lib/gemini-chat` 是 Express 唯一可写会话目录，gemini-server 所有、0700；Bot 使用独立 gemini-bot 用户，禁止读取会话目录。
- `/etc/gemini-chat/server.env`、`bot.env` 分别注入 Gemini Key 和 Discord Token；root 所有、0600，由 systemd 读取。生产目录不放 `.env`，不打印真实密钥。

## Linux 构建与发布

从已审阅代码生成源码包，不包含 `.env`、data、node_modules 或 macOS lockfile。受控 Linux 环境执行以下操作，发布期保证单写者：

1. 设置 PATH 包含 `/opt/node/bin`，在新的 release 目录执行 `npm install`；Linux lockfile 留在该 release，不提交仓库，不解除现有忽略规则。
2. 执行 `npm run test`、`npm run lint`。
3. 执行 `npm run build -- --outDir dist/web`；必须先构建 Web，Vite 的清理范围仅为 dist/web。
4. 执行 `./node_modules/.bin/esbuild server/index.ts --bundle --platform=node --format=cjs --target=node24 --outfile=dist/server.cjs --external:express --external:dotenv`，再执行 `npm run bot:build`。
5. 服务端生产文件使用 `.cjs`，避免根 type=module 与默认 CommonJS bundle 冲突；Bot 保持现有 ESM，systemd 在 WorkingDirectory 内使用相对入口 dist/bot.js，避免 current 符号链接与 import.meta 的真实路径不同导致入口守卫跳过启动。只托管 dist/web，不托管包含服务端代码的整个 dist。
6. 执行 `npm prune --omit=dev`，保留 Linux lockfile、构建日志与版本摘要；发行物 root 所有、应用不可写。
7. 首次部署安装两个 systemd 单元，`systemd-analyze verify` 后 daemon-reload；指向新 release，先启动 Express，检查 /api/health 与目录可写，再启用 Bot。
8. 后续切版先暂停 Bot、停止旧 Express 并备份，原子替换 current 符号链接再启动；不同时运行两个 Express 或 Bot。失败时停止两者并将 current 切回上个 release。代码回滚不回滚会话日志，格式变更另行评审。

## 使用 Playground

在 Mac Terminal 执行以下运维命令，保持窗口打开：

```sh
ssh -N -L 127.0.0.1:18080:127.0.0.1:3001 -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 gemini-admin@149.28.13.41
```

然后打开 http://127.0.0.1:18080 。本地转发仅监听 loopback，关闭终端即断开；VPS 两个 systemd 服务继续运行。若需要指定私钥，增加 `-i ~/.ssh/id_ed25519`。端口被占用时先检查占用，不随意换端口；更改端口需同时更新服务端 ALLOWED_ORIGINS 并重启 Express。

管理命令：SSH 登录后用 `sudo systemctl status gemini-server gemini-bot`、`sudo journalctl -u gemini-server -u gemini-bot` 查看状态。不要用 systemctl show Environment 或 cat 环境文件输出密钥。systemd on-failure 每 15 秒重启，5 分钟内超过 5 次触发启动限制，修复后 reset-failed 再 start。

## 备份与恢复

`sudo /opt/gemini-chat/current/deploy/backup.sh` 会记录服务状态、停止 Bot / Express、打包整个持久目录（会话与频道绑定一起），校验归档后重启原本运行的服务；不备份密钥。备份权限 0600，目录 0700，失败时不发布临时包，停止期间中断请求不会自动重发。

- 备份位于 `/var/backups/gemini-chat`，Vultr 自动备份不能替代应用一致性备份与异地副本。
- 将明确选定的归档及 SHA-256 文件用管理账号 sudo 读取后经 SSH 加密保存到本机受保护目录；只用来自本项目的可信归档，先校验 SHA-256。
- 恢复演练先解压到隔离临时目录，对比全部会话文件、绑定与文件校验和；不覆盖现网日志。
- 灾难恢复：停两服务，保留当前 data 副本，校验备份，恢复到 /var/lib/gemini-chat，修复归属 gemini-server、0700 目录与0600文件，再先启 Express 后 Bot。恢复到旧备份会失去备份之后的数据，需要另行明确确认；严禁在写入运行时恢复。
- 本步不自动删除旧备份，避免无授权删除数据；磁盘保留与定时备份后续按实际增长另行规划。

## 验收边界

Step 1 验证系统加固、两个非 root 服务启动、loopback / 隧道访问、密钥按职责隔离、SSE、备份和隔离恢复。连续 ≥24 小时、主机重启自恢复与 Web / Discord 同时对话属于 Step 2，须下一轮指派。本步骤完成后服务保持常驻，不自动继续 Step 2 或结项。

参考：[Ubuntu OpenSSH](https://documentation.ubuntu.com/server/how-to/security/openssh-server/)、[Ubuntu 防火墙](https://documentation.ubuntu.com/server/how-to/security/firewalls/index.html)、[systemd.exec](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)、[Node 24 官方发布](https://nodejs.org/download/release/latest-v24.x/)。


## Task 18 Step 2：真实在线验收

采集器为 deploy/validate-online.sh，使用系统 /usr/bin/python3。安装到 /opt/gemini-validation，两个新 systemd 单元 gemini-validation.service / timer 每分钟采样；采样只读取 systemd、Bot journald 与本机 /api/health，不调用 Gemini、不发送 Discord 消息、不重启应用。

- root 专属 /var/lib/gemini-validation/samples.jsonl 保留 UTC、单调时钟、boot ID、进程 invocation / PID / 重启次数 / 内存及安全状态；state.json 保留网关状态与 journal cursor，不保存消息正文、密钥或 SDK 错误原文。
- 首次采样读取当前 boot 的 Bot 日志；后续按 cursor 增量读取，仅采用当前 Bot invocation 的连接事件。按用户确认的口径，重连 / 断开在同进程自动恢复且原始日志证明耗时不超过 5 秒时允许计入观察；超时、未恢复、错误或停止仍判为中断；30 秒内存日志超过 90 秒未更新亦不通过。
- --report 只读汇总：必须同 boot 与两服务 invocation、健康样本连续跨度达到 86400 秒、间隔不超过 150 秒、最后样本新鲜，且无损坏 JSON。有效故障、重启或采样缺口重新累计；短暂恢复列出逐次开始 / 结束的单调时间、耗时、次数及总耗时，保留原样本判定和新口径结果；此结果不替代人工双入口验收，也不证明采样间隔内所有瞬时 REST 故障不存在。
- 原始 samples.jsonl 不改写；旧口径因重连判失败的样本，仅在当前 boot / invocation 的 journald 有完整配对且不超过 5 秒、HTTP与内存日志新鲜度及两进程健康时重新评估。日志缺失 / 不配对 / 错误路径不放行；failed_samples 保留原判定数，effective_failed_samples 表示新口径失败数。
- 重启主机前先确认没有正在生成的请求；重启后不手动启动应用，验证两个 enabled 单元自动 active、Bot ready、已有 Web 会话完整、原会话文件校验一致。观察窗口从重启后的健康样本开始。
- 验收期间不要切版、手动重启或运行会停服务的 backup.sh；需要维护时如实记录并重新累计窗口。查看数据不停止采集。
- 在 Web Playground 发起一次简短测试；用户在指定 Discord 频道直接 @Bot 发起测试。核对 input handled、频道持久化、非空最终回复，并确认 Web 与 Bot 同时在线。由用户发起 Discord 消息，不用 Bot Token 冒充用户发送。
- 真实至少 24 小时后检查报告、所有异常区间与内存趋势，核对同窗口双入口已验收证据与最终服务状态；通过后停用 gemini-validation.timer 保留证据，只完成 Step 2，不自动正式结项。

运维只读报告命令：sudo /opt/gemini-validation/validate-online.sh --report。验收采集是 VPS systemd 任务，Mac 关机不影响采样；聊天的后续检查仍需要本机 Codex 和 SSH 可用。VALIDATION_DIR / VALIDATION_BOOT_FILE / VALIDATION_HEALTH_URL 为测试注入变量，生产 unit 使用默认路径和 loopback 地址，不提供对外接口。

本轮Step 2已通过，验收timer已disabled / inactive；最终保存报告与原始journal位于/var/lib/gemini-validation，详见[最终验收记录](../dev-docs/research/phase3-deployment.md#最终验收2026-10-06)。停采后动态报告会自然过期，保存的final-report.json记录验收时的新鲜度；两个应用仍保持常驻。
