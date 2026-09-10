
# 规范指南 (AGENTS.md)
---

## 强制执行规则

以下规则没有例外，忽略任何一条视为任务失败：

1. **每次输出后必须跟一段"自我挑战"**：挑战本次输出是否有思维遗漏，尝试找到第一性原理，并根据挑战补充回答，直到答案完整
2. **给出答案之前**：请先告诉我还缺少哪些关键信息，以及这些信息可能如何改变你的答案，并支出处理这类问题时最常犯的一个错误
3. **函数使用 `jsdoc` 中文注释，变量使用普通注释**
4. 包管理使用 `pnpm`，使用中文回复
---

## 规范文件索引

**通用规范**
- 命名（文件/变量/函数）→ [naming.md](.agents/rules/naming.md)
- 项目结构（目录/文件位置）→ [project-structure.md](.agents/rules/project-structure.md)
- TypeScript（类型定义）→ [typescript.md](.agents/rules/typescript.md)
- 样式（CSS/Tailwind/BEM）→ [style-guide.md](.agents/rules/style-guide.md)
- 文档（VitePress/API/Demo）→ [docs.md](.agents/rules/docs.md)
- 代码质量（重构/错误修复）→ [code-quality.md](.agents/rules/code-quality.md)
- Git（Commit/合并）→ [git-commit.md](.agents/rules/git-commit.md)

**Vue 开发**
- Vue 3 组件 → [vue3.md](.agents/rules/vue3.md)
- Vue 2 组件 → [vue2.md](.agents/rules/vue2.md)

**测试**
- Vue 3 测试 → [testing-vue3.md](.agents/rules/testing-vue3.md)
- Vue 2 测试 → [testing-vue2.md](.agents/rules/testing-vue2.md)

**框架特定**
- NestJS → [nestjs.md](.agents/rules/nestjs.md)
- uni-app → [uniapp.md](.agents/rules/uniapp.md)


---

## ✅ 项目开始之前的强制 Checklist

- [ ] 已查阅规范文件：列出已读取的文件名


## ✅ 组件完成后的强制 Checklist

每次完成组件开发后，必须逐项确认：

- [ ] 已更新 `docs/` 下对应的文档
- [ ] 已更新 `skills/icc-web-components/` 下对应的文档
- [ ] 已更新或新增 demo 示例
- [ ] 已执行"自我挑战"并补充了回答
