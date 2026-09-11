# 规则交互选择与 AGENTS.md 索引修复

## 目标
- 类型：缺陷修复 / 小型变更
- 复现：执行 `team-cli init` 或 `team-cli config`，不传 `--rules` → 当前通过逗号分隔文本输入规则名称，用户不能从 registry 提供的规则清单中直接勾选。
- 目标：在交互终端中展示 registry 的规则说明并支持多选；用户确认后将所选规则用于初始化或配置。
- 复现：目标项目已有 `AGENTS.md`，包含“规范文件索引” → 当前追加独立的 `team-cli:rules` 区块，且行格式为“名称 → 链接”。
- 目标：优先在“规范文件索引”标题下维护规则索引，行格式为“说明 → [名称](地址)”。规则说明使用 registry 条目的 `desc`，名称使用 rule 名称，地址使用实际规则文件路径。
- 根因：CLI 使用 `readline` 将规则选择建模为自由文本；文档更新器只认识自身标记区块，没有“规范文件索引”定位和目标行格式。
- 边界：继续支持显式 `--rules <names...>` / `--no-rules`，便于脚本和非交互环境调用；不改变 registry、manifest、资源下载和规则文件同步契约；不覆盖索引标题之外的用户内容。

## 历史依据
- 功能文档：`.docs/team-cli/2026-09-11/design.md`、`.docs/team-cli/2026-09-11/task.md`；现有文档要求 init/config 交互选择 rules，但未定义“规范文件索引”标题下的行格式。
- 代码历史：`511db38 feat(team-cli): 新增规则技能管理 CLI` 引入了当前自由文本规则输入和 `team-cli:rules` 区块；本次修复针对该实现与新增用户约定，不涉及其他历史行为。

## 实现
- [x] → 使用 Node.js readline 实现规则 checkbox 交互，选项显示为 `rule(desc)`，序号可切换选中/取消；终端不可交互且未提供显式参数时继续明确失败。
- [x] → 将 init/config 的规则选择改为：显式参数优先，否则交互多选；config 使用本地 manifest 的已选 rules 默认回显。
- [x] → 扩展 `AGENTS.md` 更新逻辑：存在“规范文件索引”标题时在其下维护规则行，说明在左、名称链接在右；继续支持现有 `team-cli:rules` 标记区块。
- [x] → 规则文档写入链路传递 manifest 中的 rule `desc`，确保索引内容与当前 registry 一致。

## 验证场景
- [x] 交互 init/config → 规则选择器展示 `rule(desc)`，提交选择结果后进入现有 manifest 同步流程。
- [x] 交互时取消所有选择 → 选择器返回空数组，配置流程生成空 rules。
- [x] 非交互环境未传 `--rules` → 明确报告缺少必需参数。
- [x] 已有 `AGENTS.md` 且包含“规范文件索引” → 仅更新该标题下受管规则行，保留其他内容，并生成 `说明 → [名称](地址)`。
- [x] 已有旧 `team-cli:rules` 标记区块 → 继续只替换标记区块内容，不破坏区块外内容。
- [x] 无“规范文件索引”标题且无受管标记 → 保持现有追加策略并给出提示。

## 影响范围
- `src/cli.ts`：规则选择交互与命令层依赖注入。
- `src/project/agents-document.ts`：规则索引定位、格式化和写入。
- `src/commands/init.ts`、`src/commands/config.ts`：向文档写入链路传递规则说明。
- `src/commands/__tests__/`、`src/project/__tests__/`：新增交互和文档更新回归测试。
- `package.json`、`pnpm-lock.yaml`：新增 CLI 交互依赖。
