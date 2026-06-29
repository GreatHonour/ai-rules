# Vue3 Composition API

| # | 规则 |
|---|------|
| VUE-1 | 动态列表禁止用 `index` 作为 `key` |
| VUE-2 | `v-if` 和 `v-for` 不能写在同一节点上 |
| VUE-3 | props 默认不直接解构；Vue 3.5+ 仅在明确知道响应式语义时放行 |
| VUE-4 | props 和 emits 必须显式声明类型 |
| VUE-5 | 顶层业务函数优先用 `function`，回调函数可用箭头函数 |
| VUE-6 | 优先使用 `defineModel`；只有在明确理解父子同步语义时才设置默认值 |
| VUE-7 | `reactive` 不能直接解构，必要时用 `toRefs` / `toRef` |
| VUE-8 | 大型不可变数据、外部实例优先 `shallowRef`；普通业务对象不要滥用 |
| VUE-9 | `computed` 只做派生值，禁止副作用 |
| VUE-10 | 深度 `watch` 不要直接盯大 `list`；优先盯精确字段、长度、ID 集合或版本号 |
| VUE-11 | 默认禁止 `v-html`；必须使用时要说明来源和消毒方式 |
| VUE-12 | 异步组件用 `defineAsyncComponent`，不要用 `ref` 承载组件定义 |
| VUE-13 | 子组件不能直接修改父级数据，严格遵守单向数据流 |
| VUE-14 | 高频调用路径禁止反复创建相同的临时对象、数组或函数 |
| VUE-15 | 模板绑定不要直接写对象、数组或函数字面量，避免每次渲染生成新引用 |
| VUE-16 | `watch` 不要在回调里修改监听源，避免自触发死循环 |
| VUE-17 | `composable` 初始化时不要隐藏副作用，发请求、改 store、注册全局监听都要显式可见 |
