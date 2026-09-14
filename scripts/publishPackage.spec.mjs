import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { getChangesetCommand, getPublishedPackageVersions } from './publishPackage.mjs';

describe('getChangesetCommand', () => {
  it('通过当前 Node.js 启动项目本地的 Changesets CLI', () => {
    const changesetCommand = getChangesetCommand(['--version']);

    expect(changesetCommand.command).toBe(process.execPath);
    expect(changesetCommand.commandArguments[0]).toMatch(/[\\/]@changesets[\\/]cli[\\/]bin\.js$/);

    const changesetProcess = spawnSync(changesetCommand.command, changesetCommand.commandArguments, {
      encoding: 'utf8',
    });

    expect(changesetProcess.error).toBeUndefined();
    expect(changesetProcess.status).toBe(0);
    expect(changesetProcess.stdout).toContain('3.0.2');
  });
});

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
