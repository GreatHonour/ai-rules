## 功能：npm 发布

### 2026-09-14 修复 Windows 发布启动

- 能力或变更：`pnpm release:publish` 可在 Windows 上正常启动本地 Changesets CLI，不再因直接执行 `pnpm.cmd` 抛出 `spawn EINVAL`。
- 关键逻辑：发布脚本通过当前 Node.js 进程执行项目本地的 Changesets CLI，继续透传终端输出并沿用原有发布结果判断。
- 结构决策：通过 Node.js 模块解析获取 CLI 入口，不硬编码 pnpm 安装位置，也不依赖平台 shell。
- 影响面：发布脚本的子进程启动方式及对应回归测试。
- 遗留：未执行真实 npm 发布；外部发布仍依赖有效凭据和 npm 组织权限。

### 2026-09-14 明确发布结果

- 能力或变更：`pnpm release:publish` 保留 Changesets 原始输出，并明确报告发布成功或没有待发布版本。
- 关键逻辑：解析器忽略终端前缀和 ANSI 颜色，只有 Changesets 报告当前包和版本已成功发布时才输出 npm 版本地址。
- 结构决策：使用独立发布脚本包装 `changeset publish`，包元数据仍以 `package.json` 为唯一来源。
- 遗留：实际发布仍依赖 npm 组织权限和有效的 `NPM_TOKEN`，未进行真实 npm 发布验证。
