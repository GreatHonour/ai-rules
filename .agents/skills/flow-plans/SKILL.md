---
name: flow-plans
description: "用于业务决策已完成且需要技术设计 + 任务拆解时。前置条件：范围已定义、规则已确认、边界已设定。将决策摘要或完整需求转换为 design.md 和 task.md。如果决策不完整 - 先回到 flow-brainstorm。Use when business decisions are COMPLETE and you need technical design + task breakdown. Prerequisites: scope defined, rules confirmed, boundaries set. Converts decision summary or complete requirements into design.md and task.md. DO NOT use if decisions incomplete - return to flow-brainstorm."
metadata:
  author: icc-grow
  version: "2.3.1"
---

# 规划 (Plans)

目录结构模板[docs-structure.md](./assets/docs-structure.md)

**执行流程：** Phase 1 输出`design.md` → Phase 2 输出`task.md` → 调用`/flow-plan-review`
---

## Phase 1：技术设计

### 规则
1. **读取范围**：只读取本次需求直接相关的代码、当前功能已有文档、本技能明确引用的模板，以及 `AGENTS.md` 要求的规则文件。
2. **设计范围**：一份 `design.md` 覆盖本次交付和全部已确认决策；规模无法在一份文档内保持清晰时，返回 `flow-brainstorm` 拆分需求。
3. **设计内容**：写清模块职责、依赖方向、状态归属、数据流转和具体契约，不输出完整实现代码；功能点使用 `[条件/操作] → [预期结果]` 描述可观察行为。
4. **技术补充**：可由现有代码和项目约定确定的技术细节允许补充，并在具体内容后标记”设计阶段补充”；例如：`- 错误语义：沿用项目统一错误码规范（设计阶段补充）`。补充内容不得改变已确认业务决策。
5. **避免模糊**：只保留当前需求需要的章节，不为套模板创建空章节，不使用”待定”、`any`、”体验良好”或”功能正常”等模糊表达。

### 设计文档骨架

`design.md` 模板路径[design-template.md](./assets/design-template.md)

### 按需技术章节

根据需求选择需要的章节，未涉及则省略：

- **UI 或组件** → Props、Events、Slots、交互状态、视觉约束、可访问性
- **API 或服务** → 请求响应、错误语义、权限、限流、幂等、日志、网关及多服务请求
- **数据变更** → Schema、迁移、兼容、回滚
- **异步流程** → 状态机、超时、重试、补偿、可观测性
- **ToC 活动或交易** → 资格、时间、次数/金额、概率、库存、发放、撤销、风控
- **外部平台** → 能力探测、授权、失败降级、责任边界

---

## Phase 2：任务拆分
- `task.md`模板路径[task-template.md](./assets/task-template.md)
- 读取 Phase 1 生成的 `design.md`，在同一目录下输出 `task.md`

### 拆分原则

1. 一个 `Txx` 对应一个可独立说明和验证的功能边界；仅在职责不同、可独立验证或存在明确依赖时拆分，同一职责的正常、异常和禁止行为写在同一任务中。
2. 标题直接说明建立或改变的能力；内容使用 `[条件/输入] → [结果]`，结构性任务可使用明确陈述句，不增加 "能做/不能做" 等二级栏目。
3. `task.md` 覆盖 `design.md` 的全部功能点，不新增方案、业务规则或验收场景。
4. `depends` 只指向已定义任务且不得成环：`无` 表示可以最先开始；`T1, T3` 表示依赖指定任务的产物；`all` 仅用于最终集成验证。

---

## 流转操作

Phase 1 输出 `design.md`，Phase 2 输出 `task.md`。直接调用 `/flow-plan-review`；
