# flow-e2e 任务状态文件

## 目标与范围

按已确认规则，将 task.md 或 *-fix.md 的验证内容保存为 JSON，按 task_id 读取和更新，最终从结果生成失败报告。由 Agent 理解原文并整理任务，脚本负责文件命名、状态维护与汇总，不解析任意 Markdown。

## 契约

- task.md → 同目录 e2e-task.json；xx-fix.md → 同目录 xx-e2e-task-fix.json。来源目录为 `.docs/[文件名]/[YYYY-MM-DD]/`。
- 单项字段：task_id、task_name、test_content、depends、status、description、evidence。task.md 沿用原始任务编号；无编号修复场景按文档顺序使用 F1、F2…。test_content 保存独立执行所需的入口、操作、条件和预期，depends 引用同一文件内的前置任务；evidence 保存迭代目录 evidence/ 下的证据地址。
- 状态：pending、passed、failed、blocked；failed 与 blocked 必须有说明。
- init：来源文件路径 + 标准输入中的任务数组，创建 JSON，已有文件拒绝覆盖。
- get：JSON 路径 + task_id，返回指定任务及尚未通过的 blocked_by 依赖。
- update：JSON 路径 + task_id + 状态 + 可选说明和日志，串行更新指定条目，原子替换文件。
- check：迭代目录，汇总该目录的 e2e-task.json 和 *-e2e-task-fix.json。存在 pending 时返回未完成清单，不生成最终报告；没有 pending 时写 e2e-report.md，展开失败和阻塞项，全部通过则明确无失败。
- CLI 退出码：0 为成功或全部通过；1 为操作错误或测试失败；2 为测试未完成。

## 实现补充

- 单个无依赖 Node ESM 脚本与 Node 内置测试，无新增包依赖。
- 同目录多个任务文件按文件名分组汇总，允许不同文件使用同一 task_id，防止报告覆盖其他修复结果。
- 串行写入，不实现并发任务调度或历史数据库；复测更新当前状态。
- 报告从最终 JSON 生成；已有报告不代表新一轮 pending/blocked 状态，check 的返回结果为准。

## 验证

文件命名、来源 ID 保留、depends 校验、拒绝覆盖、按 ID 读取、更新隔离、非法状态或缺失失败原因、未完成判定、多文件失败汇总、全部通过报告、CLI 标准输入与退出码。
