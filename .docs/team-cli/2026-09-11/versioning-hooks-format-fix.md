# 版本管理、提交钩子与风格格式化配置接入

## 目标
- 类型：小型变更（配置接入为主，含一次性格式化）
- 目标：
  - 提交信息不符合 `.agents/rules/git-commit.md` 规范 → `commit-msg` 钩子拒绝
  - 提交暂存文件 → `pre-commit` 自动 Prettier 格式化暂存文件，然后执行 registry 资源门禁
  - `pnpm release:version` → 消耗变更记录、升级 package.json 版本号、生成 CHANGELOG.md（仅本地版本管理）
  - `pnpm format` / `pnpm format:check` → 全仓库格式化或只读检查
- 边界：
  - 不接入 npm publish（不添加 `release:publish`）
  - `.githooks/pre-commit`（资源维护门禁）保留原样，由 husky 的 pre-commit 调用，不删除其独立归属
  - 不格式化 `.agents/`、`.docs/`、`flow-v1/`、`flow-v2/`、`.changeset/` 与生成物（分发资源受 registry 校验约束，历史内容保持原样）
  - 不改动 src 业务语义；不执行 git commit；不主动修改用户已有暂存内容
  - `.npmrc` 移出版本库（本地文件保留）

## 历史依据
- 功能文档：`.changeset/README.md` 引用 `pnpm release:version` / `pnpm release:publish`，但 `package.json` 两脚本均未定义；`version.md` 内容属于 `@icc-grow/web-components`（提到 VitePress/vite build），与本项目不匹配；`.agents/rules/git-commit.md` 定义 type 列表
- 代码历史：`511db38` 引入 `.githooks/pre-commit` + `hooks:install` 机制并写入 README；当前分支为 `main` 而 `.changeset/config.json` 的 `baseBranch` 为 `master`；用户已通过 `pnpm add` 装入 changesets、commitlint、husky、lint-staged、prettier（bin 已就绪）
- 用户决策：husky 管当前项目的工程化钩子，`.githooks` 保留为 CLI 资源门禁；`version.md` 改造为 team-cli 版；仅本地版本管理；`.npmrc` 移出仓库

## 实现
- [x] → `.changeset/config.json`：`baseBranch` `master` → `main`，与当前分支一致
- [x] → `package.json` scripts：新增 `prepare`（`husky`）、`format`（`prettier --write .`）、`format:check`（`prettier --check .`）、`release:version`（`changeset version`）；移除 `hooks:install`（其 `core.hooksPath=.githooks` 与 husky 冲突）
- [x] → 新增 `commitlint.config.cjs`：扩展 `@commitlint/config-conventional`，`type-enum` 对齐 `git-commit.md`（feat/fix/docs/style/refactor/perf/test/chore/revert）
- [x] → 新增 `.husky/pre-commit`：`pnpm exec lint-staged` + 调用 `.githooks/pre-commit`（资源门禁仍生效，保持单一来源）
- [x] → 新增 `.husky/commit-msg`：`pnpm exec commitlint --edit "$1"`
- [x] → 新增 `.lintstagedrc.cjs`：暂存文件按 `*.{ts,js,cjs,mjs,json,md,yml,yaml}` 执行 `prettier --write`
- [x] → 新增 `.prettierignore`：排除 node_modules/、dist/、pnpm-lock.yaml、.pnpm-store/、CHANGELOG.md、.changeset/、.agents/、.docs/、flow-v1/、flow-v2/
- [x] → 新增 `.gitattributes`（`* text=auto eol=lf`）：sh 钩子脚本跨平台保持 LF，`format:check` 跨机器一致
- [x] → `.gitignore` 增加 `.npmrc`，并执行 `git rm --cached .npmrc`（工作区文件保留）
- [x] → 全仓库一次性 `prettier --write`（src 全部 + 根文档；纯格式、无语义变更，共 38 个文件）
- [x] → 激活 husky（生成 `.husky/_/`，`core.hooksPath` 指向 `.husky/_`）
- [x] → `.github/workflows/team-cli.yml`：verify job 增加 `pnpm format:check`
- [x] → `README.md`：hooks 安装段改为 husky 说明；补充版本管理与格式化章节
- [x] → 重写 `version.md`：team-cli 的 Changesets 本地版本管理流程（记录变更 → 升级版本 → 提交）
- [x] → `.changeset/README.md`：修正脚本引用与流程说明
- [x] → lint-staged 干跑验证（`--diff=HEAD`）：任务与 glob 匹配正常（44 个文件）；干跑触发的未暂存内容恢复失败已修复（`version.md` 冲突重写为最终版并重新同步索引，干跑产物 `.git/lint-staged_unstaged.patch` 已清理）

## 验证场景
- [x] 合法提交信息（`feat(cli): 测试提交`）→ commitlint exit 0
- [x] 非法提交信息（`update stuff`）→ exit 1（subject-empty/type-empty）；非法 type（`foo(cli): 测试`）→ exit 1（type-enum 精确列出 9 个 type）
- [x] `git config core.hooksPath` → `.husky/_`，且 `.husky/_/pre-commit`、`.husky/_/commit-msg` 包装器存在
- [x] `pnpm format:check` → 全绿（38 个文件一次性格式化）
- [x] `pnpm agents registry:check` → registry 校验通过（.agents 未被格式化，门禁不受影响）
- [x] `pnpm test`（51/51）、`pnpm check`、`pnpm build` → 通过（格式化未破坏语义）
- [x] `pnpm changeset status` → 正常执行并提示"包已变更但缺少变更记录"（版本管理链路可用）

## 影响范围
- 配置：`package.json`、`.changeset/config.json`、`.husky/`、`.lintstagedrc.cjs`、`commitlint.config.cjs`、`.prettierignore`、`.gitattributes`、`.gitignore`、`.github/workflows/team-cli.yml`
- 文档：`README.md`、`version.md`、`.changeset/README.md`、`AGENTS.md`（格式化被动变更）
- 代码：`src/**`（仅格式化；其中 6 个文件已含此前暂存的语义改动；因 lint-staged 干跑扰动，格式化结果当前已进入索引）
- 暂存区：`.npmrc` 移出（工作区保留）；既有暂存内容保留；本次新增的 `.gitattributes`、`.husky/`、`.lintstagedrc.cjs`、`.prettierignore`、`commitlint.config.cjs` 与 `.gitignore` 修改保持未暂存，留待提交时一并处理
