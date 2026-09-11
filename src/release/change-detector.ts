import type { ResourceKind } from '../types.js';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { runGit } from '../git/git-command.js';

export type ResourceChangeType = 'added' | 'modified' | 'deleted';

export interface ChangedResource {
  readonly kind: ResourceKind;
  readonly name: string;
  readonly change: ResourceChangeType;
}

/** 将资源路径归并为 rule 文件或 skill 顶层目录。 */
export function mapChangedPaths(paths: readonly string[]): readonly Omit<ChangedResource, 'change'>[] {
  const resourceKeys = new Set<string>();
  for (const pathText of paths) {
    const normalizedPath = pathText.replaceAll('\\', '/');
    const ruleMatch = /^\.agents\/rules\/([^/]+)\.md$/.exec(normalizedPath);
    if (ruleMatch?.[1] !== undefined) {
      resourceKeys.add(`rules:${ruleMatch[1]}`);
      continue;
    }
    const skillMatch = /^\.agents\/skills\/([^/]+)(?:\/|$)/.exec(normalizedPath);
    if (skillMatch?.[1] !== undefined) {
      resourceKeys.add(`skills:${skillMatch[1]}`);
    }
  }
  return [...resourceKeys].sort().map(resourceKey => {
    const separatorIndex = resourceKey.indexOf(':');
    const kindText = resourceKey.slice(0, separatorIndex);
    return {
      kind: kindText === 'rules' ? 'rules' : 'skills',
      name: resourceKey.slice(separatorIndex + 1),
    };
  });
}

/** 解析 Git --name-status -z 输出。 */
function parseNameStatus(output: string): readonly { readonly path: string; readonly change: ResourceChangeType }[] {
  const tokens = output.split('\0').filter(token => token !== '');
  const changes: { path: string; change: ResourceChangeType }[] = [];
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 2) {
    const status = tokens[tokenIndex];
    const pathText = tokens[tokenIndex + 1];
    if (status === undefined || pathText === undefined) {
      throw new Error('无法解析 Git 变化输出');
    }
    const change = status.startsWith('A') ? 'added' : status.startsWith('D') ? 'deleted' : 'modified';
    changes.push({ path: pathText, change });
  }
  return changes;
}

