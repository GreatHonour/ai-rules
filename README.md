# team-cli

`team-cli` 从公开 Git 仓库向项目分发团队 rules 与 skills，并提供版本更新、registry 发布门禁和 issue 隔离上传。CLI 要求 Node.js 20 或更高版本，包管理统一使用 pnpm。

## 安装与初始化

```bash
pnpm add -D team-cli
team-cli init
```

交互初始化会采集项目名称、框架、架构、运行环境和 rules 选择，并默认安装 registry 中全部 `flow-*` skills。CI 等非交互环境必须显式传入选择参数：

```bash
team-cli init \
  --workspace . \
  --name example-project \
  --frameworks vue3 \
  --architecture single-page-application \
  --environments PC H5 \
  --rules typescript vue3
```

初始化生成 `.agents/manifest.json`，把 rules 写入 `.agents/rules/`，把受管 skills 写入 `.agents/skills/`，并维护 `AGENTS.md` 中的 `team-cli:rules` 区块。它不会创建、复制、删除或替换目标项目的 `.git`。

## 项目命令

### config

调整项目画像和 rules 选择。取消 rule 时只删除 manifest 明确管理的同名 rule，`AGENTS.md` 标记外内容保持不变。

```bash
team-cli config --rules typescript vue3
```

### update

只比较本地 manifest 与远端 registry 的 SemVer。远端较新时展示差异并确认更新；版本相同不写入；远端更旧时报告回退异常且不降级。

```bash
team-cli update
team-cli update --yes
```

`flow-*` skill 会按完整目录覆盖。本地已有的非 `flow-*` skill 不被覆盖。下载、校验或落盘失败时，资源目录与 manifest 回滚到更新前状态。

### upload

将 `.agents/issues/` 的新增、修改和删除提交到专用远端分支，不切换当前分支，也不修改用户现有暂存区：

```bash
team-cli upload "login timeout"
team-cli upload "login timeout" --remote origin
```

远端分支名为 `codex/issue-login-timeout`。候选提交生成后会再次验证所有变化路径，任何 `.agents/issues/` 外路径都会阻止推送。

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

安装仓库内 pre-commit Hook：

```bash
pnpm hooks:install
```

CI 使用同一校验器与合并目标分支比较：

```bash
pnpm agents registry:check --base <target-ref>
```

## 目录职责

```text
.agents/
├── rules/          # 项目选择的规则文件
├── skills/         # flow-* 受管技能和用户本地技能
├── issues/         # upload 唯一允许提交的载荷
└── manifest.json   # 项目画像、registry 地址和实际安装版本
```

公共 registry 不保存项目数据、凭据、资源级 URL、checksum 或依赖关系。Git clone 只发生在临时目录；危险资源名或包含符号链接的资源会被拒绝，临时 clone 的 `.git` 不会复制到目标项目。同一批次内来自同一仓库的资源复用一次 clone。
