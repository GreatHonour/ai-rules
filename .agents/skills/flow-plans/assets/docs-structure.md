# 目录结构模板

## 目录规范

> **路径硬约束**：功能日志 `log.md` 只能位于 `.docs/[文件名]/log.md`。

.docs/
├── [文件名]
└── [文件名]/
    │   ├──log.md 
    │   │
    │   └──[YYYY-MM-DD]/
    │             ├──design.md
    │             ├──task.md
    │             ├──review.md
    │             ├──e2e-report.md
    │             └──[问题简述]-fix.md
    └── retro.md

```
  log.md                          ← 功能演进史（固定在功能目录根部）
  [YYYY-MM-DD]/                   ← 按日期分组，本次迭代产物放在同一目录
    design.md                     ← 设计文档（plans Phase 1；允许本迭代内同步实现级修正）
    task.md                       ← 任务拆分（plans Phase 2；允许本迭代内同步实现级修正）
    review.md                     ← 仅由 review 阶段创建的审查过程草稿（archive 仅清理已有文件）
    e2e-report.md                 ← E2E 验证报告（archive 保留）
    [问题简述]-fix.md              ← bug 修复记录（长期保留：根因/复现/方案，log.md 链回）
retro.md                          ← 代码、流程和工具经验候选，由用户自行处理
```


## 命名规则

- 文件名：`kebab-case`
- 日期目录：`YYYY-MM-DD`，取当天日期
- bug 修复文件：`[问题简述]-fix.md`，同一目录下可有多个
