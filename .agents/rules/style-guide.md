---
trigger: model_decision
description: 当你要编写 CSS、使用 Tailwind 类名、处理主题色或创建 BEM 类名时，来这里查看样式规范和命名规则。
---

# 样式规范

> 组件样式的**唯一规范**。所有样式写法、映射模式、hover 约定都在这里，其他文件不重复。

---

## 1. Tailwind 优先原则

优先使用 Tailwind 类名。仅以下场景才写 `<style scoped>`：
- hover + box-shadow 组合（需要 CSS 变量）
- 复杂 CSS 动画 / 伪元素
- `:not()` 排除选择器
- 严格按照 `Tailwind` 自定义配置规则，例如 `12px` 应该书写 `text-12`, 而不是 `text-xs`

---

## 2. 静态 vs 动态分离

| 层级 | 放在哪 | 示例 |
| ---- | ------ | ---- |
| 静态通用样式 | template `class` | `inline-flex items-center transition-all` |
| 动态变体样式 | `computed` 返回 `:class` | 因 type/size/mode 变化的 Tailwind class |

---

## 3. 样式映射模式（核心）

多 type/mode 组合时，**禁止**在 `<style>` 中为每个组合写 CSS modifier。
用 **`as const` 映射对象 + computed** 动态注入 Tailwind class：

```typescript
const TYPE_STYLE_MAP = {
  primary: {
    solid: 'bg-primary text-white border-transparent',
    plain: 'bg-primary-5 border-primary-30 text-primary',
  },
  danger: { solid: '...', plain: '...' },
} as const;

const SIZE_STYLE_MAP = {
  large: 'h-38 px-28 rounded-10 gap-8',
  small: 'h-22 px-6 rounded-3 gap-3',
} as const;

const DISABLED_STYLE = 'is-disabled bg-black-10 border-transparent text-black-30 cursor-not-allowed pointer-events-none';

const classes = computed(() => [
  `i-xxx--${props.type}`,
  SIZE_STYLE_MAP[props.size],
  mode === 'disabled' ? DISABLED_STYLE : TYPE_STYLE_MAP[props.type][mode],
]);
```

---

## 4. BEM 命名

| 层级 | 格式 | 示例 |
| ---- | ---- | ---- |
| Block | `i-{name}` | `i-button` |
| Element | `i-{name}__{el}` | `i-button__loading` |
| Modifier | `i-{name}--{mod}` | `i-button--primary` |
| State | `is-{state}` | `is-disabled`, `is-plain`, `is-text` |

状态类两个用途：
1. 标记模式 — 供 `<style scoped>` hover 选择器使用
2. 携带样式 — 如 `DISABLED_STYLE` 中的 `is-disabled` 同时携带 Tailwind 类名

---

## 5. hover 选择器约定

| 模式 | 选择器格式 |
| ---- | ---- |
| 实心 | `.i-xxx--{type}:not(.is-plain):not(.is-text):not(.is-disabled):hover` |
| plain | `.i-xxx--{type}.is-plain:not(.is-disabled):hover` |
| text | `.i-xxx--{type}.is-text:not(.is-disabled):hover` |

多个 type 有相同 hover 效果时，**合并选择器**，不重复写。

---

## 6. 主题系统

```
:root 覆盖 → CSS 变量（--i-color-xxx） → Tailwind 自动映射 → 组件使用
```

- 变量格式：`--i-color-{category}` / `--i-color-{category}-{opacity}`
- Tailwind key：去掉 `i-color-` 前缀 → `bg-primary`, `text-primary-10`
- 变量定义请查看配置引入路径

---


## 7. 禁止事项

1. **禁止硬编码颜色值** → 用 `var(--i-color-xxx)` 或 Tailwind 主题色
2. **禁止 Tailwind 原生颜色** → 如 `bg-purple-500`，用 `bg-primary`
3. **AI 禁止自行添加/修改 CSS 变量**，除非用户明确要求
4. **`<style>` 必须加 `scoped`**
5. **禁止 `<style>` 枚举 modifier** → 用映射对象 + computed
6. **禁止 `@apply` 写可用映射对象实现的样式**