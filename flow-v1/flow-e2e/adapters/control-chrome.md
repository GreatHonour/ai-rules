# Adapter: chrome:control-chrome（首选）

浏览器 IDE 内置插件，能直接控制用户当前 Chrome 的 tab。

## 可用性判定

- 能读取到 `chrome:control-chrome` skill 文档；且能成功拿到 `extension` 浏览器绑定
- 任一不满足即降级到 Chrome DevTools MCP

## 初始化

1. 完整读取 `chrome:control-chrome` skill（按当次版本，API 可能变动）
2. 拿到 `extension` 浏览器绑定 → `chrome.nameSession('<emoji> <需求短名>')`
3. 新建目标 tab；仅用户显式提供 tab 时才 claim
4. 打开目标 URL → 核对实际 URL / document.title / 关键特征

## 动作映射

| 动作 | API |
|------|-----|
| 导航 | `tab.navigate(url)` |
| DOM snapshot | `tab.dom.snapshot()` |
| 点击 / 输入 | `tab.dom.click(ref)` / `tab.dom.fill(ref, value)` |
| 控制台错误 | `tab.dev.logs({ levels: ['error'] })` |
| 视口设置 | `tab.viewport.set({ width, height })` → 后 `tab.eval('innerWidth/innerHeight')` 校验 |
| 视口重置 | `tab.viewport.reset()`（**必须**在结束前调用） |
| 收尾 | `chrome.tabs.finalize()` |

## 已知陷阱

- 同一次 E2E 复用一个 browser binding 和一个 tab，所有操作串行
- 插件版本更新时 API 名可能变化，以当次读取到的 skill 文档为准
- 移动端合成手势能力有限，复杂手势失败时降级到 Playwright
