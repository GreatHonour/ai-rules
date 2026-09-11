import type { Manifest, Registry } from '../../types.js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeManifest } from '../../project/manifest.js';
import { configureProject } from '../config.js';

const temporaryDirectories: string[] = [];

/** 创建带受管 rule 的测试工作区。 */
async function createConfiguredWorkspace(): Promise<{ readonly workspacePath: string; readonly manifest: Manifest }> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-config-'));
  temporaryDirectories.push(workspacePath);
  const entry = {
    version: '1.0.0',
    desc: 'TypeScript 规则',
    updatedAt: '2026-09-10 08:00:00',
  };
  const manifest: Manifest = {
    schemaVersion: 1,
    project: { name: 'demo', frameworks: ['vue3'], architecture: 'spa', environments: ['PC'] },
    registryUrl: 'https://example.com/registry.json',
    repositoryUrl: 'https://example.com/repo.git',
    rules: { typescript: entry },
    skills: {},
    cliVersion: '1.0.0',
    updatedAt: '2026-09-10 08:00:00',
  };
  await writeManifest(workspacePath, manifest);
  await mkdir(join(workspacePath, '.agents', 'rules'), { recursive: true });
  await writeFile(join(workspacePath, '.agents', 'rules', 'typescript.md'), 'managed', 'utf8');
  await writeFile(join(workspacePath, '.agents', 'rules', 'personal.md'), 'personal', 'utf8');
  await writeFile(
    join(workspacePath, 'AGENTS.md'),
    '# 用户内容\n\n## 规范文件索引\n\n- 旧规则 → [old](.agents/rules/old.md)\n\n## 其他内容\n\n正文\n',
    'utf8'
  );
  return { workspacePath, manifest };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directoryPath => rm(directoryPath, { recursive: true, force: true }))
  );
});

describe('configureProject', () => {
  it('取消 rule 时只删除受管文件并保留用户内容', async () => {
    const fixture = await createConfiguredWorkspace();
    const registry: Registry = { repositoryUrl: 'https://example.com/repo.git', rules: {}, skills: {} };
    const downloadRoot = await mkdtemp(join(tmpdir(), 'team-cli-config-download-'));
    temporaryDirectories.push(downloadRoot);

    await configureProject(
      { workspacePath: fixture.workspacePath, ruleNames: [] },
      {
        fetchRegistry: async () => registry,
        downloadResources: async () => ({ temporaryRoot: downloadRoot, resources: [] }),
        now: () => new Date('2026-09-11T08:00:00.000Z'),
        cleanupDownloads: false,
      }
    );

    await expect(readFile(join(fixture.workspacePath, '.agents', 'rules', 'typescript.md'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(fixture.workspacePath, '.agents', 'rules', 'personal.md'), 'utf8')).resolves.toBe('personal');
    const agentsText = await readFile(join(fixture.workspacePath, 'AGENTS.md'), 'utf8');
    expect(agentsText).toContain('# 用户内容');
    expect(agentsText).not.toContain('typescript.md');
    expect(agentsText).toContain('## 规范文件索引');
    expect(agentsText).toContain('## 其他内容\n\n正文');
  });
});
