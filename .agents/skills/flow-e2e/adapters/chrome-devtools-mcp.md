# Adapter: Chrome DevTools MCP（降级 1）

通过 MCP 直连 Chrome DevTools Protocol，覆盖 DOM / Network / Console / Emulation 全套能力。

## 可用性判定

- IDE 中已配置 Chrome DevTools MCP server 且状态可用
- 本地存在 Chrome/Chromium 可执行文件
- 任一不满足即降级到 browser-use MCP

## 初始化

1. 通过 MCP 命令启动或连接目标浏览器
2. 打开一个 tab，记录 tab id 供单次 E2E 复用
3. 打开目标 URL → 核对实际 URL / document.title / 关键特征

## 动作映射

| 动作 | 说明 |
|------|------|
| 导航 | `Page.navigate` |
| DOM snapshot | `DOM.getDocument` + `DOM.querySelectorAll` 或 `Runtime.evaluate('document.documentElement.outerHTML')` |
| 点击 / 输入 | `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`；或 `Runtime.evaluate` 走 el.click / dispatchEvent |
| 控制台错误 | 订阅 `Runtime.consoleAPICalled` 和 `Runtime.exceptionThrown`，过滤 level=error |
| 视口设置 | `Emulation.setDeviceMetricsOverride({ width, height, deviceScaleFactor, mobile })` |
| 视口重置 | `Emulation.clearDeviceMetricsOverride` |
| 收尾 | 关闭 tab，清除 emulation |

## 已知陷阱

- CDP 事件异步到达，做控制台断言前先 flush（等待稳定或轮询 200ms）
- 触摸手势需 `Input.dispatchTouchEvent` 序列合成，注意 identifier 一致
- `setDeviceMetricsOverride` 的 mobile 参数影响 layout viewport 和 media query，移动端场景务必开启
