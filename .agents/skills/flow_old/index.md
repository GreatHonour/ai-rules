# 工作流 Skill 系统

## 上下文获取策略（所有 Skill 通用）

### 预期来源优先级

1. **功能文档**（预期的唯一权威来源）：
   - `.docs/[文件名]/log.md` — 功能演进史和关键决策
   - 相关 `design.md` — 当前迭代设计
   - 历史 `*-fix.md` — 已知问题和修复记录
   - `task.md` — 任务边界和验收标准

2. **代码与测试**（仅无功能文档时作为预期来源）：
   - 代码实现和测试用例
   - 在产物中标注"无功能文档"

### Git 使用边界

**允许使用：**
- `git diff <base>` — 确定本次改动范围（review/archive）
- `git log -- <file>` — 定位可疑提交窗口，缩小根因排查范围（bugfix）
- `git show <commit>` — 查看具体改动内容（根因分析）
- `git blame <file>` — 追查代码来源（必要时）
- `git status` — 检查工作区状态

**禁止使用：**
- ❌ 不用 git 历史重建业务预期或功能边界
- ❌ 不做全仓库 git 遍历或无目标的历史翻查

### 冲突处理

文档、代码、测试、用户描述出现冲突时：
1. 先列出冲突点和各来源的内容
2. 请求用户确认正确预期
3. 不擅自选择其中一个作为依据

## 流程总览

### 新功能开发

```
brainstorm → plans → implement（含 review）→ e2e → archive（清理过程文件 → git 提交）
```

brainstorm 的阻塞约束、方案与边界确认，plans 完成后的 `/grill-with-docs` 或 `implement` 路由选择，以及 review 的修复范围确认属于用户决策点。其余阶段完成后直接调用下游 skill；用户明确要求只执行当前阶段时例外。

### Bug 修复（独立入口）

```
bugfix（确认缺陷或小型变更 → 输出 fix.md → 用户确认 → 最小修改 → 影响范围验证）
  ├─ 用户选择 E2E → e2e → archive
  └─ 用户选择直接归档 → archive
```

Bugfix 根据改动范围和现有验证给出下游建议，由用户选择 E2E 或直接归档；用户已提前指定时不重复询问。Git 提交统一由 Archive 执行。

## 触发方式

| 用户意图 | 触发 Skill |
|----------|-----------|
| "我想做一个新功能 / 我有个想法" | brainstorm |
| "我发现 bug / 这个功能坏了 / 新增一个已明确的小逻辑" | bugfix |
| "帮我拆任务 / 出设计文档"（已有明确需求） | plans |
| "继续实现 / 开始写代码" | implement |

## Skill 说明

| Skill | 职责 | 产物 |
|-------|------|------|
| brainstorm | 先收敛业务闭环与阻塞约束，再比较真实方案并确认交互边界 | 决策摘要 |
| plans | 将决策摘要转换为通用技术设计和按功能边界拆分的任务 | `design.md` + `task.md` |
| implement | 按 task.md 逐一 TDD 实现 | 代码 + 测试 |
| review | 审查代码质量，输出分级问题清单 | `review.md`（过程文件） |
| e2e | 端到端验证集成场景 | `e2e-report.md`（过程文件） |
| archive | 提炼迭代事实和经验候选，清理过程文件并提交本次改动 | 更新 `log.md` 和可选的 `.docs/retro.md`；删除 `review.md`；完成 Git 提交 |
| bugfix | 修复缺陷或实现明确的小型变更，验证后由用户选择下游 | `[问题简述]-fix.md` + 代码 + 测试或适用检查 |

## 产物目录结构

```
.docs/
  [文件名]/
    log.md                      ← 功能演进史（能力/关键逻辑/结构决策/遗留）
    [YYYY-MM-DD]/               ← 按日期分组
      design.md                 ← 设计文档（长期保留；允许在本迭代内同步实现级修正）
      task.md                   ← 任务列表（长期保留；允许在本迭代内同步实现级修正）
      review.md                 ← 审查过程文件（archive 阶段直接删除）
      e2e-report.md             ← E2E 过程文件（archive 保留）
      [问题简述]-fix.md         ← bug 修复记录（长期保留：根因/复现/方案，log.md 链回）
  retro.md                      ← 代码、流程和工具经验候选，由用户自行处理
```

## 断点续跑

每个 skill 的产物落盘后即可中断。恢复时读取最近的产物文件，判断当前阶段继续执行：

- `*-fix.md` 已存在但计划内容尚未实现或验证 → 从 bugfix 继续
- `*-fix.md` 已完成验证且用户已选择 E2E，但无 `e2e-report.md` → 从 e2e 继续
- `*-fix.md` 已完成验证且用户选择直接归档，或 E2E 已通过但 `log.md` 无本次记录 → 从 archive 继续
- `design.md` 存在但无 `task.md` → 从 plans Phase 2 继续
- 普通功能任务中有 `[ ]` → 从 implement 继续
- 普通功能任务全部 `[x]` 但无 `review.md` → 直接调用 `review/SKILL.md`
- `review.md` 存在且集成验证任务中有 `[ ]` → 从 e2e 继续
- 无集成验证任务或集成验证任务全部 `[x]`，但 `log.md` 无本次记录 → 从 archive 继续
- `log.md` 已有本次记录，但 `review.md` 尚未清理或本次改动尚未提交 → 从 archive 继续
