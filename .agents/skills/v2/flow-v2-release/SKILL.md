---
name: flow-v2-release
description: 从完整验收和每个必需仓库的生产部署事实推导独立的 released 状态。
---

# 发布

前置条件：交付记录存在且验收已达到 `verified`。读取 [状态模型](../_shared/references/state-model.md)、[授权边界](../_shared/references/authorization.md) 和 [发布模板](../_shared/assets/release-template.md)。

每个必需仓库与目标生产环境各登记一条部署事实，包含分支、提交、结果、时间戳和具体 pipeline/deployment 锚点。缺少任何一条、结果非成功或锚点不可复核时，保持未发布并说明阻塞。

测试地址、预览链接、代码合并和 E2E 通过都不能替代生产部署事实。实际部署属于外部写入，必须由项目适配器执行并在动作前取得明确授权。
