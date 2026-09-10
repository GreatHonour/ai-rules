## 功能：agentctl

### 2026-09-10 首版

- 能力或变更：提供 `init`、`add`、`sync`、`check`、`diff`、`upgrade`、`publish`、`doctor`，通过 Git 注册表统一管理 rule 和 skill 包。
- 关键逻辑：项目提交 manifest、lock 和 state；托管目录禁止直接修改；覆盖优先级为 `overrides.local > overrides > 托管包`；现有 `.agents` 必须通过 `init --adopt` 显式接管。
- 结构决策：CLI 直接位于仓库根目录，使用 Node.js、TypeScript、pnpm 和 Vitest；注册表版本以 SemVer 解析并锁定 Git commit 与内容 hash。
- 影响面：新增根项目构建配置、CLI 源码、测试、使用文档和三平台 CI 验证矩阵。
- 遗留：macOS 与 Linux 由 CI 矩阵验证，本地已完成 Windows 验证。
