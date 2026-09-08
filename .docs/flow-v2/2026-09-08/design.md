# flow v2 设计文档

## 目标与范围

- 目标：在不修改现有 `.agents/skills/flow-*` 的前提下，建立一个以 DeliveryGuard 方法论为核心、轻量且可组合的 v2 Skill 集合。
- 成功标准：每个 v2 Skill 的入口文件短小、职责单一；复杂规则按需放入 references；产物有统一模板；事实、证据、状态和授权边界可由脚本检查。
- 职责边界：v2 负责开发交付流程与证据门禁，不复制 DeliveryGuard 的领域专项实现，也不替代项目自身的数据库、设备、部署或消息适配器。

## 现状与约束

- 原有八个 `flow-*` 保持不变，继续作为完整规范版。
- 新集合放在 `.agents/skills/v2/`，每个子目录是独立 Skill；Skill 名称使用 `flow-v2-` 前缀以便发现和区分。
- 入口 Skill 只表达触发条件、前置事实、最小动作、输出、状态和授权；细节渐进披露。
- 默认只读；外部写入、生产操作、凭证、业务数据、设备系统设置均需当前动作的明确授权。
- 生命周期状态由事实推导：`planned → specified → implemented → verified → released`。

## 技术方案

### Skill 集合

```text
v2/
├── flow-v2-intake/       # 登记交付范围和事实入口
├── flow-v2-plan/         # 将确认意图变成可验证计划
├── flow-v2-implement/    # 依赖顺序实施并登记源码事实
├── flow-v2-review/       # 代码质量与范围审查
├── flow-v2-verify/       # 文档→需求→用例→证据验收
├── flow-v2-repair/       # red/green/regression 缺陷闭环
├── flow-v2-release/      # 独立生产部署门禁
└── flow-v2-close/        # 交付交接、知识沉淀和归档
```

共享资源：

- `references/state-model.md`：状态、结论和升级规则。
- `references/evidence-contract.md`：证据最小字段、覆盖矩阵和敏感信息约束。
- `references/authorization.md`：只读默认、外部写入和生产操作边界。
- `references/adapter-contract.md`：项目适配器输入/输出协议，不绑定具体工具。
- `assets/`：delivery manifest、计划、验收、修复、发布和收口模板。
- `scripts/validate_manifest.mjs`、`scripts/validate_evidence.mjs`、`scripts/validate_tasks.mjs`：确定性校验。

### 统一交付对象

每次交付使用 `delivery.json` 作为唯一事实源，至少包含交付 ID、版本、文档、仓库、环境、当前阶段、源码事实、验收报告和部署锚点；可按模板生成 Markdown 摘要，但不得成为第二事实源。阶段字段不得手工越级，由校验脚本根据事实推导并报告差异。

### 统一证据对象

验收矩阵使用 `document → requirement → case → result → evidence` 映射。`passed` 需要完整覆盖和全部通过；失败、阻塞、不确定、跳过和待处理保持独立语义，不得互相升级。

### 适配器边界

适配器只负责项目特定的检查、环境连接、部署和证据采集；必须返回结构化事实、命令 argv、环境锚点、时间和副作用声明。Skill 不内置凭证、固定 URL、设备标识或供应商命令。

## 功能点

#### F1：范围与事实登记

- 交付对象、版本、文档、仓库和环境齐全 → 进入 `planned` 或报告缺口。

#### F2：计划与执行

- 计划完整且已确认 → 生成有序任务；任务完成必须绑定真实源码和检查事实。

#### F3：审查与修复

- 存在代码改动 → 输出有证据的问题清单；缺陷修复必须具备失败基线、通过候选和回归证据。

#### F4：验收与发布

- 覆盖完整且证据有效 → `verified`；每个必需仓库有成功生产部署锚点 → `released`。

#### F5：收口与知识

- 只归档已证实事实；保留验收和发布边界，清理过程文件，脱敏后沉淀知识。

## 异常与边界

- 缺少范围、版本、仓库或环境 → `pending`，不得升级状态。
- 证据不足但无明确失败 → `inconclusive`，不得写成通过。
- 依赖、权限或环境不可用 → `blocked`，记录具体阻塞者。
- 外部写入未获明确授权 → 停止在动作前，保留计划，不模拟成功。
- OpenSpec/计划完成、测试通过、代码合并、预览地址均不能单独证明 `verified` 或 `released`。

## Out of Scope

- 不修改现有 `flow-*`。
- 不复制 DeliveryGuard 的 19 个领域专项 Skill；只吸收其方法论和关键门禁。
- 不实现具体数据库、网关、设备、部署平台或消息服务连接器。
