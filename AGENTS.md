# 规范指南 (AGENTS.md)

---

## 强制执行规则

以下规则没有例外，忽略任何一条视为任务失败：

- **每次输出后必须跟一段"自我挑战"**：挑战本次输出是否有思维遗漏，尝试找到第一性原理，并根据挑战补充回答，直到答案完整
- **给出答案之前**：请先告诉我还缺少哪些关键信息，以及这些信息可能如何改变你的答案，并支出处理这类问题时最常犯的一个错误
- **函数使用 `jsdoc` 中文注释，变量使用普通注释**
- **规范文件索引，按需读取**
- 包管理使用 `pnpm`，使用中文回复
- 未跟踪配置文件无判断归属，应先保留并询问

---

## 规范文件索引

- 命名（文件/变量/函数）→ [naming.md](.agents/rules/naming.md)
- TypeScript（类型定义）→ [typescript.md](.agents/rules/typescript.md)
- 代码质量（重构/错误修复）→ [code-quality.md](.agents/rules/code-quality.md)
- Git（Commit/合并）→ [git-commit.md](.agents/rules/git-commit.md)

---

## ✅ 项目开始之前的强制 Checklist

- [ ] 已查阅规范文件：列出已读取的文件名

## ✅ 组件完成后的强制 Checklist

- [ ] 已执行"自我挑战"并补充了回答
- [ ] 每个优化完 `.agents/rules/` 或者 `.agents/skills/` 的文件版本号，请同步修改 `registry.json`
