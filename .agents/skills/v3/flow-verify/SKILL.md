---
name: flow-v3-verify
description: 按 acceptance.json 和客户确认的平台执行验收并记录结果。
---

# 验收

读取 `acceptance.json`、`delivery.json`、`adapters.md` 和 `evidence-contract.md`（如存在）。先确认实现提交与部署事实属于同一交付，再按每项 `platform` 选择适配器：本地 mock、Web/PC、微信、移动端真机或 API。需要部署的平台必须在 `flow-v3-deploy` 完成后执行；本地假数据不得冒充真实平台通过。

只执行 `acceptance.json` 中的用例。执行器或适配器写入状态与证据，Agent 负责解释失败和定位修复，不凭文字把 `pending` 改成 `passed`。更新 `acceptance.json` 的 `status` 后，将环境、源码提交、时间和证据路径写入 `evidence/`。失败、阻塞或缺证据时不得推导 `verified`。

全部必需用例通过后输出验收摘要，进入 `flow-v3-archive`；目标为 `released` 时还必须存在每个必需仓库的生产部署事实。
