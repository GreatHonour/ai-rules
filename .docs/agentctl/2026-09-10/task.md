# agentctl 任务列表

## 核心模型与注册表

#### [x] T1: 建立 manifest、lock 和状态文件模型
depends: 无

- [manifest 缺失或字段非法] → 输出可定位的校验错误，不生成部分文件。
- [manifest、lock 和 state 读取] → 统一得到注册表、依赖、commit、hash、目标目录和托管状态。
- [未知字段或路径穿越] → 拒绝解析。
- [`init --adopt`] → 为已有 `.agents` 目录记录基线 state，不改写现有文件。

#### [x] T2: 实现 Git 注册表适配器和本地缓存
depends: T1

- [给定 Git URL、ref 或 commit] → 拉取或复用本地 checkout，并返回可校验的注册表树。
- [远端不可达或凭据失败] → 保留已有项目状态并返回 Git 错误上下文。
- [注册表包含脚本或钩子] → 仅读取文件，不执行。

#### [x] T3: 实现 rule/skill 包结构与内容校验
depends: T2

- [包元数据、入口和文件清单完整] → 通过类型、名称、版本和路径安全校验。
- [skill 缺少 `SKILL.md`、rule 入口不是 Markdown 或路径逃逸] → 拒绝包。
- [包内容可读取] → 生成稳定的相对路径和文件字节 hash。

## 依赖解析与物料化

#### [x] T4: 实现 SemVer 解析和 lock 更新
depends: T1, T3

- [manifest 中存在合法版本范围] → 选择满足约束的包版本，并写入 commit、hash 和来源。
- [无法满足版本范围] → 保持原 lock 不变并指出冲突依赖。
- [manifest 与 lock 不一致] → 标记为需要显式更新，不静默改写。

#### [x] T5: 实现托管目录状态检测和冲突保护
depends: T1

- [`.agents/rules` 或 `.agents/skills` 与 state hash 一致] → 允许同步覆盖生成。
- [检测到人工修改] → 默认停止并输出文件级 diff。
- [`--force` 明确提供] → 覆盖托管目录并更新 state hash。
- [已有 `.agents` 且不存在 state] → 默认拒绝接管；`init --adopt` 后才允许进入托管流程。

#### [x] T6: 实现 overlay 合并和有效目录生成
depends: T3, T4, T5

- [managed、team overlay、local overlay 存在同路径文件] → 按 local、team、managed 优先级生成有效目录。
- [overlay 覆盖必需入口、包含路径逃逸或多个包写入同一目标] → 拒绝生成并报告冲突。
- [生成成功] → 先在临时目录完成 `.agents/rules`、`.agents/skills` 生成，再原子替换运行时目录，最后更新 state，保留 overlay 源文件。
- [任一步骤失败] → 删除临时目录，保留旧 `.agents`、lock 和 state。

## CLI 命令

#### [x] T7: 实现 `init`、`add`、`sync`
depends: T4, T5, T6

- [`init`] → 创建配置骨架且不覆盖已有配置；检测到已有 `.agents` 时提示 adopt。
- [`init --adopt`] → 记录现有托管目录基线且不覆盖文件。
- [`add`] → 原子写入依赖版本范围和对应 lock，不提前改动托管运行时目录。
- [`sync`] → 按 lock 校验、冲突保护和 overlay 规则生成有效 `.agents` 目录。

#### [x] T8: 实现 `check`、`diff`、`doctor`
depends: T5, T6

- [`check`] → 只读报告 manifest、lock、hash、overlay 和注册表一致性。
- [`diff`] → 展示解析版本、包内容、托管目录和 overlay 来源差异。
- [`doctor`] → 检查 Git、凭据、Node 运行时、路径权限和缓存状态。

#### [x] T9: 实现 `upgrade` 和显式覆盖选项
depends: T7, T8

- [`upgrade`] → 在 SemVer 范围内解析新版本，清洁时更新 lock 并同步。
- [托管目录有人工修改] → 停止升级并要求先处理 diff。
- [`--force`] → 仅在用户明确传入时覆盖托管内容，并记录新的 state hash。

#### [x] T10: 实现 `publish` 的包校验和 Git 变更生成
depends: T2, T3

- [`publish`] → 校验包结构、版本、索引和路径安全，生成可审查的注册表变更。
- [校验失败] → 不修改注册表文件。
- [校验通过] → 默认只生成工作区变更；`--commit` 显式创建提交，`--push` 仅在显式要求时推送，CLI 不调用托管平台 API。

## 文档与质量

#### [x] T11: 编写 manifest、lock、overlay 和注册表格式文档
depends: T7, T8, T10

- [新用户阅读文档] → 能完成初始化、添加依赖、同步、升级、发布和冲突恢复。
- [文档示例] → 与实际命令和目录契约一致。

#### [x] T12: 完成跨平台验证和安全回归
depends: T9, T10, T11

- [Windows、macOS、Linux 路径] → manifest、lock 和 hash 结果保持一致。
- [路径穿越、符号链接、恶意脚本、hash 漂移和 overlay 冲突用例] → 全部被拒绝或按设计处理。
- [完整初始化到同步流程] → 生成的 `.agents/rules` 和 `.agents/skills` 可被现有 Agent 读取。
