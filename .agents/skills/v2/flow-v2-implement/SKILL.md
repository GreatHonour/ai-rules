---
name: flow-v2-implement
description: 按已批准计划的依赖顺序实施最小变更，并登记真实源码与检查事实。
---

# 实施

前置条件：`delivery.json`、设计和任务均已确认。读取 [状态模型](../_shared/references/state-model.md)、[授权边界](../_shared/references/authorization.md) 和项目 `AGENTS.md`/适用规则。

只选择依赖已满足的未完成任务；实现最小范围，保留无关改动。可重复验证优先使用项目现有测试、类型检查、lint 或构建。任务只有在代码和检查事实都存在时才标记完成；把仓库、分支、提交、命令 argv、结果和时间写回交付记录。

遇到契约冲突、跨仓库依赖无法验证或需要外部写入时停止并报告具体阻塞。实现完成可推导 `implemented`，不能据此声称 `verified` 或 `released`。
