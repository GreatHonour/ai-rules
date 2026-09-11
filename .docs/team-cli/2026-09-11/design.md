# team-cli 设计文档

## 目标与范围

- 目标：从零实现 npm CLI `team-cli`，由公开 Git 仓库分发 rules 与 skills，并为使用项目提供初始化、版本检查、增量更新和 issue 上传能力。
- 成功标准：
  - 用户安装 npm 包后，可执行 `team-cli init` 初始化项目，不创建、复制或替换目标项目的 `.git`。
  - 初始化默认安装全部 `flow-*` skills，用户交互选择所需 rules，并生成与选择一致的 `AGENTS.md` 规则引用。
  - `team-cli update` 仅依据版本号比较本地 `.agents/manifest.json` 与远端 `registry.json`，发现不一致时展示差异并由用户确认更新。
  - 更新保留本地已有的非 `flow-*` skills；`flow-*` skills 是公共受管资源，确认更新后允许整目录覆盖。
  - 公共源仓库中的 rule 或 skill 内容变化后，维护者先执行 `pnpm agents release` 选择版本升级类型并生成 `registry.json` 变更；未同步升级版本时 Git 提交被阻止。
  - `team-cli upload` 只把 `.agents/issues/` 的变化提交到 `codex/issue-<名称>` 分支并推送，不夹带任何其他路径。
- 职责边界：
  - 负责：CLI 安装入口、公共资源注册表读取、项目配置、资源初始化与更新、`AGENTS.md` 受管引用、公共仓库发布校验、issue 定向 Git 上传。
  - 不负责：旧 `agentctl` 的兼容或迁移；私有仓库鉴权；集中保存各项目 manifest；自动判断 rule/skill 兼容性；自动执行 npm 发布；自动提交项目 manifest、rules、skills 或业务代码。

## 现状与约束

- 本功能是独立新功能，npm 包名和可执行命令均为 `team-cli`；旧 `agentctl` 配置与构建产物不属于可复用契约。
- 包管理统一使用 pnpm，Node.js 运行时最低版本沿用当前工程的 Node.js 20。
- 源码使用 TypeScript 严格模式；导出函数声明返回类型，禁用 `any`、非空断言和双重断言；函数使用中文 JSDoc，变量仅在解释原因时使用普通注释。
- 公共 Git 仓库是 rules、skills 和 `registry.json` 的唯一发布源；npm 只分发 CLI 程序。
- 公共 Git 仓库第一阶段允许匿名读取；私有仓库登录与授权后续另行设计。
- 研发流程文档保存在 `.docs/`；`.agents/issues/` 仅保存 `team-cli upload` 的上传载荷。
- 使用项目自己的 Git 保存 `.agents/manifest.json` 副本，但由用户自行提交；CLI 的 `upload` 不提交该文件。
- `registry.json` 顶层保存公共 `repositoryUrl`；每个资源条目只保存 `version`、`desc`、`updatedAt`，不保存 URL、checksum、Git commit、依赖关系或项目数据。（契约调整）
- 发布纪律：任一 rule 或 skill 的源内容发生变化，对应版本和 `updatedAt` 必须变化；CLI 不根据内容自动决定 patch/minor/major。

## 技术方案

### 模块与职责

```text
src/
├── cli.ts                         # team-cli 命令入口与退出码
├── commands/
│   ├── init.ts                    # 初始化 manifest、flow skills、rules、AGENTS.md
│   ├── update.ts                  # 比较版本、确认并应用更新
│   ├── release.ts                 # 维护者生成 registry 版本变更
│   └── upload.ts                  # 隔离提交并推送 .agents/issues
├── registry/
│   ├── registry-client.ts         # 获取并校验公开 registry
│   └── resource-downloader.ts     # 临时 clone Git 并读取 path 指定资源
├── project/
│   ├── manifest.ts                # 读取、校验、原子写入项目 manifest
│   ├── agents-document.ts         # 维护 AGENTS.md 规则引用区块
│   └── resource-sync.ts           # rules/skills 合并与覆盖策略
├── release/
│   ├── change-detector.ts         # 将 Git 变化归并到资源名
│   └── registry-editor.ts         # 版本升级与更新时间生成
├── git/
│   ├── release-check.ts           # pre-commit/CI 只读版本校验
│   └── issue-uploader.ts          # 临时索引、分支提交和 push
└── types.ts                       # 跨模块公共契约
```

