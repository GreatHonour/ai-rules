# agentctl 设计文档

## 目标与范围

- 目标：用一个 CLI 统一维护个人和团队共享的 agent 规则与 skill，并让每个项目通过版本锁定获得可复现的 `.agents` 运行时内容。
- 成功标准：维护者可以从 Git 注册表发布经过结构校验的 rule/skill 包；项目可以声明依赖、生成 lock、同步到现有 `.agents/rules` 和 `.agents/skills`；同步冲突、hash 漂移和 overlay 覆盖关系都能被 CLI 检查和解释。
- 职责边界：CLI 负责 Git 注册表访问、版本解析、lock 管理、内容校验、物料化、overlay 合并和诊断；不负责托管 Git 服务、执行注册表脚本或改变 Agent 运行时的读取协议。

## 现状与约束

- 当前仓库使用 `.agents/rules/<name>.md` 保存规则，使用 `.agents/skills/<name>/` 保存 skill 及其 `SKILL.md`、`references/`、模板和适配器。
- 项目运行时继续读取 `.agents/rules` 与 `.agents/skills`；CLI 通过生成最终目录保持兼容。
- 第一版注册表使用 Git 仓库，认证复用 Git 已配置的 SSH/HTTPS 凭据。
- 包版本使用 SemVer；项目实际构建以 lock 中的 Git commit 和内容哈希为准。
- 托管内容只读；项目差异通过 `.agents/overrides/`（团队）和 `.agents/overrides.local/`（个人）表达。
- CLI 使用 Node.js + TypeScript 实现，并通过 pnpm 管理开发依赖（设计阶段补充）。
- CLI 源码、包配置和测试直接位于当前仓库根目录，不创建独立 `agentctl/` 子项目（实现阶段补充）。
- 注册表内容只作为文本和资源读取，CLI 不执行包内脚本或钩子。

## 技术方案

### 模块与职责

```text
CLI commands
  ├─ config/manifest loader ──> manifest + user config
  ├─ git registry adapter ────> registry checkout/cache
  ├─ resolver + lock manager ─> SemVer resolution + lockfile
  ├─ package validator ───────> metadata/tree/hash validation
  ├─ materializer ────────────> managed tree + overlay merge
  └─ diagnostics ─────────────> diff/check/doctor reports
```

- `config/manifest loader`：读取项目 manifest、全局注册表别名和路径配置，拒绝未知字段或缺失必填项。
- `git registry adapter`：按 URL、ref 和 commit 拉取注册表到缓存；不执行注册表文件。
- `resolver + lock manager`：依据 SemVer 约束选择版本，记录来源 URL、commit、解析版本和内容 hash。
- `package validator`：校验包类型、名称、版本、入口文件和相对路径，禁止路径穿越及重复目标。
- `materializer`：先检查托管目录状态，再生成基础内容，按固定优先级合并 overlay，并写入状态 hash。
- `diagnostics`：输出可操作的 diff、缺失依赖、锁文件漂移、覆盖关系和 Git 环境问题。

### 核心流程与状态

#### 初始化与添加依赖

`项目无配置/执行 init` → 创建 `.agentctl/manifest.yaml`、`.agentctl/lock.yaml` 和约定的 `.agents/overrides*` 目录 → 项目进入可同步状态

`已有 `.agents/rules` 或 `.agents/skills`/执行 `init --adopt` → 计算现有托管目录基线 hash，写入 `.agentctl/state.yaml`，不覆盖现有文件 → 项目进入可迁移状态

`执行 add` → 从 Git 注册表读取包索引并校验包元数据 → 原子更新 manifest 和 lock → 不改变现有托管文件，等待 sync

#### 同步

`执行 sync` → 读取 manifest 和 lock → 拉取或复用 Git commit → 校验包结构与 hash → 检查 `.agents/rules`、`.agents/skills` 的状态 hash → 在临时目录生成基础内容并合并 overlay → 全部校验通过后原子替换运行时目录 → 最后更新 state 记录

任一步骤失败 → 保留旧的 `.agents`、lock 和 state，不留下半成品目录。

overlay 合并优先级固定为：

`overrides.local > overrides > lock 中的托管包`

同一路径采用文件级替换；目录只允许增加或替换明确的相对文件，不允许通过 overlay 删除托管包的必需入口文件。

#### 检查与升级

`执行 check` → 比较 manifest、lock、Git commit、内容 hash、生成目录和 overlay → 输出通过项或带文件路径的失败原因，不修改文件。

`执行 upgrade` → 在当前 SemVer 范围内选择新版本 → 展示依赖和内容 diff → 仅在托管目录无人工修改时更新 lock 并完成同步；存在修改时停止并要求先处理 diff。

#### 发布

`执行 publish` → 校验包目录、元数据、命名、版本和路径安全 → 生成或更新注册表索引和工作区变更；默认不提交或推送。`--commit` 显式创建 Git 提交，`--push` 仅在同时显式要求时推送；不调用外部托管 API。

### 契约

#### 注册表布局

注册表根目录包含索引文件和包目录。规则包与 skill 包分开存放，包目录是发布和版本校验的最小单位：

```text
registry/
  registry.yaml
  packages/
    rules/<package-name>/<version>/...
    skills/<package-name>/<version>/...
