import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { runRegistryCheck } from '../release-check.js';

const executeFile = promisify(execFile);
const temporaryDirectories: string[] = [];

/** 创建带 registry 的 Git 测试仓库。 */
async function createRepository(): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-check-'));
  temporaryDirectories.push(workspacePath);
  await mkdir(join(workspacePath, '.agents', 'rules'), { recursive: true });
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
  await executeFile('git', ['add', '.'], { cwd: workspacePath });
  await executeFile('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'base'], { cwd: workspacePath });
  return workspacePath;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

describe('runRegistryCheck', () => {
  it('阻止漏升版本并接受同步升级', async () => {
    const workspacePath = await createRepository();
    await writeFile(join(workspacePath, '.agents', 'rules', 'typescript.md'), 'changed', 'utf8');
    await executeFile('git', ['add', '.agents/rules/typescript.md'], { cwd: workspacePath });

    await expect(runRegistryCheck(workspacePath)).rejects.toThrow('pnpm agents release');

    await writeFile(join(workspacePath, 'registry.json'), JSON.stringify({
      repositoryUrl: 'https://example.com/repo.git',
      rules: {
        typescript: {
          version: '1.0.1',
          desc: 'TypeScript 规则',
          updatedAt: '2026-09-11 08:00:00',
        },
      },
      skills: {},
    }), 'utf8');
    await executeFile('git', ['add', 'registry.json'], { cwd: workspacePath });

    await expect(runRegistryCheck(workspacePath)).resolves.toBeUndefined();
  });
});
