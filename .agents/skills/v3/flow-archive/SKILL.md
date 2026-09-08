---
name: flow-v3-archive
description: 按目标阶段归档日志、经验、清理过程文件并提交相关变更。
---

# 归档

读取 `delivery.json`、`state-model.md`、`document-layout.md`、`task.md`、`acceptance.json`、`evidence/` 和部署报告。

## 归档前置检查

- `implemented`：所有必需普通任务为 `[x]`，每项有实现和检查事实；
- `verified`：`acceptance.json` 中所有必需用例为 `passed`，每项有环境、源码版本、时间和证据；
- `released`：已达到 `verified`，且每个必需仓库都有目标生产环境的成功部署事实、时间和可复核锚点。

不满足目标时停止归档并报告缺口；不得为了收口降低 `targetStage`，也不得把 review 通过、代码合并或预览地址当作发布证明。

## 归档产物与清理

1. 在 `.docs/<feature-slug>/log.md` 追加已证实的功能变化、关键边界、结构决策和遗留事项。
2. 在 `.docs/retro.md` 追加有证据的代码、流程或工具经验。
3. 读取 `_shared/assets/archive-template.md`，生成同一日期目录的 `archive.md`，记录目标阶段、实际阶段、范围、通过/失败/阻塞用例、部署状态、证据路径和限制。
4. 删除本次过程性的 `review.md`；保留 `decision.md`、`design.md`、`task.md`、`delivery.json`、`acceptance.json`、部署报告和证据。
5. 检查多仓库变更归属，只提交本次交付相关文件；提交信息遵循项目 Git 规范。
