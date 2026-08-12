# Adapter: Playwright（降级 3，兜底）

直接调用 Playwright API 写脚本执行验证。所有 MCP 方案都不可用时使用。

## 可用性判定

- 项目本地已装 `@playwright/test` → 优先用；或能联网执行 `npx playwright@latest`
- Node 版本满足 Playwright 要求

## 初始化

1. 检测项目根 `package.json`：
   - 有 `@playwright/test` 依赖 → 用本地
   - 无 → 用 `npx playwright@latest`（首次会拉浏览器，注意耗时）
2. 在 `test/e2e/` 或 `tests/e2e/` 下创建**临时**脚本（如 `_tmp-e2e-<需求名>.spec.js`）
3. 用 `chromium.launch({ headless: false })` 便于观测；CI 场景才 headless

## 动作映射

| 动作 | API |
|------|-----|
| 导航 | `page.goto(url)` |
| DOM snapshot | `page.content()` 或 `page.locator(...).all()` |
| 点击 / 输入 | `page.locator(selector).click()` / `.fill(value)` |
| 等待稳定 | `page.waitForLoadState('networkidle')` / `expect(locator).toBeVisible()` |
| 控制台错误 | `page.on('console', ...)` + `page.on('pageerror', ...)` 累计 |
| 视口设置 | `browser.newContext({ viewport: { width, height }, isMobile, hasTouch })` |
| 收尾 | `context.close()` / `browser.close()` |

## 已知陷阱

- 临时脚本**必须**在验证完成后删除，不能污染仓库；e2e-report.md 中列明「已删除」
- 首次运行需 `npx playwright install`，无网络时无法进行 → 报告标注并降级到「需人工介入」
- `isMobile: true` 会同时切换 UA 和触摸支持；只需窗口大小就只传 `viewport` 不加 `isMobile`
- `waitForTimeout` 是反模式，用 `waitFor` 等待具体状态
