## 功能：team-cli

### 2026-09-14 拆分前后端框架画像

- 能力或变更：`init` 和 `config` 使用可选的前端框架、后端框架参数，不再采集架构。
- 关键逻辑：新 manifest 使用 schema v2；读取 schema v1 时保留旧框架为前端框架，后端框架初始化为空数组并移除旧架构。
- 影响面：命令参数由 `--frameworks`、`--architecture` 调整为 `--frontend-frameworks`、`--backend-frameworks`。
