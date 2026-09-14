import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateManifest, writeJsonAtomic } from '../manifest.js';

const temporaryDirectories: string[] = [];

/** 创建合法 manifest 测试夹具。 */
function createManifest(): unknown {
  return {
    schemaVersion: 2,
    project: {
      name: 'demo',
      frontendFrameworks: ['vue3'],
      backendFrameworks: ['nestjs'],
      environments: ['PC', 'H5'],
    },
    registryUrl: 'https://example.com/registry.json',
    repositoryUrl: 'https://example.com/rules.git',
    rules: {},
    skills: { 'flow-implement': { version: '1.0.0', desc: '实施任务', updatedAt: '2026-09-11 08:00:00', managed: true } },
    cliVersion: '1.0.0',
    updatedAt: '2026-09-11 08:00:00',
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directoryPath => rm(directoryPath, { recursive: true, force: true }))
  );
});

describe('validateManifest', () => {
  it('校验完整项目画像和受管 skill', () => {
    const manifest = validateManifest(createManifest());
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.project.frontendFrameworks).toEqual(['vue3']);
    expect(manifest.project.backendFrameworks).toEqual(['nestjs']);
    expect(manifest.project.environments).toEqual(['PC', 'H5']);
    expect(manifest.skills['flow-implement']?.managed).toBe(true);
  });

  it('读取 schema v1 时迁移旧项目画像', () => {
    const legacyManifest = createManifest();
    if (typeof legacyManifest !== 'object' || legacyManifest === null || !('project' in legacyManifest)) {
      throw new Error('测试夹具结构错误');
    }
    Reflect.set(legacyManifest, 'schemaVersion', 1);
    Reflect.set(legacyManifest, 'project', {
      name: 'demo',
      frameworks: ['vue3'],
      architecture: 'single-page-application',
      environments: ['PC', 'H5'],
    });

    const manifest = validateManifest(legacyManifest);

    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.project).toEqual({
      name: 'demo',
      frontendFrameworks: ['vue3'],
      backendFrameworks: [],
      environments: ['PC', 'H5'],
    });
  });

  it('拒绝 managed 不为 true、危险名称和旧 url 字段', () => {
    const manifest = createManifest();
    if (typeof manifest !== 'object' || manifest === null || !('skills' in manifest)) throw new Error('测试夹具结构错误');
    const skills = manifest.skills;
    if (typeof skills !== 'object' || skills === null || !('flow-implement' in skills)) throw new Error('测试夹具结构错误');
    const skill = skills['flow-implement'];
    if (typeof skill !== 'object' || skill === null) throw new Error('测试夹具结构错误');
    Reflect.set(skill, 'managed', false);
    expect(() => validateManifest(manifest)).toThrow('manifest.skills.flow-implement.managed');
    Reflect.set(skill, 'managed', true);
    Reflect.set(skill, 'url', 'legacy');
    expect(() => validateManifest(manifest)).toThrow('manifest.skills.flow-implement.url');
  });

  it('schema v2 缺少后端框架时报告嵌套字段路径', () => {
    const manifest = createManifest();
    if (typeof manifest !== 'object' || manifest === null || !('project' in manifest)) throw new Error('测试夹具结构错误');
    const project = manifest.project;
    if (typeof project !== 'object' || project === null) throw new Error('测试夹具结构错误');
    Reflect.deleteProperty(project, 'backendFrameworks');
    expect(() => validateManifest(manifest)).toThrow('manifest.project.backendFrameworks');
  });
});

describe('writeJsonAtomic', () => {
  it('成功时写入格式化 JSON', async () => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'team-cli-manifest-'));
    temporaryDirectories.push(directoryPath);
    const filePath = join(directoryPath, 'manifest.json');
    await writeJsonAtomic(filePath, { value: 1 });
    await expect(readFile(filePath, 'utf8')).resolves.toBe('{\n  "value": 1\n}\n');
  });

  it('目标替换失败时保留已有文件', async () => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'team-cli-manifest-'));
    temporaryDirectories.push(directoryPath);
    const filePath = join(directoryPath, 'manifest.json');
    await writeFile(filePath, 'original', 'utf8');
    await expect(writeJsonAtomic(directoryPath, { value: 1 })).rejects.toThrow();
    await expect(readFile(filePath, 'utf8')).resolves.toBe('original');
  });
});
