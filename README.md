# agentctl

`agentctl` 使用 Git 仓库统一维护 Agent 规则和 skill。项目提交 manifest 与 lock，以获得可复现的 `.agents/rules` 和 `.agents/skills`；团队与个人差异通过显式 overlay 管理。

## 开发

```bash
pnpm install
pnpm test
pnpm check
pnpm build
pnpm link --global
```

## 注册表格式

```text
registry/
├── registry.yaml
└── packages/
    ├── rules/<name>/<version>/...
    └── skills/<name>/<version>/...
```

```yaml
schema: 1
packages:
  - name: naming
    kind: rule
    versions:
      - version: 1.0.0
        path: packages/rules/naming/1.0.0
        entry: naming.md
        files:
          - naming.md
```

一个 rule 包以 Markdown 文件为入口。一个 skill 包以 `SKILL.md` 为入口，`references/`、模板和适配器与入口一起列入 `files`。

## 项目配置

初始化新项目：

```bash
agentctl init
```

已有 `.agents` 的项目必须显式接管，命令只记录基线 hash，不覆盖文件：

```bash
agentctl init --adopt
```

添加依赖会原子更新 `.agentctl/manifest.yaml` 和 `.agentctl/lock.yaml`：

```bash
agentctl add rule:naming@^1.0.0 --registry team --url git@github.com:example/agent-registry.git --ref main
agentctl add skill:flow-review@^2.0.0 --registry team
agentctl sync
```

项目应提交 `.agentctl/manifest.yaml`、`.agentctl/lock.yaml`、`.agentctl/state.yaml` 和 `.agents/overrides/`。缓存与 `.agents/overrides.local/` 默认被忽略。

## 覆盖与冲突

有效优先级为：

```text
.agents/overrides.local > .agents/overrides > lock 中的托管包
```

overlay 的目录结构镜像 `.agents`，例如 `.agents/overrides/rules/naming.md`。skill 的 `SKILL.md` 是必需入口，overlay 不得替换它。直接修改 `.agents/rules` 或 `.agents/skills` 会导致 `sync` 和 `upgrade` 停止；先运行 `agentctl diff` 检查，只有确认放弃修改时才使用 `--force`。

## 维护命令

```bash
agentctl check
agentctl diff
agentctl doctor
agentctl upgrade
```

`check` 会访问 lock 中的 Git commit 并重新校验包清单与内容 hash，因此私有注册表需要当前 Git 凭据可用。`doctor` 会使用只读 `git ls-remote` 提前检查每个已配置注册表的连接与凭据。

发布默认只在注册表工作区生成文件和索引变更：

```bash
agentctl publish ./my-skill --registry-directory ../agent-registry --kind skill --name my-skill --version 1.0.0 --entry SKILL.md
```

使用 `--commit` 创建提交；只有同时显式传入 `--commit --push` 才会推送。CLI 不调用 Git 托管平台 API，也不执行包内脚本或钩子。
