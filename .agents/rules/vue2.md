---
trigger: model_decision
description: 当你要编写 Vue 2 组件（.vue 文件）、使用 Options API、管理响应式数据、定义 Props、编写 computed / watch / methods 或处理 Vue2 响应式限制时，来这里查 Vue 2 语法规范和最佳实践。
---

# Vue 2 最佳实践（通用 · Vue 2.6+）

## 1. SFC 结构

顺序：`<template>` → `<script>` → `<style scoped>`。

组件选项建议顺序：

```
name
components
props
data
computed
watch
生命周期
methods
```

- 组件必须声明 `name`，便于调试、KeepAlive、递归组件和错误追踪。
- Vue2 组件统一使用 Options API。
- 禁止空的 `computed: {}`、`watch: {}`、`methods: {}`、空 `<style scoped>`。

## 2. props

- `props` 必须显式声明类型，禁止只写字符串数组。
- 引用类型默认值必须使用工厂函数。
- 子组件禁止直接修改 `props`。
- 需要双向同步时，优先通过 `$emit` 通知父组件更新。
- 复杂对象 `props` 不要依赖深层隐式变更，优先通过明确事件表达业务意图。

```javascript
props: {
  value: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
}
```

## 3. data

- `data` 必须是函数，返回普通对象。
- 所有模板中会访问的响应式字段必须在 `data` 初始化声明。
- 禁止后续直接新增未声明的响应式字段；确需新增对象属性时使用 `this.$set`。
- `data` 只放组件状态，不放静态常量、配置表、纯映射对象。
- 静态配置应提到组件外部常量，避免每个组件实例重复创建。

```javascript
const STATUS_TEXT_MAP = {
  DRAFT: '草稿',
  ENABLED: '启用',
};

export default {
  data() {
    return {
      loading: false,
      list: [],
      form: {
        name: '',
      },
    };
  },
};
```

## 4. computed

- 派生数据优先使用 `computed`，不要用 `watch` 手动维护另一个状态。
- `computed` 必须保持纯函数，禁止在里面改状态、发请求、调接口、触发弹窗。
- 模板中的复杂表达式应提取为 `computed`。
- 布尔值命名建议使用 `is` / `has` / `can` / `show` 前缀。
- 需要 getter/setter 的双向派生值时，使用可写 `computed`。

## 5. methods

- 事件处理函数用 `handleXxx` / `fetchXxx` 表达交互入口。
- 业务动作函数用动词开头，如 `fetchUserList`、`handleSubmit`、`handleReset`。
- 异步方法统一 `async/await` + `try/catch/finally`。
- 高频渲染路径不要在模板里创建匿名函数，提取到 `methods`。
- 方法只承载动作，不要把纯派生值写成方法给模板反复调用。

## 6. watch

> 少用 `watch`，不是不用 `watch`。`watch` 只处理副作用，不处理派生状态。

- 优先使用 `computed` 表达派生关系。
- 优先使用事件处理用户交互联动。
- 只有在“响应某个外部变化并执行副作用”时才使用 `watch`，如路由变化、props 外部输入变化、异步请求触发。
- 禁止用 `watch` 维护可以由 `computed` 得出的值。
- 禁止深度 `watch` 大对象或大列表。
- 禁止在 `watch` 回调中修改被监听源，避免自触发循环。
- `watch` 监听对象字段时，优先监听精确路径，而不是整个对象。
- 异步 `watch` 要处理竞态，必要时做请求序号、取消标记或结果校验。
- `immediate` 只用于初始化和变化逻辑完全一致的场景。

```javascript
computed: {
  selectedIds() {
    return this.list.map(item => item.id);
  },
},

watch: {
  '$route.query.id': {
    immediate: true,
    handler(id) {
      if (!id) return;
      this.loadDetail(id);
    },
  },
}
```

## 7. 模板

### 指令缩写（强制）

`v-bind:x` → `:x` · `v-on:click` → `@click` · `v-slot:name` → `#name`

### 条件 & 列表

