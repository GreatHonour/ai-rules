# flow-e2e 逐项验证与结果汇总

## 目标

根据用户确认，覆盖 task.md 全部任务或 *-fix.md 全部验证场景，逐项判断验证方式，汇总任务名称、结果、失败原因和证据。按后续反馈精简技能，只保留影响执行的核心约束。

## JSON 状态流程补充

- 后续修正：JSON 沿用来源任务编号，无编号修复场景使用稳定的 F1、F2…；依赖字段在初始化、落盘和读取时统一为 depends。
- 对应 10 组测试通过，覆盖依赖引用校验、依赖门禁、阻塞汇总、状态清理和严格 CLI 参数解析。

- 最新流程由本目录 design.md、task.md 记录：Agent 整理任务数组，脚本初始化、按 ID 读取、更新状态并最终校验。
- task.md 对应 e2e-task.json，xx-fix.md 对应 xx-e2e-task-fix.json，均位于来源文档所在迭代目录。
- e2eTasks.mjs 提供 init/get/update/check；check 汇总目录中所有任务文件，pending 返回未完成，没有 pending 时生成包含失败和阻塞项的报告。
- 此前曾在本目录执行 init/get/update/check；当前状态文件已移除，本次验证使用隔离临时目录，不重建历史状态。
- 定向格式检查与 git diff --check 通过。JSON 作为当前状态，复测更新结果，不实现历史数据库。

## 改动

- 当前技能入口：.agents/skills/flow-e2e/SKILL.md。
- 新增简短报告模板：.agents/skills/flow-e2e/assets/e2e-report-template.md。
- 单项失败继续独立任务，不能验证的条目说明原因；默认先收集问题。
- 删除重复解释、状态推导表、固定重试次数和多层报告结构。
- 工具按既定环境映射选择：PC/H5 使用 agent-browser 或用户提供的 browser-use，微信开发者工具使用 computer-use，移动端使用 mobile-mcp，视觉复刻或对比使用 screenshot-to-code-agent 辅助。
- 用户指定上述工具时优先使用；用户提供的工具均不可用或能力不足时，说明缺口并建议替代工具，等待用户确认后再切换或安装。
- 核对用户提供的官方仓库：mobile-mcp 支持 iOS/Android 真机与模拟器的设备交互；screenshot-to-code-agent 用于截图、录屏复刻与视觉对比，不自带浏览器驱动或设备控制，已从移动端控制候选中移除。

## 验证

- 核对全部任务覆盖、按条件验证、失败后继续、阻塞说明、失败证据和复测保留规则。
- 执行 Markdown 格式检查、模板引用检查和 git diff --check。
- 官方 quick_validate.py 因现有 Python 缺少 PyYAML 未能运行；未修改项目依赖。
- 本轮是指令与模板精简，未进行真实项目自动化验证。
