# 文档布局

交付文档统一放在协调仓库的：

```text
.docs/<feature-slug>/<YYYY-MM-DD>/
```

同一交付目录包括：

- `delivery.json`：机器可读的交付登记与仓库/分支映射；
- `delivery.md`：交付登记的人类摘要；
- `decision.md`：`flow-brainstorm` 输出的已确认决策摘要；
- `design.md`：技术设计；
- `task.md`：实现任务及状态；
- `acceptance.json`：轻量验收对象及状态；
- `evidence/`：测试、部署和验收产生的脱敏证据；
- `deploy-report.md`：部署事实摘要（发生部署时）；
- `archive.md`：最终收口摘要；
- `<issue-slug>-fix.md`：bugfix 独立修复记录。

`review.md` 是过程文件；归档后可删除。设计、任务、决策、验收清单和部署事实应长期保留。
