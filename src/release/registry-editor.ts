import { inc } from 'semver';

export type ReleaseType = 'patch' | 'minor' | 'major';

/** 按维护者选择升级 SemVer。 */
export function bumpResourceVersion(version: string, releaseType: ReleaseType): string {
  const nextVersion = inc(version, releaseType);
  if (nextVersion === null) {
    throw new Error(`无法升级非法版本: ${version}`);
  }
  return nextVersion;
}
