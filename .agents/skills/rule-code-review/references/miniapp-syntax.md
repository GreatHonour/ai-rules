# 小程序语法

> 审查基准：微信小程序基础库 `2.32.3`

| # | 规则 |
|---|------|
| MA-1 | 页面统一使用 `Component()`，不要新增 `Page()` 写法 |
| MA-2 | 页面和组件统一四文件结构：`.ts` / `.wxml` / `.scss` / `.json` |
| MA-3 | 自定义组件的 `.json` 必须显式声明 `"component": true` |
| MA-4 | 生命周期统一放入 `lifetimes`，事件方法统一放入 `methods` |
| MA-5 | WXML 事件绑定统一使用 `bind:event`，不要混用旧式 `bindtap` |
| MA-6 | WXML 的 `{{}}` 内禁止调用方法，复杂表达式先在 TS 中计算。例外：纯 getter 类方法（如格式化函数）允许调用，前提是无副作用且开销小 |
| MA-7 | `wx.setStorageSync` 禁止存储大量数据（单 key 上限 1MB），同步写入会阻塞 UI，大数据走异步存储或文件系统 |
| MA-8 | 页面间传参禁止 URL 拼接大对象，优先用 `EventChannel` 或全局 store |
| MA-9 | `onShareAppMessage` 内必须处理异步异常，禁止无 `try/catch` 导致静默吞错 |
| MA-10 | 禁止在 `onHide` / `onUnload` 生命周期之后继续调用 `setData` |
| MA-11 | `wx:for` 必须提供稳定 `wx:key`，禁止用数组下标兜底 |
| MA-12 | `wx:if` 和 `wx:for` 不要写在同一节点上 |
| MA-13 | 允许动态 class；如果动态 class 来自 UnoCSS / Tailwind 原子类，需要确认构建期可识别或配置 safelist |
| MA-14 | `setData` 优先使用路径更新，禁止循环中逐条 `setData` |
| MA-15 | `data` 中不要存放 WXML 不使用的数据 |
| MA-16 | `observers` 中禁止无保护地 `setData`，必须避免自触发循环 |
| MA-17 | `WXS` 只做纯格式化，禁止调用 API 或承载业务逻辑 |
| MA-18 | `getCurrentPages()` 只允许用于路由守卫、埋点、返回刷新，不要当全局状态管理使用 |
| MA-19 | 组件对外事件统一使用 `triggerEvent`，事件名使用 `kebab-case` |
