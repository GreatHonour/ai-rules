---
name: flow-archive
description: "在功能实现或 flow-bugfix 完成且通过验证后归档本次迭代。前置条件：所有任务已完成、flow-review 已通过或按流程豁免、必要的 flow-e2e 已完成。更新功能日志到 log.md、清理已有过程文件（review.md）、将有证据的经验候选记录到 retro.md、执行 Git 提交"
metadata:
  author: icc-grow
  version: "2.1.0"
---

## 归档规则

1. 只记录已经实现或验证的事实，不补写未完成的想法。
2. 同一日期目录内，可将 review、E2E、bugfix 或 核心方案变更 的实现修正同步回 `design.md` 和 `task.md`；历史日期目录不得改写。
3. 更新功能根目录的 `log.md`；删除已经存在的 `review.md`。
4. 真机或外部验证项不写入 `task.md`，但必须在归档摘要中说明是否阻塞发布。
5. bugfix 选择直接归档 或 archive 期间不得为了满足路径结构补建 `review.md`。


## 变更记录 
- 模板路径[log-template.md](./assets/log-template.md)
- 唯一允许路径：`.docs/[文件名]/log.md`（功能目录根部）。禁止在 `.docs/[文件名]/[YYYY-MM-DD]/` 创建或更新 `log.md`。
- 日期目录只存放本次迭代产物。按日期倒序追加；同一个日期内，最新内容插入旧内容之前。
- 只记录功能变化、关键边界、结构决策和遗留事项，不写阶段流水账，也不复述其他产物。
- 没有内容的字段省略。纯重构、命名、注释和阶段完成信息不写入 `log.md`。


## 经验记录 
- 模板路径[retro-template.md](./assets/retro-template.md)
- 读取 `.docs/retro.md`，仅在本次迭代按日期倒序追加，同一个日期内，最新内容插入旧内容之前；没有实施证据时不写占位内容。
- 代码、流程和工具经验全部只写入 `.docs/retro.md`。


## git 提交

归档摘要输出后执行 git 提交。

**检查变更归属**：用 `git status` 检查变更归属，只提交本次任务相关文件。
**成对提交**：测试与对应实现必须成对纳入，不提交用户或其他迭代的修改。
**提交内容**： `git diff` 内容，一个 commit 只做一件事，不同模块/功能分开提交

归档和提交完成后，工作流结束。
