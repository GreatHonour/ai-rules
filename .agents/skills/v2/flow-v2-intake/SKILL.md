---
name: flow-v2-intake
description: 登记一次软件交付的范围、版本、文档、仓库和环境，并从已存在事实推导初始状态。
---

# 交付登记

读取 [状态模型](../_shared/references/state-model.md)、[证据契约](../_shared/references/evidence-contract.md) 和 [授权边界](../_shared/references/authorization.md)。

先解析一个交付 ID，登记版本、主/支持文档、受影响仓库、目标环境和非目标；基于 [manifest 示例](../_shared/assets/delivery-manifest.example.json) 生成或更新唯一事实源 `delivery.json`，需要人类摘要时使用 [交付模板](../_shared/assets/delivery-template.md)。只记录已经存在的分支、提交、构建、报告和部署事实，不猜测或补写。

输出登记结果、缺口和由事实推导的阶段。缺少范围、版本、仓库或环境时保持 `planned`/`pending`，不得声称已实施、验收或发布。外部写入前读取 [适配器契约](../_shared/references/adapter-contract.md) 并取得当前动作的明确授权。
