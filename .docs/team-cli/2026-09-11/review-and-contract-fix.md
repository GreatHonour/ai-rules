# review 全量修复与资源契约调整

## 问题

- review.md 中 R1-R6 已由用户确认全部修复。
- 原资源条目以 `url` 定位资源，缺少可展示的说明；`updatedAt` 格式不符合用户要求。

## 目标行为

- registry 顶层保存公共 `repositoryUrl`，rule/skill 条目仅保存 `version`、`desc`、`updatedAt`。
- manifest 顶层保存实际使用的 `repositoryUrl`，逐项条目同样不保存 URL，并为受管 skill 追加 `managed: true`。
- `updatedAt` 使用 UTC `yyyy-MM-dd HH:mm:ss`，严格校验并统一生成。
- 资源路径按种类和安全资源名推导；registry、manifest 与同步入口均拒绝路径穿越名称。
- 初始化/config 在选择前展示 registry 中 rule 的名称与描述；release 新资源时要求维护者输入描述。
- 完成 review R1-R6 的全部修复，并保持 `.git`、本地非 flow skill、用户 index/分支和失败回滚边界不变。

## 验证场景

- 旧的 `url` 字段、缺失 `desc`、非规范时间和危险资源名均被字段路径错误拒绝。
- 同一仓库的多个资源只 clone 一次，任一资源失败仍清理整个批次。
- pre-commit 校验不构建、不写 `dist`；release 缺少 Git/origin/rules/skills 任一契约时失败。
- 已有 `AGENTS.md` 缺少标记时先输出提示再追加。
- 全量测试、类型检查、构建、CLI 帮助与发布干运行通过。

## 不变边界

- 不兼容旧 `agentctl`。
- 不引入私有仓库鉴权、checksum、依赖解析或自动 npm 发布。
- 不自动提交、暂存或推送公共资源变更。
