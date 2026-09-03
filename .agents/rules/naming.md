---
trigger: model_decision
description: 创建任何新文件、变量、函数或组件时加载。确认文件名格式、变量命名风格、组件前缀规则时必读。
---

# 命名规范

> **加载时机**：给任何东西起名字时

---

## 文件 & 目录

| 类型         | 规则                     | 示例                        |
| ------------ | ------------------------ | --------------------------- | 
| 页面文件     | `kebab-case`             | `order-list.vue`            | 
| 组件文件夹   | `kebab-case`             | `coupon-card/`              | 
| 组件文件     | 与文件夹同名             | `coupon-card/coupon-card.vue` |
| hooks 文件   | `use` 前缀 + `camelCase` | `useOrderList.ts`           | 
| 工具函数文件 | `camelCase`              | `dateFormat.ts`             | 
| 测试文件     | 源文件名 + `.spec`       | `coupon-card.spec.ts`       | 
| API / 类型   | 固定命名                 | `api.ts`、`types.ts`        |
---

## 变量 & 函数

| 类型         | 规则                                 | 示例                                     |
| ------------ | ------------------------------------ | ---------------------------------------- |
| 普通变量     | `camelCase`，名词短语                | `couponList`、`selectedCouponId`         |
| 布尔变量     | `is` / `has` / `can` / `should` 前缀 | `isExpired`、`hasPermission`             |
| 常量         | `UPPER_SNAKE_CASE`                   | `MAX_RETRY_COUNT`、`DEFAULT_PAGE_SIZE`   |
| 函数         | `camelCase`，动词开头                | `fetchCouponList()`、`handleSubmit()`    |
| 事件处理     | `handle` + 事件源 + 事件类型         | `handleCouponSelect()`                   |
| 类型/接口    | `PascalCase`                         | `CouponItem`、`OrderStatus`              |
| 枚举         | `PascalCase`，值 `UPPER_SNAKE_CASE`  | `enum OrderStatus { PENDING = 'PENDING' }` |

---

## Vue 组件

| 类型              | 规则                      | 示例                                     |
| ----------------- | ------------------------- | ---------------------------------------- |
| 组件 `name` 属性  | `PascalCase`              | `name: 'CouponCard'`                     |
| 模板中使用组件    | `kebab-case`              | `<coupon-card />`                        |
| 组件 props        | `camelCase`               | `selectedId`、`maxCount`                 |
| 组件 emits        | `kebab-case`              | `@update:value`、`@coupon-select`        |

---

## 禁止的命名

泛化命名禁止作为**最终变量名**：`data`、`list`、`item`、`flag`、`temp`、`tmp`、`val`、`obj`、`res`。

> **Review Checklist**：发现泛化命名必须重命名为语义化名称。
