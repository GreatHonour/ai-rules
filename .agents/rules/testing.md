---
trigger: model_decision
description: 当你要编写或修改测试用例时，来这里查看测试模板、目录结构和覆盖要求。
---

## 测试规范

### 编写测试前置判断（强制）

不要直接套用下方测试模板。先从项目配置确认 **Vue 主版本** 和 **测试运行器**，再选择对应语法：

1. 读取 `package.json` 中 `vue` 的主版本。
2. Vue 2 通常同时存在 `vue-template-compiler`，使用 `@vue/test-utils` v1；Vue 3 通常存在 `@vue/compiler-sfc`，使用 `@vue/test-utils` v2。
3. 根据 `jest.config.*` / `vitest.config.*`、脚本命令和已存在的测试文件，确认使用 Jest 还是 Vitest。配置和现有用例冲突时，以项目实际可运行配置为准。
4. 若版本或运行器无法确认，先检查锁文件和 CI 配置，禁止凭经验猜测。

### Vue 版本与测试语法

| 项目类型 | 推荐测试工具 | 测试语法要点 |
| --- | --- | --- |
| Vue 2 | `@vue/test-utils` v1 + Jest/Vitest | Options API；通过 `wrapper.vm` 访问 `data` / `computed` / `methods`；组件事件使用 `wrapper.emitted()`；异步更新使用 `Vue.nextTick()` 或项目已有 helper |
| Vue 3 | `@vue/test-utils` v2 + Vitest/Jest | Composition API / `<script setup>`；通过 `setProps`、`setValue`、`emitted` 验证公开行为；异步更新使用 `nextTick` / `flushPromises`；Vitest 才能使用 `vi.*` |

不要混用以下 API：

- Vue 2 不使用 `vi`、`defineProps`、`defineEmits`、`onMounted` 等 Vue 3 API。
- Vue 3 不使用 `this.$set`、`this.$destroy` 或 Vue 2 专属的实例操作。
- Jest 使用 `jest.fn()` / `jest.spyOn()`；Vitest 使用 `vi.fn()` / `vi.spyOn()`。Mock API 必须与运行器一致。

### 技术栈

- **Vue 2**：`@vue/test-utils` v1 + 项目已配置的 Jest 或 Vitest
- **Vue 3**：`@vue/test-utils` v2 + 项目已配置的 Vitest 或 Jest
- 测试位置：组件同级 `__tests__/` 目录，文件名与组件名一致

### 测试骨架

```typescript
// Vue 2 + Jest 示例：
import { mount } from '@vue/test-utils';
import Component from '../Component.vue';

describe('Component', () => {
  it('应渲染标题', () => {
    const wrapper = mount(Component, { propsData: { title: '标题' } });
    expect(wrapper.text()).toContain('标题');
  });
});

// Vue 3 + Vitest 示例：
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Component from '../Component.vue';

describe('Component', () => {
  it('应响应 prop 变化', async () => {
    const wrapper = mount(Component, { props: { title: '标题' } });
    await wrapper.setProps({ title: '新标题' });
    expect(wrapper.text()).toContain('新标题');
  });
});
```

### 分区与断言约定

- 用 `// ==================== 分类名 ====================` 分区
- **禁止断言样式相关内容**：不检测 Tailwind 原子类、BEM 装饰类、内联样式等纯样式实现，避免每次改样式都导致测试报错
- 断言优先级（从高到低）：
  1. 逻辑与数据：直接断言 `wrapper.vm` 的 computed / data
  2. 子组件交互：`findComponent()` + `props()` / `emitted()`
  3. 渲染文本：`wrapper.text()` 先做空白归一化（`.replace(/\s+/g, '')`）再 `toContain`，避免模板排版空格导致误报
- 确需 DOM 锚点时（如条件渲染节点），使用 `data-test` 属性，不复用样式类名

### Vue 3 环境测试技巧（仅在项目确认为 Vue 3 且使用对应运行器时适用）

- teleport 内容（如 IPopup 默认 teleport 到 body）不在组件树内，`wrapper.text()` 取不到，改用 `document.body.textContent` 断言
- 懒加载路由组件（`() => import(...)`）挂载需多轮宏任务，`flushPromises` 不够时用 `vi.waitFor` 轮询断言目标出现
- 测试互斥态（如 viewState 为 null ⟺ state 为 null 的骨架屏语义）时，必须同步置空所有关联 ref，只改一侧会构造出真实链路不存在的状态组合

### 覆盖要求

每个组件**必须**覆盖：

| 分类 | 测试点 |
| ---- | ------ |

### 核心规则

- 中文描述：`'应{行为}'` 或 `'{场景}时应{行为}'`
- 运行：`pnpm test`，单组件：`pnpm test -- --filter i-button`
