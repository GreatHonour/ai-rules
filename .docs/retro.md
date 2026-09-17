## 2026-09-17 team-cli

### 流程 release registry 与源文件版本同步

  - 依据：`src/commands/__tests__/release.spec.ts` 5/5 通过，覆盖 rule 成功发布、版本不一致拒绝和 skill `metadata.version` 校验。
  - 原因：release 原先只根据 registry 版本生成新版本，没有验证源文件自身的版本声明。
  - 改进：发布命令在写入 registry 前读取并校验源文件版本；不一致时失败且保持 registry 不变，版本同步责任保持在维护者侧。

## 2026-09-17 flow-e2e

### 流程 证据字段替换

  - 依据：`pnpm exec node --test .agents/skills/flow-e2e/scripts/e2eTasks.spec.mjs` 12/12 通过，覆盖旧 `error_log` 迁移、CLI 多证据参数、证据路径校验与报告输出。
  - 原因：单独的错误日志字段无法承载通过结果的截图、录屏等证据，也使报告审计不完整。
  - 改进：统一使用相对 `evidence` 地址，但只关联任务专属工件；状态迁移、CLI 参数、报告和恢复规则必须作为同一契约同步修改。

## 2026-09-14 npm 发布

### 代码 Windows 被占用目录同步

  - 依据：执行 `team-cli init` 时 `.agents` 根目录重命名返回 `EPERM`；修改后 60 项全量测试、TypeScript 与格式检查均通过。
  - 原因：目录级交换把读取 `.agents` 的普通进程视为对整个目录可移动的前提，Windows 文件共享语义不保证该前提。
  - 改进：同步用户可能持续读取的配置目录时，使用完整快照后按受管资源原地写入；失败信息必须列出具体资源与快照位置，避免错误的全目录重命名恢复策略。

### 工具 Windows `.cmd` 子进程兼容性

- 依据：Node.js 22.16.0 在 Windows 上直接执行 `spawn('pnpm.cmd', ...)` 稳定抛出 `spawn EINVAL`；改用当前 Node.js 执行本地 Changesets CLI 后，真实子进程回归测试通过。
- 原因：发布包装脚本把命令行中可调用的 `.cmd` 入口误认为 Node.js `child_process.spawn` 在未启用 shell 时也能直接执行。
- 改进：包装 Node.js CLI 时优先解析依赖包导出的 JavaScript 入口，并通过 `process.execPath` 启动；测试既断言本地入口，也实际执行无副作用的版本命令。
