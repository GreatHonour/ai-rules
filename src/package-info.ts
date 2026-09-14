import { createRequire } from 'node:module';

// 同时兼容 tsx 源码执行与 dist 中的已编译 CLI。
const packageRequire = createRequire(import.meta.url);

/** 读取当前已安装 npm 包的版本。 */
export function getPackageVersion(): string {
  const packageMetadata: unknown = packageRequire('../package.json');
  if (
    typeof packageMetadata !== 'object' ||
    packageMetadata === null ||
    !('version' in packageMetadata) ||
    typeof packageMetadata.version !== 'string'
  ) {
    throw new Error('package.json 缺少有效 version');
  }
  return packageMetadata.version;
}
