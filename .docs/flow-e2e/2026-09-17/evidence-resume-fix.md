# flow-e2e 证据留存与恢复执行修复

## 目标

- 类型：小型变更
- 目标：E2E 任务执行或恢复执行 -> 按来源任务的顺序依赖继续验证，并将任务专属日志、截图等证据地址持久化到任务状态与最终报告。
- 边界：依赖关系以 `task.md` 或对应 `*-fix.md` 为准，来源任务按顺序完成；本次不新增循环依赖检测，不改变 `init/get/update/check` 四个命令。

## 历史依据

- 功能文档：`.docs/flow-e2e/2026-09-17/design.md`、`skill-contract-fix.md`、`task-verification-fix.md`。
- 代码历史：当前工作区已有未提交的 flow-e2e 契约修复，本次在现有 `depends` 和四命令契约上增量修改，不回退已有改动。

## 实现

- JSON 模板与状态校验增加 `evidence: []` -> 所有任务都能持久化零个或多个证据地址。
- 验证工具仅在存在任务专属工件时，将日志、截图和录屏等证据生成到来源文档同目录的 `evidence/` -> 状态脚本只校验并记录地址，不负责采集测试工具输出。
- 任务专属日志默认命名为 `<task_name>.log` -> 文件名包含 Windows 非法字符时替换为 `_`；同目录同名冲突时追加 `task_id`，防止覆盖其他任务证据。
- `update` 支持通过可重复的 `--evidence <路径>` 记录多个任务专属证据地址 -> `passed`、`failed` 均可保留证据；`blocked` 在存在环境诊断证据时也可记录。
- 删除 `error_log` 字段 -> `--log` 仅作为日志证据的便捷入口，最终与其他证据一起写入 `evidence`，不再维护单独的日志地址。
- 恢复执行时从来源文档重建稳定任务 ID 队列，并对队列中的每个 ID 调用一次 `get` 建立状态快照 -> 后续每次 `update` 同步内存状态，不重复读取完整 JSON。
- 将“最小验证”改为“逐项覆盖全部验收条件；同一次测试覆盖多个任务时复用证据，避免重复执行” -> 消除少测或漏测歧义。
- 报告仅输出拥有专属文件的终态任务证据地址 -> 迭代级测试结果在修复说明中记录一次，避免重复附件。

## 验证场景

- 初始化任务 -> 每项包含空的 `evidence` 数组。
- 读取包含旧 `error_log` 的状态文件 -> 返回结果移除旧字段，并将非空日志地址迁移到 `evidence`。
- 更新通过、失败或阻塞任务并提交一个或多个证据地址 -> `get` 返回完整证据数组，其他任务不受影响。
- 证据地址不在当前迭代目录的 `evidence/` 内或目标不存在 -> 更新失败且不修改任务文件。
- 日志任务名包含非法字符或与已有日志同名 -> 使用安全文件名且不覆盖其他任务证据。
- 从已有状态文件恢复 -> 每个任务只调用一次 `get` 建立快照，已完成任务不重跑，依赖通过后按来源顺序继续。
- 最终 `check` -> 报告仅列出拥有专属文件的通过、失败和阻塞任务证据地址。
- 一个测试覆盖多个任务 -> 测试只执行一次，每个相关任务分别记录同一证据地址并更新状态。

## 影响范围

- `.agents/skills/flow-e2e/SKILL.md`
- `.agents/skills/flow-e2e/assets/e2e-task.json`
- `.agents/skills/flow-e2e/assets/e2e-report-template.md`
- `.agents/skills/flow-e2e/scripts/e2eTasks.mjs`
- `.agents/skills/flow-e2e/scripts/e2eTasks.spec.mjs`

## 验证结果

- `pnpm exec node --test .agents/skills/flow-e2e/scripts/e2eTasks.spec.mjs`：12/12 通过。
- `pnpm exec node --check .agents/skills/flow-e2e/scripts/e2eTasks.mjs`：通过。
- JSON 模板解析、技能引用路径与 `git diff --check`：通过。
- 新契约与新写入已移除 `error_log`；当前迭代状态已迁移为 `evidence`，其他旧状态由读取兼容层在下一次 `update` 时写回新结构。
- `pnpm exec node .agents/skills/flow-e2e/scripts/e2eTasks.mjs check .docs/flow-e2e/2026-09-17`：4/4 通过；回归测试结果记录在本文件，未复制为任务级证据。
