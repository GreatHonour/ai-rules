---
name: flow-plan-review
description: "在 flow-plans 之后、实现前审查计划，重新建立决策到 design.md 和 task.md 的追踪映射，并通过场景反证发现遗漏；问题修正后进入 flow-implement。不适用于 bugfix 或实现代码审查。Use automatically after flow-plans and before implementation."
metadata:
  author: icc-grow
  version: "1.1.0"
---

# 计划审查 (Plan Review)

审查 `flow-plans` 生成的 `design.md` 和 `task.md`，确认已批准的决策被完整、准确地转化为可执行任务。

## 前置条件

必须同时存在：已确认的决策、`design.md` 和同目录的 `task.md`。缺少任一项时停止，不得从设计反推决策。

不适用于 `flow-bugfix`。代码审查由 `flow-review` 负责。

## 审查内容

从原始决策重新开始，不沿用 `flow-plans` 的结论：

1. 将决策按语义编号为 `D1、D2...`
2. 检查决策 → `design.md` → `task.md` 的完整映射
3. 反查任务是否有设计依据，是否越界
4. 检查文档矛盾和错误的任务依赖
5. **场景反证**：用具体场景验证涉及状态变化、生命周期、权限、并发、资金和外部依赖的规则；两种合理结果但决策未定义时列为阻塞
6. 检查未定义的对象生命周期、状态转换或异常恢复策略
7. 验证跨边界交互契约完整性

有疑点时读相关代码或项目文档核实。能自行查明的不询问用户。发现决策缺失时标注 `[决策缺失]`，当前澄清后继续。

## 输出

- **阻塞**：决策断链、文档矛盾、任务越界或计划不可执行，未解决前不得实现
- **建议**：存在明确的维护或验证风险，但不影响正确实施

无问题时只报告检查的决策数量和通过结论。有问题时一次列完：

```text
P1 [阻塞/建议/决策缺失] 标题
追踪：决策 → design.md 位置 → task.md 位置或缺失
影响：具体风险
建议：修改或澄清方向
```

确认前不修改文件；确认后只修改 `design.md` 和 `task.md`，再重新审查。对 `[决策缺失]` 项，澄清后直接补充到 `design.md`，必要时更新 `task.md`。

阻塞项清零后自动调用 `/flow-implement`；用户要求停在计划阶段时除外。
