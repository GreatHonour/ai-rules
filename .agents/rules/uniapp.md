---
trigger: model_decision
description: uni-app 相关的规则逻辑。
---

# 多端兼容规范

> **加载时机**：涉及平台差异代码时

---

## 📝 条件编译基本语法

```vue
<template>
  <!-- #ifdef MP-WEIXIN -->
  <official-account />
  <!-- #endif -->
</template>

<script setup lang="ts">
// #ifdef MP-WEIXIN
wx.login({ success: res => { /* ... */ } });
// #endif
</script>
```

> `#ifdef` 是**编译期指令**，不可嵌套，不等同于 JS `if`。运行时判断用 `uni.getSystemInfoSync().platform`。

---

## 🌳 差异代码分级策略

**原则：共同逻辑只写一次，平台差异收拢到最小范围**

| 策略                 | 适用场景                      | 做法                                          |
| -------------------- | ----------------------------- | --------------------------------------------- |
| ① 提取适配函数       | 差异 1-2 行                   | 公共逻辑在外，仅差异部分在 `#ifdef` 适配函数中 |
| ② 拆分平台 Hook      | 差异逻辑 > 5 行且多处使用     | `useShare.ts` 统一接口 + `.mp.ts` / `.h5.ts`  |
| ③ 运行时判断         | 差异是配置/字符串             | `import { isMP } from '@/base'` + 三元表达式  |

### 决策树

```
有多端差异？
  ├── 差异 1-2 行 → #ifdef 或提取适配函数
  ├── 差异 > 5 行且复用 → 平台 Hook
  └── 差异是配置/字符串 → platform.ts 运行时判断
```

## 常犯错误

> 以下为 AI 屡次犯错的记录，编写代码时务必自查。

| #   | 规则                         | 说明                                                                     |
| --- | ---------------------------- | ------------------------------------------------------------------------ |
| 1   | **布局优先 Flex**            | 所有容器必须显式声明 `flex` 或 `flex-col`，禁止依赖默认 block 布局       |
| 2   | **文案必须用 `<text>` 包裹** | 所有可见文字、插值 `{{ }}` 须放在 `<text>` 内，禁止裸露在 `<view>` 中    |
| 3   | **样式优先 Tailwind 类**     | `<style scoped>` 仅用于动画、渐变等 Tailwind 无法实现的场景              |
| 4   | **禁止任意值语法 `[value]`** | 小程序不支持方括号，固定值用预设类，动态值改用 `:style`|
| 5  | **禁止`v-bind="attrs`** | uni-app 编译器不支持 `Vue 3` 的无参数展开，微信小程序 `wxml` 无等效机制|
| 6  | **禁止`wxml`中使用组件`PascalCase`** | 微信小程序不识别 `PascalCase` 组件标签 |
| 7  | **`@click` 在小程序原生 `<button>` 上完全不触发** | 微信 `wxml` 只有 `bindtap`，`@tap` 可稳定编译且 H5 / App 端兼容。|
| 8  | **`uni-app`中`import`任何文件必须引用完整的路径** | uni-app 编译器依赖 import 路径识别自定义组件，barrel re-export 无法追踪到 `.vue` 源文件。|
| 9  | **业务组件必须用 `@tap.stop` 阻止原生事件冒泡** | 组件内部虽然没有 `emit('tap')`，但父组件的 `@tap` 仍被触发。|

