# release 源文件版本同步校验

## 目标
- 类型：缺陷修复
- 复现：修改 rule 或 skill 内容后执行 `pnpm agents release`，registry 版本可升级，但源文件 front matter 版本可能未同步
- 目标：release 写入 registry 前，校验源 rule 的 `version` 或 skill 的 `metadata.version` 等于目标版本
- 根因：release 只根据 registry 当前版本计算新版本，没有读取源文件版本
- 边界：不自动修改源文件，不改变维护者选择的 patch/minor/major，不检查删除资源的源文件

## 历史依据
- 功能文档：`.docs/team-cli/2026-09-11/design.md` 要求源内容变化时对应版本必须变化
- 代码历史：原 `releaseRegistry` 仅更新 `registry.json`，未读取 rule/skill front matter

## 实现
- `src/commands/release.ts` 读取 rule 顶层 `version` 和 skill `metadata.version`
- 目标版本与源文件版本不一致时，在写入 registry 前失败
- `src/commands/__tests__/release.spec.ts` 覆盖 rule 不同步拒绝、rule 成功和 skill 新资源场景

## 验证场景
- 源版本等于 release 目标版本 → 正常生成 registry
- 源版本未升级 → 拒绝并保持原 registry 不变
- 新 rule/skill 源版本为 `1.0.0` → 正常发布

## 影响范围
- 公共源仓库 `pnpm agents release` 发布流程
