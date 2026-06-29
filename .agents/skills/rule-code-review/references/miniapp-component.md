# 小程序原生组件

| # | 规则 |
|---|------|
| MC-1 | `scroll-view` 必须有明确高度或容器约束，禁止无限内容撑开导致滚动失效 |
| MC-2 | 原生组件上方叠加内容时，不要只依赖 `z-index`；必须考虑同层渲染和真机表现 |
| MC-3 | `cover-view` / `cover-image` 只用于覆盖原生组件，不要当普通布局组件使用 |
| MC-4 | `input` / `textarea` 和浮层、弹窗、吸底按钮组合时，必须真机验证键盘和层级表现 |
| MC-5 | `video`、`camera`、`live-player`、`live-pusher` 必须绑定错误事件并给出降级状态 |
