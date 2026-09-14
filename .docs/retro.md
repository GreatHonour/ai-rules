## 2026-09-14 npm 发布

### 代码 Windows 被占用目录同步

  - 依据：执行 `team-cli init` 时 `.agents` 根目录重命名返回 `EPERM`；修改后 60 项全量测试、TypeScript 与格式检查均通过。
  - 原因：目录级交换把读取 `.agents` 的普通进程视为对整个目录可移动的前提，Windows 文件共享语义不保证该前提。
  - 改进：同步用户可能持续读取的配置目录时，使用完整快照后按受管资源原地写入；失败信息必须列出具体资源与快照位置，避免错误的全目录重命名恢复策略。

### 工具 Windows `.cmd` 子进程兼容性

- 依据：Node.js 22.16.0 在 Windows 上直接执行 `spawn('pnpm.cmd', ...)` 稳定抛出 `spawn EINVAL`；改用当前 Node.js 执行本地 Changesets CLI 后，真实子进程回归测试通过。
- 原因：发布包装脚本把命令行中可调用的 `.cmd` 入口误认为 Node.js `child_process.spawn` 在未启用 shell 时也能直接执行。
- 改进：包装 Node.js CLI 时优先解析依赖包导出的 JavaScript 入口，并通过 `process.execPath` 启动；测试既断言本地入口，也实际执行无副作用的版本命令。