- 命令层只解析参数、组织交互和映射退出码；不得直接拼接 Shell 命令。
- registry、project、release、git 模块提供可独立测试的领域能力，依赖方向从命令层指向领域模块。
- 外部 JSON、命令参数和 Git 输出均先做结构校验再使用。（设计阶段补充）
- 文件更新先写入目标文件同目录的临时路径，全部下载与校验成功后再替换；失败时保持原文件和原 manifest 不变。（设计阶段补充）

### 核心流程与状态

#### 初始化

```text
用户执行 team-cli init
  → 校验目标目录与公开 registry
  → 采集项目框架、架构、运行环境
  → 默认选择全部 flow-* skills，并交互选择 rules
  → 下载到临时目录
  → 按同步策略写入 .agents/
  → 写入 .agents/manifest.json
  → 创建或更新 AGENTS.md 受管规则引用区块
  → 初始化完成
```

#### 更新

```text
用户执行 team-cli update
  → 读取并校验本地 manifest 与远端 registry
  → 对 manifest 已选 rule/skill 逐项比较 SemVer
  → 版本一致则保持不变
  → 远端版本较新则展示差异并请求确认
  → 本地版本较新则报告远端回退异常且不自动降级
  → 确认后下载全部待更新资源
  → 应用 rule/skill 策略
  → 更新 manifest 的实际版本和 updatedAt
  → rules 选择或版本变化时重建 AGENTS.md 受管引用区块
```

#### 公共资源发布

```text
维护者修改一个或多个 rule/skill
  → 执行 pnpm agents release
  → CLI 相对 HEAD 识别工作树中的资源变化
  → 每个变化项由维护者选择 patch/minor/major
  → CLI 更新对应 registry 条目的 version 与 updatedAt
  → CLI 输出摘要但不 git add、不 commit、不 push
  → 维护者精确暂存源文件与 registry.json 后提交
  → pre-commit 校验暂存区，CI 基于目标分支再次校验
```

#### Issue 上传

```text
用户执行 team-cli upload <issue-name>
  → 校验当前目录是已有 Git 工作树
  → 只收集 .agents/issues/ 的新增、修改与删除
  → 从当前 HEAD 建立 codex/issue-<slug> 分支引用
  → 使用隔离的临时 Git index 生成只包含 issue 路径的提交
  → 验证提交树的变更路径均位于 .agents/issues/
  → 推送专用分支到当前项目既有 origin
  → 不切换用户当前分支，不修改用户暂存区
```

### 契约

#### 公共 `registry.json`

```json
{
  "repositoryUrl": "https://github.com/example/team-rules.git",
  "rules": {
    "typescript": {
      "version": "1.0.0",
      "desc": "TypeScript 类型安全与编码约定",
      "updatedAt": "2026-09-11 08:00:00"
    }
  },
  "skills": {
    "flow-brainstorm": {
      "version": "1.0.0",
      "desc": "通过结构化讨论收敛产品决策",
      "updatedAt": "2026-09-11 08:00:00"
    }
  }
}
```

- `version` 必须是有效 SemVer；新资源固定从 `1.0.0` 开始。
- `repositoryUrl` 指向可匿名浅克隆的公开 Git 仓库；rule 与 skill 路径分别按 `.agents/rules/<name>.md` 和 `.agents/skills/<name>` 推导，不把临时目录的 `.git` 复制到目标项目。（契约调整）
- 资源名只允许字母、数字与连字符且不得包含路径片段；skill 目录内的文件不得通过符号链接逃逸到目录外。（契约调整）
- `desc` 是初始化/config 选择和新资源发布摘要使用的必填说明。（契约调整）
- `updatedAt` 使用 UTC `yyyy-MM-dd HH:mm:ss`；只用于展示和记录，不参与升级排序。（契约调整）
- CLI 判断更新只比较 `version`；版本相同即视为内容一致。

#### 项目 `.agents/manifest.json`

