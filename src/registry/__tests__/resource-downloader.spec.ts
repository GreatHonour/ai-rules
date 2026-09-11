import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { assertNoSymbolicLinks, createResourcePath, downloadResources } from '../resource-downloader.js';

const executeFile = promisify(execFile);
const temporaryDirectories: string[] = [];

/** 创建包含测试资源的本地 Git 仓库。 */
async function createResourceRepository(): Promise<string> {
  const repositoryPath = await mkdtemp(join(tmpdir(), 'team-cli-source-'));
  temporaryDirectories.push(repositoryPath);
  await mkdir(join(repositoryPath, '.agents', 'rules'), { recursive: true });
  await mkdir(join(repositoryPath, '.agents', 'skills', 'flow-test'), { recursive: true });
  await writeFile(join(repositoryPath, '.agents', 'rules', 'typescript.md'), '# TypeScript\n', 'utf8');
  await writeFile(join(repositoryPath, '.agents', 'skills', 'flow-test', 'SKILL.md'), '# Flow test\n', 'utf8');
  await executeFile('git', ['init'], { cwd: repositoryPath });
  await executeFile('git', ['add', '.'], { cwd: repositoryPath });
  await executeFile('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'init'], { cwd: repositoryPath });
  return `file:///${repositoryPath.replaceAll('\\', '/')}`;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

describe('createResourcePath', () => {
  it('按类型推导固定路径并拒绝危险名称', () => {
    expect(createResourcePath('rules', 'typescript')).toContain(join('.agents', 'rules', 'typescript.md'));
    expect(createResourcePath('skills', 'flow-test')).toContain(join('.agents', 'skills', 'flow-test'));
    expect(() => createResourcePath('rules', '../../escape')).toThrow('字母、数字和连字符');
  });
});

describe('downloadResources', () => {
  it('完整下载同仓库 rule 与 skill 且不包含 .git', async () => {
    const repositoryUrl = await createResourceRepository();
    const downloadedBatch = await downloadResources([
      { kind: 'rules', name: 'typescript', repositoryUrl },
      { kind: 'skills', name: 'flow-test', repositoryUrl },
    ]);
    temporaryDirectories.push(downloadedBatch.temporaryRoot);
    await expect(readFile(downloadedBatch.resources[0]?.sourcePath ?? '', 'utf8')).resolves.toContain('TypeScript');
    await expect(readFile(join(downloadedBatch.resources[1]?.sourcePath ?? '', 'SKILL.md'), 'utf8')).resolves.toContain('Flow test');
    await expect(readFile(join(downloadedBatch.resources[1]?.sourcePath ?? '', '.git'), 'utf8')).rejects.toThrow();
    await expect(stat(join(downloadedBatch.temporaryRoot, 'clone-1'))).rejects.toThrow();
  });

  it('批量下载任一项失败时清理临时目录', async () => {
    const repositoryUrl = await createResourceRepository();
    await expect(downloadResources([
      { kind: 'rules', name: 'typescript', repositoryUrl },
      { kind: 'rules', name: 'missing', repositoryUrl },
    ])).rejects.toThrow('missing');
  });

  it('拒绝通过符号链接逃逸的 skill', async () => {
    const resourcePath = await mkdtemp(join(tmpdir(), 'team-cli-link-resource-'));
    const outsidePath = await mkdtemp(join(tmpdir(), 'team-cli-link-outside-'));
    temporaryDirectories.push(resourcePath, outsidePath);
    await writeFile(join(outsidePath, 'secret.md'), 'secret', 'utf8');
    await symlink(outsidePath, join(resourcePath, 'escape'), 'junction');
    await expect(assertNoSymbolicLinks(resourcePath)).rejects.toThrow('符号链接');
  });
});
