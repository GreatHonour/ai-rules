# 交付上下文

`delivery.json` 是一次交付的最小事实索引，不替代 `design.md`、`task.md` 或需求文档。

必须登记：交付 ID、目标阶段、各仓库及分支、测试环境、客户确认的平台、跨仓库/跨项目关系和部署方式。目标阶段只能是：

- `implemented`：实现和工程检查完成；
- `verified`：验收清单执行完成；
- `released`：已验收且生产部署事实完整。

平台与环境是不同维度：平台描述 Web、PC、微信、手机或 API；环境描述 local、test、staging、production 等。不得因仓库存在就自动扩大平台或环境范围。
