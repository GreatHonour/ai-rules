---
trigger: always_on
description: AI 编码常犯错误记录表，编写代码时务必自查。
---

# 代码质量规范

## Vue 3 常犯错误

- 组件标签统一 PascalCase — `<IButton>` 而非 `<i-button>`
- 静态列定义不要用 `reactive` 包裹 — `const columns = COLUMNS` 即可
- 模板禁止魔法数字 — 用命名常量如 `DisplayStatus.DRAFT` 替代 `1`
- 优先用组件事件（`@change` 等）处理联动，不要用 `watch` — 见 vue3.md §6

## Vue 2 常犯错误

**Props 和响应式：**
- 直接修改 `props` → 通过 `$emit` 通知父组件
- `data` 写成对象 → 必须是函数 `data() { return {} }`
- `default: []` → 引用类型必须用工厂函数 `default: () => []`
- 新增对象属性不响应 → 用 `this.$set(obj, key, val)`
- 数组索引赋值不响应 → 用 `splice` 或整体替换

**模板和列表：**
- `v-for` 用 `index` 做 `key` → 使用稳定唯一业务 ID
- `v-if` 和 `v-for` 同节点 → 使用外层 `<template>` 或提前过滤
- 模板中复杂表达式 → 提取到 `computed`

**Watch 滥用：**
- 用 `watch` 同步派生状态 → 用 `computed`
- 用 `watch` 监听值变化做联动 → 用事件处理
- 深度 `watch` 大对象 → 监听精确字段或版本号
- `watch` 回调修改监听源 → 避免自触发循环

**其他：**
- 忘记清理定时器/监听 → 在 `beforeDestroy` 清理
- 静态配置放 `data` → 提到组件外部常量
