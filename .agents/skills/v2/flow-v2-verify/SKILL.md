---
name: flow-v2-verify
description: 建立并验证文档到需求、用例和证据的验收闭环，推导可审计的验收结论。
---

# 验收

前置条件：存在交付记录、已完成实现事实和可执行用例。先读取 [证据契约](../_shared/references/evidence-contract.md) 与 [状态模型](../_shared/references/state-model.md)，再按 [验收模板](../_shared/assets/acceptance-template.md) 建立矩阵。

每份登记文档必须映射需求，每条需求必须映射用例；每个 `passed`/`failed` 用例必须有仓库相对路径证据，`blocked`/`skipped` 必须有具体原因。先做确定性检查，再做交互、浏览器或设备检查；证据至少包含环境、源码版本、时间和观察结果。

运行 `../_shared/scripts/validate_evidence.mjs`。完整覆盖且全部通过才是 `verified` 候选；失败、阻塞、不确定或覆盖不足不得升级。
