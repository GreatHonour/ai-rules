---
trigger: model_decision
description: 新增、移动或拆分文件时加载，用于判断目录归属与依赖边界。
---

# 项目文件目录规范

> 命名规则见 [naming.md](naming.md)，本文件只负责「放哪里」和「依赖怎么连」。

## `src` 目录职责

| 目录 | 职责 |
| --- | --- |
| `src/baseApi/` | 存放多个页面共用的接口和接口类型 |
| `src/components/` | 存放多个页面共用的业务组件 |
| `src/config/` | 存放应用级静态配置和环境配置映射 |
| `src/plugins/` | 存放请求、存储和通用工具等基础能力 |
| `src/routers/` | 存放路由表、路由实例和路由守卫 |
| `src/styles/` | 存放全局样式、主题和基础样式 |
| `src/types/` | 存放全局声明和跨模块公共类型 |
| `src/views/` | 存放按页面划分的业务模块 |

## 共用 vs 页面私有的判定

判据只有一条：**被引用的范围**。默认放页面内，被第 2 个页面引用时才上提。

| 资源 | 单页面使用 | ≥2 个页面使用 |
| --- | --- | --- |
| 组件 | `views/xxx/components/` | `src/components/` |
| 接口 | `views/xxx/api.ts` | `src/baseApi/` |
| 类型 | `views/xxx/types.ts` | `src/types/` |

> 不要「预判将来会共用」而提前上提，等真的出现第二个引用方再移动。

## 依赖方向规则

依赖只能从上层指向下层，禁止反向和横向：

- `plugins/` 为最底层，不依赖任何业务目录（views/components/baseApi）
- `components/` 不得依赖 `views/`
- `views/` 之间禁止互相 import，需共用就按上表上提
- 任意目录都可依赖 `plugins/`、`config/`、`types/`、`styles/`


## 目录结构示例

页面内的目录和文件按实际需要创建（文件命名见 [naming.md](naming.md)）：

```text
项目根目录/
└── src/
    ├── baseApi/
    │   ├── index.ts
    │   └── types.ts
    ├── config/
    │   └── index.ts
    ├── styles/
    ├── types/
    ├── components/
    │   └── activity-banner/
    │       ├── __tests__/
    │       ├── types.ts
    │       └── activity-banner.vue
    ├── plugins/
    │   └── axios/
    │       ├── __tests__/
    │       ├── index.ts
    │       └── types.ts
    ├── routers/
    │   ├── __tests__/
    │   ├── index.ts
    │   └── routes.ts
    └── views/
        └── home/
            ├── __tests__/
            ├── components/
            ├── api.ts
            ├── types.ts
            ├── useActivityState.ts
            └── home.vue
```

> 单元测试就近放在各模块的 `__tests__/`，规则见 [testing.md](testing.md)。
