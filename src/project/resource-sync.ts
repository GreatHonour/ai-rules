import type { DownloadedResource } from '../registry/resource-downloader.js';
import type { Manifest } from '../types.js';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { writeJsonAtomic } from './manifest.js';
import { requireResourceName } from '../validation.js';

export interface ResourceSyncResult {
  readonly backupPath: string;
  readonly skippedSkills: readonly string[];
}

export interface ResourceSyncOptions {
  readonly removedRuleNames?: readonly string[];
  readonly manifest?: Manifest;
  readonly afterSwap?: () => Promise<void>;
}

interface ResourceSyncFailure {
  readonly resourceName: string;
  readonly message: string;
}

/** 表示已保留备份、需人工处理的资源同步失败。 */
export class ResourceSyncError extends Error {
  readonly backupPath: string;
  readonly failures: readonly ResourceSyncFailure[];

  /** 创建包含失败资源与备份位置的同步错误。 */
  constructor(backupPath: string, failures: readonly ResourceSyncFailure[]) {
    const failureText = failures.map(failure => `${failure.resourceName}: ${failure.message}`).join('\n');
    super(`资源同步失败，请根据以下项目手动更新：\n${failureText}\n已保留备份目录: ${backupPath}`);
    this.name = 'ResourceSyncError';
    this.backupPath = backupPath;
    this.failures = failures;
  }
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

/** 将日期转换为 Windows 安全的 UTC 备份时间戳。 */
function formatBackupTimestamp(date: Date): string {
  const pad = (value: number, length = 2): string => value.toString().padStart(length, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes()
  )}${pad(date.getUTCSeconds())}${pad(date.getUTCMilliseconds(), 3)}`;
}

/** 创建不与已有目录冲突的项目根目录备份路径。 */
async function createBackupPath(workspacePath: string): Promise<string> {
  const backupName = `.team-cli-agents-backup-${formatBackupTimestamp(new Date())}`;
  let sequence = 0;
  while (true) {
    const suffix = sequence === 0 ? '' : `-${sequence}`;
    const backupPath = join(workspacePath, `${backupName}${suffix}`);
    if (!(await pathExists(backupPath))) {
      return backupPath;
    }
    sequence += 1;
  }
}

/** 在修改前创建 `.agents` 的完整副本。 */
async function createAgentsBackup(workspacePath: string, agentsPath: string): Promise<string> {
  const backupPath = await createBackupPath(workspacePath);
  if (await pathExists(agentsPath)) {
    await cp(agentsPath, backupPath, { recursive: true });
  } else {
    await mkdir(backupPath, { recursive: true });
  }
  return backupPath;
}

/** 记录单个资源的写入失败，并继续尝试其他资源。 */
async function applyOperation(
  resourceName: string,
  operation: () => Promise<void>,
  failures: ResourceSyncFailure[]
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    failures.push({ resourceName, message: error instanceof Error ? error.message : String(error) });
  }
}

/** 原地同步资源，保留本地非 flow skill。 */
async function applyResources(
  agentsPath: string,
  resources: readonly DownloadedResource[],
  removedRuleNames: readonly string[],
  failures: ResourceSyncFailure[]
): Promise<readonly string[]> {
  await applyOperation(
    'rules 目录',
    async () => {
      await mkdir(join(agentsPath, 'rules'), { recursive: true });
    },
    failures
  );
  await applyOperation(
    'skills 目录',
    async () => {
      await mkdir(join(agentsPath, 'skills'), { recursive: true });
    },
    failures
  );
  await applyOperation(
    'issues 目录',
    async () => {
      await mkdir(join(agentsPath, 'issues'), { recursive: true });
    },
    failures
  );
  for (const ruleName of removedRuleNames) {
    const safeRuleName = requireResourceName(ruleName, `removedRules.${ruleName}`);
    await applyOperation(
      `rules.${safeRuleName}`,
      async () => rm(join(agentsPath, 'rules', `${safeRuleName}.md`), { force: true }),
      failures
    );
  }
  const skippedSkills: string[] = [];
  for (const resource of resources) {
    const safeResourceName = requireResourceName(resource.name, `${resource.kind}.${resource.name}`);
    const targetPath =
      resource.kind === 'rules'
        ? join(agentsPath, 'rules', `${safeResourceName}.md`)
        : join(agentsPath, 'skills', safeResourceName);
    let isSkipped = false;
    await applyOperation(
      `${resource.kind}.${safeResourceName}`,
      async () => {
        if (resource.kind === 'skills' && !safeResourceName.startsWith('flow-') && (await pathExists(targetPath))) {
          isSkipped = true;
          return;
        }
        await rm(targetPath, { recursive: resource.kind === 'skills', force: true });
        await cp(resource.sourcePath, targetPath, { recursive: resource.kind === 'skills' });
      },
      failures
    );
    if (isSkipped) {
      skippedSkills.push(safeResourceName);
    }
  }
  return skippedSkills;
}

/** 创建备份后原地同步资源，失败时保留副本供用户手动恢复。 */
export async function syncResources(
  workspacePath: string,
  resources: readonly DownloadedResource[],
  options: ResourceSyncOptions = {}
): Promise<ResourceSyncResult> {
  const agentsPath = join(workspacePath, '.agents');
  const backupPath = await createAgentsBackup(workspacePath, agentsPath);
  const failures: ResourceSyncFailure[] = [];
  const skippedSkills = await applyResources(agentsPath, resources, options.removedRuleNames ?? [], failures);
  if (failures.length === 0 && options.manifest !== undefined) {
    await applyOperation(
      'manifest.json',
      async () => writeJsonAtomic(join(agentsPath, 'manifest.json'), options.manifest),
      failures
    );
  }
  if (failures.length === 0 && options.afterSwap !== undefined) {
    await applyOperation('AGENTS.md', options.afterSwap, failures);
  }
  if (failures.length > 0) {
    throw new ResourceSyncError(backupPath, failures);
  }
  return { backupPath, skippedSkills };
}
