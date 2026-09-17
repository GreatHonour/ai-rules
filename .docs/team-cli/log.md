## 功能：team-cli

### 2026-09-17 release 版本同步校验

- 能力或变更：`release` 更新 registry 时保留顶层 `repositoryUrl`，并校验 rule front matter `version`、skill `metadata.version` 与目标版本一致。
- 关键逻辑：已有资源按维护者选择的 SemVer 升级计算目标版本，新资源目标版本固定为 `1.0.0`；源版本不一致时在写入 registry 前失败。
- 结构决策：不自动修改源文件，要求维护者先同步版本号，避免 release 静默改写资源内容。
- 影响面：公共源仓库 `pnpm agents release` 发布流程及其回归测试。
- 遗留：`pnpm test` 仍会收集已有的 `.agents/skills/flow-e2e/scripts/e2eTasks.spec.mjs` 并因无 Vitest 测试套件失败；本次 release 测试、构建、类型和格式检查均通过。

### 2026-09-14 Windows `.agents` 占用兼容

- 能力或变更：`init`、`config`、`update` 在项目根目录创建带 UTC 时间戳的 `.agents` 备份后，原地同步受管资源；成功时提示用户手动删除备份目录。
- 关键逻辑：不再重命名 `.agents` 根目录；受管 rule 和 `flow-*` skill 单独覆盖，本地非 `flow-*` skill 与 `issues/` 保留。任一资源写入失败时汇总失败项并保留备份，跳过 manifest 与 `AGENTS.md` 更新。
- 结构决策：由目录交换改为“完整备份 + 原地资源更新”，规避 Windows 对被占用目录的 `rename` 限制，并将失败处置交给用户手动完成。
- 影响面：共享同步逻辑以及 `init`、`config`、`update` 的命令行输出。

### 2026-09-14 拆分前后端框架画像

- 能力或变更：`init` 和 `config` 使用可选的前端框架、后端框架参数，不再采集架构。
- 关键逻辑：新 manifest 使用 schema v2；读取 schema v1 时保留旧框架为前端框架，后端框架初始化为空数组并移除旧架构。
- 影响面：命令参数由 `--frameworks`、`--architecture` 调整为 `--frontend-frameworks`、`--backend-frameworks`。
