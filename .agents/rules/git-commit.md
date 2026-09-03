---
trigger: model_decision
description: 当你要帮用户写 commit message 或执行 git commit 的时候，来这里查格式要求。
---

## Git 提交规范（Conventional Commits）

> **提交描述文案要简洁**

### 格式

```
<type>(<scope>): <subject>
```

### Type 说明

| type       | 用途                   |
| ---------- | ---------------------- |
| `feat`     | 新功能                 |
| `fix`      | Bug 修复               |
| `docs`     | 文档更新               |
| `style`    | 代码格式（不影响逻辑） |
| `refactor` | 重构                   |
| `perf`     | 性能优化               |
| `test`     | 测试                   |
| `chore`    | 构建/工具链            |
| `revert`   | 回滚                   |

### 提交粒度原则

- ✅ 一个 commit 只做一件事
- ✅ 不同模块/功能分开提交
- ✅ 使用 `git add <file>` 精准暂存文件
- ❌ 避免 `git add .` 把所有修改混在一起提交

### 示例

```bash
feat(coupon): 新增优惠券领取功能
fix(order): 修复订单详情页价格显示错误
chore(eslint): 更新 ESLint 配置
refactor(request): 重构网络请求拦截器
```

```bash
# ❌ 禁止
git commit -m "fix bug"
git commit -m "修改了一些东西"
git add . && git commit -m "更新了很多文件"  # 多个模块混在一起

# ✅ 规范
git commit -m "fix(coupon): 修复微信小程序下优惠券图片不显示问题"
git add src/rules/*.md && git commit -m "docs(rules): 统一更新代码规范"
git add src/skill/flow.md && git commit -m "feat(flow): 新增流程审查功能"
```
