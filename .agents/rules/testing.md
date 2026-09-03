---
trigger: model_decision
description: 编写或修改测试用例时查看测试语法、断言约定和覆盖要求
---

## 测试规范

### 前置检查（强制）

编写测试前必须确认项目配置，禁止凭经验猜测：

1. **Vue 版本**：读取 `package.json` 中 `vue` 的主版本
2. **测试运行器**：检查 `jest.config.*` / `vitest.config.*` 和现有测试文件确认是 Jest 还是 Vitest
3. **版本无法确认时**：检查锁文件和 CI 配置，不要套用模板

### Vue 2 测试要点

**测试工具**：`@vue/test-utils` v1 + Jest/Vitest

**关键语法**：
- Props 传参：`mount(Component, { propsData: { title: '标题' } })`
- 访问实例：`wrapper.vm.data` / `wrapper.vm.computedProp` / `wrapper.vm.method()`
- 事件断言：`wrapper.emitted('event-name')`
- Mock 函数：Jest 用 `jest.fn()`，Vitest 用 `vi.fn()`

**测试骨架**：
```typescript
import { mount } from '@vue/test-utils';
import Component from '../Component.vue';

describe('Component', () => {
  it('应渲染标题', () => {
    const wrapper = mount(Component, { propsData: { title: '标题' } });
    expect(wrapper.text()).toContain('标题');
  });

  it('点击按钮时应触发事件', async () => {
    const wrapper = mount(Component);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('submit')).toBeTruthy();
  });
});
```

**禁止使用**：`vi`（Vitest 专属）、`defineProps`、`onMounted`、Composition API

### Vue 3 测试要点

**测试工具**：`@vue/test-utils` v2 + Vitest/Jest

**关键语法**：
- Props 传参：`mount(Component, { props: { title: '标题' } })`
- 避免访问 `wrapper.vm`，通过 props/events 验证行为
- 事件断言：`wrapper.emitted('eventName')`
- Mock 函数：Vitest 用 `vi.fn()`，Jest 用 `jest.fn()`
- 异步更新：`await nextTick()` 或 `await flushPromises()`

**测试骨架**：
```typescript
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Component from '../Component.vue';

describe('Component', () => {
  it('应响应 prop 变化', async () => {
    const wrapper = mount(Component, { props: { title: '标题' } });
    await wrapper.setProps({ title: '新标题' });
    expect(wrapper.text()).toContain('新标题');
  });

  it('点击按钮时应触发事件', async () => {
    const wrapper = mount(Component);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });
});
```

**禁止使用**：`propsData`、`wrapper.vm` 直接访问、`this.$set`、`this.$destroy`、Options API 专属方法


### 断言规则

**禁止断言样式**：不检测样式类名、内联样式，避免样式改动导致测试失败。
**断言优先级**（从高到低）：
1. **逻辑与数据**：Vue 2 可直接断言 `wrapper.vm.computedProp`；Vue 3 通过 props/events 验证
2. **子组件交互**：`findComponent(ChildComponent).props('propName')` 和 `emitted('eventName')`
3. **渲染文本**：`wrapper.text().replace(/\s+/g, '')` 归一化空白后再 `toContain`
**DOM 锚点**：条件渲染用 `data-testid` 属性定位，不复用样式类名。

### 覆盖要求

每个组件必须覆盖：

| 分类 | 测试点 | 示例 |
| --- | --- | --- |
| Props | 必传 props 渲染；关键 props 变化响应 | `setProps({ disabled: true })` 后按钮不可点击 |
| Events | 用户交互触发的事件及参数 | 点击按钮触发 `submit` 事件，参数包含表单数据 |
| 条件渲染 | 不同状态下的显示/隐藏 | `loading` 为 true 时显示加载图标 |
| 核心逻辑 | Computed/方法的返回值 | Vue 2: `wrapper.vm.filteredList.length === 2` |

### 组织结构

- **测试位置**：组件同级 `__tests__/` 目录，文件名与组件名一致
- **分区注释**：用 `// ==================== Props ====================` 分隔场景
- **描述规范**：`'应{行为}'` 或 `'{场景}时应{行为}'`

### 运行命令

```bash
pnpm test                        # 全量测试
pnpm test -- --filter Button     # 单文件测试
```

