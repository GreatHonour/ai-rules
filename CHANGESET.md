# team-cli 发布流程

`@icc-grow/team-cli` 使用 [Changesets](https://github.com/changesets/changesets) 管理版本号、变更记录（CHANGELOG.md）和 npm 发布。包以公开访问级别发布到 npmjs.org。

## 第一步：记录变更（开发阶段）

完成新功能或缺陷修复、准备提交代码时执行：

```bash
pnpm changeset
```

终端交互步骤：

1. 空格选中本次修改涉及的包（单包仓库直接回车确认）。
2. 选择版本类型：
   - `patch`：修复缺陷，向后兼容。
   - `minor`：新增功能，向后兼容。
   - `major`：破坏性变更。
3. 输入该变更的发布说明（会写入 CHANGELOG.md）。

命令在 `.changeset/` 下生成一个 Markdown 变更记录，请随代码一起提交。该目录已被 `.prettierignore` 排除，提交时不会被格式化改写。

## 第二步：升级版本（准备发版）

积累若干变更记录后执行：

```bash
pnpm release:version
```

该命令会：

- 消耗 `.changeset/` 下已积累的变更记录文件；
- 更新 `package.json` 的版本号；
- 生成或更新 `CHANGELOG.md`。

随后提交版本变更：

```bash
git add package.json CHANGELOG.md .changeset
git commit -m "chore(release): version packages"
```

## 第三步：自动发布

合并包含 changeset 的 PR 后，GitHub Actions 会创建或更新版本 PR；合并该版本 PR 后，Node.js 22 发布工作流执行 `changeset publish`，发布 npm 包并创建 GitHub Release。包的运行时仍支持 Node.js 20.17 或更高版本。

仓库管理员需要在 GitHub 仓库设置中配置 `NPM_TOKEN`：它必须是 `@icc-grow` 组织可发布该包的 npm automation token。令牌只能存放在 GitHub Actions secret 或本机用户级 npm 配置中，禁止写入仓库。

首次发布前需确认 npm 组织已授予发布者 `@icc-grow/team-cli` 的公开发布权限。紧急手动发布可在完成质量检查后执行：

```bash
pnpm release:publish
```

命令会保留 Changesets 原始输出，并在结束后明确显示“发布成功”及对应 npm 页面地址；若没有待发布的新版本，则会明确提示“没有发布新版本”。
