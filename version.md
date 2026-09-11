# team-cli 版本管理

`team-cli` 使用 [Changesets](https://github.com/changesets/changesets) 管理版本号与变更记录（CHANGELOG.md）。当前流程仅覆盖本地版本管理，npm 发布暂未接入。

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

## 后续：发布（暂未接入）

npm 发布（`changeset publish` 与 Git Tag）尚未接入，待发布目标确定后补充。发布凭据只应保存在本地（`~/.npmrc` 或环境变量），禁止写入仓库。
