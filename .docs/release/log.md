## 功能：npm 发布

### 2026-09-14 明确发布结果

- 能力或变更：`pnpm release:publish` 保留 Changesets 原始输出，并明确报告发布成功或没有待发布版本。
- 关键逻辑：解析器忽略终端前缀和 ANSI 颜色，只有 Changesets 报告当前包和版本已成功发布时才输出 npm 版本地址。
- 结构决策：使用独立发布脚本包装 `changeset publish`，包元数据仍以 `package.json` 为唯一来源。
- 遗留：实际发布仍依赖 npm 组织权限和有效的 `NPM_TOKEN`，未进行真实 npm 发布验证。
