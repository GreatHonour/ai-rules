## 功能：team-cli

### 2026-09-14 Windows `.agents` 占用兼容

- 能力或变更：`init`、`config`、`update` 在项目根目录创建带 UTC 时间戳的 `.agents` 备份后，原地同步受管资源；成功时提示用户手动删除备份目录。
- 关键逻辑：不再重命名 `.agents` 根目录；受管 rule 和 `flow-*` skill 单独覆盖，本地非 `flow-*` skill 与 `issues/` 保留。任一资源写入失败时汇总失败项并保留备份，跳过 manifest 与 `AGENTS.md` 更新。
- 结构决策：由目录交换改为“完整备份 + 原地资源更新”，规避 Windows 对被占用目录的 `rename` 限制，并将失败处置交给用户手动完成。
- 影响面：共享同步逻辑以及 `init`、`config`、`update` 的命令行输出。

### 2026-09-14 拆分前后端框架画像

- 能力或变更：`init` 和 `config` 使用可选的前端框架、后端框架参数，不再采集架构。
- 关键逻辑：新 manifest 使用 schema v2；读取 schema v1 时保留旧框架为前端框架，后端框架初始化为空数组并移除旧架构。
- 影响面：命令参数由 `--frameworks`、`--architecture` 调整为 `--frontend-frameworks`、`--backend-frameworks`。
