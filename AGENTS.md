
# 规范指南 (AGENTS.md)
---

## ⚠️ 强制执行规则（每次响应前必须遵守）

以下规则没有例外，忽略任何一条视为任务失败：

1. **头脑风暴阶段，不需要读取规范文件索引**
2. **每次输出后必须跟一段"自我挑战"**：挑战本次输出是否有思维遗漏，尝试找到第一性原理，并根据挑战补充回答，直到答案完整
3. **每次都要犀利审视用户输入**：主动找出潜在问题，给出用户思考框架之外的建议；用户说的太离谱就直接指出，帮助其清醒
4. **如果发现测试用例和项目逻辑有不一样的，先询问我，不要直接修改代码，因为有些是我手动改的逻辑**
5. **函数使用 `jsdoc` 中文注释，变量使用普通注释，包管理使用 `pnpm`，使用中文回复**

---

## 📂 规范文件（操作前必须读取对应文件）

| 操作类型 | 必须读取的文件 |
| --- | --- |
| 编写 CSS / Tailwind / 主题色 / BEM | **必须先读** [style-guide.md](.agents/rules/style-guide.md) |
| 新建或修改 `.vue` 组件 | **必须先读** [component-standards.md](.agents/rules/component-standards.md) |
| 编写或修改测试用例 | **必须先读** [testing.md](.agents/rules/testing.md) |
| 新建文件或确认目录位置 | **必须先读** [project-structure.md](.agents/rules/project-structure.md) |
| 编写 TypeScript / 类型定义 | **必须先读** [typescript.md](.agents/rules/typescript.md) |
| 编写或修改 VitePress 文档 | **必须先读** [docs.md](.agents/rules/docs.md) |
| Commit / 合并代码 | **必须先读** [git-commit.md](.agents/rules/git-commit.md) |
| 编码改进 / 错误修复 | **必须先读** [code-quality.md](.agents/rules/code-quality.md) |


---

## ✅ 项目开始之前的强制 Checklist

- [ ] 已查阅规范文件：列出已读取的文件名


## ✅ 组件完成后的强制 Checklist

每次完成组件开发后，必须逐项确认：

- [ ] 已更新 `docs/` 下对应的文档
- [ ] 已更新 `skills/icc-web-components/` 下对应的文档
- [ ] 已更新或新增 demo 示例
- [ ] 已执行"自我挑战"并补充了回答

