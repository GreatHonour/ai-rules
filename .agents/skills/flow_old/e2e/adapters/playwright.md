# Adapter: Playwright（兜底）

前三种浏览器 Adapter 均不可用时，使用 Playwright 执行验证。

## 可用性检查

1. 检查项目是否已安装 Playwright，以及所需浏览器是否可用。
2. 检查 Node 版本是否满足项目所用 Playwright 的要求。
3. 未安装依赖或浏览器时先说明影响；未经用户确认，不得执行 `npx playwright@latest`、安装依赖或下载浏览器。
4. 根据当前环境和取证需要选择 headed 或 headless，不固定运行模式。

## 执行

- 优先使用项目已有 Playwright 配置、命令和测试目录。
- 仅在必要时创建临时脚本，并使用 `_tmp-e2e-<文件名>` 等可识别名称。
- 用 locator 定位唯一目标，以可观察状态作为等待和断言条件。
- 监听 `console` 和 `pageerror`，将错误纳入场景证据。
- 移动场景通过 context 设置 `viewport`；只有场景确实需要移动 UA 或触摸时才设置 `isMobile`、`hasTouch`。
- 不使用 `waitForTimeout` 代替明确的状态等待。

## 常用能力

| 能力 | Playwright API |
| --- | --- |
| 导航 | `page.goto(url)` |
| 页面状态 | `page.locator(...)` / `page.content()` |
| 点击与输入 | `locator.click()` / `locator.fill(value)` |
| 状态断言 | `expect(locator).toBeVisible()` 等 Web-first assertions |
| 控制台错误 | `page.on('console', ...)` / `page.on('pageerror', ...)` |
| 移动环境 | `browser.newContext({ viewport, isMobile, hasTouch })` |

## 清理

关闭 page、context 和 browser，删除本次创建的临时脚本及产物。返回主流程后用 `git status` 复查残留。
