---
name: e2e
description: 使用浏览器工具在真实运行环境中执行端到端验证，失败时就地修复并复测。Use whenever an implemented feature or fix must be verified through its complete Demo user flow, including review, bugfix, archive preflight, and mobile viewport behavior.
metadata:
  author: icc-grow
  version: "2.0"
---

# E2E 验证

实现、review/bugfix 完成后或归档补验时，选定可用的浏览器工具，逐场景验证完整用户链路，失败时就地修复。（不需要截图）

## 工具选择（按顺序尝试）

内置四件套自动降级，无需询问用户：

1. **`chrome:control-chrome`**（首选）→ [adapters/control-chrome.md](adapters/control-chrome.md)
2. **Chrome DevTools MCP** → [adapters/chrome-devtools-mcp.md](adapters/chrome-devtools-mcp.md)
3. **browser-use MCP** → [adapters/browser-use-mcp.md](adapters/browser-use-mcp.md)
4. **Playwright** → [adapters/playwright.md](adapters/playwright.md)

超出此链（如 agent-browser、Cypress）→ AskUserQuestion 请求授权，不擅自选型。

### 降级触发条件（满足任一）

- 初始化失败（adapter 前置检查不通过 或 无法建立 browser binding）
- 关键动作（导航 / snapshot / 点击 / 输入 / 控制台读取）连续 2 次同类错误
- 无法获取任务要求的证据类型（如需要控制台日志但工具不支持）

### 降级动作

1. 立即切到下一级 adapter；报告的「使用工具」栏记录：`[工具A] → [工具B]（降级原因）`
2. 已完成场景无需重跑；未完成场景用新工具继续
3. 全链降完仍失败 → 场景标「需人工介入」，继续下一场景；四工具全部失败则中止并 AskUserQuestion

## 通用验证规则（工具无关）

1. 优先只验证 `task.md`「集成验证」或 bugfix 计划「复现路径」中的场景，不自创；直接实现且没有上述产物时，以用户原始需求和本次新增/修改 Demo 的完整交互为来源，报告来源标记为「用户需求」，禁止为满足门禁反向补造 task
2. 走 Demo 交互入口；仅任务标注 `[公开 API]` 时才在页面上下文验证服务语义
3. 每次交互前用最新 DOM snapshot 确认目标唯一；交互后用可见文本、DOM 状态、URL、控制台日志形成证据（**命令成功返回不能单独作为证据**）
4. 离屏元素先滚动进入视口并确认可见，再交互
5. 移动端场景用 adapter 提供的 viewport 能力设置明确尺寸，读取 `innerWidth`/`innerHeight` 校验生效；结束前重置
6. 时序敏感 UI（toast、动画浮层等）在有效展示期内完成触发和断言；等待明确稳定状态，避免假阴性
7. 每页检查控制台 error；页面错误记录 URL、可见状态和控制台证据
8. 场景失败后就地分析修复，最多重试 1 次；修复可能影响既有场景时重跑所有已完成场景。E2E 阶段代码修改全部记录到报告；第二次仍失败则标记「需人工介入」并继续下一场景

## 前置条件

- dev server 已启动；目标 URL 从任务上下文、`E2E_URL`、项目配置或文档中确定
- 启动 dev server 时优先原样运行 `package.json` 已定义的 script 和固定端口；禁止未经核对就追加 `--` 分隔符。确需覆盖参数时，先确认包管理器的参数转发规则及底层 CLI 的位置参数顺序；启动后立即核对实际 URL，并用 `git status --short` 检查是否生成了 `docs/--port`、`docs/--host` 等意外目录
- Node 工具链若以 `EPERM` 失败且错误路径位于项目 `node_modules`，立即用完全相同的命令申请沙箱外重跑；仅当沙箱外仍失败时，才按依赖缺失或安装损坏继续诊断
- 打开后核对实际 URL、页面标题和关键特征，防止端口指向其他项目
- 验证场景已定义在 `task.md`「集成验证」或 bugfix 计划「复现路径」中；直接实现无流程产物时，用户原始需求和对应 Demo 交互可作为场景来源

## 执行流程

```
1. 提取 task.md、bugfix 计划或直接实现用户需求中的场景列表与目标页面
2. 确认 dev server 可访问
3. 按工具优先级选定首个可用 adapter，读取其文档完成初始化
4. 打开目标 URL，核对页面身份，获取首个 DOM snapshot
5. 逐场景：定位唯一目标 → 交互 → 读取稳定状态 → 记录证据与结果
6. 移动端场景按 adapter 指引设置 viewport 并校验
7. 检查控制台 error；失败按规则修复重试；不行则降级或标记人工介入
8. 写入 .docs/[文件名]/[YYYY-MM-DD]/e2e-report.md
9. 按 adapter 指引清理（重置视口 / 关闭 tab / 删除临时脚本等）
10. 全部完成后调用 archive/SKILL.md 继续
```

## 报告格式

```markdown
# [功能名] E2E 验证报告

日期：YYYY-MM-DD
使用工具：[工具名]（若有降级：[工具A] → [工具B]，原因：...）

## 验证结论

✅ 全部通过 / ⚠️ 存在问题（N 个场景需人工介入）

## 场景结果

| 场景 | 来源 | 结果 |
| --- | --- | --- |
| 场景描述 | task.md Tn / bugfix 复现 | ✅/❌ + 证据摘要（DOM/URL/控制台） |

## E2E 阶段修改记录

- [文件:行号] 修改描述：原因 → 修复方式

## 未解决问题

- 场景描述：失败原因 → 已尝试的修复方式 → 是否已降级重试

## 清理确认

- [x] 视口已重置 / tab 已关闭 / 临时脚本已删除（如有）
```

全部通过且无修改时，省略「修改记录」和「未解决问题」；无临时资源时省略「清理确认」。
