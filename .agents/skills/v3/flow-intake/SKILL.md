---
name: flow-v3-intake
description: 登记多仓库软件交付的范围、分支、平台、环境和目标阶段。
---

# 交付登记

读取 `_shared/references/delivery-context.md`、`state-model.md`、`document-layout.md`、`authorization.md`、`delivery.example.json` 和 `delivery-template.md`。

## 执行步骤

1. 确定功能 slug、交付 ID 和文档目录 `.docs/<feature-slug>/<YYYY-MM-DD>/`。
2. 逐一登记每个仓库、仓库角色、仓库路径、独立分支和是否必需；禁止用一个分支名代替多个仓库事实。
3. 记录客户确认的测试平台和测试环境，区分平台（Web、PC、微信、手机、API）与环境（local、test、staging、production）。
4. 记录是否跨仓库/跨项目、部署适配器（默认 Jenkins）、目标阶段，以及数据库迁移、配置变更和回滚是否在范围内。
5. 使用 `_shared/assets/delivery.example.json` 生成 `delivery.json`，并按 `delivery-template.md` 生成 `delivery.md` 摘要。

交付范围由本 Skill 登记，业务需求由 `flow-v3-brainstorm` 澄清。不得替客户增加平台、环境或生产发布目标；缺少关键登记信息时保持 `planned` 并报告缺口。

## 输出

输出登记路径、已登记仓库/分支、平台/环境、目标阶段和缺口。完成后进入 `flow-v3-brainstorm`。
