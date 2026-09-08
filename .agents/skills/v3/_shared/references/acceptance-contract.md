# 验收清单契约

`acceptance.json` 保持轻量，每项只描述可追踪的验收对象：

```json
{
  "deliveryId": "example",
  "cases": [
    { "id": "C1", "requirement": "R1", "feature": "登录成功", "platform": "web", "status": "pending" }
  ]
}
```

`platform` 使用交付登记中客户确认的值；`status` 初始为 `pending`，执行器可写 `passed`、`failed` 或 `blocked`。执行结果必须能关联到当前仓库提交、环境和证据，详情记录在测试报告或适配器输出中，不把所有字段塞进清单。
