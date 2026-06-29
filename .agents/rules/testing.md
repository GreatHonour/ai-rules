---
trigger: model_decision
description: 当你要编写或修改测试用例时，来这里查看测试模板、目录结构和覆盖要求。
---

## 测试规范

### 技术栈

- **Vitest** + `@vue/test-utils`
- 测试位置：组件同级 `__tests__/` 目录，文件名与组件名一致

### 测试骨架

```typescript

```

### 分区与断言约定

- 用 `// ==================== 分类名 ====================` 分区
- 映射注入的 Tailwind class 用 `wrapper.classes().join(' ')` 检测
- BEM class / 状态类用 `wrapper.classes().toContain()` 检测
- BEM 子元素用 `wrapper.find('.i-xxx__el').exists()` 检测

### 覆盖要求

每个组件**必须**覆盖：

| 分类 | 测试点 |
| ---- | ------ |

### 核心规则

- 中文描述：`'应{行为}'` 或 `'{场景}时应{行为}'`
- 运行：`pnpm test`，单组件：`pnpm test -- --filter i-button`