```json
{
  "schemaVersion": 1,
  "project": {
    "name": "example-project",
    "frameworks": ["vue3"],
    "architecture": "single-page-application",
    "environments": ["PC", "H5"]
  },
  "registryUrl": "https://example.com/registry.json",
  "repositoryUrl": "https://github.com/example/team-rules.git",
  "rules": {
    "typescript": {
      "version": "1.0.0",
      "desc": "TypeScript 类型安全与编码约定",
      "updatedAt": "2026-09-11 08:00:00"
    }
  },
  "skills": {
    "flow-brainstorm": {
      "version": "1.0.0",
      "desc": "通过结构化讨论收敛产品决策",
      "updatedAt": "2026-09-11 08:00:00",
      "managed": true
    }
  },
  "cliVersion": "1.0.0",
  "updatedAt": "2026-09-11 08:00:00"
}
```

- `frameworks`、`architecture`、`environments` 保存用户在初始化或配置变更时确认的项目画像。
- `rules` 保存当前已选择且已安装的 rules；`skills` 保存受管 skills 及实际安装版本。
- `managed: true` 表示 CLI 可按已确认策略更新；本地已有且未被 CLI 接管的非 `flow-*` skill 不写成受管项。
- manifest 不保存 Token、密码、SSH 私钥或用户 Git 凭据。
- manifest 的云端副本是使用项目 Git 中的同一文件，不另建中央配置服务。

#### `AGENTS.md` 受管区块

```markdown
<!-- team-cli:rules:start -->
- TypeScript → [.agents/rules/typescript.md](.agents/rules/typescript.md)
<!-- team-cli:rules:end -->
```

- CLI 只替换成对标记之间的内容；标记之外的用户文档原样保留。
- 用户新增、移除或更新 rule 后，引用按 manifest 中的 rules 重新生成，不保留失效引用。
- 文件不存在时，CLI 可创建包含受管区块的新 `AGENTS.md`；文件存在但标记缺失时，先展示将追加区块的提示。（设计阶段补充）

#### CLI 命令

- `team-cli init [--workspace <path>]`：初始化项目并进行交互选择；公开 registry 地址采用 CLI 内置默认值，可用参数覆盖。
- `team-cli update [--workspace <path>]`：检查全部已选资源版本，展示差异，确认后原子更新。
- `team-cli config [--workspace <path>]`：调整框架、架构、环境和 rules 选择；rules 变化后同步资源、manifest 和 `AGENTS.md`。
- `team-cli release`：仅允许在公共源仓库运行；检测变化、询问版本类型并更新 `registry.json`，不执行 Git 写操作。
- `team-cli registry:check [--base <ref>]`：只读检查变化资源是否同步升级 registry 条目，供 Hook 与 CI 共用。
- `team-cli upload <issue-name> [--remote <name>]`：默认推送到 `origin` 的 `codex/issue-<slug>`，只提交 `.agents/issues/`。
- 公共仓库提供 pnpm 脚本 `agents` 指向本地 `team-cli`，因此维护者使用 `pnpm agents release`；安装后的用户直接使用 `team-cli`。（设计阶段补充）

## 功能点

#### F1：独立 CLI 包

- 安装 npm 包 `team-cli` → 系统提供同名可执行命令。
- 构建与发布 → 仅包含新 TypeScript 源码产生的 `dist`，不引用或兼容旧 `agentctl`。

#### F2：安全初始化

- 目标项目不存在 `.agents/` → 创建所需的 `rules/`、`skills/`、`issues/` 和 `manifest.json`。
- 目标已存在 `.agents/skills/` → 增量合并，不删除任何本地独有 skill。
- registry 存在 `flow-*` skills → 默认全部安装并标记为受管。
- 初始化下载内容包含 `.git` 或路径穿越项 → 拒绝初始化且不写入目标项目。
- 任意初始化场景 → 不创建、复制、删除或替换目标项目 `.git`。

#### F3：按项目选择 rules

- 初始化或执行 config → 用户选择当前项目需要的 rules，并填写项目框架、架构和 PC/Flutter/H5 等运行环境。
- rules 选择发生变化 → 下载新增 rule、移除已取消选择且由 CLI 管理的 rule，并同步 manifest 与 `AGENTS.md` 引用。
- `AGENTS.md` 含用户内容 → 只更新受管区块。

