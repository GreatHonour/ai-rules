import type { Registry } from '../../types.js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeProject } from '../init.js';

const temporaryDirectories: string[] = [];

const REGISTRY: Registry = {
  repositoryUrl: 'https://example.com/rules.git',
  rules: {
    typescript: {
      version: '1.0.0',
      desc: 'TypeScript 规则',
      updatedAt: '2026-09-11 08:00:00',
    },
  },
  skills: {
    'flow-test': {
      version: '1.1.0',
      desc: '流程测试 skill',
      updatedAt: '2026-09-11 08:00:00',
    },
    personal: {
      version: '1.0.0',
      desc: '个人 skill',
      updatedAt: '2026-09-11 08:00:00',
    },
  },
};

/** 创建初始化测试工作区和已下载资源。 */
async function createFixture(): Promise<{ readonly workspacePath: string; readonly resourceRoot: string }> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-init-'));
  const resourceRoot = await mkdtemp(join(tmpdir(), 'team-cli-resources-'));
  temporaryDirectories.push(workspacePath, resourceRoot);
  await mkdir(join(resourceRoot, 'flow-test'), { recursive: true });
  await writeFile(join(resourceRoot, 'typescript.md'), '# TypeScript', 'utf8');
  await writeFile(join(resourceRoot, 'flow-test', 'SKILL.md'), '# Skill', 'utf8');
  return { workspacePath, resourceRoot };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

describe('initializeProject', () => {
  it('安装已选 rules、全部 flow skills 并保留本地 skill 与 .git', async () => {
    const fixture = await createFixture();
    await mkdir(join(fixture.workspacePath, '.git'), { recursive: true });
    await mkdir(join(fixture.workspacePath, '.agents', 'skills', 'local-skill'), { recursive: true });
    await writeFile(join(fixture.workspacePath, '.git', 'sentinel'), 'unchanged', 'utf8');
    await writeFile(join(fixture.workspacePath, '.agents', 'skills', 'local-skill', 'SKILL.md'), 'local', 'utf8');

    await initializeProject({
      workspacePath: fixture.workspacePath,
      registryUrl: 'https://example.com/registry.json',
      project: { name: 'demo', frameworks: ['vue3'], architecture: 'spa', environments: ['PC'] },
      ruleNames: ['typescript'],
    }, {
      fetchRegistry: async () => REGISTRY,
      downloadResources: async () => ({
        temporaryRoot: fixture.resourceRoot,
        resources: [
          { kind: 'rules', name: 'typescript', sourcePath: join(fixture.resourceRoot, 'typescript.md') },
          { kind: 'skills', name: 'flow-test', sourcePath: join(fixture.resourceRoot, 'flow-test') },
        ],
      }),
      now: () => new Date('2026-09-11T09:00:00.000Z'),
      cliVersion: '1.0.0',
      cleanupDownloads: false,
    });

    await expect(readFile(join(fixture.workspacePath, '.git', 'sentinel'), 'utf8')).resolves.toBe('unchanged');
    await expect(readFile(join(fixture.workspacePath, '.agents', 'skills', 'local-skill', 'SKILL.md'), 'utf8')).resolves.toBe('local');
    await expect(readFile(join(fixture.workspacePath, '.agents', 'skills', 'flow-test', 'SKILL.md'), 'utf8')).resolves.toBe('# Skill');
    const manifestText = await readFile(join(fixture.workspacePath, '.agents', 'manifest.json'), 'utf8');
    expect(manifestText).toContain('"flow-test"');
    expect(manifestText).not.toContain('"personal"');
    await expect(readFile(join(fixture.workspacePath, 'AGENTS.md'), 'utf8')).resolves.toContain('.agents/rules/typescript.md');
  });

  it('拒绝 registry 中不存在的 rule 且不创建 .agents', async () => {
    const fixture = await createFixture();

    await expect(initializeProject({
      workspacePath: fixture.workspacePath,
      registryUrl: 'https://example.com/registry.json',
      project: { name: 'demo', frameworks: [], architecture: 'cli', environments: ['PC'] },
      ruleNames: ['missing'],
    }, {
      fetchRegistry: async () => REGISTRY,
      downloadResources: async () => { throw new Error('不应下载'); },
      now: () => new Date('2026-09-11T09:00:00.000Z'),
      cliVersion: '1.0.0',
      cleanupDownloads: false,
    })).rejects.toThrow('missing');
    await expect(readFile(join(fixture.workspacePath, '.agents', 'manifest.json'), 'utf8')).rejects.toThrow();
  });
});
