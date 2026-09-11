import type { Manifest, Registry } from '../../types.js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeManifest } from '../../project/manifest.js';
import { planUpdates, updateProject } from '../update.js';

const temporaryDirectories: string[] = [];

const LOCAL_ENTRY = {
  version: '1.0.0',
  desc: '规则',
  updatedAt: '2026-09-10 08:00:00',
};

const MANIFEST: Manifest = {
  schemaVersion: 1,
  project: { name: 'demo', frameworks: [], architecture: 'cli', environments: ['PC'] },
  registryUrl: 'https://example.com/registry.json',
  repositoryUrl: 'https://example.com/rules.git',
  rules: { typescript: LOCAL_ENTRY },
  skills: {
    'flow-test': { ...LOCAL_ENTRY, managed: true },
    custom: { ...LOCAL_ENTRY, managed: true },
  },
  cliVersion: '1.0.0',
  updatedAt: '2026-09-10 08:00:00',
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directoryPath => rm(directoryPath, { recursive: true, force: true }))
  );
});

describe('planUpdates', () => {
  it('只规划远端较新的 rule 和 flow skill', () => {
    const registry: Registry = {
      repositoryUrl: 'https://example.com/rules.git',
      rules: { typescript: { ...LOCAL_ENTRY, version: '1.1.0' } },
      skills: {
        'flow-test': { ...LOCAL_ENTRY, version: '2.0.0' },
        custom: { ...LOCAL_ENTRY, version: '1.2.0' },
      },
    };

    const plan = planUpdates(MANIFEST, registry);

    expect(plan.updates.map(entry => entry.name)).toEqual(['typescript', 'flow-test']);
    expect(plan.skippedSkills).toEqual(['custom']);
    expect(plan.rollbacks).toEqual([]);
  });

  it('识别远端回退且不纳入更新', () => {
    const registry: Registry = {
      repositoryUrl: 'https://example.com/rules.git',
      rules: { typescript: { ...LOCAL_ENTRY, version: '0.9.0' } },
      skills: {
        'flow-test': LOCAL_ENTRY,
        custom: LOCAL_ENTRY,
      },
    };

    const plan = planUpdates(MANIFEST, registry);

    expect(plan.updates).toEqual([]);
    expect(plan.rollbacks).toEqual([{ kind: 'rules', name: 'typescript', localVersion: '1.0.0', remoteVersion: '0.9.0' }]);
  });

  it('远端缺少 manifest 资源时报告错误', () => {
    expect(() => planUpdates(MANIFEST, { repositoryUrl: 'https://example.com/rules.git', rules: {}, skills: {} })).toThrow(
      'typescript'
    );
  });
});

describe('updateProject', () => {
  it('确认后同步资源和实际 manifest 版本', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-update-'));
    const resourceRoot = await mkdtemp(join(tmpdir(), 'team-cli-update-resource-'));
    temporaryDirectories.push(workspacePath, resourceRoot);
    const manifest: Manifest = { ...MANIFEST, skills: {} };
    await writeManifest(workspacePath, manifest);
    await mkdir(join(workspacePath, '.agents', 'rules'), { recursive: true });
    await writeFile(join(workspacePath, '.agents', 'rules', 'typescript.md'), 'old', 'utf8');
    await writeFile(join(resourceRoot, 'typescript.md'), 'new', 'utf8');
    const registry: Registry = {
      repositoryUrl: 'https://example.com/rules.git',
      rules: { typescript: { ...LOCAL_ENTRY, version: '1.1.0', updatedAt: '2026-09-11 08:00:00' } },
      skills: {},
    };

    const result = await updateProject(workspacePath, {
      fetchRegistry: async () => registry,
      downloadResources: async () => ({
        temporaryRoot: resourceRoot,
        resources: [{ kind: 'rules', name: 'typescript', sourcePath: join(resourceRoot, 'typescript.md') }],
      }),
      confirm: async () => true,
      now: () => new Date('2026-09-11T09:00:00.000Z'),
      cleanupDownloads: false,
    });

    expect(result.status).toBe('updated');
    await expect(readFile(join(workspacePath, '.agents', 'rules', 'typescript.md'), 'utf8')).resolves.toBe('new');
    const manifestText = await readFile(join(workspacePath, '.agents', 'manifest.json'), 'utf8');
    expect(manifestText).toContain('"version": "1.1.0"');
  });

  it('用户拒绝时不下载也不写入', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-update-'));
    temporaryDirectories.push(workspacePath);
    const manifest: Manifest = { ...MANIFEST, skills: {} };
    await writeManifest(workspacePath, manifest);
    const originalManifest = await readFile(join(workspacePath, '.agents', 'manifest.json'), 'utf8');

    const result = await updateProject(workspacePath, {
      fetchRegistry: async () => ({
        repositoryUrl: 'https://example.com/rules.git',
        rules: { typescript: { ...LOCAL_ENTRY, version: '1.1.0' } },
        skills: {},
      }),
      downloadResources: async () => {
        throw new Error('不应下载');
      },
      confirm: async () => false,
      now: () => new Date('2026-09-11T09:00:00.000Z'),
      cleanupDownloads: false,
    });

    expect(result.status).toBe('cancelled');
    await expect(readFile(join(workspacePath, '.agents', 'manifest.json'), 'utf8')).resolves.toBe(originalManifest);
  });
});
