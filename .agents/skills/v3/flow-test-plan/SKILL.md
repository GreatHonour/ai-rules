---
name: flow-v3-test-plan
description: 根据需求和已确认平台生成轻量 acceptance.json 验收清单。
---

# 验收计划

读取 `decision.md`、`design.md`、`task.md`、`delivery.json` 和 `_shared/assets/acceptance.example.json`，写入同一日期目录的 `acceptance.json`。

每条需验收的需求至少生成一项：`id`、`requirement`、`feature`、`platform`、`status`。`status` 初始为 `pending`；平台只能取 intake 中客户确认的范围。代码级 TDD 不重复写入，除非它本身是用户可观察的验收要求。

本 Skill 只生成清单，不部署、不执行测试、不凭空填写通过。详细步骤由 `flow-v3-verify` 的平台适配器解释；测试结果、当前提交、环境和证据写入 `evidence/` 或适配器报告。完成后：需要目标环境部署则进入 `flow-v3-deploy`，否则直接进入 `flow-v3-verify`。
