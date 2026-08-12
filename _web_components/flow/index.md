# 工作流 Skill 系统

替代 `openspec` 和 `Superpowers`，轻量、可断点续跑；阶段产物满足条件后直接进入下游，仅在明确的用户决策点暂停。

## 流程总览

### 新功能开发

```
brainstorm → plans → implement → review → e2e → archive → retro
```

brainstorm 的方案与边界确认、review 的修复范围确认属于用户决策点。其余阶段完成后直接调用下游 skill；用户明确要求只执行当前阶段时例外。

### Bug 修复（独立入口）

```
bugfix（复现 → 根因分析 → 输出修复计划 → 用户确认 → 红灯测试 → 最小修复 → 验证绿灯 → TDD 用例回归 → 提交 & 更新日志）→ e2e → archive → retro
```

## 触发方式

| 用户意图 | 触发 Skill |
|----------|-----------|
| "我想做一个新功能 / 我有个想法" | brainstorm |
| "我发现 bug / 这个功能坏了 / 之前好的现在不行了" | bugfix |
| "帮我拆任务 / 出设计文档"（已有明确需求） | plans |
| "继续实现 / 开始写代码" | implement |

## Skill 说明

| Skill | 职责 | 产物 |
|-------|------|------|
| brainstorm | 将想法转为 2-3 个方案，用户选定后确认边界 | 选定方案 + 边界清单 |
| plans | 生成设计文档 + 拆分任务列表 | `design.md` + `task.md` |
| implement | 按 task.md 逐一 TDD 实现 | 代码 + 测试 |
| review | 审查代码质量，输出分级问题清单 | `review.md`（过程草稿，archive 后删除） |
| e2e | 端到端验证集成场景 | `e2e-report.md` |
| archive | 归档迭代记录，沉淀经验规则 | `log.md` 更新（功能演进史）+ 经验规则；删除 review.md |
| retro | 回顾流程质量，输出改进建议 | `retro.md` 更新 |
| bugfix | 诊断 bug 根因，输出修复计划，TDD 修复 | `[问题简述]-fix.md` + `log.md` 更新 |

## 产物目录结构

```
.docs/
  [需求名]/
    log.md                      ← 功能演进史（能力/关键逻辑/结构决策/遗留/review 净结论）
    [YYYY-MM-DD]/               ← 按日期分组
      design.md                 ← 设计文档（长期保留；允许在本迭代内同步实现级修正）
      task.md                   ← 任务列表（长期保留；允许在本迭代内同步实现级修正）
      review.md                 ← 审查过程草稿（archive 阶段删除，净结论合并入 log.md）
      e2e-report.md             ← E2E 报告（长期保留）
      [问题简述]-fix.md         ← bug 修复记录（长期保留：根因/复现/方案，log.md 链回）
  retro.md                      ← 全局流程回顾
```

## 断点续跑

每个 skill 的产物落盘后即可中断。恢复时读取最近的产物文件，判断当前阶段继续执行：

- `design.md` 存在但无 `task.md` → 从 plans Phase 2 继续
- `task.md` 中有 `[ ]` → 从 implement 继续
- 全部 `[x]` 但无 `review.md` → 从 review 继续
- `review.md` 存在但无 `e2e-report.md` → 从 e2e 继续
- `e2e-report.md` 存在但 log.md 无本次记录 → 从 archive 继续（archive 完成后 review.md 应被删除）
