import { describe, expect, it } from 'vitest';

import { getPublishedPackageVersions } from './publishPackage.mjs';

describe('getPublishedPackageVersions', () => {
  it('从带终端前缀的 Changesets 输出中提取包版本', () => {
    const commandOutput = [
      '◇  Successfully published:',
      '│  @icc-grow/team-cli@1.0.1',
      '│',
      '◇  Created git tags:',
      '│  @icc-grow/team-cli@1.0.1',
    ].join('\n');

    expect(getPublishedPackageVersions(commandOutput)).toEqual(['@icc-grow/team-cli@1.0.1']);
  });

  it('忽略没有成功发布区块的输出', () => {
    expect(getPublishedPackageVersions('No packages to publish')).toEqual([]);
  });
});
