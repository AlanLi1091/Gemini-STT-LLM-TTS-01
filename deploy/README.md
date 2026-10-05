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
