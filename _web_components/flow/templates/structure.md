# 产物目录结构模板

## 目录规范

```
.docs/
  [文件名]/
    log.md                          ← 功能演进史（能力/关键逻辑/结构决策/遗留/review 净结论）
    [YYYY-MM-DD]/                   ← 按日期分组，所有产物放在同一目录
      design.md                     ← 设计文档（plans Phase 1；允许本迭代内同步实现级修正）
      task.md                       ← 任务拆分（plans Phase 2；允许本迭代内同步实现级修正）
      review.md                     ← 审查过程草稿（archive 阶段删除，净结论合并入 log.md）
      e2e-report.md                 ← E2E 验证报告（长期保留）
      [问题简述]-fix.md             ← bug 修复记录（长期保留：根因/复现/方案，log.md 链回）
  retro.md                          ← 全局流程回顾（跨需求）
```

## 命名规则

- 需求名：小写英文，单词用 `-` 连接，如 `search-input`、`hotspot-editor`
- 日期目录：`YYYY-MM-DD`，取当天日期
- bug 修复文件：`[问题简述]-fix.md`，同一目录下可有多个
- 同一天多次迭代：极少情况追加序号 `YYYY-MM-DD-2`


## 文件格式参考

- design.md → 参考 `plans/SKILL.md` Phase 1 输出模板
- task.md → 参考 `plans/SKILL.md` Phase 2 输出格式
- review.md → 参考 `review/SKILL.md` 产物格式
- e2e-report.md → 参考 `e2e/SKILL.md` 报告格式
- [问题简述]-fix.md → 参考 `bugfix/SKILL.md` Phase 2 输出模板
