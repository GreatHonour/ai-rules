---
name: flow-e2e
description: "在真实浏览器中验证集成场景，记录证据、处理失败并更新验证状态。前置条件：必须存在 task.md 的集成验证任务或 fix.md 的验证场景。如果没有验证任务 - 询问用户是否需要。适用于：跨组件交互、完整用户流程、浏览器特定行为。Use after review or bugfix when complete user flows require browser verification. DO NOT use without verification tasks."
metadata:
  author: icc-grow
  version: "2.3.0"
---

# E2E 验证

在真实运行环境中验证既定用户场景。只负责集成验证任务，不修改普通功能任务的状态。

## 验证范围

遵循[上下文获取策略](../index.md#上下文获取策略所有-skill-通用)。

- 验证对象仅限 `task.md`「集成验证」中的每个 Txx，或 `*-fix.md` 中的一条「验证场景」，不得自行扩展。
- 每个验证对象可以包含一个或多个场景。
- `*-fix.md` 的场景没有对应 Txx，不修改 `task.md`。
- 预期行为从任务文档和设计文档获取，不从 git 历史推测。

## 工具选择与能力预检

优先使用`chrome:control-chrome`；能力不足时先说明缺口，未经同意不得切换。

未指定时按顺序选择首个可用 Adapter：

1. `chrome:control-chrome` → [adapters/control-chrome.md](adapters/control-chrome.md)
2. Chrome DevTools MCP → [adapters/chrome-devtools-mcp.md](adapters/chrome-devtools-mcp.md)
3. browser-use MCP → [adapters/browser-use-mcp.md](adapters/browser-use-mcp.md)
4. Playwright → [adapters/playwright.md](adapters/playwright.md)

超出该列表的工具需先获得用户授权。

执行前：

1. 确认 dev server、目标 URL 和页面身份。
2. 读取所选 Adapter。
3. 列出每个场景需要的能力和证据，如 viewport、触摸、DOM、URL、控制台日志。
4. 一次性检查 Adapter 是否满足全部场景；不满足则切换默认 Adapter，或将用户指定工具的缺口标记为「需人工介入」。

## 执行规则

1. 从 Demo 或任务指定的用户入口开始；仅场景标注 `[公开 API]` 时验证服务语义。
2. 交互前读取最新页面状态并确认目标唯一，离屏元素先滚动到可见区域。
3. 交互后等待页面状态不再变化（DOM 无更新且网络请求完成），再以可见文本、DOM、URL 或控制台日志记录证据；命令成功不能单独作为证据。
4. 移动端场景设置明确 viewport，并读取 `innerWidth`、`innerHeight` 确认生效。
5. 检查页面控制台 error；出现错误时记录 URL、页面状态和日志。
6. **执行失败超过3次，必须停止执行**，并通知用户

## 失败、修复与复测

- 失败后先定位原因；能够确定失败原因且修复方案确定时可就地修改代码。
- 修改后运行受影响测试和项目适用检查，再重跑受影响场景。
- 修改可能影响已通过场景时，同时重跑这些场景。
- 在报告中记录 E2E 阶段的全部代码修改。
- 无法确定失败原因或需要用户判断时，停止对应场景并标记「需人工介入」，不做无依据重试。

## 结果与流转

1. 记录每个场景的结果和证据；用户明确确认人工验收通过，也视为该场景通过。
2. Txx 的全部场景通过，才将其从 `[ ]` 标记为 `[x]`；否则保持 `[ ]`。
3. `*-fix.md` 的验证场景没有对应 Txx 时，只记录结果；全部场景通过即视为完成。

写入 `.docs/[文件名]/[YYYY-MM-DD]/e2e-report.md`，至少包含：

- 使用工具及切换原因
- 每个场景的来源、结果和证据
- E2E 阶段修改记录（如有）
- 未解决问题和人工介入项（如有）

按 Adapter 指引重置 viewport、关闭页面并删除临时脚本或截图。最后检查 `git status`；若工具异步写回临时文件，继续清理并复查，直到没有本次 E2E 产生的残留。

报告和清理完成后，所有验证对象均已完成则调用 `/archive`；否则停止并保留未完成状态，告知用户修复后重新调用 `e2e/SKILL.md` 重跑失败场景，或确认跳过后调用 `archive/SKILL.md`。
