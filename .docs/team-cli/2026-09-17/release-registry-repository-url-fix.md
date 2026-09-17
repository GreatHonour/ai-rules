# release 删除 registry.repositoryUrl

## 目标
- 类型：缺陷修复
- 复现：执行 `pnpm agents release` 更新资源后运行 `pnpm agents registry:check` → 报错 `registry.repositoryUrl 必须是非空字符串`
- 目标：release 更新资源条目后保留 registry 顶层 `repositoryUrl`，提交前校验通过
- 根因：`releaseRegistry` 写回 JSON 时只写入 `rules` 和 `skills`，遗漏了已读取的 `repositoryUrl`
- 边界：不改变版本升级、资源删除、描述更新和 Git 暂存行为

## 历史依据
- 功能文档：`.docs/team-cli/2026-09-11/design.md` 要求 registry 顶层保存公共 `repositoryUrl`
- 代码历史：`511db38` 初始实现 `releaseRegistry` 时写回对象遗漏 `repositoryUrl`

## 实现
- `src/commands/release.ts` 写回时保留 `registry.repositoryUrl`
- `src/commands/__tests__/release.spec.ts` 增加 URL 保留回归断言
- `registry.json` 已在 `71389f3` 恢复顶层 `repositoryUrl`

## 验证场景
- release 修改已有资源 → 版本升级且 `repositoryUrl` 不变
- `pnpm agents registry:check` → 通过

## 影响范围
- 公共源仓库 release 命令和 registry 提交门禁
