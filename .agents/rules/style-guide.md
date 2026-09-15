---
trigger: model_decision
description: 当你要编写 CSS、使用 Tailwind 类名、处理主题色或创建 BEM 类名时，来这里查看样式规范和命名规则。
version: "1.0.1"
---

# 样式规范

> 组件样式的**唯一规范**。所有样式写法、映射模式、hover 约定都在这里，其他文件不重复。

## 1. Tailwind 优先原则

项目已扩展 Tailwind 配置以支持精确数值类名（如 `text-12` `h-38` `px-28`），优先使用 Tailwind 类名完成样式。

**仅以下场景才写 `<style scoped>`：**
- hover + box-shadow 组合（需要 CSS 变量）
- 复杂 CSS 动画 / 伪元素
- `:not()` 排除选择器

**注意事项：**
- 使用自定义数值类名时，直接写数值：`text-12` 而非 `text-xs`
- `<style>` 必须加 `scoped`
- 禁止硬编码颜色值，用 `var(--i-color-xxx)` 或 Tailwind 主题色
- 禁止使用 Tailwind 原生颜色（如 `bg-purple-500`），改用 `bg-primary`

## 2. 动态样式模式（核心）

### 静态 vs 动态分离

- **静态通用样式** → template `class`（如 `inline-flex items-center transition-all`）
- **动态变体样式** → `computed` 返回 `:class`（因 type/size/mode 变化的 Tailwind class）

### 映射对象模式

多变体组合时，**禁止**在 `<style>` 中枚举 modifier，改用 **`as const` 映射对象 + computed** 注入 Tailwind 类名。

```typescript
const TYPE_MAP = {
  primary: { solid: 'bg-primary text-white', plain: 'bg-primary-5 text-primary' },
  danger: { solid: 'bg-danger text-white', plain: 'bg-danger-5 text-danger' },
} as const;

const SIZE_MAP = { large: 'h-38 px-28', small: 'h-22 px-12' } as const;

const mode = computed(() => props.disabled ? 'disabled' : (props.plain ? 'plain' : 'solid'));

const classes = computed(() => [
  `i-button--${props.type}`,
  SIZE_MAP[props.size],
  mode.value === 'disabled' ? 'is-disabled bg-black-10 text-black-30' : TYPE_MAP[props.type][mode.value],
]);
```

## 3. BEM 与状态管理

### 命名规范

- **Block** → `i-{name}`（如 `i-button`）
- **Element** → `i-{name}__{el}`（如 `i-button__loading`）
- **Modifier** → `i-{name}--{mod}`（如 `i-button--primary`）
- **State** → `is-{state}`（如 `is-disabled`, `is-plain`, `is-text`）

### 状态类的双重用途

1. **标记模式** — 供 `<style scoped>` hover 选择器使用
2. **携带样式** — 如 `DISABLED_STYLE` 中的 `is-disabled` 同时携带 Tailwind 类名

## 4. 主题系统

### 工作流程

```
:root 覆盖 → CSS 变量（--i-color-xxx） → Tailwind 自动映射 → 组件使用
```

### 变量命名规则

- 变量格式：`--i-color-{category}` / `--i-color-{category}-{opacity}`
- Tailwind key：去掉 `i-color-` 前缀 → `bg-primary`, `text-primary-10`
- 配置示例：项目已在 `tailwind.config.js` 中完成 CSS 变量到 Tailwind 类名的映射和数值扩展

💡 **注意：AI 禁止自行添加/修改 CSS 变量**，除非用户明确要求