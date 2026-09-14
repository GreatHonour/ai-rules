import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { createProgram } from '../cli.js';
import { getPackageVersion } from '../package-info.js';

/** 读取根目录 package.json 中声明的版本。 */
async function readDeclaredVersion(): Promise<string> {
  const packageText = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  const packageMetadata: unknown = JSON.parse(packageText);
  if (
    typeof packageMetadata !== 'object' ||
    packageMetadata === null ||
    !('version' in packageMetadata) ||
    typeof packageMetadata.version !== 'string'
  ) {
    throw new Error('测试 package.json 缺少有效 version');
  }
  return packageMetadata.version;
}

describe('getPackageVersion', () => {
  it('读取 package.json 中声明的当前版本', async () => {
    await expect(readDeclaredVersion()).resolves.toBe(getPackageVersion());
  });

  it('将当前版本用于 CLI 输出', () => {
    expect(createProgram().version()).toBe(getPackageVersion());
  });
});
