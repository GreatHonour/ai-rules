---
name: flow-v3-plan-review
description: 审查 decision.md 到 design.md、task.md 的追踪完整性，发现遗漏后再进入实现。
---

# 计划审查

这是可选的计划门禁，适用于跨仓库、数据库、权限、并发、外部平台或高风险交付。读取 `decision.md`、`design.md`、`task.md`、`delivery.json` 和适用规则。

## 检查

1. 为 `decision.md` 中的决策编号，建立“决策 → 设计 → 任务”映射。
2. 检查任务是否覆盖全部功能点、边界、异常、迁移、配置、回滚和已确认平台；反查任务是否越界。
3. 用具体场景反证状态、生命周期、权限、并发、跨仓库契约和失败恢复；两种合理结果但没有决策时列为阻塞。
4. 将问题写入同一目录的 `plan-review.md`，分为阻塞和建议；确认前不修改设计或任务。

用户确认后只修改 `design.md`、`task.md` 和必要的 `decision.md`，重新审查。阻塞清零后进入 `flow-v3-implement`。计划审查通过不表示代码已实现。
