import type { Registry } from '../../types.js';
import { describe, expect, it } from 'vitest';
import { validateRegistryChanges } from '../release-check.js';

const BASE_ENTRY = {
  version: '1.0.0',
  desc: 'TypeScript 规则',
  updatedAt: '2026-09-10 08:00:00',
};

const BASE_REGISTRY: Registry = {
  repositoryUrl: 'https://example.com/rules.git',
  rules: {
    typescript: BASE_ENTRY,
  },
  skills: {},
};

describe('validateRegistryChanges', () => {
  it('接受版本和时间均递增的修改资源', () => {
    expect(validateRegistryChanges(
      [{ kind: 'rules', name: 'typescript', change: 'modified' }],
      BASE_REGISTRY,
      { repositoryUrl: BASE_REGISTRY.repositoryUrl, rules: { typescript: { ...BASE_ENTRY, version: '1.0.1', updatedAt: '2026-09-11 08:00:00' } }, skills: {} },
    )).toEqual([]);
  });

  it('拒绝只改版本未改时间', () => {
    const errors = validateRegistryChanges(
      [{ kind: 'rules', name: 'typescript', change: 'modified' }],
      BASE_REGISTRY,
      { repositoryUrl: BASE_REGISTRY.repositoryUrl, rules: { typescript: { ...BASE_ENTRY, version: '1.0.1' } }, skills: {} },
    );

    expect(errors.join('\n')).toContain('updatedAt');
  });

  it('拒绝新资源不是 1.0.0', () => {
    const errors = validateRegistryChanges(
      [{ kind: 'skills', name: 'flow-new', change: 'added' }],
      BASE_REGISTRY,
      { repositoryUrl: BASE_REGISTRY.repositoryUrl, rules: BASE_REGISTRY.rules, skills: { 'flow-new': { version: '1.1.0', desc: '新 skill', updatedAt: '2026-09-11 08:00:00' } } },
    );

    expect(errors.join('\n')).toContain('1.0.0');
  });

  it('拒绝删除源资源但保留 registry 条目', () => {
    const errors = validateRegistryChanges(
      [{ kind: 'rules', name: 'typescript', change: 'deleted' }],
      BASE_REGISTRY,
      BASE_REGISTRY,
    );

    expect(errors.join('\n')).toContain('删除');
  });

  it('即使源资源未变化也拒绝 registry 版本下降', () => {
    const errors = validateRegistryChanges([], BASE_REGISTRY, {
      repositoryUrl: BASE_REGISTRY.repositoryUrl,
      rules: { typescript: { ...BASE_ENTRY, version: '0.9.0' } },
      skills: {},
    });

    expect(errors.join('\n')).toContain('不能');
  });
});
