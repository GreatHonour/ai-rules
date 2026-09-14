import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ResourceSyncError, syncResources } from '../resource-sync.js';

const temporaryDirectories: string[] = [];

/** 创建测试工作目录。 */
async function createWorkspace(): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-workspace-'));
  temporaryDirectories.push(workspacePath);
  return workspacePath;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directoryPath => rm(directoryPath, { recursive: true, force: true }))
  );
});

describe('syncResources', () => {
  it('覆盖 flow skill 并保留本地非 flow skill', async () => {
    const workspacePath = await createWorkspace();
    const sourceRoot = await createWorkspace();
    await mkdir(join(workspacePath, '.agents', 'skills', 'flow-test'), { recursive: true });
    await mkdir(join(workspacePath, '.agents', 'skills', 'personal'), { recursive: true });
    await mkdir(join(sourceRoot, 'flow-test'), { recursive: true });
    await writeFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'old.md'), 'old', 'utf8');
    await writeFile(join(workspacePath, '.agents', 'skills', 'personal', 'keep.md'), 'keep', 'utf8');
    await writeFile(join(sourceRoot, 'flow-test', 'new.md'), 'new', 'utf8');

    const result = await syncResources(workspacePath, [
      { kind: 'skills', name: 'flow-test', sourcePath: join(sourceRoot, 'flow-test') },
    ]);

    await expect(readFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'new.md'), 'utf8')).resolves.toBe('new');
    await expect(readFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'old.md'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(workspacePath, '.agents', 'skills', 'personal', 'keep.md'), 'utf8')).resolves.toBe('keep');
    await expect(readFile(join(result.backupPath, 'skills', 'flow-test', 'old.md'), 'utf8')).resolves.toBe('old');
    await expect(readFile(join(result.backupPath, 'skills', 'personal', 'keep.md'), 'utf8')).resolves.toBe('keep');
  });

  it('不覆盖已存在的非 flow skill', async () => {
    const workspacePath = await createWorkspace();
    const sourceRoot = await createWorkspace();
    await mkdir(join(workspacePath, '.agents', 'skills', 'custom'), { recursive: true });
    await mkdir(join(sourceRoot, 'custom'), { recursive: true });
    await writeFile(join(workspacePath, '.agents', 'skills', 'custom', 'value.md'), 'local', 'utf8');
    await writeFile(join(sourceRoot, 'custom', 'value.md'), 'remote', 'utf8');

    const result = await syncResources(workspacePath, [
      { kind: 'skills', name: 'custom', sourcePath: join(sourceRoot, 'custom') },
    ]);

    expect(result.skippedSkills).toEqual(['custom']);
    await expect(readFile(join(workspacePath, '.agents', 'skills', 'custom', 'value.md'), 'utf8')).resolves.toBe('local');
  });

  it('后续操作失败时保留备份和已更新资源供手动处理', async () => {
    const workspacePath = await createWorkspace();
    const sourceRoot = await createWorkspace();
    await mkdir(join(workspacePath, '.agents', 'skills', 'flow-test'), { recursive: true });
    await mkdir(join(sourceRoot, 'flow-test'), { recursive: true });
    await writeFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'value.md'), 'old', 'utf8');
    await writeFile(join(sourceRoot, 'flow-test', 'value.md'), 'new', 'utf8');

    let syncError: unknown;
    try {
      await syncResources(workspacePath, [{ kind: 'skills', name: 'flow-test', sourcePath: join(sourceRoot, 'flow-test') }], {
        afterSwap: async () => {
          throw new Error('模拟后续写入失败');
        },
      });
    } catch (error: unknown) {
      syncError = error;
    }

    expect(syncError).toBeInstanceOf(ResourceSyncError);
    expect(syncError).toHaveProperty('message', expect.stringContaining('AGENTS.md: 模拟后续写入失败'));
    if (!(syncError instanceof ResourceSyncError)) {
      throw new Error('应抛出 ResourceSyncError');
    }
    await expect(readFile(join(workspacePath, '.agents', 'skills', 'flow-test', 'value.md'), 'utf8')).resolves.toBe('new');
    await expect(readFile(join(syncError.backupPath, 'skills', 'flow-test', 'value.md'), 'utf8')).resolves.toBe('old');
  });

  it('拒绝危险资源名且不删除工作区文件', async () => {
    const workspacePath = await createWorkspace();
    const protectedPath = join(workspacePath, 'protected.md');
    await writeFile(protectedPath, 'protected', 'utf8');

    await expect(
      syncResources(workspacePath, [], {
        removedRuleNames: ['../../protected'],
      })
    ).rejects.toThrow('字母、数字和连字符');

    await expect(readFile(protectedPath, 'utf8')).resolves.toBe('protected');
  });
});
