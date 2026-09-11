# team-cli 任务列表

## 工程与契约

#### [x] T1: 建立独立的 team-cli 工程骨架
depends: 无

- 将 npm 包名、bin 和命令入口统一为 `team-cli`，并提供公共仓库脚本 `pnpm agents <command>`。
- 建立 TypeScript 严格模式源码、构建、Vitest 和 pnpm 脚本 → 构建产物只来自新 `src/`。
- 清除旧 `agentctl` 包名、命令和产物引用 → 新 CLI 不提供兼容入口。
- 所有导出函数使用中文 JSDoc，变量遵循普通注释和语义化命名规范。

#### [x] T2: 定义并校验 registry 与 manifest 契约
depends: T1

- 实现仅含 `version`、`desc`、`updatedAt` 的 rule/skill registry 条目校验，并由 registry 顶层 `repositoryUrl` 定位公共源。
- 实现 `.agents/manifest.json` 的项目画像、registry 地址、已选 rules、受管 skills、逐项版本和更新时间契约。
- 非法 JSON、非法 SemVer、非法时间或缺失字段 → 返回包含具体字段路径的错误。
- 提供原子 JSON 写入能力 → 写入失败不破坏已有文件。

## 初始化与同步

#### [x] T3: 实现公开资源下载和安全落盘
depends: T2

- 使用 registry 顶层 `repositoryUrl` 浅克隆公共源，rule/skill 路径按安全资源名推导；同一仓库批次只 clone 一次。
- 危险资源名或资源通过符号链接逃逸 → 拒绝读取并删除临时目录。
- 临时 clone 的 `.git` 元数据只存在于临时目录 → 目标项目不创建、复制或修改 `.git`。
- 批量资源读取中任一 clone 或文件校验失败 → 不进入正式替换阶段。
- 临时文件与目标文件位于同一文件系统 → 通过原子替换或可恢复交换保证失败后仍可使用旧版本。

#### [x] T4: 实现项目初始化和配置选择
depends: T3

- `team-cli init` 采集项目名称、框架、架构和运行环境，默认选择全部 `flow-*` skills，并让用户选择 rules。
- 目标不存在 `.agents/` → 创建 `rules/`、`skills/`、`issues/` 和 `manifest.json`，但不创建或修改 `.git`。
- 已存在 `.agents/skills/` → 增量合并；本地独有的非 `flow-*` skill 保持不变。
- 初始化完成 → manifest 记录实际安装资源及逐项版本。
- 非交互环境缺少必需选择参数 → 明确失败，不静默选择 rules。

#### [x] T5: 生成并维护 AGENTS.md 规则引用
depends: T4

- 初始化已选 rules → 创建或更新 `team-cli:rules` 受管区块，引用路径与真实文件一致。
- `AGENTS.md` 已含用户内容 → 标记外内容逐字保留。
- `team-cli config` 新增或取消 rule → 同步资源、manifest 与引用，且只删除 CLI 明确管理的 rule。
- 更新 rule 版本但选择未变 → 保持引用集合稳定并更新所指文件。

#### [x] T6: 实现逐项版本检查与增量更新
depends: T3, T5

- `team-cli update` 对 manifest 中每个已选 rule 和 skill 比较远端版本并展示差异与 `updatedAt`。
- 远端版本较新且用户确认 → 更新对应资源和 manifest；版本相同 → 不写入。
- 本地版本较新 → 报告回退异常且不降级。
- 更新 `flow-*` skill → 完整替换同名目录；更新非 `flow-*` 同名 skill → 保留本地版本并报告跳过。
- 任一更新失败 → manifest 不前移，已安装资源恢复至更新前状态。

## 发布与 Git 门禁

#### [x] T7: 实现 registry release 命令
depends: T2

- `pnpm agents release` 相对 `HEAD` 检测 `.agents/rules/` 和 `.agents/skills/` 的工作树变化，并将 skill 目录内变化归并为单个资源。
- 每个变更资源由维护者选择 patch/minor/major → CLI 更新对应版本和 UTC `updatedAt`。
- 新资源 → 固定生成 `1.0.0`；无资源变化 → 不修改 registry。
- 完成后只输出摘要 → 不执行 `git add`、`git commit` 或 `git push`。
- 非公共源仓库环境执行 → 因缺少 registry 或源目录契约而拒绝运行。

#### [x] T8: 建立本地 Hook 与 CI 版本校验
depends: T7

- `team-cli registry:check` 比较暂存区与 `HEAD` → 变化资源的 registry 版本和 `updatedAt` 未同步时返回非零退出码。
- 新资源不是 `1.0.0`、版本下降、版本格式非法或删除未同步 → 拒绝提交并提示 `pnpm agents release`。
- pre-commit 只调用校验器，不自动修改或暂存文件。
- CI 基于合并目标分支运行同一校验 → `--no-verify` 无法绕过合并门禁。

#### [x] T9: 实现仅上传 issues 的隔离 Git 提交
depends: T1

- `team-cli upload <issue-name>` 从当前 `HEAD` 创建 `codex/issue-<slug>` 提交并推送至当前项目既有 remote。
- 使用临时 Git index 只纳入 `.agents/issues/` 的新增、修改和删除 → 用户当前 index 与工作树保持不变。
- 提交前再次验证所有变化路径 → 出现 `.agents/issues/` 外路径立即拒绝推送。
- issue 无变化、分支冲突、remote 缺失、认证失败或 push 失败 → 返回明确错误且不改为提交当前分支。

## 验证与文档

#### [x] T10: 完成自动化验证与使用文档
depends: T4, T5, T6, T8, T9

- 单元测试覆盖 registry/manifest 校验、SemVer 比较、`AGENTS.md` 区块更新、资源合并策略和变化归并。
- 临时 Git 仓库集成测试覆盖：已有 `.git` 不变、已有 skill 保留、`flow-*` 覆盖、Hook 拒绝漏升版本、隔离 index 和专用分支只含 issues。
- 网络与文件失败测试覆盖 clone 失败、非法 Git path、符号链接逃逸和原子回滚。
- `pnpm check`、`pnpm test`、`pnpm build` 全部通过。
- 更新根 `README.md`，说明 init/config/update/release/registry:check/upload 命令、维护者发布步骤、目录职责和安全边界。
