---
trigger: model_decision
description: Vue 2 项目的测试编写规范
---

## Vue 2 测试规范

### 核心语法

```typescript
import { mount } from '@vue/test-utils';
import Component from '../Component.vue';

// Props 传参使用 propsData
const wrapper = mount(Component, { propsData: { title: '标题' } });

// 可以直接访问组件实例
wrapper.vm.computedProp
wrapper.vm.method()

// 事件断言
wrapper.emitted('event-name')
```

### 断言原则

**组件测试优先级**（从高到低）：
1. 直接断言 `wrapper.vm` 的 data/computed/methods 返回值
2. 子组件交互：`findComponent(Child).props()` 和 `emitted()`
3. 渲染文本：`wrapper.text()` 归一化空白后断言

**禁止**：断言样式类名或内联样式

```typescript
// ✅ 正确
expect(wrapper.vm.isActive).toBe(true);
expect(wrapper.vm.filteredList).toHaveLength(2);

// ❌ 错误
expect(wrapper.find('.active').exists()).toBe(true);
```

### 覆盖要求

**核心路径**：主要业务逻辑和用户流程必须覆盖
- 组件：Props 渲染、Events 触发、条件渲染、核心逻辑
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