```

包元数据至少包含：`name`、`kind`（`rule` 或 `skill`）、`version`、`entry` 和文件清单。skill 的 `references/`、模板和适配器属于同一包内容。

#### 项目文件

`.agentctl/manifest.yaml` 声明注册表 URL、依赖名称、包类型和 SemVer 范围；它是可读、可审查的期望状态。

`.agentctl/lock.yaml` 记录每个依赖的解析版本、Git URL、commit、包路径、内容 hash 和生成目标；它是构建和同步的实际输入。

`.agentctl/state.yaml` 记录上一次成功物料化的托管文件 hash，用于识别人工修改和避免误覆盖。

#### 目录归属

- `.agents/rules`、`.agents/skills`：CLI 生成的有效运行时目录，禁止直接编辑。
- `.agents/overrides`：团队提交的项目级覆盖，目录结构镜像目标目录。
- `.agents/overrides.local`：个人机器覆盖，默认加入 gitignore。
- `.agentctl/cache`：本地 Git checkout 和包缓存，不进入版本库。

#### 命令契约

- `init`：创建配置骨架，不覆盖已有 manifest 或托管文件；发现已有 `.agents` 时提示使用 `--adopt`。
- `init --adopt`：记录现有托管目录基线，不覆盖现有文件。
- `add <package>`：原子更新 manifest 和 lock，不改变现有托管文件。
- `sync`：按 lock 物料化；默认拒绝覆盖人工修改。
- `check`：只读验证 manifest、lock、hash、overlay 和环境。
- `diff`：展示注册表版本、lock 和有效 `.agents` 树之间的差异。
- `upgrade`：在约束范围内更新版本并同步，遇到冲突停止。
- `publish`：校验并生成 Git 注册表变更；默认不提交/推送，`--commit` 和 `--push` 显式控制副作用，不执行脚本。
- `doctor`：检查 Git、凭据、版本、路径权限和缓存状态。

### 运行时安全

- 所有包路径必须经过规范化后确认仍位于目标包目录内，拒绝 `..`、绝对路径和符号链接逃逸。
- 默认不执行注册表中的任何脚本、二进制或生命周期钩子。
- 内容 hash 使用稳定的相对路径排序和文件字节计算，保证不同机器可复现（设计阶段补充）。
- Git 提交审查和注册表维护者承担内容可信责任；CLI 只保证来源、完整性和路径安全。

## 功能点

#### F1：初始化项目管理

- [项目尚未有 `.agentctl/manifest.yaml`] → 创建配置骨架和 overlay 目录。
- [项目已有配置] → 保留现有内容并报告无需重复初始化。

#### F2：声明和解析依赖

- [用户执行 `add`] → 从 Git 注册表选择 rule/skill 包并写入 SemVer 范围。
- [依赖名称、类型或版本非法] → 拒绝写入并指出可用包或校验错误。

#### F3：锁定和同步运行时目录

- [manifest 与 lock 可解析且托管目录未被修改] → 拉取指定 commit，校验 hash，生成 `.agents/rules` 和 `.agents/skills`。
- [托管目录 hash 漂移] → 默认停止并输出 diff，不覆盖人工修改。
- [overlay 存在同路径文件] → 按 local、team、managed 顺序生成有效内容，并报告覆盖来源。

#### F4：检查、差异和诊断

- [执行 `check` 或 `doctor`] → 输出结构化检查结果、失败路径和修复建议，不修改项目文件。
- [执行 `diff`] → 展示依赖解析、包内容、托管目录和 overlay 的可读差异。

#### F5：升级和发布

- [执行 `upgrade`] → 在 SemVer 范围内解析新版本并在清洁状态下更新 lock 与运行时目录。
- [执行 `publish`] → 通过包校验和索引校验后生成可审查的 Git 变更；禁止执行包内代码。

## 异常与边界

- **Git 仓库不可达或凭据失败** → 保留现有 lock 和 `.agents`，输出远端 URL、Git 原始错误和可重试建议。
- **已有 `.agents` 但未执行 adopt** → `init` 和 `sync` 拒绝接管并提示 `init --adopt`，不猜测现有文件归属。
- **lock 中的 commit 被删除或内容 hash 不匹配** → 同步失败，不回退到未锁定版本。
- **manifest 与 lock 不一致** → `check` 失败；`sync` 要求先执行显式的 lock 更新或 upgrade。
- **托管目录存在人工修改** → `sync`、`upgrade` 拒绝覆盖，要求使用 `diff`、清理修改或显式 `--force`。
- **物料化中途失败** → 删除临时目录，保留旧的 `.agents`、lock 和 state。
- **overlay 覆盖 skill 必需入口或产生路径穿越** → 拒绝物料化并报告冲突路径。
- **多个包写入同一目标文件** → 拒绝解析，要求依赖方通过 overlay 或拆分包消除歧义。
- **个人 overlay 与团队 overlay 冲突** → 允许 local 优先，但 `check` 必须报告最终生效来源。
- **不同平台路径差异** → 统一使用 POSIX 相对路径保存 manifest、lock 和包清单，物料化时转换本地分隔符。

## 风险与外部待确认

- Git 注册表内容可能包含诱导 Agent 改变行为的恶意文本；责任人是注册表维护者和团队代码审查者，首版不提供签名验证。
- 私有 Git 凭据由用户现有 Git 配置管理；CLI 不保存明文 token。
- 大型注册表或大量 skill 会增加 checkout 和 hash 时间；首版通过本地缓存和按 commit 复用降低成本。
- 没有外部待确认项；后续若引入 npm/OCI、签名或远程策略服务，需要单独设计发布和信任模型。

## Out of Scope

- 托管 Git 服务、用户组织、权限审批和 Web 管理界面。
- npm、OCI 或其他非 Git 注册表适配器。
- 注册表脚本、插件、生命周期钩子和任意代码执行。
- 自动把本地修改反向合并回上游包。
- 自动接管没有经过 `init --adopt` 的现有 `.agents` 内容。
- 自动解决多个包对同一路径的语义冲突。
- Agent 运行时协议、规则解释器和 skill 执行器的改造。
