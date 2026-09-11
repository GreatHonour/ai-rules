# team-cli 代码审查

## 必须修复

### R1: manifest 资源名可穿越同步目录

- 位置：`src/project/manifest.ts:42`、`src/project/resource-sync.ts:42`
- 问题：manifest 的 `rules`/`skills` 键没有校验安全名称；`config` 会把取消的 rule 名直接拼入 `join(stagedAgentsPath, 'rules', `${ruleName}.md`)`。恶意名称如 `../../victim` 会规范化到临时 `.agents` 目录外并删除工作区文件。
- 原因：manifest 属于外部输入，设计要求外部 JSON 先做结构校验，资源路径不得穿越；当前只校验条目值，没有校验映射键。
- 建议：统一定义资源名校验器，并在 registry、manifest 和同步入口校验仅允许安全名称；新增路径穿越回归测试，确认工作区外目标不受影响。
- 状态：已修复（registry、manifest 与同步入口均校验安全资源名，并新增穿越回归测试）

### R2: pre-commit 校验会先写入构建产物

- 位置：`package.json:13`、`.githooks/pre-commit:2`
- 问题：Hook 调用 `pnpm agents registry:check`，而 `agents` 脚本先执行 `pnpm run build`，因此提交门禁不是只读操作，会在每次提交前重写 `dist/`。
- 原因：T8 明确要求 pre-commit 只调用校验器；构建写入与门禁职责无关，也可能因构建环境失败而阻断本可执行的版本校验。
- 建议：让公共仓库的 `agents` 脚本直接运行 TypeScript 源入口（例如项目已有的 TS 运行器），或提供不写文件的专用校验入口；保留 npm `bin` 指向构建后的 `dist/cli.js`。
- 状态：已修复（`pnpm agents` 改用 tsx 直接运行源码，验证前后 dist 哈希不变）

### R3: AGENTS.md 缺少受管标记时未提示用户

- 位置：`src/project/agents-document.ts:34`、`src/commands/init.ts:86`
- 问题：已有 `AGENTS.md` 但缺少受管标记时，初始化/config 会直接追加区块，没有先展示即将追加的提示。
- 原因：设计契约明确要求“文件存在但标记缺失时，先展示将追加区块的提示”。当前领域函数和命令层都没有返回或输出该状态。
- 建议：在写入前检测文档状态，将“将追加受管区块”作为命令输出或回调事件，并补命令级测试。
- 状态：已修复（已有文件缺少标记时在原子写入前输出追加提示）

### R4: release 未校验公共源目录契约

- 位置：`src/commands/release.ts:73`
- 问题：只要根目录存在合法 `registry.json`，当没有检测到资源变化时就直接成功返回；即使 `.agents/rules/` 与 `.agents/skills/` 均不存在，也不会拒绝执行。
- 原因：T7 要求非公共源仓库因缺少 registry 或源目录契约而拒绝运行。当前仅验证 registry，且在读取 remote 前提前返回。
- 建议：release 开始时显式校验 Git 工作树、origin 和公共源目录结构，再执行变化检测；补缺少目录的失败测试。
- 状态：已修复（release 启动时校验 Git、origin、rules 与 skills 目录）

## 建议修复

### R5: UTC 时间校验接受非规范格式

- 位置：`src/validation.ts:55`
- 问题：校验仅要求 `Date.parse` 成功且以 `Z` 结尾，例如 `2026-09-11Z` 会被接受并解释为零点，但 registry 契约示例和写入均使用带毫秒的规范 UTC ISO 字符串。
- 原因：宽松解析会让同一时间出现多种持久化形式，降低错误字段提示和跨工具一致性。
- 建议：要求 `new Date(parsedTime).toISOString() === dateText`，并补非规范格式测试。
- 状态：已修复（改为严格 UTC `yyyy-MM-dd HH:mm:ss` 并覆盖非法日期与毫秒格式）

### R6: 同一仓库的每个资源都会重复 clone

- 位置：`src/registry/resource-downloader.ts:135`
- 问题：默认初始化多个 `flow-*` skills 和 rules 时，每个条目都会对同一公开仓库执行一次浅克隆，当前 registry 会产生十余次重复网络与 Git 开销。
- 原因：资源 URL 的仓库部分相同，批次下载可按仓库 URL 分组并复用一次临时 clone；现实现的延迟和失败面随资源数量线性增加。
- 建议：按 repository URL 分组 clone，再分别校验与复制 path；保留任一失败清理整个批次的事务语义。
- 状态：已修复（批次按 repositoryUrl 分组，每个仓库只浅克隆一次）
