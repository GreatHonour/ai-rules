import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { detectWorkingResourceChanges } from '../../release/change-detector.js';
import { releaseRegistry } from '../release.js';

const executeFile = promisify(execFile);
const temporaryDirectories: string[] = [];

/** 创建可执行 release 的公共源仓库。 */
async function createRepository(): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-release-'));
  temporaryDirectories.push(workspacePath);
  await mkdir(join(workspacePath, '.agents', 'rules'), { recursive: true });
  await mkdir(join(workspacePath, '.agents', 'skills'), { recursive: true });
  await writeFile(join(workspacePath, '.agents', 'rules', 'typescript.md'), 'base', 'utf8');
  await writeFile(join(workspacePath, 'registry.json'), JSON.stringify({
    repositoryUrl: 'https://example.com/repo.git',
    rules: {
      typescript: {
        version: '1.0.0',
        desc: 'TypeScript 规则',
        updatedAt: '2026-09-10 08:00:00',
      },
    },
    skills: {},
  }), 'utf8');
  await executeFile('git', ['init'], { cwd: workspacePath });
  await executeFile('git', ['remote', 'add', 'origin', 'https://example.com/repo.git'], { cwd: workspacePath });
  await executeFile('git', ['add', '.'], { cwd: workspacePath });
  await executeFile('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'base'], { cwd: workspacePath });
  return workspacePath;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

describe('releaseRegistry', () => {
  it('逐项升级并且不自动暂存', async () => {
    const workspacePath = await createRepository();
    await writeFile(join(workspacePath, '.agents', 'rules', 'typescript.md'), 'changed', 'utf8');

    const released = await releaseRegistry(workspacePath, {
      detectChanges: detectWorkingResourceChanges,
      selectReleaseType: async () => 'minor',
      describeResource: async () => '新资源',
      now: () => new Date('2026-09-11T08:00:00.000Z'),
    });

    expect(released[0]?.nextVersion).toBe('1.1.0');
    const registryText = await readFile(join(workspacePath, 'registry.json'), 'utf8');
    expect(registryText).toContain('"version": "1.1.0"');
    expect((await executeFile('git', ['diff', '--cached', '--name-only'], { cwd: workspacePath })).stdout).toBe('');
  });

  it('缺少公共源目录时拒绝运行', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-release-invalid-'));
    temporaryDirectories.push(workspacePath);
    await executeFile('git', ['init'], { cwd: workspacePath });
    await executeFile('git', ['remote', 'add', 'origin', 'https://example.com/repo.git'], { cwd: workspacePath });
    await writeFile(join(workspacePath, 'registry.json'), JSON.stringify({ repositoryUrl: 'https://example.com/repo.git', rules: {}, skills: {} }), 'utf8');

    await expect(releaseRegistry(workspacePath)).rejects.toThrow();
  });

  it('新增资源时写入说明和固定初始版本', async () => {
    const workspacePath = await createRepository();
    await writeFile(join(workspacePath, '.agents', 'rules', 'naming.md'), 'new', 'utf8');

    await releaseRegistry(workspacePath, {
      detectChanges: detectWorkingResourceChanges,
      selectReleaseType: async () => 'major',
      describeResource: async () => '命名规范',
      now: () => new Date('2026-09-11T10:11:12.000Z'),
    });

    const registryText = await readFile(join(workspacePath, 'registry.json'), 'utf8');
    expect(registryText).toContain('"version": "1.0.0"');
    expect(registryText).toContain('"desc": "命名规范"');
    expect(registryText).toContain('"updatedAt": "2026-09-11 10:11:12"');
  });
});
