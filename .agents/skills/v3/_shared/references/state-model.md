# v3 状态模型

交付阶段由已存在的文档和检查事实推导，不由 Agent 手工越级：

```text
planned → specified → implemented → verified → released
```

- `planned`：交付上下文已登记，但需求、设计或任务仍不完整。
- `specified`：需求决策已确认，`design.md`、`task.md` 和验收对象完整。
- `implemented`：必需任务已完成，代码与 TDD/工程检查有事实记录。
- `verified`：目标平台和环境的验收对象全部完成，结果和证据可复核。
- `released`：达到 `verified`，且目标为发布时，每个必需仓库都有生产部署事实。

允许提前收口：交付的 `targetStage` 可以是 `implemented`、`verified` 或 `released`。目标阶段必须在 intake 阶段确认，归档只能判断是否达到目标，不能降低目标。
