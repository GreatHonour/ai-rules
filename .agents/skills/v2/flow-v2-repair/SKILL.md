---
name: flow-v2-repair
description: 处理可复现缺陷，建立首个失败边界以及 red、green、regression 的修复证据闭环。
---

# 缺陷修复

诊断阶段只读，先记录环境、时间窗、入口、预期、实际和请求/追踪标识；沿请求链找到首个证据支持的失败边界。读取 [状态模型](../_shared/references/state-model.md) 与 [授权边界](../_shared/references/authorization.md)。

使用 [修复模板](../_shared/assets/repair-template.md)。`verified` 必须同时具备失败基线提交、不同的通过候选提交和回归检查证据；配置、数据、依赖或测试基础设施故障不得冒充代码修复。

不得重放变更请求、修改生产数据或部署，除非单独获得明确授权。根因未证实时保持 `inconclusive` 或 `blocked`。
