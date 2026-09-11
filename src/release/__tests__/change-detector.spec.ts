import { describe, expect, it } from 'vitest';

import { mapChangedPaths } from '../change-detector.js';

describe('mapChangedPaths', () => {
  it('将 skill 内多个变化归并为单个资源', () => {
    expect(
      mapChangedPaths([
        '.agents/skills/flow-test/SKILL.md',
        '.agents/skills/flow-test/assets/template.md',
        '.agents/rules/typescript.md',
        'README.md',
      ])
    ).toEqual([
      { kind: 'rules', name: 'typescript' },
      { kind: 'skills', name: 'flow-test' },
    ]);
  });
});
