import { describe, expect, it } from 'vitest';
import { parseManifest, parsePackageSpec } from '../config.js';

describe('parseManifest', () => {
  it('parses a valid project manifest', () => {
    const manifest = parseManifest(`
schema: 1
registries:
  default:
    url: ../registry
    ref: main
dependencies:
  rules:
    naming:
      version: ^1.0.0
      registry: default
  skills: {}
`);

    expect(manifest.registries.default?.url).toBe('../registry');
    expect(manifest.dependencies.rules.naming?.version).toBe('^1.0.0');
  });

  it('rejects unknown top-level fields', () => {
    expect(() => parseManifest('schema: 1\nregistries: {}\ndependencies: { rules: {}, skills: {} }\nextra: true')).toThrow(
      '未知字段',
    );
  });
});

describe('parsePackageSpec', () => {
  it('parses kind, name, and range', () => {
    expect(parsePackageSpec('skill:flow-review@^2.0.0')).toEqual({
      kind: 'skill',
      name: 'flow-review',
      version: '^2.0.0',
    });
  });

  it('rejects unsafe names', () => {
    expect(() => parsePackageSpec('rule:../secret@1.0.0')).toThrow('包参数');
  });
});