#### F4：版本检查与更新

- 本地和远端版本相同 → 不下载、不覆盖、不更新时间。
- 远端版本较新 → 展示资源名、本地版本、远端版本和远端更新时间，用户确认后更新。
- 本地版本较新 → 报告 registry 回退异常，不自动降级。
- 更新任一 `flow-*` skill → 以远端完整内容替换同名目录。
- 本地存在非 `flow-*` 同名 skill → 保留本地目录并报告跳过，不删除、不覆盖。
- 下载或写入任一项失败 → 不更新 manifest，保留更新前可用状态。

#### F5：registry 发布

- 新增 rule/skill → `release` 要求初始版本为 `1.0.0` 并写入当前 UTC `updatedAt`。
- 修改两个或更多资源 → 对每项分别选择 patch/minor/major，并只更新对应条目。
- 未检测到源变化 → `release` 不修改 registry 并以成功的无变化结果结束。
- `release` 完成 → 输出变化摘要，不自动暂存、提交或推送。

#### F6：提交门禁

- 暂存区包含变更的 rule/skill，registry 对应版本未递增或 `updatedAt` 未变化 → pre-commit 拒绝提交并提示运行 `pnpm agents release`。
- 新资源的 registry 初始版本不是 `1.0.0` → 拒绝提交。
- registry 版本下降、格式非法或源资源被删除但 registry 未同步处理 → 拒绝提交。
- 使用 `--no-verify` 绕过本地 Hook → CI 运行相同校验并阻止合并。

#### F7：限定 issue 上传

- `.agents/issues/` 有变化 → 创建只包含这些路径的提交并推送专用分支。
- 用户暂存区已有其他改动 → 上传过程不提交、不取消暂存也不改变这些内容。
- 候选提交出现 `.agents/issues/` 外路径 → 立即终止且不推送。
- `.agents/issues/` 无变化、远端不存在、分支已存在或 push 失败 → 返回明确错误，不回退为提交当前分支。

## 异常与边界

- **registry 无法访问或 JSON 非法** → `init/update/release` 失败并保持本地状态；不得使用过期数据伪装成功。
- **资源版本不是 SemVer** → 拒绝读取该条目并指出资源名。
- **用户拒绝 update** → 不写任何资源和 manifest，命令以“已取消”结束。
- **非交互环境执行需要选择的命令** → 缺少显式参数时失败并列出所需参数，不静默采用 rules 默认值；只有 `flow-*` 的默认安装不需要选择。（设计阶段补充）
- **repositoryUrl 无法 clone、资源名不安全或资源含符号链接** → 拒绝读取，删除临时 clone，不写入目标目录。（契约调整）
- **`flow-*` 更新替换失败** → 从同盘备份恢复旧目录，不留下半更新状态。（设计阶段补充）
- **取消选择 rule** → 只删除 manifest 明确管理的同名 rule 文件，不删除用户自行添加的规则。
- **issue 名称不能安全转换为分支 slug** → 拒绝执行并提示合法格式。
- **远端认证失败** → 交由现有 Git credential/SSH 配置处理并原样报告；CLI 不收集凭据。

## 风险与外部待确认

- 版本一致即视为内容一致，依赖维护者严格执行“源变更必须升级版本”的发布纪律；责任人是公共仓库维护者，Hook 与 CI 提供强制门禁。
- `registry.json` 不描述 rule/skill 依赖；跨资源兼容性不由 CLI 判断，发布前的组合测试由维护者负责。
- 公共 URL 内容可变且无 checksum；第一版接受此供应链取舍，后续私有化或完整性校验需单独设计。
- npm 上 `team-cli` 名称是否可用需要发布前确认；若不可用，改用 scope 会改变安装名称但不改变本地二进制名。

## Out of Scope

- Git 私有仓库、OAuth、Token 分发或中央权限服务。
- registry checksum、不可变 commit、依赖范围和自动兼容性解析。
- 自动 npm publish、自动 Git commit/push 公共资源变更。
- 对旧 `agentctl` manifest、lock、命令或构建产物的迁移与兼容。
- `team-cli upload` 自动创建 Pull Request、自动合并或提交 `.agents/issues/` 以外的文件。
