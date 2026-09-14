# Windows 下 `.agents` 重命名 EPERM

## 目标
- 类型：缺陷修复
- 复现：在 Windows 项目中执行 `team-cli init`，选择 rules 并完成下载；当其他进程持续读取 `.agents` 时，CLI 执行 `.agents -> .team-cli-agents-backup-*` 的目录重命名，实际返回 `EPERM: operation not permitted, rename`。
- 目标：`.agents` 根目录被读取但其中受管文件可正常写入时，`team-cli init` 仍完成 rules、flow skills、manifest 与 `AGENTS.md` 的同步。
- 根因：`syncResources` 为获得目录级交换和回滚能力，无条件重命名已有 `.agents`。Windows 不允许重命名被进程占用的目录；该限制与资源下载、目标文件写权限无关。
- 边界：继续保留本地非 `flow-*` skill、未受管文件和 `.agents/issues/`；在项目根目录创建以 UTC 时间戳结尾的完整 `.agents` 副本后，再原地写入受管资源；失败时保留副本并列出失败项，由用户手动更新或恢复；不修改 `.git`，不把权限不足静默当成成功。

## 历史依据
- 功能文档：`.docs/team-cli/2026-09-11/design.md` 与 `README.md` 要求增量合并已有 `.agents/skills/`、保留本地非 flow skill，并在落盘失败时回滚资源目录与 manifest。
- 代码历史：提交 `511db38 feat(team-cli): 新增规则技能管理 CLI` 首次引入 `src/project/resource-sync.ts` 的整目录交换；后续提交仅格式化，未改变该行为。

## 实现
- `src/project/resource-sync.ts`：在项目根目录创建 `.team-cli-agents-backup-<UTC 时间戳>`，随后只替换本次新增、更新或删除的 rule、flow skill 和 manifest，不再重命名 `.agents` 根目录。
- `src/project/resource-sync.ts`：资源写入失败时继续收集其他失败项；不写入 manifest 与 `AGENTS.md`，并通过错误信息提供失败资源和备份路径供用户手动处理。
- `src/project/__tests__/resource-sync.spec.ts`：验证成功同步后完整备份仍存在，并验证 `AGENTS.md` 更新失败时保留新资源与旧副本。

## 验证场景
- Windows 上保持 `.agents` 目录句柄打开后执行同步 → flow skill、rule 和 manifest 更新成功，不出现根目录 `rename EPERM`。
- 替换 flow skill → 旧目录中的过期文件被删除，新文件完整写入。
- 提交部分资源后模拟失败 → CLI 列出失败资源，保留新状态和备份目录供用户手动处理，manifest 不写入。
- 同步成功或失败 → 本地非 flow skill、未受管文件和 `.agents/issues/` 内容保持不变。
- 目标项目原本不存在 `.agents` → 创建所需目录和资源；失败时不遗留本次生成的内容。
- 执行 `pnpm vitest run src/project/__tests__/resource-sync.spec.ts`、`pnpm test`、`pnpm check` → 全部通过。

## 影响范围
- `team-cli init`、`team-cli config`、`team-cli update` 共用的项目资源同步与失败回滚逻辑。
