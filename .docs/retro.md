## 2026-09-14 npm 发布

### 工具 Windows `.cmd` 子进程兼容性

- 依据：Node.js 22.16.0 在 Windows 上直接执行 `spawn('pnpm.cmd', ...)` 稳定抛出 `spawn EINVAL`；改用当前 Node.js 执行本地 Changesets CLI 后，真实子进程回归测试通过。
- 原因：发布包装脚本把命令行中可调用的 `.cmd` 入口误认为 Node.js `child_process.spawn` 在未启用 shell 时也能直接执行。
- 改进：包装 Node.js CLI 时优先解析依赖包导出的 JavaScript 入口，并通过 `process.execPath` 启动；测试既断言本地入口，也实际执行无副作用的版本命令。
