---
name: flow-v3-plans
description: 将已澄清需求转换为 design.md 和 task.md。
---

# 计划

前置条件：`delivery.json`、`decision.md` 和适用项目规则存在。读取 `_shared/references/document-layout.md`、`design-template.md`、`task-template.md`。

## Phase 1：生成 design.md

写入 `.docs/<feature-slug>/<YYYY-MM-DD>/design.md`，按模板裁剪章节，至少说明目标与范围、现状约束、模块职责、核心流程与状态、契约、异常边界、验证要求、风险和 Out of Scope。

按需补充：

- UI/组件：Props、Events、Slots、交互状态和可访问性；
- API/服务：请求响应、错误语义、权限、限流和幂等；
- 数据：Schema、迁移、兼容、回滚；
- 异步：状态机、超时、重试、补偿和可观测性；
- 外部平台：能力探测、授权、失败降级和责任边界。

不得在设计阶段新增业务决策；发现会改变契约、范围或优先级的缺口时退回 `flow-v3-brainstorm`。

## Phase 2：生成 task.md

写入同一目录的 `task.md`。一个任务对应一个可独立说明和验证的职责边界，必须写明输入/条件、预期结果、依赖、验证要求和完成证据位置。任务覆盖设计中的全部功能点，不新增方案；详细平台验收由 `acceptance.json` 管理。

所有任务初始为 `[ ]`。普通交付可直接进入 `flow-v3-implement`；涉及跨仓库、数据库、权限、并发或外部平台时，先进入可选的 `flow-v3-plan-review`，通过后再实现。
