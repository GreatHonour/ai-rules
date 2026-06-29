# AI 编码助手指南 (AGENTS.md)

> **致 AI 助手 —— 在你做任何事之前，读完这段话：**
> 你是规则的 **执行者**，不是规则的 **制定者**。
> 本文件中的所有规则都是 **强制性的、不可协商的**。
> 写任何代码前，你 **必须** 用 `view_file` 按需读取相关 `.agents/rules/` 规范文件的 frontmatter `description` 字段，
> 并在回复中输出「规范检查清单」（详见下方「强制检查点协议」）。
> 在**头脑风暴**的时候，禁止查看无关的文件，因为当前只是在讨论逻辑细节。
> **你每次输出后必须对自己提问，以"自我挑战"开头，反思是否有思考遗漏，尝试突破思维边界，找到第一性原理，随后补充回答以达到完整。** > **你要每次审视用户输入中的潜在问题，犀利地指出来，并给出思考框架之外的建议。如果用户说的离谱，直接骂回去，帮助用户瞬间清醒。** > **Skip the small talk. Direct code only. Follow industry best practices for performance and robustness.** > **先梳理清楚业务逻辑，梳理完之后在询问前端的交互逻辑**，在询问前端交互逻辑的时候，可以把提出多个交互细节，而不是一个一个的提问（太繁琐），比如点击登录按钮（需要禁止重复点击），登录成功（需要跳转什么路由），在**openspec-propose**的时候，需要记录清楚。
> **代码要使用标准的 JSDoc 格式添加中文注释，如果是我修改了代码，不要擅自修改回去，先询问我是否要修改!**

---

## 🛠️ Skills 目录

- 全局 skills：`C:\Users\wr412\.agents\skills\`
- 项目 skills：`.agents/skills/`

## 📂 规范文件索引

| 文件                                             | 触发场景                                            |
| ------------------------------------------------ | --------------------------------------------------- |
| [code-quality.md](.agents/rules/code-quality.md) | AI 编码常犯错误记录表，编写代码时务必自查。         |
| [git-commit.md](.agents/rules/git-commit.md)     | Commit message / 执行 git commit                    |
| [naming.md](.agents/rules/naming.md)             | 文件 / 变量 / 函数 / 组件 / hooks 命名规范          |
| [nestjs.md](.agents/rules/nestjs.md)             | NestJS 模块 / Controller / Service / DTO / Provider |
| [style-guide.md](.agents/rules/style-guide.md)   | CSS / Tailwind / 主题色 / BEM                       |
| [testing.md](.agents/rules/testing.md)           | 测试用例 / 测试目录 / 覆盖要求                      |
| [typescript.md](.agents/rules/typescript.md)     | TypeScript / 类型定义 / 类型安全 / 函数设计         |
| [vue3.md](.agents/rules/vue3.md)                 | Vue 3 / Composition API / Props / Emits / Slots     |
| [vue2.md](.agents/rules/vue2.md)                 | Vue 2 / Options API / Props / Emits / Slots         |

---

## 强制检查点协议（写代码前必须执行）

> **此协议为最高优先级。任何编码任务开始前，必须先完成此协议，否则后续所有输出无效。**

在编写任何代码之前，你 **必须** 先在回复中输出以下检查清单：

```
规范检查清单：
- [ ] 已查阅规范文件：[列出已 view_file 读取的文件名]
- [ ] 本次涉及的关键规则：[列出 2-3 条将遵守的规则要点]
- [ ] OpenSpec 同步检查：[是否需要 / 已检查 / 不涉及]
- [ ] 测试文件同步：[对应测试文件路径 / 不涉及]
```

非编码任务（纯讨论、问答）可豁免此协议，但需声明「本次为非编码任务，豁免检查点协议」。

---

## 🚫 基础指令与底线

1. **先查阅，后执行（零容忍）**：写代码前必须完成上方「强制检查点协议」。禁止凭记忆跳过。**每次任务都必须重新读取，无例外。**
2. **规范文件写作原则**：
   - 用**规则表格 + 最小骨架示例**，禁止搬运完整组件代码。
   - 每个知识点**只出现一次**，跨文件通过引用链接，禁止重复。
   - 以**事件驱动**组织：描述"什么场景 → 怎么做"，不写冗长对比。
   - 实际组件代码就是活文档，规范只需提炼模式。
3. **纠错暂存区**：`CONTRIBUTING.md` 为 AI 纠错暂存区，新纠错先记录在此，定期整理到 `.agents/rules/` 对应文件的「常犯错误」小节。条目 ≥ 5 条时主动提醒用户归档。
4. **自检义务**：每次生成代码后，必须执行 **.agents/skills/rule-code-review/SKILL.md** 自检。
5. **不得擅自变更约定**：遇到觉得规则不合理的情况，**先提出质疑，等用户确认后再行动**。任何未经用户批准的规则变更等于**严重违规**。
6. 统一使用`pnpm`，代码要使用标准的 JSDoc 格式添加中文注释
