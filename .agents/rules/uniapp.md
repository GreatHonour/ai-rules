---
trigger: model_decision
description: uni-app 多端开发规则
---

# uni-app 多端兼容规范

## 条件编译

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

`#ifdef` 是编译期指令，不可嵌套。运行时判断用 `uni.getSystemInfoSync().platform`。

## 差异代码策略

**共同逻辑只写一次，平台差异收拢到最小范围**

- **差异 1-2 行** → `#ifdef` 适配函数
- **差异 > 5 行且复用** → 拆分平台 Hook：`useShare.ts` + `.mp.ts` / `.h5.ts`
- **配置/字符串差异** → 运行时判断：`isMP` + 三元表达式

## 核心约束

- **布局显式用 `flex` / `flex-col`** — 禁止依赖 block 默认布局
- **文案必须 `<text>` 包裹** — 插值 `{{ }}` 不可裸露在 `<view>` 中
- **样式优先 Tailwind 类** — `<style>` 仅用于动画/渐变
- **禁止 `[value]` 任意值语法** — 小程序不支持方括号，动态值用 `:style`
- **禁止 `v-bind="$attrs"`** — 编译器不支持无参数展开
- **组件标签用 `kebab-case`** — 小程序不识别 `PascalCase`
- **原生 `<button>` 用 `@tap`** — 小程序 `@click` 不触发
- **`import` 必须完整路径** — 编译器无法追踪 barrel re-export
- **业务组件用 `@tap.stop`** — 防止原生事件冒泡到父组件

