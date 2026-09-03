---
trigger: model_decision
description: 当你要编写 Vue 3 组件（.vue 文件）、使用 Composition API、管理响应式数据、定义 Props/Emits/Slots 或使用 vue-router 时，来这里查 Vue 3 语法规范和最佳实践。
---

# Vue 3 最佳实践（通用 · Vue 3.4+）

## 快速索引
[响应式选型](#3-响应式选型) · [Props/Emits](#4-props--emits--slots) · [watch 使用时机](#6-watch) · [生命周期](#8-生命周期) · [Composables 规范](#9-composables-骨架) · [响应式工具 API](#10-响应式工具-api) · [性能优化](#13-性能优化) · [常见陷阱](#14-常见陷阱) · [AI 常犯错误](#常犯错误)

---

## 1. SFC 结构

顺序：`<template>` → `<script setup lang="ts">` → `<style scoped>`。统一使用 Composition API。

## 2. script setup 内部排列

```typescript
import type → import 值
路由（useRoute / useRouter）
响应式状态（ref / shallowRef）
composable 调用（useXxx）
computed
watch / watchEffect
函数（事件处理 → 业务逻辑）
生命周期（onMounted 等）
```

## 3. 响应式选型

| 场景 | API |
| ---- | --- |
| 基础值 | `ref()` |
| 对象/数组（深度响应） | `ref<T>()` |
| 大列表（只整体替换） | `shallowRef<T[]>()` |
| DOM/组件引用 | `ref<HTMLElement>()` / `ref<Exposed>()` |
| 派生值 | `computed()` |
| 可写派生 | `computed({ get, set })` |
| 需要解构的对象 | `reactive()` + `toRefs()` |

**核心区别**：`ref` 通过 `.value` 可整体替换；`reactive` 解构丢失响应性，不可整体赋值。

```typescript
// shallowRef 不触发深度更新
list.value.push(item);              // ❌ 不生效
list.value = [...list.value, item]; // ✅

// reactive 解构陷阱
const { count } = state;            // ❌ 非响应式
const { count } = toRefs(state);    // ✅ Ref<number>
```

## 4. Props / Emits / Slots

### Props

```typescript
// types.ts 中定义
interface Props { title: string; count?: number; items: string[] }

// 组件内
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  items: () => [],  // 引用类型必须工厂函数
});

// Vue 3.5+ 可解构且保持响应性
const { title, count = 0 } = defineProps<Props>();
```

### Emits

```typescript
const emit = defineEmits<{
  change: [value: string];
  'update:modelValue': [value: number];
  close: [];
}>();
```

### v-model

```typescript
// Vue 3.4+ defineModel
const modelValue = defineModel<string>();       // v-model
const name = defineModel<string>('name');       // v-model:name
modelValue.value = 'new';                       // 内部自动 emit('update:modelValue', 'new')
```

### Slots

```typescript
defineSlots<{
  default: (props: { item: Item; index: number }) => void;
  header: () => void;
}>();
```

### Expose

```typescript
defineExpose({ validate, reset });

// 父组件
const childRef = ref<InstanceType<typeof Child>>();
childRef.value?.validate();
```

## 5. computed

- 纯函数，零副作用，禁止在内部修改状态或调 API
- 布尔命名：`is` / `has` / `show` / `can` 前缀

## 6. watch

> **优先使用组件事件**（`@change`、`@input`、`@select` 等）处理联动逻辑，避免隐式依赖和性能开销。
> 仅在**无对应事件可订阅**时才使用 `watch`（如 route 变化、跨组件响应式依赖等）。

```typescript
watch(count, (val, oldVal) => {});                       // 监听 ref
watch(() => state.key, (val) => {});                     // 监听 reactive 属性
watch([a, b], ([aVal, bVal]) => {});                     // 多源
watch(source, cb, { immediate: true, deep: true });      // 选项
watchEffect(() => { /* 自动收集依赖 */ });

// 清理上一次副作用
watch(id, async (newId, _old, onCleanup) => {
  const ctrl = new AbortController();
  onCleanup(() => ctrl.abort());
  await fetch(`/api/${newId}`, { signal: ctrl.signal });
});

// 联动清理工厂（批量同类监听）
function watchReset(source: () => unknown, keys: Array<keyof Form>, cond: (v: unknown) => boolean) {
  watch(source, v => { if (cond(v)) keys.forEach(k => { form.value[k] = defaults[k]; }); });
}
```

## 7. 模板

### 指令缩写（强制）

`v-bind:x` → `:x` · `v-on:click` → `@click` · `v-slot:name` → `#name`

### 属性顺序

`v-model` → `v-if/v-show` → `:动态绑定` → `静态属性` → `@事件`

### 事件命名

统一使用 kebab-case：`@user-select` 而非 `@userSelect`

### 条件 & 列表

- 频繁切换 → `v-show`；否则 → `v-if`
- `v-if` + `v-for` 禁止同元素，用 `<template v-for>` 包裹
- `v-for` 的 `:key` 必须唯一业务 ID，禁止 `index`
- 模板中禁止复杂表达式，提取到 `computed`

## 8. 生命周期

```
setup → onBeforeMount → onMounted（DOM就绪）→ onBeforeUpdate → onUpdated
→ onBeforeUnmount（清理定时器/监听）→ onUnmounted
```

- KeepAlive: `onActivated` / `onDeactivated`
- `onMounted` 调异步用 `void` 前缀：`void loadData()`

## 9. Composables 骨架

```typescript
export function useXxx(input: MaybeRefOrGetter<string>, options?: Options): Return {
  const result = ref<T>();
  const loading = ref(false);

  async function execute(): Promise<void> {
    loading.value = true;
    try { result.value = await api(toValue(input)); }
    catch (e) { /* handle */ }
    finally { loading.value = false; }
  }

  onMounted(() => { void execute(); });
  onBeforeUnmount(() => { /* 清理 */ });

  return { result, loading, execute };
}
```

设计规则：命名 `useXxx`；返回 `ref` 不返回 `reactive`；入参支持 `MaybeRefOrGetter`；内部处理清理。

## 10. 响应式工具 API

| API | 用途 |
| --- | ---- |
| `toValue(source)` | 统一取值 ref/getter/普通值 |
| `toRef(obj, 'key')` | reactive 单属性转 ref |
| `toRefs(obj)` | reactive 所有属性转 ref |
| `readonly(ref)` | 只读代理（provide 用） |
| `markRaw(obj)` | 永不代理 |
| `effectScope()` | 批量收集/清理副作用 |
| `nextTick()` | 等 DOM 更新 |
| `defineModel()` | 3.4+ 极简 v-model |
| `useTemplateRef()` | 3.5+ 模板引用 |

## 11. Provide / Inject

```typescript
export const CTX_KEY: InjectionKey<CtxType> = Symbol('ctx');

// 祖先
provide(CTX_KEY, { data: readonly(data), update: (v) => { data.value = v; } });

// 后代
const ctx = inject(CTX_KEY);
if (!ctx) throw new Error('Missing context');
```

### 通信选型

| 场景 | 方案 |
|------|------|
| 父 → 子 | Props |
| 子 → 父 | Emits |
| 跨层级 | Provide/Inject |
| 全局状态 | Pinia |

## 12. 内置组件

```html
<!-- Teleport -->
<Teleport to="body"><div class="modal">...</div></Teleport>

<!-- KeepAlive -->
<KeepAlive :include="['ListView']" :max="10"><component :is="view" /></KeepAlive>

<!-- Transition -->
<Transition name="fade" mode="out-in"><component :is="view" /></Transition>

<!-- Suspense（实验性） -->
<Suspense><AsyncComp /><template #fallback><Loading /></template></Suspense>
```

## 13. 性能优化

| 技术 | 场景 |
| ---- | ---- |
| `shallowRef` | 大列表只替换不深度代理 |
| `v-once` | 纯静态内容 |
| `v-memo="[deps]"` | 列表未变项跳过渲染 |
| `markRaw(obj)` | 第三方实例不代理（ECharts 等） |
| 异步组件 `defineAsyncComponent` | 路由懒加载 |
| 常量提取 | 避免模板每次渲染创建临时对象/数组 |

## 14. 常见陷阱

| 陷阱 | 解决 |
| ---- | ---- |
| `reactive` 解构丢响应性 | `toRefs()` 或改用 `ref` |
| `watch` reactive 拿不到 oldValue | 监听 `() => ({ ...state })` |
| `v-for` 用 index 做 key 导致错乱 | 用唯一业务 ID |
| `computed` 中 await | computed 是同步的，用 watch+ref |
| props 直接修改 | emit 通知父组件 |
| `v-html` + 用户输入 | XSS 风险，用文本插值 |
| `async setup` 不渲染 | 需要包裹 `<Suspense>` |
| `onMounted` 中子组件 ref 为 null | `nextTick()` 或 `watchEffect` |

## 15. vue-router

```typescript
const route = useRoute();
const router = useRouter();

// 路由参数 → computed 包装
const id = computed(() => Number(route.params.id));

// 导航
await router.push({ name: 'Detail', params: { id: 1 } });
await router.replace({ name: 'Login' });

// 组件内守卫
onBeforeRouteLeave(() => {
  if (dirty.value) return confirm('有未保存的更改');
});

// 路由懒加载
{ path: '/page', component: () => import('./Page.vue') }
```

### RouterLink 最佳实践

```vue
<!-- 命名路由优于路径字符串 -->
<RouterLink :to="{ name: 'Detail', params: { id: 1 } }">详情</RouterLink>

<!-- 外部链接自动处理 -->
<RouterLink to="https://example.com">外部链接</RouterLink>

<!-- 激活类名样式 -->
<RouterLink to="/about" active-class="is-active" exact-active-class="is-exact-active">
  关于
</RouterLink>
```