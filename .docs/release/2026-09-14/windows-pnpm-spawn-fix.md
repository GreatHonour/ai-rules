# Windows 发布命令启动失败

## 目标

- 类型：缺陷修复
- 复现：在 Windows、Node.js 22.16.0、pnpm 10.12.0 环境执行 `pnpm release:publish` -> 发布脚本启动 `pnpm.cmd` 时抛出 `spawn EINVAL`
- 目标：发布脚本能跨平台启动本地 Changesets CLI，并继续保留原始终端输出和明确发布结果
- 根因：`scripts/publishPackage.mjs` 在 Windows 上直接通过 `child_process.spawn` 执行 `pnpm.cmd`；当前 Node.js 不支持在未启用 shell 的情况下直接启动该命令脚本，因此子进程尚未执行 Changesets 就失败
- 边界：不改变 Changesets 的版本与发布规则，不修改 npm registry 或认证配置，不在验证期间执行真实发布

## 历史依据

- 功能文档：`CHANGESET.md` 要求 `release:publish` 保留 Changesets 原始输出，并明确报告发布成功或没有新版本
- 代码历史：提交 `cfa5aa0` 将 `release:publish` 从 `changeset publish` 改为 Node.js 包装脚本，并首次引入 Windows 下直接执行 `pnpm.cmd` 的逻辑；缺陷由该提交引入

## 实现

- 为发布子进程命令解析增加可测试逻辑 -> 使用当前 Node.js 可直接执行的本地 Changesets CLI，避免依赖 Windows `.cmd` 启动行为
- 增加 Windows 命令解析回归测试 -> 防止再次生成 `pnpm.cmd` 直启方案

## 验证场景

- Windows 命令解析 -> 返回 Node.js 可执行文件和本地 Changesets CLI 参数
- Linux/macOS 命令解析 -> 同样使用 Node.js 执行本地 Changesets CLI
- 无副作用子进程验证 -> 使用解析结果执行 `changeset --version` 成功退出
- 发布输出解析测试、全量测试、类型检查、格式检查和构建 -> 全部通过

## 影响范围

- `scripts/publishPackage.mjs`
- `scripts/publishPackage.spec.mjs`

## 验证结果

- Windows 最小复现：原实现直接启动 `pnpm.cmd` 时稳定抛出 `spawn EINVAL`。
- 回归测试：使用当前 Node.js 成功启动项目本地 Changesets CLI 3.0.2。
- `pnpm test`：18 个测试文件、60 项测试全部通过。
- `pnpm check`：通过。
- `pnpm build`：通过。
- `pnpm format:check`：通过。
- 未执行真实 npm 发布。
