---
trigger: model_decision
description: TypeScript 通用编码规范：类型安全、命名常量、函数设计、不可变性等。定义 interface/type/enum 或编写业务逻辑时必读。
---

## TypeScript 规范

### 类型安全（强制）

**禁用项**：
- 禁止 `any` → 用 `unknown` + 类型收窄
- 禁止 `@ts-ignore` → 用 `@ts-expect-error` + 注释原因
- 禁止 `!` 非空断言 → 用 `?.` 或显式 null 检查
- 禁止裸 `object`、`Function`、`{}` → 用具体类型

**必须标注**：
- 导出函数必须标注返回类型（内部函数可推导）
- API 调用必须标注泛型：`get<UserInfo>()`，禁止裸 `get()`
- 类型导入必须用 `import type` 区分值/类型导入

**特殊约定**：
- OpenAPI `integer(int64)` 前端统一映射为 `string`（避免大整数精度风险）

### 类型定义模式（组件 Props/Emits）

> 联合字面量类型**先独立导出为 `type` 别名**，再在 `interface` 中引用，而非内联在 interface 中。

```typescript
// ✅ 正确：先独立导出 type 别名，再在 interface 中引用
export type ButtonType = 'primary' | 'danger' | 'black';

export interface ButtonProps {
  type?: ButtonType;
}

// ❌ 错误：联合字面量内联在 interface 中
export interface ButtonProps {
  type?: 'primary' | 'danger' | 'black';
}
```

### 类型位置
> `import type` 排在第一个位， 如下：

```typescript
import type { Request } from 'express';
import type { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AUTHORIZATION_BEARER_PREFIX } from './constants/auth.constants';
```

### interface vs type vs enum

| 场景 | 用什么 |
| ---- | ------ |
| 对象结构（Props、响应体） | `interface` |
| 联合类型、函数签名、工具类型 | `type` |
| 有限状态集合（≥3 个固定值） | `enum`（UPPER_SNAKE_CASE 值） |
| 少量状态（2-3 个） | `type` 联合字面量 |

### 样式映射对象的类型约束

组件中的样式映射对象使用 `as const` 保证类型安全和自动推导：

```typescript
// ✅ 映射对象用 as const
const TYPE_STYLE_MAP = { primary: { solid: '...', plain: '...' } } as const;

// ❌ 没有 as const，丢失字面量类型信息
const TYPE_STYLE_MAP = { primary: { solid: '...' } };
```

### 函数设计规范

**参数设计**：
- 参数 ≤2 个 → 直接传递
- 参数 >2 个 → 合并为对象参数并定义 interface

**拆分原则**（避免过度拆分和巨型函数）：
- 仅当被复用 ≥2 次**或**函数体超过 30 行时才提取
- 逻辑内聚的代码块不要强行拆分

**异步处理**：
- 统一使用 `async/await` + `try/catch`，**禁止裸跑 Promise**

### 不可变性

- 非响应式常量、函数入参 → `readonly` / `as const`
- Vue 响应式数据（ref、reactive）不受此限制

### 防御性编程

- API 返回值 / 外部输入 → 先验证数据结构再使用
- 注释只解释"**为什么**这么做"，不解释"在做什么"

---

## 常犯错误

> 以下为 AI 屡次犯错的记录，编写代码时务必自查。

| # | 规则 | 备注 |
|---|------|------|
| 1 | 禁止全局可变状态 — 用工厂函数 + 闭包替代模块级 `let` | |
| 2 | 禁止 `as unknown as` 双重断言 — 类型不匹配应修正类型定义 | |
| 3 | 类型定义与实际数据必须一致 — 后端返回 `string \| string[]` 就不能只写 `string[]` | |
