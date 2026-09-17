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
import { formatUtcDate, requireSemVer, requireString } from '../validation.js';

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
  describeResource: async resource => `${resource.kind}.${resource.name}`,
  now: () => new Date(),
};

/** 判断公共源资源当前是否存在。 */
async function resourceExists(workspacePath: string, resource: ChangedResource): Promise<boolean> {
  const resourcePath =
    resource.kind === 'rules'
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

/** 从 rule 或 skill 的 front matter 读取源文件版本。 */
function parseSourceVersion(content: string, resource: ChangedResource, documentPath: string): string {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== '---') {
    throw new Error(`${documentPath} 缺少 front matter，无法校验版本号`);
  }
  let inMetadata = false;
  for (const line of lines.slice(1)) {
    if (line === '---') {
      break;
    }
    if (resource.kind === 'skills') {
      if (/^metadata:\s*$/.test(line)) {
        inMetadata = true;
        continue;
      }
      if (/^\S/.test(line)) {
        inMetadata = false;
      }
    }
    const versionMatch = /^\s*version:\s*["']?([^"'\s]+)["']?\s*$/.exec(line);
    const isVersionField = resource.kind === 'rules' ? /^version:/.test(line) : inMetadata;
    if (isVersionField && versionMatch?.[1] !== undefined) {
      return requireSemVer(versionMatch[1], `${resource.kind}.${resource.name}.sourceVersion`);
    }
  }
  throw new Error(`${documentPath} 缺少版本号，无法与 registry 同步`);
}

/** 读取资源源文件版本并用于 release 一致性校验。 */
async function readSourceVersion(workspacePath: string, resource: ChangedResource): Promise<string> {
  const documentPath =
    resource.kind === 'rules'
      ? join(workspacePath, '.agents', 'rules', `${resource.name}.md`)
      : join(workspacePath, '.agents', 'skills', resource.name, 'SKILL.md');
  let content: string;
  try {
    content = await readFile(documentPath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法读取 ${documentPath} 版本号: ${message}`);
  }
  return parseSourceVersion(content, resource, documentPath);
}

/** 根据工作树资源变化生成 registry 版本更新，不执行 Git 写操作。 */
export async function releaseRegistry(
  workspacePath: string,
  dependencies: ReleaseDependencies = DEFAULT_DEPENDENCIES
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
    if (!(await resourceExists(workspacePath, resource))) {
      delete resourceMap[resource.name];
      releasedResources.push(currentEntry === undefined ? resource : { ...resource, previousVersion: currentEntry.version });
      continue;
    }
    const nextVersion =
      currentEntry === undefined
        ? '1.0.0'
        : bumpResourceVersion(currentEntry.version, await dependencies.selectReleaseType(resource));
    const sourceVersion = await readSourceVersion(workspacePath, resource);
    if (sourceVersion !== nextVersion) {
      throw new Error(
        `${resource.kind}.${resource.name}.version 源文件为 ${sourceVersion}，release 目标为 ${nextVersion}，请同步修改源文件版本号`
      );
    }
    if (currentEntry === undefined) {
      resourceMap[resource.name] = {
        version: nextVersion,
        desc: requireString(await dependencies.describeResource(resource), `${resource.kind}.${resource.name}.desc`),
        updatedAt: formatUtcDate(dependencies.now()),
      };
      releasedResources.push({ ...resource, nextVersion });
      continue;
    }
    resourceMap[resource.name] = { ...currentEntry, version: nextVersion, updatedAt: formatUtcDate(dependencies.now()) };
    releasedResources.push({ ...resource, previousVersion: currentEntry.version, nextVersion });
  }
  await writeJsonAtomic(join(workspacePath, 'registry.json'), {
    repositoryUrl: registry.repositoryUrl,
    rules: mutableRules,
    skills: mutableSkills,
  });
  return releasedResources;
}
