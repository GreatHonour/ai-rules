# team-cli

`@icc-grow/team-cli` 从公开 Git 仓库向项目分发团队 rules 与 skills，并提供版本更新、registry 发布门禁和 issue 隔离上传。CLI 要求 Node.js 20.17 或更高版本、系统已安装 Git，包管理统一使用 pnpm。

## 安装与初始化

```bash
pnpm add -D @icc-grow/team-cli
team-cli init
```

交互初始化会采集项目名称、可选的前端框架、可选的后端框架、运行环境和 rules 选择，并默认安装 registry 中全部 `flow-*` skills。CI 等非交互环境无需提供框架参数，其余必需参数需要显式传入：

```bash
team-cli init \
  --workspace . \
  --name example-project \
  --frontend-frameworks vue3 \
  --backend-frameworks nestjs \
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

`flow-*` skill 会按完整目录覆盖。本地已有的非 `flow-*` skill 不被覆盖。每次写入前会在项目根目录保留 `.team-cli-agents-backup-<UTC 时间戳>` 备份；成功后 CLI 会提示用户确认并手动删除。落盘失败时，CLI 列出失败资源并保留备份，用户可据此手动更新或恢复。

### upload

将 `.agents/issues/` 的新增、修改和删除提交到专用远端分支，不切换当前分支，也不修改用户现有暂存区：

```bash
team-cli upload "login timeout"
team-cli upload "login timeout" --remote origin
```

远端分支名为 `codex/issue-login-timeout`。候选提交生成后会再次验证所有变化路径，任何 `.agents/issues/` 外路径都会阻止推送。

## 项目维护

仓库开发、公共资源维护、质量检查和发布说明见 [PROJECT.md](./PROJECT.md)。
