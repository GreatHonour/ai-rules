import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { uploadIssues } from '../issue-uploader.js';

const executeFile = promisify(execFile);
const temporaryDirectories: string[] = [];

/** 创建带裸远端的 Git 测试仓库。 */
async function createGitFixture(): Promise<{ readonly workspacePath: string; readonly remotePath: string }> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-upload-'));
  const remotePath = await mkdtemp(join(tmpdir(), 'team-cli-remote-'));
  temporaryDirectories.push(workspacePath, remotePath);
  await executeFile('git', ['init', '--bare'], { cwd: remotePath });
  await executeFile('git', ['init'], { cwd: workspacePath });
  await writeFile(join(workspacePath, 'business.txt'), 'base', 'utf8');
  await executeFile('git', ['add', '.'], { cwd: workspacePath });
  await executeFile('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'base'], {
    cwd: workspacePath,
  });
  await executeFile('git', ['remote', 'add', 'origin', remotePath], { cwd: workspacePath });
  return { workspacePath, remotePath };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directoryPath => rm(directoryPath, { recursive: true, force: true }))
  );
});

describe('uploadIssues', () => {
  it('只上传 issues 且保持当前分支和 index', async () => {
    const fixture = await createGitFixture();
    const branchBefore = (await executeFile('git', ['branch', '--show-current'], { cwd: fixture.workspacePath })).stdout.trim();
    await mkdir(join(fixture.workspacePath, '.agents', 'issues'), { recursive: true });
    await writeFile(join(fixture.workspacePath, '.agents', 'issues', 'bug.md'), 'bug', 'utf8');
    await writeFile(join(fixture.workspacePath, 'business.txt'), 'staged business change', 'utf8');
    await executeFile('git', ['add', 'business.txt'], { cwd: fixture.workspacePath });
    const stagedBefore = (await executeFile('git', ['diff', '--cached', '--name-only'], { cwd: fixture.workspacePath })).stdout;

    const result = await uploadIssues(fixture.workspacePath, 'Bug report', 'origin');

    expect(result.branchName).toBe('codex/issue-bug-report');
    expect((await executeFile('git', ['branch', '--show-current'], { cwd: fixture.workspacePath })).stdout.trim()).toBe(
      branchBefore
    );
    expect((await executeFile('git', ['diff', '--cached', '--name-only'], { cwd: fixture.workspacePath })).stdout).toBe(
      stagedBefore
    );
    const remoteCommit = (
      await executeFile('git', ['rev-parse', 'refs/heads/codex/issue-bug-report'], { cwd: fixture.remotePath })
    ).stdout.trim();
    const changedPaths = (
      await executeFile('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', remoteCommit], { cwd: fixture.remotePath })
    ).stdout.trim();
    expect(changedPaths).toBe('.agents/issues/bug.md');
    await expect(readFile(join(fixture.workspacePath, 'business.txt'), 'utf8')).resolves.toBe('staged business change');
  });

  it('没有 issue 变化时返回明确错误', async () => {
    const fixture = await createGitFixture();
    await expect(uploadIssues(fixture.workspacePath, 'empty', 'origin')).rejects.toThrow('没有变化');
  });
});
