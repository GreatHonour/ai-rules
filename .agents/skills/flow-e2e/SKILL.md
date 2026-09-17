---
name: flow-e2e
description: '对 task.md 或 *-fix.md 中已定义的验收场景执行集成与 E2E 验证，使用状态 JSON 按依赖逐项记录结果，并生成失败或阻塞报告。用于功能完成后的浏览器、H5、桌面或移动端验收及修复复测；没有明确验证清单时不要使用。'
metadata:
  author: icc-grow
  version: '2.6.1'
---

# E2E 验证

读取当前迭代的 `task.md` 或对应 `*-fix.md`，以文档中的预期为准逐项验证。默认只记录结果，不修改业务代码或来源任务状态。

**执行流程**：读取验收清单 -> 初始化或恢复状态 -> 按依赖选择任务 -> 选择工具并执行验证 -> 更新任务状态 -> 汇总检查并生成报告。


## 状态文件

按 [JSON 模板](assets/e2e-task.json)整理验收场景；脚本不解析 Markdown。JSON 全程使用 `depends`，使用 `evidence` 数组保存证据地址：`task.md` 沿用原任务 ID，无编号的修复场景按顺序使用 `F1、F2…`。

- `task.md` -> `e2e-task.json`
- `<name>-fix.md` -> `<name>-e2e-task-fix.json`
- 状态文件已存在时继续原进度，不重新初始化。

脚本入口为 `<skill目录>/scripts/e2eTasks.mjs`：

```text
<任务数组 JSON> | pnpm exec node <脚本> init <来源.md>
pnpm exec node <脚本> get <任务.json> <task_id>
pnpm exec node <脚本> update <任务.json> <task_id> <status> [说明] [--evidence 证据路径]... [--log 日志路径]
pnpm exec node <脚本> check <迭代目录>
```

## 执行

1. 没有状态文件时整理完整验收场景，通过标准输入调用 `init`。
2. 新建后保留已提交的任务数组及 `init` 返回的 `task_file/task_ids` 作为执行队列，不再读取整个状态 JSON。恢复执行时从来源文档重建稳定的 ID 队列，对每个 ID 调用一次 `get` 建立状态快照；每次 `update` 后同步更新内存状态，已完成任务不重跑。
3. 根据内存中的状态处理依赖：依赖为 `pending` 时暂缓；依赖为 `failed/blocked` 时直接将当前项更新为 `blocked`，不执行测试。
4. 逐项覆盖可执行任务的全部验收条件；同一次测试能覆盖多个任务时只运行一次并复用证据，避免按 `task_id` 重复执行。
5. 用可见结果、URL、DOM、日志、截图或录屏证明结果；命令成功本身不是验收证据。只有任务拥有可复查的专属文件时，才将其生成在来源文档同目录的 `evidence/`；日志默认命名为 `<task_name>.log`，非法文件名字符替换为 `_`，同名冲突时追加 `task_id`。迭代级测试输出在报告或修复说明中记录一次，不复制为每个任务的证据。需要真机能力的场景不能用普通浏览器代替。
6. 任务得到终态后调用一次 `update`；有专属证据时通过 `--evidence` 记录地址，日志可用 `--log` 记录，两者最终都写入 `evidence`。本次专属证据会替换该任务的旧证据。失败或阻塞必须写明实际结果和原因，原因不明写“待定位”。`update` 只持久化结果，不代替测试。
7. 遇到阻塞时继续执行不受影响的独立任务；没有可执行任务时调用一次 `check` 并停止。正常完成时也只在最后调用一次 `check`。

## 环境与工具

| 环境 | 使用工具 |
| --- | --- |
| PC 网页 | 首选 `agent-browser`，不可用或能力不足时使用用户提供的 `browser-use`；桌面窗口操作使用 `computer-use` |
| 普通 H5 | 同 PC 网页，并确认移动视口；真实设备行为使用 `mobile-mcp` |
| 微信开发者工具 | 使用 `computer-use` 操作开发者工具 |
| 手机浏览器、手机微信 | 使用 `mobile-mcp` 连接真机或模拟器 |
| 视觉复刻或对比 | `screenshot-to-code-agent` 仅作辅助，不代替浏览器或设备控制 |

### 工具来源
- [`browser-use`](https://www.skills.sh/browser-use/browser-use/browser-use)、
- [`mobile-mcp`](https://github.com/mobile-next/mobile-mcp)、
- [`screenshot-to-code-agent`](https://github.com/hxx2001/screenshot_to_code_agent-skill)。
- 实际调用以已安装 skill 或 MCP 的当前说明为准。

用户指定上述工具时优先使用。只有这些工具均不可用或能力不足时，才说明缺口并建议其他合适工具；暂停执行，等待用户确认后再切换或安装。


## 状态
- 状态仅限 `pending / passed / failed / blocked`。
- 退出码：`0` 全部通过；`1` 存在失败、阻塞或命令错误；`2` 仍有待执行任务。
- 报告格式见 [报告模板](assets/e2e-report-template.md)。
