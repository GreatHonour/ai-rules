# team-cli 项目说明

本文面向 `@icc-grow/team-cli` 的开发者和维护者。CLI 的安装、初始化及日常命令见 [README.md](./README.md)。

## 本地开发

项目要求 Node.js 20.17 或更高版本，统一使用 pnpm：

```bash
pnpm install
pnpm agents --help
```

常用质量检查命令：

```bash
pnpm format:check
pnpm test
pnpm check
pnpm build
```

代码风格由 Prettier 统一，提交信息由 commitlint 在 `commit-msg` 阶段校验。`pnpm install` 会激活 husky 管理的 Git hooks。

## 公共资源维护

公共源仓库根目录包含 `registry.json`。顶层 `repositoryUrl` 定位公开 Git 仓库；每个资源条目只允许 `version`、`desc` 和 `updatedAt`：

```json
{
  "repositoryUrl": "https://github.com/GreatHonour/ai-rules.git",
  "rules": {
    "typescript": {
      "version": "1.0.0",
      "desc": "TypeScript 类型安全与编码约定",
      "updatedAt": "2026-09-11 08:00:00"
    }
  }
}
```

`updatedAt` 按 UTC 使用 `yyyy-MM-dd HH:mm:ss`。CLI 根据资源名推导 `.agents/rules/<name>.md` 或 `.agents/skills/<name>`，资源名只允许字母、数字和连字符。

修改 `.agents/rules/` 或 `.agents/skills/` 后执行：

```bash
pnpm agents release
```

命令相对 `HEAD` 归并变化；已有资源逐项选择 `patch`、`minor` 或 `major`，新资源固定为 `1.0.0`，删除资源会移除对应 registry 条目。命令只更新 `registry.json` 并输出摘要，不执行 `git add`、`git commit` 或 `git push`。

精确暂存资源和 registry 后，可执行只读门禁：

```bash
pnpm agents registry:check
```

pre-commit 会先通过 lint-staged 格式化暂存文件，再执行 registry 门禁；门禁的独立实现保留在 `.githooks/pre-commit`。CI 使用同一校验器与合并目标分支比较：

```bash
pnpm agents registry:check --base <target-ref>
```

## 版本与发布

版本号、变更记录和 npm 发布由 Changesets 管理。

功能或缺陷修复完成后，先记录发布变更：

```bash
pnpm changeset
```

准备发版和手动发布分别使用：

```bash
pnpm release:version
pnpm release:publish
```

## 目录职责

```text
src/                 # CLI 源码
scripts/             # 项目维护与发布脚本
flow-v1/             # 第一版 flow 技能
flow-v2/             # 第二版 flow 技能、模板与校验脚本
.agents/
├── rules/           # 项目选择的规则文件
├── skills/          # flow-* 受管技能和用户本地技能
├── issues/          # upload 唯一允许提交的载荷
└── manifest.json    # 项目画像、registry 地址和实际安装版本
registry.json        # 公共资源索引
```

公共 registry 不保存项目数据、凭据、资源级 URL、checksum 或依赖关系。Git clone 只发生在临时目录；危险资源名或包含符号链接的资源会被拒绝，临时 clone 的 `.git` 不会复制到目标项目。同一批次内来自同一仓库的资源复用一次 clone。