- `v-if` 和 `v-for` 禁止写在同一个元素上。
- `v-for` 必须提供稳定唯一的业务 `key`，禁止使用 `index`。
- 高频切换用 `v-show`，条件创建/销毁/表单切换用 `v-if`。
- 模板中禁止复杂表达式、复杂三元、链式计算，提取到 `computed`。
- 模板绑定不要直接写对象、数组、函数字面量，避免每次渲染创建新引用。
- 模板中禁止魔法数字、魔法字符串，提取为命名常量或配置映射。
- 默认禁止 `v-html`；必须使用时要说明来源可信或经过消毒。

## 8. 响应式限制

- Vue2 对对象新增/删除属性不自动响应，新增属性必须用 `this.$set`。
- Vue2 对数组索引赋值、直接改 `length` 不可靠，使用 `splice` 或整体替换。
- 初始化状态时声明完整对象结构，减少后续 `$set`。
- 大列表更新优先整体替换或按需局部更新，避免深层遍历。
- 第三方实例、非渲染状态不要放进响应式 `data`。

```javascript
this.$set(this.form, 'age', 18);
this.list.splice(index, 1, nextItem);
this.list = nextList;
```

## 9. 生命周期

- 初始化请求放在 `created` 或 `mounted`：不依赖 DOM 用 `created`，依赖 DOM 用 `mounted`。
- 定时器、事件监听、第三方实例必须在 `beforeDestroy` 清理。
- `mounted` 中操作子组件或 DOM ref，必要时使用 `this.$nextTick`。
- `activated` / `deactivated` 只用于 KeepAlive 场景。
- 生命周期中不要堆大量业务逻辑，应调用具名方法。

## 10. 组件通信

- 父传子用 `props`。
- 子传父用 `$emit`。
- 跨层共享状态优先使用 Vuex 或明确的 provide/inject。
- 禁止子组件直接读写父组件内部状态。
- 避免事件总线滥用；必须使用时要在销毁阶段解绑。

## 11. 性能语法

- 静态配置、列定义、映射表提到组件外部，避免每个实例重复创建。
- 大列表渲染必须使用稳定 `key`，避免 `index`。
- 模板中不要调用会创建新对象/数组的方法。
- 大对象、大数组避免 `deep: true`。
- 不需要响应式的数据不要放 `data`。
- 纯静态内容可使用 `v-once`。
- 路由页面组件优先懒加载。
- 频繁输入、滚动、resize 触发逻辑应防抖或节流。

---

## 常犯错误

> 以下为 AI 屡次犯错的记录，编写代码时务必自查。

| # | 规则 | 备注 |
|---|------|------|
| 1 | `props` 禁止直接修改 | 子组件通过 `$emit` 通知父组件更新 |
| 2 | `data` 必须是函数 | 返回普通对象 |
| 3 | 引用类型 `props.default` 必须是工厂函数 | 如 `default: () => []` |
| 4 | 动态列表禁止使用 `index` 作为 `key` | 使用稳定唯一业务 ID |
| 5 | `v-if` 和 `v-for` 禁止写在同一节点上 | 先过滤数据或使用外层 `<template>` |
| 6 | 能用 `computed` 就不要用 `watch` 同步派生状态 | `watch` 只处理副作用 |
| 7 | 能用事件处理联动就不要用 `watch` 监听值变化 | 避免隐式依赖和额外开销 |
| 8 | 禁止深度 `watch` 大对象或大列表 | 优先监听精确字段、长度、ID 集合或版本号 |
| 9 | 禁止在 `watch` 回调里修改监听源 | 避免自触发死循环 |
| 10 | 新增响应式对象属性必须用 `this.$set` | Vue2 对新增属性不自动响应 |
| 11 | 数组按索引更新使用 `splice` 或整体替换 | 避免响应式失效 |
| 12 | 定时器、DOM 监听、事件总线必须在 `beforeDestroy` 清理 | 避免内存泄漏和重复触发 |
| 13 | 模板禁止复杂表达式和临时对象/数组字面量 | 提取到 `computed` 或常量 |
| 14 | 默认禁止 `v-html` | 必须说明来源和消毒方式 |
| 15 | 静态配置不要放进 `data` | 避免无意义响应式代理和实例重复创建 |
