import type { DownloadedResource } from '../registry/resource-downloader.js';
import type { Manifest } from '../types.js';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonAtomic } from './manifest.js';
import { requireResourceName } from '../validation.js';

export interface ResourceSyncResult {
  readonly skippedSkills: readonly string[];
}

export interface ResourceSyncOptions {
  readonly removedRuleNames?: readonly string[];
  readonly manifest?: Manifest;
  readonly afterSwap?: () => Promise<void>;
}

/** 判断路径是否存在。 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error: unknown) {
    const errorCode = error instanceof Error && 'code' in error ? Reflect.get(error, 'code') : undefined;
    if (errorCode === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/** 在临时副本中应用资源更新。 */
async function applyResources(
  stagedAgentsPath: string,
  resources: readonly DownloadedResource[],
  removedRuleNames: readonly string[],
): Promise<readonly string[]> {
  await mkdir(join(stagedAgentsPath, 'rules'), { recursive: true });
  await mkdir(join(stagedAgentsPath, 'skills'), { recursive: true });
  await mkdir(join(stagedAgentsPath, 'issues'), { recursive: true });
  for (const ruleName of removedRuleNames) {
    const safeRuleName = requireResourceName(ruleName, `removedRules.${ruleName}`);
    await rm(join(stagedAgentsPath, 'rules', `${safeRuleName}.md`), { force: true });
  }
  const skippedSkills: string[] = [];
  for (const resource of resources) {
    const safeResourceName = requireResourceName(resource.name, `${resource.kind}.${resource.name}`);
    const targetPath = resource.kind === 'rules'
      ? join(stagedAgentsPath, 'rules', `${safeResourceName}.md`)
      : join(stagedAgentsPath, 'skills', safeResourceName);
    if (resource.kind === 'skills' && !safeResourceName.startsWith('flow-') && await pathExists(targetPath)) {
      skippedSkills.push(safeResourceName);
      continue;
    }
    await rm(targetPath, { recursive: true, force: true });
    await cp(resource.sourcePath, targetPath, { recursive: resource.kind === 'skills' });
  }
  return skippedSkills;
}

/** 通过目录交换同步资源，并在交换失败时恢复旧 .agents。 */
export async function syncResources(
  workspacePath: string,
  resources: readonly DownloadedResource[],
  options: ResourceSyncOptions = {},
): Promise<ResourceSyncResult> {
  const agentsPath = join(workspacePath, '.agents');
  const operationId = randomUUID();
  const stagedAgentsPath = join(workspacePath, `.team-cli-agents-stage-${operationId}`);
  const backupAgentsPath = join(workspacePath, `.team-cli-agents-backup-${operationId}`);
  const hasExistingAgents = await pathExists(agentsPath);
  let hasBackup = false;
  try {
    if (hasExistingAgents) {
      await cp(agentsPath, stagedAgentsPath, { recursive: true });
    } else {
      await mkdir(stagedAgentsPath, { recursive: true });
    }
    const skippedSkills = await applyResources(stagedAgentsPath, resources, options.removedRuleNames ?? []);
    if (options.manifest !== undefined) {
      await writeJsonAtomic(join(stagedAgentsPath, 'manifest.json'), options.manifest);
    }
    if (hasExistingAgents) {
      await rename(agentsPath, backupAgentsPath);
      hasBackup = true;
    }
    await rename(stagedAgentsPath, agentsPath);
    if (options.afterSwap !== undefined) {
      await options.afterSwap();
    }
    if (hasBackup) {
      hasBackup = false;
      try {
        await rm(backupAgentsPath, { recursive: true, force: true });
      } catch {
        // 新状态已提交，备份清理失败不应触发破坏性回滚。
      }
    }
    return { skippedSkills };
  } catch (error: unknown) {
    if (hasBackup) {
      await rm(agentsPath, { recursive: true, force: true });
      await rename(backupAgentsPath, agentsPath);
      hasBackup = false;
    } else if (!hasExistingAgents) {
      await rm(agentsPath, { recursive: true, force: true });
    }
    throw error;
  } finally {
    await rm(stagedAgentsPath, { recursive: true, force: true });
  }
}
