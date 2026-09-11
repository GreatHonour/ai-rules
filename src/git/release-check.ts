import type { Registry, ResourceEntry } from '../types.js';
import type { ChangedResource } from '../release/change-detector.js';
import { compare } from 'semver';
import { detectBranchResourceChanges, detectStagedResourceChanges } from '../release/change-detector.js';
import { validateRegistry } from '../registry/registry-client.js';
import { runGit } from './git-command.js';

/** 从 registry 中读取指定资源条目。 */
function getEntry(registry: Registry, resource: ChangedResource): ResourceEntry | undefined {
  return registry[resource.kind][resource.name];
}

/** 校验变化资源是否同步更新 registry 版本与时间。 */
export function validateRegistryChanges(
  changedResources: readonly ChangedResource[],
  baseRegistry: Registry,
  nextRegistry: Registry,
): readonly string[] {
  const errors: string[] = [];
  for (const kind of ['rules', 'skills'] as const) {
    for (const [name, baseEntry] of Object.entries(baseRegistry[kind])) {
      const nextEntry = nextRegistry[kind][name];
      if (nextEntry !== undefined && compare(nextEntry.version, baseEntry.version) < 0) {
        errors.push(`${kind}.${name}.version 不能从 ${baseEntry.version} 降至 ${nextEntry.version}`);
      }
    }
  }
  for (const resource of changedResources) {
    const baseEntry = getEntry(baseRegistry, resource);
    const nextEntry = getEntry(nextRegistry, resource);
    const resourcePath = `${resource.kind}.${resource.name}`;
    if (resource.change === 'deleted') {
      if (nextEntry !== undefined) {
        errors.push(`${resourcePath} 源资源已删除，但 registry 条目未删除`);
      }
      continue;
    }
    if (resource.change === 'added' || baseEntry === undefined) {
      if (nextEntry === undefined) {
        errors.push(`${resourcePath} 新资源缺少 registry 条目`);
      } else if (nextEntry.version !== '1.0.0') {
        errors.push(`${resourcePath}.version 新资源必须为 1.0.0`);
      }
      continue;
    }
    if (nextEntry === undefined) {
      errors.push(`${resourcePath} 修改后缺少 registry 条目`);
      continue;
    }
    if (compare(nextEntry.version, baseEntry.version) <= 0) {
      errors.push(`${resourcePath}.version 必须高于 ${baseEntry.version}`);
    }
    if (nextEntry.updatedAt === baseEntry.updatedAt) {
      errors.push(`${resourcePath}.updatedAt 必须随源内容变化`);
    }
  }
  return errors;
}

/** 尝试从 Git 对象读取 registry；基准中不存在时返回空 registry。 */
async function readGitRegistry(workspacePath: string, revisionPath: string): Promise<Registry> {
  let registryText: string;
  try {
    registryText = await runGit(workspacePath, ['show', revisionPath]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('does not exist in') || message.includes('exists on disk, but not in')) {
      return { repositoryUrl: '', rules: {}, skills: {} };
    }
    throw error;
  }
  return validateRegistry(JSON.parse(registryText) as unknown);
}

/** 执行暂存区或目标分支的只读 registry 门禁。 */
export async function runRegistryCheck(workspacePath: string, baseReference?: string): Promise<void> {
  const changedResources = baseReference === undefined
    ? await detectStagedResourceChanges(workspacePath)
    : await detectBranchResourceChanges(workspacePath, baseReference);
  const baseRegistry = baseReference === undefined
    ? await readGitRegistry(workspacePath, 'HEAD:registry.json')
    : await readGitRegistry(workspacePath, `${baseReference}:registry.json`);
  const nextRegistry = baseReference === undefined
    ? validateRegistry(JSON.parse(await readFileFromIndex(workspacePath)) as unknown)
    : await readGitRegistry(workspacePath, 'HEAD:registry.json');
  const errors = validateRegistryChanges(changedResources, baseRegistry, nextRegistry);
  if (errors.length > 0) {
    throw new Error(`${errors.join('\n')}\n请运行 pnpm agents release`);
  }
}

/** 从暂存区读取 registry.json。 */
async function readFileFromIndex(workspacePath: string): Promise<string> {
  return runGit(workspacePath, ['show', ':registry.json']);
}
