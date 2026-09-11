import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { runGit } from './git-command.js';

const executeFile = promisify(execFile);

export interface IssueUploadResult {
  readonly branchName: string;
  readonly commit: string;
  readonly paths: readonly string[];
}

/** 将 issue 名转换为安全的分支片段。 */
export function createIssueSlug(issueName: string): string {
  const slug = issueName.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug === '') {
    throw new Error('issue 名称无法转换为安全分支 slug');
  }
  return slug;
}

/** 执行用于存在性判断的 Git 命令并返回是否成功。 */
async function canRunGit(workspacePath: string, argumentsList: readonly string[]): Promise<boolean> {
  try {
    await executeFile('git', argumentsList, { cwd: workspacePath });
    return true;
  } catch {
    return false;
  }
}

/** 验证候选提交仅包含 .agents/issues 路径。 */
function validateIssuePaths(paths: readonly string[]): void {
  const invalidPath = paths.find((pathText) => !pathText.replaceAll('\\', '/').startsWith('.agents/issues/'));
  if (invalidPath !== undefined) {
    throw new Error(`候选提交包含 .agents/issues/ 外路径: ${invalidPath}`);
  }
}

/** 使用临时 Git index 创建并推送仅含 issues 的提交。 */
export async function uploadIssues(
  workspacePath: string,
  issueName: string,
  remoteName = 'origin',
): Promise<IssueUploadResult> {
  await runGit(workspacePath, ['rev-parse', '--is-inside-work-tree']);
  await runGit(workspacePath, ['remote', 'get-url', remoteName]);
  const branchName = `codex/issue-${createIssueSlug(issueName)}`;
  if (await canRunGit(workspacePath, ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`])) {
    throw new Error(`本地分支已存在: ${branchName}`);
  }
  if (await canRunGit(workspacePath, ['ls-remote', '--exit-code', '--heads', remoteName, `refs/heads/${branchName}`])) {
    throw new Error(`远端分支已存在: ${branchName}`);
  }
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'team-cli-index-'));
  const indexPath = join(temporaryDirectory, 'index');
  const gitEnvironment = { GIT_INDEX_FILE: indexPath };
  try {
    const headCommit = (await runGit(workspacePath, ['rev-parse', 'HEAD'])).trim();
    await runGit(workspacePath, ['read-tree', 'HEAD'], { environment: gitEnvironment });
    try {
      await runGit(workspacePath, ['add', '-A', '--', '.agents/issues'], { environment: gitEnvironment });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('did not match any files')) {
        throw new Error('.agents/issues/ 没有变化');
      }
      throw error;
    }
    const stagedPathsText = await runGit(workspacePath, ['diff', '--cached', '--name-only', '-z'], { environment: gitEnvironment });
    const stagedPaths = stagedPathsText.split('\0').filter((pathText) => pathText !== '');
    if (stagedPaths.length === 0) {
      throw new Error('.agents/issues/ 没有变化');
    }
    validateIssuePaths(stagedPaths);
    const treeHash = (await runGit(workspacePath, ['write-tree'], { environment: gitEnvironment })).trim();
    const commitHash = (await runGit(workspacePath, [
      'commit-tree', treeHash, '-p', headCommit, '-m', `docs(issue): ${issueName}`,
    ])).trim();
    const commitPathsText = await runGit(workspacePath, [
      'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', commitHash,
    ]);
    const commitPaths = commitPathsText.split('\0').filter((pathText) => pathText !== '');
    validateIssuePaths(commitPaths);
    await runGit(workspacePath, ['push', remoteName, `${commitHash}:refs/heads/${branchName}`]);
    return { branchName, commit: commitHash, paths: commitPaths };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
