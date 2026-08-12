# Adapter: browser-use MCP（降级 2）

在 Playwright 之上封装的语义化浏览器操作 MCP，能用「点击带文字 X 的按钮」这种意图级指令驱动交互。

## 可用性判定

- IDE 中已配置 browser-use MCP server 且状态可用
- 任一不满足即降级到 Playwright

## 初始化

1. 通过 MCP 创建或复用 session，记录 session id 供单次 E2E 复用
2. 指定浏览器类型（默认 chromium）
3. 打开目标 URL → 核对实际 URL / document.title / 关键特征

## 动作映射

| 动作 | 说明 |
|------|------|
| 导航 | `navigate(url)` |
| DOM snapshot | `get_dom_state` 或 `get_interactive_elements`（后者返回可交互元素 + index） |
| 点击 / 输入 | `click(index)` / `input_text(index, value)`；关键交互先取 index 再操作 |
| 控制台错误 | `get_console_logs({ level: 'error' })` |
| 视口设置 | 创建 session 时传 `viewport: { width, height, is_mobile: true }` |
| 收尾 | `close_session(session_id)` |

## 已知陷阱

- 语义定位依赖 LLM，可能不稳定：**关键交互先 `get_interactive_elements` 拿 index 再 click**，不要直接用文字描述
- session 状态跨调用保留 → 控制台日志会累积，读取后手动清理或只关注新增部分
- 移动端手势能力弱，复杂 touch 场景直接降级到 Playwright
