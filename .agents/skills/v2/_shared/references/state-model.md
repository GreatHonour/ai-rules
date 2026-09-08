# 状态模型

生命周期由事实推导，不由执行者手工越级：

`planned → specified → implemented → verified → released`

- `planned`：交付对象已登记，但规格或边界仍不完整。
- `specified`：范围、文档、设计和可执行任务完整。
- `implemented`：必需仓库有真实源码事实和检查结果。
- `verified`：登记需求覆盖完整，所有用例通过且证据有效。
- `released`：每个必需仓库都有成功生产部署、时间和可复核锚点。

结论状态统一为：`passed`、`failed`、`blocked`、`inconclusive`、`skipped`、`pending`。

- 缺覆盖或尚未完成：`pending`
- 已验证失败：`failed`
- 依赖/权限/环境不可用：`blocked`
- 证据不足无法确认：`inconclusive`
- 主动不执行且说明原因：`skipped`
- 全部覆盖且全部通过：`passed`

OpenSpec/设计完成、测试通过、提交合并、预览地址不能单独升级生命周期。
