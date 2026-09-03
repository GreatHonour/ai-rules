---
name: flow-implement
description: "按 design.md 和 task.md 的依赖顺序实现未完成任务。前置条件：必须存在 design.md 和 task.md。如果没有设计文档 - 先调用 plans；如果需求不明确 - 先调用 brainstorm。完成测试与质量检查后更新任务状态。Use when approved design and task list exist and user is ready to implement. DO NOT use without design.md/task.md - call plans first."
metadata:
  author: icc-grow
  version: "2.2.0"
---

# 任务实现 (Implement)

读取 `.docs/[文件名]/[YYYY-MM-DD]/design.md` 和 `task.md`，实现未完成的功能任务。”集成验证”任务留给 `flow-e2e/SKILL.md`。

## 实现规则
1. **按设计实现**：按 `task.md` 任务边界实现，不增加非本次任务范围的功能或重构。
2. **TDD 原则**：可测试的行为变更使用 TDD：先确认测试失败，再实现并确认通过。文档、配置、静态样式等无法有效测试的任务使用对应检查，不伪造测试。
3. **使用项目工具**：测试、类型检查、lint 和 build 使用项目已有命令，只执行适用项。
4. **需求变更处理**：需要改变业务行为、边界或方案时停止并报告。实现级修正同步到 `design.md`；任务边界变化同步到 `task.md`。
5. **规范约定**：规则文件已覆盖相关约定，禁止再读示例组件确认，如有不清晰请询问用户。

## 任务调度

主 agent 按 `depends` 选择任务。依赖全部为 `[x]` 后才能执行；`depends: 无` 可直接执行。

有 subagent 能力时，仅在以下条件全部满足时并行：

- 任务职责可以独立完成
- `depends` 均已满足
- 已明确列出各任务的写入文件范围且互不重叠

不满足时串行执行；共享写入范围的任务可交给同一 subagent。

主 agent 为每个 subagent 指定 Txx、任务原文、相关设计和允许写入范围（明确列出文件列表）。

- Subagent 执行前读取 `AGENTS.md` 和任务相关规则。
- Subagent 可以读取必要上下文，但不得实现其他任务或修改 `task.md`。
- 需要修改范围外文件时立即停止并申请扩展，不得先修改后报告。
- Subagent 执行期间，其写入范围不得由其他 agent 同时修改。
- Subagent 返回改动文件列表、检查结果和阻塞项。

主 agent 核对实际 diff 并运行受影响检查。通过后才将对应功能任务标记为 `[x]`。

## 执行流程

1. 读取设计、任务、规则和相关代码，确定验证命令。
2. 排除”集成验证”任务，按依赖选择功能任务并决定串行或并行。
3. 对每个任务：执行失败验证（适用时）→ 实现 → 增量检查，仅针对当前修改的文件（lint/type）→ 更新 task.md 状态。
4. 全部功能任务完成后运行适用的完整检查，对比基线排除误报。
5. 调用 `/review`；如有问题，修复后重新验证受影响任务，最多重试 2 次后报告剩余阻塞项。review 通过后由 review 负责路由至 e2e 或 archive，implement 流程结束。
6. 函数用标准 `jsdoc` 注释，变量用普通注释。

## task.md 状态格式

- `[x]` — 已完成，所有检查通过
- `[ ]` — 未开始或实现失败（失败时在任务下方以注释说明阻塞原因）

## 失败处理

失败时根据输出修复并重跑。仍无法通过则保留 `[ ]`，在 task.md 中注释任务名、失败输出摘要、已尝试方案和阻塞原因，并向用户报告。不得删除测试、降低断言或跳过检查。

