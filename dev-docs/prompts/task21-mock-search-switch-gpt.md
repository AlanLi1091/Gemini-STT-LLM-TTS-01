# Task 21 收尾验收用 Mock 搜索开关 GPT 指派提示词

2026-10-19 由 Claude 起草、用户确认留档。用户为 Task 21 收尾人工验收选择方案 A（见 [acceptance/task21-mock-checklist.md](../acceptance/task21-mock-checklist.md)）。基线 `V0.0.2-build.240`。本文件仅为提示词存档，不构成开工授权；以用户在会话中的实际指派为准。

```text
你是本项目的开发与测试执行方（GPT）。本轮任务：为 Task 21 收尾人工验收增加一个只在本地显式启用的离线 Mock 搜索开关，并补齐搜索配置的部署样例文档（Z2）。不做其他事。

## 0. 启动与流程（严格遵守 AGENTS.md / dev-docs/rules.md）
1. 通读 AGENTS.md、dev-docs/rules.md、dev-docs/status.md，再读：
   - dev-docs/acceptance/task21-mock-checklist.md（本开关服务的验收清单，尤其是 ★ 项）
   - ADR-015（N3：用途许可澄清前不得真实调用 Tavily）
   - server/index.ts、server/chat-adapter-stream-source.ts（createChatStreamSourceFromEnv、searchAdapter 选项）、server/search-adapter.ts（MockSearchAdapter）、server/search-config.ts、deploy/server.env.example、deploy/README.md 及相关测试
2. 先只提交计划：文件清单，加上每个文件一句话说明，以及配置取值表和各 Mock 场景返回的数据样例。等我确认后再动手，确认前不得创建或修改任何文件。
3. 按 TDD 实施：先写失败测试，再实现。
4. 单步闭环：全量测试、根目录及四个包的类型检查、三项构建全部通过后，在 backlog Task 21 相关段落注明本开关已交付（不勾选任何 Task 22 项）；同步 tests.md 台账和 history；然后 commit、push origin test、更新 status.md，再按累计提交数打 annotated tag（V0.0.2-build.<N>）并推送。完成后停止汇报，等待 Claude 复核。

## 1. 开关语义（硬性要求）
- 新增环境变量 SEARCH_PROVIDER：
  - 未设置或 none：与现在完全相同，不接入任何搜索适配器（搜索请求降级为 unavailable）。这是默认值。
  - mock：接入离线 Mock 搜索适配器。
  - 其他任何取值（包括 tavily）：启动时报错退出，错误信息固定、不含环境变量原文。本步不得接入真实 Tavily（N3）。
- 启用 mock 时，服务启动日志输出一行固定警告（例如 "[server] search provider=mock (offline fixtures, not for production)"），日志不含其他配置值。
- Mock 适配器不发起任何网络请求，只返回本地固定数据；仍须走完整的生产链路：准入顺序、搜索额度与每日账本（账本写在 SESSION_DATA_DIR 下）、期限、来源规范化、持久化、done 事件、刷新与回放。不得为 mock 绕过任何守卫。
- 生产默认不变：deploy/systemd 单元和 deploy/server.env.example 中不得启用 mock；server.env.example 中以注释形式说明 SEARCH_PROVIDER 只允许本地验收使用 mock，生产必须不设置或设为 none。

## 2. Mock 场景
- 新增 SEARCH_MOCK_SCENARIO（仅在 SEARCH_PROVIDER=mock 时生效；未设置时为 default；非法取值启动报错）。请在计划中给出每个场景的具体数据，至少包括：
  - default：3 条正常来源（中文标题与摘要、https 链接，其中 1 条为 IDN 域名）。
  - hostile：用于验收 W-11 / D-10 的恶意来源，包含 `<script>`、`[文字](链接)`、`@everyone`、`<@id>`、反引号、偶数个连续 `*` 的标题或摘要，以及 javascript: 链接和超长链接各一条（超长链接用于触发"链接过长未展示"）；数据必须经过现有 normalizeSearchSources，不得绕过过滤。
  - empty：返回 0 条结果（应降级为 no_results）。
  - fail：抛出搜索失败（应降级为 provider_failure）。
  - slow：延迟若干秒后返回 default，并遵守 AbortSignal（用于验收停止与超时）；延迟须小于搜索期限，具体秒数在计划中说明。
- 场景数据为代码内固定常量，不从文件或网络读取。

## 3. Z2：部署样例与文档
- deploy/server.env.example 补齐 Task 20 新增的全部搜索配置项（SEARCH_REQUESTS_PER_MINUTE、SEARCH_WEB_RESERVED_REQUESTS_PER_MINUTE、SEARCH_REQUESTS_PER_DAY、SEARCH_DISCORD_*、SEARCH_TIMEOUT_MS、SEARCH_LEDGER_PATH）及 SEARCH_PROVIDER，默认值与 server/search-config.ts 一致，并注明生产不启用搜索网络。
- deploy/README.md 增加简短说明：本地 Mock 验收如何启用（引用验收清单），以及生产不得设置 mock。
- 不修改真实的 server.env、bot.env、systemd 单元，不访问 VPS。

## 4. 测试（至少）
- 配置解析：未设置 / none / mock / 非法值 / tavily 的行为；SEARCH_MOCK_SCENARIO 合法与非法取值；非 mock 时 SEARCH_MOCK_SCENARIO 被忽略。
- 装配：默认装配不含搜索适配器；mock 装配含 Mock 适配器且输出启动警告；fetch 被替换为计数桩时，mock 全程网络调用为 0。
- 端到端（本机临时 HTTP 服务 + 临时数据目录）：default 场景得到 succeeded 及 3 条来源并持久化、刷新与回放一致、账本计数增加；hostile 场景危险链接被过滤或回退；empty / fail 分别降级为 no_results / provider_failure；slow 场景中途取消不保存来源。
- 现有全部用例必须通过（当前基线为 44/44 个文件、818/818 条用例）。交付前连续跑全量测试至少 3 次；如出现失败，记录用例名和错误。

## 5. 范围与约束
- 不调用真实 Tavily / Gemini / Discord，不访问 VPS，不新增依赖，不变更版本号，不合入 main，不部署；不提交 .zcodeignore。
- 不处理 Z1（Vite 代理删除 Origin）、Y1、D12 / P1-4 / R3、Q4、deployment-validation 偶发失败；不改 Web / Bot 代码。

## 6. 交付汇报
- 改动文件清单。
- 配置取值表与各场景数据样例。
- 启动警告的实际输出。
- 新增用例数、全量结果及多次运行结果。
- 一段可直接照做的本地 Mock 验收启动命令示例（server 与 bot）。
- commit 和 tag。
```
