import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { detectWorkingResourceChanges } from '../change-detector.js';

const executeFile = promisify(execFile);
const temporaryDirectories: string[] = [];

/** 创建包含公共资源的 Git 仓库。 */
async function createRepository(): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-changes-'));
  temporaryDirectories.push(workspacePath);
  await mkdir(join(workspacePath, '.agents', 'skills', 'flow-test'), { recursive: true });
  await writeFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'SKILL.md'), 'base', 'utf8');
  await writeFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'keep.md'), 'keep', 'utf8');
  await executeFile('git', ['init'], { cwd: workspacePath });
  await executeFile('git', ['add', '.'], { cwd: workspacePath });
  await executeFile('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'base'], { cwd: workspacePath });
  return workspacePath;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

describe('detectWorkingResourceChanges', () => {
  it('归并真实 Git 工作树中的已跟踪和未跟踪变化', async () => {
    const workspacePath = await createRepository();
    await writeFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'SKILL.md'), 'changed', 'utf8');
    await writeFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'asset.md'), 'new', 'utf8');

    await expect(detectWorkingResourceChanges(workspacePath)).resolves.toEqual([
      { kind: 'skills', name: 'flow-test', change: 'modified' },
    ]);
  });

  it('删除 skill 内单个文件仍判定为资源修改', async () => {
    const workspacePath = await createRepository();
    await unlink(join(workspacePath, '.agents', 'skills', 'flow-test', 'SKILL.md'));

    await expect(detectWorkingResourceChanges(workspacePath)).resolves.toEqual([
      { kind: 'skills', name: 'flow-test', change: 'modified' },
    ]);
  });
});
