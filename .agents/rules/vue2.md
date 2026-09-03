---
trigger: model_decision
description: 当你要编写 Vue 2 组件（.vue 文件）、使用 Options API、管理响应式数据、定义 Props、编写 computed / watch / methods 或处理 Vue2 响应式限制时，来这里查 Vue 2 语法规范和最佳实践。
---

# Vue 2 最佳实践（通用 · Vue 2.6+）

## 1. SFC 结构

顺序：`<template>` → `<script>` → `<style scoped>`。

组件选项顺序：`name` → `components` → `props` → `data` → `computed` → `watch` → 生命周期 → `methods`

- 组件必须声明 `name`，便于调试、KeepAlive、递归组件和错误追踪。
- Vue2 组件统一使用 Options API。

## 2. props

- 必须显式声明类型，禁止只写字符串数组。
- 引用类型默认值必须使用工厂函数 `default: () => []`。
- 子组件禁止直接修改 `props`，通过 `$emit` 通知父组件更新。

```javascript
props: {
  value: { type: String, default: '' },
  options: { type: Array, default: () => [] },
}
```

## 3. data & 响应式

- `data` 必须是函数，返回普通对象。
- 所有模板中访问的字段必须在 `data` 初始化声明。
- **Vue2 响应式限制**：新增对象属性用 `this.$set(obj, key, val)`，数组索引更新用 `splice` 或整体替换。
- 静态配置（映射表、选项列表）提到组件外部，避免每个实例重复创建。
- 第三方实例、非渲染状态不要放进 `data`。

```javascript
const STATUS_MAP = { DRAFT: '草稿', ENABLED: '启用' };

export default {
  data() {
    return {
      list: [],
      form: { name: '' }, // 提前声明完整结构
    };
  },
  methods: {
    addField() {
      this.$set(this.form, 'age', 18); // 新增属性
      this.list.splice(index, 1, newItem); // 数组更新
    }
  }
};
```

## 4. computed

- 派生数据优先使用 `computed`，不要用 `watch` 手动维护。
- 必须保持纯函数，禁止在里面改状态、发请求、触发弹窗。
- 模板中的复杂表达式应提取为 `computed`。
- 布尔值命名使用 `is` / `has` / `can` / `show` 前缀。

## 5. watch

> 少用 `watch`，不是不用。`watch` 只处理副作用，不处理派生状态。

- 优先使用 `computed` 表达派生关系，优先使用事件处理用户交互。
- 只在”响应外部变化并执行副作用”时才用 `watch`，如路由变化、props 输入变化、异步请求触发。
- 禁止用 `watch` 维护可以由 `computed` 得出的值。
- 禁止深度 `watch` 大对象或大列表，优先监听精确路径。
- 禁止在 `watch` 回调中修改被监听源，避免自触发循环。
- 异步 `watch` 要处理竞态，必要时做请求序号或取消标记。

```javascript
computed: {
  selectedIds() {
    return this.list.map(item => item.id); // 派生状态用 computed
  },
},
watch: {
  '$route.query.id': { // 副作用用 watch
    immediate: true,
    handler(id) {
      if (!id) return;
      this.loadDetail(id);
    },
  },
}
```

## 6. methods & 生命周期

**methods**
- 事件处理函数用 `handleXxx` / `fetchXxx` 命名。
- 异步方法统一 `async/await` + `try/catch/finally`。
- 高频渲染路径不要在模板里创建匿名函数，提取到 `methods`。
- 方法只承载动作，纯派生值用 `computed`。

**生命周期**
- 初始化请求：不依赖 DOM 用 `created`，依赖 DOM 用 `mounted`。
- 定时器、事件监听、第三方实例必须在 `beforeDestroy` 清理。
- `mounted` 中操作子组件或 DOM ref 时使用 `this.$nextTick`。

## 7. 模板

**指令缩写（强制）**：`v-bind:x` → `:x` · `v-on:click` → `@click` · `v-slot:name` → `#name`

**条件 & 列表**
- `v-if` 和 `v-for` 禁止写在同一元素上，使用外层 `<template>` 或提前过滤数据。
- `v-for` 必须提供稳定唯一的业务 `key`，禁止使用 `index`。
- 高频切换用 `v-show`，条件创建/销毁用 `v-if`。
- 模板中禁止复杂表达式、链式计算、对象/数组字面量，提取到 `computed` 或常量。
- 默认禁止 `v-html`；必须使用时要说明来源可信或经过消毒。

## 8. 组件通信 & 性能

**通信**
- 父传子用 `props`，子传父用 `$emit`。
- 跨层共享状态优先使用 Vuex 或 provide/inject。
- 禁止子组件直接读写父组件内部状态。

**性能**
- 静态配置、映射表提到组件外部。
- 大列表渲染必须使用稳定 `key`。
- 不需要响应式的数据不要放 `data`。
- 路由页面组件优先懒加载。
- 频繁输入、滚动、resize 触发逻辑应防抖或节流。
