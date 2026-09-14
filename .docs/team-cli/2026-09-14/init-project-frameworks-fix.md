# 调整 init 项目框架信息

## 目标
- 类型：小型变更
- 目标：执行 `team-cli init` 时，项目名称仍为必填；不再填写架构；分别填写前端框架和后端框架，且两项均可留空。
- 边界：运行环境、rules 选择、资源下载与同步行为不变；`config` 仅同步项目画像契约和命令参数，不扩展为局部画像编辑。

## 历史依据
- 功能文档：`.docs/team-cli/2026-09-11/design.md` 与 `task.md` 当前约定 `frameworks`、`architecture`；本次按用户确认的新项目画像替换该约定。
- 代码历史：`511db38` 首次实现项目画像；`33ae40a` 只调整 rules 交互，没有改变画像字段。现有画像字段仅持久化到 manifest，不参与规则或技能选择。

## 实现
- CLI 画像选项由 `--frameworks`、`--architecture` 改为 `--frontend-frameworks`、`--backend-frameworks` → 交互文案分别显示“前端框架”和“后端框架”，缺失或留空均写入空数组。
- `ProjectProfile` 由 `frameworks`、`architecture` 改为 `frontendFrameworks`、`backendFrameworks` → 新初始化项目不再保存架构。
- manifest 写入版本升级为 schema v2；读取 schema v1 时把旧 `frameworks` 迁移为 `frontendFrameworks`，把 `backendFrameworks` 设为空数组并丢弃旧 `architecture` → 已初始化项目仍可执行 `config/update`，下次写入时自动升级。
- 同步更新 CLI 使用文档与原设计中的当前契约说明；保留工作区已有文档改动。

## 验证场景
- 交互初始化时前端框架和后端框架都留空 → 初始化成功，manifest 两个数组均为空且没有 `architecture`。
- 非交互初始化只提供项目名称、运行环境和 rules → 不要求框架参数，初始化成功。
- 分别传入 `--frontend-frameworks`、`--backend-frameworks` → manifest 按类别保存框架。
- 读取旧 schema v1 manifest → 成功迁移旧前端框架、忽略架构，并可继续执行更新。
- 新 schema v2 缺少任一框架数组或含旧画像键 → 返回具体字段路径错误。
- 执行相关 Vitest、`pnpm check`、`pnpm build` → 全部通过。

## 影响范围
- `src/cli.ts`：初始化/config 的画像参数和交互采集。
- `src/types.ts`、`src/project/manifest.ts`：项目画像与 manifest 版本迁移。
- init、config、update、manifest 相关测试夹具与 CLI 行为测试。
- `README.md`、`.docs/team-cli/2026-09-11/design.md`、`.docs/team-cli/2026-09-11/task.md`：当前命令和契约说明。

## 验证结果
- `pnpm test`：17 个测试文件、57 项测试全部通过。
- `pnpm check`：通过。
- `pnpm build`：通过。
- `pnpm agents init --help`、`pnpm agents config --help`：只显示分类后的可选框架参数，不再显示旧框架和架构参数。
