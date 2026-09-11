import type { Registry, ResourceEntry } from '../types.js';
import type { ChangedResource } from '../release/change-detector.js';
import type { ReleaseType } from '../release/registry-editor.js';
import { access, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonAtomic } from '../project/manifest.js';
import { validateRegistry } from '../registry/registry-client.js';
import { detectWorkingResourceChanges } from '../release/change-detector.js';
import { bumpResourceVersion } from '../release/registry-editor.js';
import { runGit } from '../git/git-command.js';
import { formatUtcDate, requireString } from '../validation.js';

export interface ReleaseDependencies {
  readonly detectChanges: (workspacePath: string) => Promise<readonly ChangedResource[]>;
  readonly selectReleaseType: (resource: ChangedResource) => Promise<ReleaseType>;
  readonly describeResource: (resource: ChangedResource) => Promise<string>;
  readonly now: () => Date;
}

export interface ReleasedResource extends ChangedResource {
  readonly previousVersion?: string;
  readonly nextVersion?: string;
}

const DEFAULT_DEPENDENCIES: ReleaseDependencies = {
  detectChanges: detectWorkingResourceChanges,
  selectReleaseType: async () => 'patch',
  describeResource: async (resource) => `${resource.kind}.${resource.name}`,
  now: () => new Date(),
};

/** 判断公共源资源当前是否存在。 */
async function resourceExists(workspacePath: string, resource: ChangedResource): Promise<boolean> {
  const resourcePath = resource.kind === 'rules'
    ? join(workspacePath, '.agents', 'rules', `${resource.name}.md`)
    : join(workspacePath, '.agents', 'skills', resource.name);
  try {
    await stat(resourcePath);
    return true;
  } catch (error: unknown) {
    const errorCode = error instanceof Error && 'code' in error ? Reflect.get(error, 'code') : undefined;
    if (errorCode === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/** 读取当前工作树 registry。 */
async function readWorkingRegistry(workspacePath: string): Promise<Registry> {
  const registryPath = join(workspacePath, 'registry.json');
  let registryText: string;
  try {
    registryText = await readFile(registryPath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`当前目录不是公共源仓库或缺少 registry.json: ${message}`);
  }
  return validateRegistry(JSON.parse(registryText) as unknown);
}

/** 校验公共源仓库具备 Git、origin 和资源目录契约。 */
async function assertPublicSourceRepository(workspacePath: string): Promise<void> {
  await runGit(workspacePath, ['rev-parse', '--is-inside-work-tree']);
  await runGit(workspacePath, ['remote', 'get-url', 'origin']);
  await access(join(workspacePath, '.agents', 'rules'));
  await access(join(workspacePath, '.agents', 'skills'));
}

/** 根据工作树资源变化生成 registry 版本更新，不执行 Git 写操作。 */
export async function releaseRegistry(
  workspacePath: string,
  dependencies: ReleaseDependencies = DEFAULT_DEPENDENCIES,
): Promise<readonly ReleasedResource[]> {
  await assertPublicSourceRepository(workspacePath);
  const registry = await readWorkingRegistry(workspacePath);
  const changes = await dependencies.detectChanges(workspacePath);
  if (changes.length === 0) {
    return [];
  }
  const mutableRules: Record<string, ResourceEntry> = { ...registry.rules };
  const mutableSkills: Record<string, ResourceEntry> = { ...registry.skills };
  const releasedResources: ReleasedResource[] = [];
  for (const resource of changes) {
    const resourceMap = resource.kind === 'rules' ? mutableRules : mutableSkills;
    const currentEntry = resourceMap[resource.name];
    if (!await resourceExists(workspacePath, resource)) {
      delete resourceMap[resource.name];
      releasedResources.push(currentEntry === undefined
        ? resource
        : { ...resource, previousVersion: currentEntry.version });
      continue;
    }
    if (currentEntry === undefined) {
      resourceMap[resource.name] = {
        version: '1.0.0',
        desc: requireString(await dependencies.describeResource(resource), `${resource.kind}.${resource.name}.desc`),
        updatedAt: formatUtcDate(dependencies.now()),
      };
      releasedResources.push({ ...resource, nextVersion: '1.0.0' });
      continue;
    }
    const releaseType = await dependencies.selectReleaseType(resource);
    const nextVersion = bumpResourceVersion(currentEntry.version, releaseType);
    resourceMap[resource.name] = { ...currentEntry, version: nextVersion, updatedAt: formatUtcDate(dependencies.now()) };
    releasedResources.push({ ...resource, previousVersion: currentEntry.version, nextVersion });
  }
  await writeJsonAtomic(join(workspacePath, 'registry.json'), { rules: mutableRules, skills: mutableSkills });
  return releasedResources;
}