/** 合并同一资源的多文件变化，并让删除优先于修改。 */
function mergeResourceChanges(
  pathChanges: readonly { readonly path: string; readonly change: ResourceChangeType }[]
): readonly ChangedResource[] {
  const mergedChanges = new Map<
    string,
    { readonly kind: ResourceKind; readonly name: string; readonly changes: Set<ResourceChangeType> }
  >();
  for (const pathChange of pathChanges) {
    for (const resource of mapChangedPaths([pathChange.path])) {
      const resourceKey = `${resource.kind}:${resource.name}`;
      const previous = mergedChanges.get(resourceKey);
      if (previous === undefined) {
        mergedChanges.set(resourceKey, { ...resource, changes: new Set([pathChange.change]) });
      } else {
        previous.changes.add(pathChange.change);
      }
    }
  }
  return [...mergedChanges.values()]
    .map(resource => {
      const change = resource.changes.size === 1 ? (resource.changes.values().next().value ?? 'modified') : 'modified';
      return { kind: resource.kind, name: resource.name, change };
    })
    .sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`));
}

/** 返回资源在仓库中的规范路径。 */
function getResourcePath(resource: Omit<ChangedResource, 'change'>): string {
  return resource.kind === 'rules' ? `.agents/rules/${resource.name}.md` : `.agents/skills/${resource.name}`;
}

/** 判断资源在工作树中是否存在。 */
async function resourceExistsInWorkingTree(workspacePath: string, resource: Omit<ChangedResource, 'change'>): Promise<boolean> {
  try {
    await stat(join(workspacePath, getResourcePath(resource)));
    return true;
  } catch (error: unknown) {
    const errorCode = error instanceof Error && 'code' in error ? Reflect.get(error, 'code') : undefined;
    if (errorCode === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/** 判断资源在 Git tree 中是否存在。 */
async function resourceExistsInTree(
  workspacePath: string,
  reference: string,
  resource: Omit<ChangedResource, 'change'>
): Promise<boolean> {
  const output = await runGit(workspacePath, ['ls-tree', '-r', '--name-only', reference, '--', getResourcePath(resource)]);
  return output.trim() !== '';
}

/** 判断资源在当前 index 中是否存在。 */
async function resourceExistsInIndex(workspacePath: string, resource: Omit<ChangedResource, 'change'>): Promise<boolean> {
  const output = await runGit(workspacePath, ['ls-files', '--cached', '--', getResourcePath(resource)]);
  return output.trim() !== '';
}

/** 根据资源两端存在性判定新增、修改或删除。 */
function classifyResourceChange(
  resource: Omit<ChangedResource, 'change'>,
  baseExists: boolean,
  nextExists: boolean
): ChangedResource {
  const change = !baseExists && nextExists ? 'added' : baseExists && !nextExists ? 'deleted' : 'modified';
  return { ...resource, change };
}

/** 检测相对 HEAD 的工作树资源变化，包含未跟踪资源。 */
export async function detectWorkingResourceChanges(workspacePath: string): Promise<readonly ChangedResource[]> {
  const diffOutput = await runGit(workspacePath, [
    'diff',
    '--name-status',
    '--no-renames',
    '-z',
    'HEAD',
    '--',
    '.agents/rules',
    '.agents/skills',
  ]);
  const untrackedOutput = await runGit(workspacePath, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    '.agents/rules',
    '.agents/skills',
  ]);
  const trackedChanges = parseNameStatus(diffOutput);
  const untrackedChanges = untrackedOutput
    .split('\0')
    .filter(pathText => pathText !== '')
    .map(pathText => ({ path: pathText, change: 'added' as const }));
  const resources = mergeResourceChanges([...trackedChanges, ...untrackedChanges]);
  return Promise.all(
    resources.map(async ({ kind, name }) => {
      const resource = { kind, name };
      const [baseExists, nextExists] = await Promise.all([
        resourceExistsInTree(workspacePath, 'HEAD', resource),
        resourceExistsInWorkingTree(workspacePath, resource),
      ]);
      return classifyResourceChange(resource, baseExists, nextExists);
    })
  );
}

/** 检测暂存区相对 HEAD 的资源变化。 */
export async function detectStagedResourceChanges(workspacePath: string): Promise<readonly ChangedResource[]> {
  const diffOutput = await runGit(workspacePath, [
    'diff',
    '--cached',
    '--name-status',
    '--no-renames',
    '-z',
    'HEAD',
    '--',
    '.agents/rules',
    '.agents/skills',
  ]);
  const resources = mergeResourceChanges(parseNameStatus(diffOutput));
  return Promise.all(
    resources.map(async ({ kind, name }) => {
      const resource = { kind, name };
      const [baseExists, nextExists] = await Promise.all([
        resourceExistsInTree(workspacePath, 'HEAD', resource),
        resourceExistsInIndex(workspacePath, resource),
      ]);
      return classifyResourceChange(resource, baseExists, nextExists);
    })
  );
}

/** 检测当前 HEAD 相对合并目标分支的资源变化。 */
export async function detectBranchResourceChanges(
  workspacePath: string,
  baseReference: string
): Promise<readonly ChangedResource[]> {
  const diffOutput = await runGit(workspacePath, [
    'diff',
    '--name-status',
    '--no-renames',
    '-z',
    `${baseReference}...HEAD`,
    '--',
    '.agents/rules',
    '.agents/skills',
  ]);
  const resources = mergeResourceChanges(parseNameStatus(diffOutput));
  return Promise.all(
    resources.map(async ({ kind, name }) => {
      const resource = { kind, name };
      const [baseExists, nextExists] = await Promise.all([
        resourceExistsInTree(workspacePath, baseReference, resource),
        resourceExistsInTree(workspacePath, 'HEAD', resource),
      ]);
      return classifyResourceChange(resource, baseExists, nextExists);
    })
  );
}
