# Flow v2 共享任务契约

`task.md` 面向人工阅读与规划，`task.json` 面向机器同步与校验。两者不自由双向编辑。

## 单任务原则

一个 `Txx` 只对应一个可独立实现、可独立验证的行为边界。可独立验证的正常、异常、禁止行为拆成不同 Txx。

## 状态

`pending`、`in_progress`、`passed`、`failed`、`blocked`、`skipped`、`inconclusive`。

## 证据规则

- `passed` 或 `failed` 必须有 `evidence`；
- `blocked` 或 `skipped` 必须有 `reason`；
- `databaseMigration`、`productionRelease` 默认是空数组，仅实际涉及才填写。
