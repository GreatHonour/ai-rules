# npm 发布就绪

## 目标
- 类型：小型变更
- 目标：发布 `@icc-grow/team-cli` 时，构建产物、CLI 版本、Changesets 权限和 CI 发布流程保持一致。
- 边界：不修改 CLI 的业务命令、不修改未跟踪的 `.npmrc`、不替代维护者配置 npm 组织权限与 GitHub Secret。

## 历史依据
- 功能文档：`version.md` 明确 npm 发布尚未接入。
- 代码历史：`fb6c147` 接入了 Changesets 与质量工具，但未接入发布流程；`src/cli.ts` 与 `src/commands/init.ts` 将 CLI 版本固定为 `1.0.0`。

## 实现
- 包名调整为公开的 `@icc-grow/team-cli`，补齐 npm 元数据与固定 registry。
- 从包元数据读取运行时版本，供 CLI 输出和 manifest 使用。
- 打包与发布前执行构建和质量检查。
- 使用 GitHub Actions 和 Changesets 创建版本 PR、发布 npm 包、创建 GitHub Release。
- 兼容 Changesets 终端前缀和 ANSI 颜色输出，可靠识别实际发布的包版本。

## 验证场景
- 执行 `pnpm test`、`pnpm check`、`pnpm build` 和 `pnpm format:check` 均通过。
- 打包预览包含当前编译结果，`team-cli --version` 与 `package.json` 一致。
- 发布工作流仅从 `NPM_TOKEN` secret 读取凭据，包发布目标为 npmjs.org 公开 registry。
- 发布输出解析测试覆盖带终端前缀的成功区块和无发布区块。

## 影响范围
- npm 消费者、项目 manifest 版本记录、GitHub 发布流水线与维护者发布文档。
