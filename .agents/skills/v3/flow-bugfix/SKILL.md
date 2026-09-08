---
name: flow-v3-bugfix
description: 独立处理可复现缺陷和边界明确的小型变更。
---

# 缺陷修复

读取 `delivery.json`、`document-layout.md` 和 `bugfix-template.md`。在同一日期目录生成 `<issue-slug>-fix.md`，先记录复现环境、步骤、预期、实际、边界和工作区已有变更；根因未证实时标记“待确认”，不得提前写成事实。

修复阶段使用最小范围和 TDD（适用时）：先建立失败基线，再修改实现，确认修复和回归结果。记录各仓库分支、修复提交、命令和结果；涉及迁移、配置、部署或回滚时使用 `flow-v3-deploy` 并取得授权。

修复完成后只重跑受影响的 `acceptance.json` 用例，更新 fix 文档中的验证事实和状态；未解决或无法复现时保持 `blocked`/`inconclusive`，不得直接归档为完成。验证通过后进入 `flow-v3-archive`。
