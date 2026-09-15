---
trigger: model_decision
description: Vue 3 项目的测试编写规范
version: "1.0.1"
---

## Vue 3 测试规范

### 核心语法

```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Component from '../Component.vue';

// Props 传参使用 props
const wrapper = mount(Component, { props: { title: '标题' } });

// 避免直接访问 wrapper.vm，通过 props/events 验证行为

// 事件断言
wrapper.emitted('eventName')
```

### 断言原则

**组件测试优先级**（从高到低）：
1. 子组件交互：`findComponent(Child).props()` 和 `emitted()`
2. 渲染文本：`wrapper.text()` 归一化空白后断言
3. 避免依赖 `wrapper.vm` 内部状态

**禁止**：断言样式类名或内联样式

```typescript
// ✅ 正确
expect(wrapper.findComponent(Child).props('active')).toBe(true);
expect(wrapper.text()).toContain('已激活');

// ❌ 错误
expect(wrapper.vm.isActive).toBe(true);  // 破坏封装
expect(wrapper.find('.active').exists()).toBe(true);
```

### 覆盖要求

**核心路径**：主要业务逻辑和用户流程必须覆盖
- 组件：Props 渲染、Events 触发、条件渲染、子组件通信
- 逻辑函数：各种输入输出组合、返回值正确性
- Composables/Hooks：状态变化、副作用执行、依赖注入
- Stores/Services：状态管理、API 调用、数据转换

**边界情况**：异常输入和极端场景
- 空值/null/undefined 处理
- 空数组/空对象/空字符串
- 最大值/最小值/负数
- 数据类型错误

**错误处理**：异常分支和降级逻辑
- try-catch 分支
- API 失败场景
- 网络超时和重试
- 用户权限不足
