---
trigger: model_decision
description: 当你要编写或修改 VitePress 文档（组件、工具函数、Hooks）时，来这里查看文档结构、Demo 引用规范和 API 模板。
---

# VitePress 文档规范

适用于组件、工具函数、Hooks 的文档编写。

## 目录结构

```
docs/
├── components/         # 组件文档 Markdown
│   └── button.md
├── hooks/              # Hooks 文档 Markdown
│   └── useXxx.md
├── utils/              # 工具函数文档 Markdown
│   └── formatDate.md
├── examples/           # 独立 Demo 文件（按 API 名称分目录）
│   ├── button/
│   │   ├── basic.vue
│   │   └── disabled.vue
│   └── useXxx/
│       └── basic.vue
└── .vitepress/
    └── config.ts       # 侧边栏注册
```

## 文档 Markdown 骨架

### 组件文档模板

```markdown
# ComponentName 中文名

一句话描述组件用途。

## 基础用法

简短说明。

:::preview 基础用法
demo-preview=../examples/button/basic.vue
:::

## 其他功能

...

---

## API 参考

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| type | 按钮类型 | `'primary' \| 'default'` | `'default'` |

### Events

| 事件名 | 说明 | 回调参数 |
| --- | --- | --- |
| click | 点击时触发 | `(event: MouseEvent) => void` |

### Slots

| 插槽名 | 说明 |
| --- | --- |
| default | 按钮内容 |

### Expose（如有）

| 方法名 | 说明 | 参数 |
| --- | --- | --- |
| focus | 使按钮获取焦点 | - |

### BEM CSS 覆盖

- `.i-button`：根类
- `.i-button__icon`：图标元素
- `.is-disabled`：禁用状态
```

### 工具函数 / Hooks 文档模板

```markdown
# API 名称

一句话描述用途。

## 基础用法

:::preview 基础用法
demo-preview=../examples/useCounter/basic.vue
:::

## 进阶用法

:::preview 进阶用法
demo-preview=../examples/useCounter/advanced.vue
:::

---

## API

### 函数签名

\`\`\`typescript
function useCounter(
  initial?: number,
  options?: { min?: number; max?: number }
): {
  count: Ref<number>;
  inc: () => void;
  dec: () => void;
}
\`\`\`

### 参数

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| initial | 初始值 | `number` | `0` |
| options.min | 最小值 | `number` | - |
| options.max | 最大值 | `number` | - |

### 返回值

| 属性 | 说明 | 类型 |
| --- | --- | --- |
| count | 当前计数 | `Ref<number>` |
| inc | 增加 | `() => void` |
| dec | 减少 | `() => void` |
```

## 核心规则

| 规则 | 说明 |
| ---- | ---- |
| **Demo 必须外挂** | 所有示例必须使用 `:::preview` + 独立 `.vue` 文件，禁止内联代码块 |
| **Demo 路径** | 相对于当前 Markdown 文件，例如 `docs/components/button.md` 使用 `../examples/button/basic.vue` |
| **Demo 目录** | `docs/examples/<api-name>/`，每个 API 一个子目录 |
| **preview 标题** | `:::preview 中文标题` 必须填写，会显示在预览区上方 |
| **API 前加分隔线** | 用 `---` 分隔"示例区"和"API 参考区" |
| **Props 表格列** | `参数 / 说明 / 类型 / 默认值`（四列） |
| **Events 表格列** | `事件名 / 说明 / 回调参数`（三列），不体现 `update:xx` 事件 |
| **命名风格** | Props 参数、Events 事件名、Slots 插槽名统一使用 `kebab-case` |
| **BEM 段（组件必写）** | 列出根类、子元素类、状态修饰类，便于样式覆盖 |
| **侧边栏注册** | 新增文档后必须在 `docs/.vitepress/config.ts` 的 sidebar 中注册 |
| **包名一致性** | 示例中的包名和导入路径必须与 `packages/*/package.json` 保持一致 |

## Demo 编写约定

| 规则 | 说明 |
| ---- | ---- |
| **不导入组件** | 组件 Demo 中**不需要** `import` 组件，VitePress 主题已全局注册 |
| **最小原则** | 只展示当前功能点，不要一个 Demo 塞所有用法 |
| **中文文案** | 示例中的文案统一使用中文 |
| **样式复用** | 优先复用项目现有样式；Tailwind 仅在适合时使用 |

## 完成前检查

1. 确认 Markdown、Demo 和 sidebar 链接都指向实际文件
2. 在仓库根目录执行 `pnpm build:docs`，确保文档可以构建
3. 组件文档必须包含 BEM CSS 覆盖段
4. 工具函数/Hooks 必须包含完整的函数签名和参数说明
