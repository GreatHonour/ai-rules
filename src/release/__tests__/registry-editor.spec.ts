import { describe, expect, it } from 'vitest';

import { bumpResourceVersion } from '../registry-editor.js';

describe('bumpResourceVersion', () => {
  it.each([
    ['patch', '1.2.4'],
    ['minor', '1.3.0'],
    ['major', '2.0.0'],
  ] as const)('按 %s 升级版本', (releaseType, expectedVersion) => {
    expect(bumpResourceVersion('1.2.3', releaseType)).toBe(expectedVersion);
  });
});
