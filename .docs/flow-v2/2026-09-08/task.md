# flow v2 任务列表

## 架构与资源

#### [x] T1: 建立 v2 Skill 集合目录与统一资源
depends: 无

- `.agents/skills/v2/` 下包含八个独立 Skill 子目录，以及共享 `references/`、`assets/`、`scripts/`。
- 每个 Skill 具有合法 frontmatter、独立触发描述和最小职责。

#### [x] T2: 编写状态、证据、授权和适配器参考文档
depends: T1

- references 能独立解释状态推导、证据契约、授权边界和适配器协议。

#### [x] T3: 编写交付产物模板
depends: T1

- assets 提供 delivery、plan、acceptance、repair、release、close 模板。

## 独立 Skills

#### [x] T4: 实现 flow-v2-intake
depends: T2, T3

- 登记交付范围和已有事实；缺口保持 `planned/pending`，不发明提交或部署信息。

#### [x] T5: 实现 flow-v2-plan
depends: T2, T3

- 将已确认意图转换为可验证设计、任务和验收映射；阻塞决策未清零时停止。

#### [x] T6: 实现 flow-v2-implement
depends: T2, T3, T5

- 按依赖实施最小任务；真实源码事实和检查结果写回交付记录。

#### [x] T7: 实现 flow-v2-review
depends: T2, T6

- 基于 diff、设计和规则输出分级问题；用户确认前不擅自修改。

#### [x] T8: 实现 flow-v2-verify
depends: T2, T3, T6, T7

- 建立并校验文档到证据矩阵，按统一语义推导验收结论。

#### [x] T9: 实现 flow-v2-repair
depends: T2, T3

- 记录首个失败边界和 red/green/regression 证据；配置或基础设施故障不冒充代码修复。

#### [x] T10: 实现 flow-v2-release
depends: T2, T3, T8

- 只从成功生产部署事实推导 `released`，一仓库一事实一锚点。

#### [x] T11: 实现 flow-v2-close
depends: T2, T3, T8, T10

- 生成证据交接、脱敏知识和归档摘要；不把归档或交接升级为验收/发布。

## 程序化检查

#### [x] T12: 实现并验证 manifest、evidence、tasks 校验脚本
depends: T2, T3

- Node 脚本对必填字段、路径、状态、覆盖和任务依赖给出非零失败码。
- 脚本包含中文 JSDoc 函数注释，并提供最小运行示例。

## 集成验证

#### [x] T13: 验证 v2 集合的结构与关键门禁
depends: all

- 运行 skill quick validation 和三类脚本的成功/失败样例。
- 验证未授权写入、缺证据升级、无部署锚点发布等场景均被阻断。
