import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

import { validateRegistry } from '../registry-client.js';

const VALID_ENTRY = {
  version: '1.2.3',
  desc: 'TypeScript 规则',
  updatedAt: '2026-09-11 08:00:00',
};

describe('validateRegistry', () => {
  it('校验合法 registry', () => {
    const registry = validateRegistry({
      repositoryUrl: 'https://example.com/rules.git',
      rules: { typescript: VALID_ENTRY },
      skills: {},
    });

    expect(registry.rules.typescript?.version).toBe('1.2.3');
  });

  it.each([
    ['非法版本', { ...VALID_ENTRY, version: 'latest' }, 'registry.rules.typescript.version'],
    ['非法时间', { ...VALID_ENTRY, updatedAt: '2026-09-11T08:00:00.000Z' }, 'registry.rules.typescript.updatedAt'],
    ['缺少字段', { version: '1.0.0', updatedAt: '2026-09-11 08:00:00' }, 'registry.rules.typescript.desc'],
  ])('%s 时报告字段路径', (_name, entry, fieldPath) => {
    expect(() =>
      validateRegistry({ repositoryUrl: 'https://example.com/rules.git', rules: { typescript: entry }, skills: {} })
    ).toThrow(fieldPath);
  });

  it('拒绝条目中的额外字段和危险名称', () => {
    expect(() =>
      validateRegistry({
        repositoryUrl: 'https://example.com/rules.git',
        rules: { typescript: { ...VALID_ENTRY, url: 'legacy' } },
        skills: {},
      })
    ).toThrow('registry.rules.typescript.url');
    expect(() =>
      validateRegistry({
        repositoryUrl: 'https://example.com/rules.git',
        rules: { '../escape': VALID_ENTRY },
        skills: {},
      })
    ).toThrow('registry.rules...');
  });

  it('拒绝不存在的日期和秒以外的时间精度', () => {
    expect(() =>
      validateRegistry({
        repositoryUrl: 'https://example.com/rules.git',
        rules: { typescript: { ...VALID_ENTRY, updatedAt: '2026-02-30 08:00:00' } },
        skills: {},
      })
    ).toThrow('updatedAt');
    expect(() =>
      validateRegistry({
        repositoryUrl: 'https://example.com/rules.git',
        rules: { typescript: { ...VALID_ENTRY, updatedAt: '2026-09-11 08:00:00.123' } },
        skills: {},
      })
    ).toThrow('updatedAt');
  });

  it('校验公共仓库的真实 registry.json', async () => {
    const registryText = await readFile('registry.json', 'utf8');
    const registry = validateRegistry(JSON.parse(registryText) as unknown);

    expect(registry.repositoryUrl).toContain('GreatHonour/ai-rules');
    expect(registry.rules.typescript?.desc).toContain('TypeScript');
  });
});
