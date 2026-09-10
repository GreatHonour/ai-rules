import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { copyTree, hashFiles, hashTree, pathExists } from './file-system.js';
import { readState, writeYaml } from './config.js';

export interface MaterializeOptions {
  readonly workspace: string;
  readonly managedRoot: string;
  readonly force: boolean;
}

export async function computeRuntimeHash(runtimeRoot: string): Promise<string> {
  return hashTree(runtimeRoot);
}

export async function computeRuntimeFileHashes(runtimeRoot: string): Promise<Readonly<Record<string, string>>> {
  return hashFiles(runtimeRoot);
}

async function assertRuntimeClean(workspace: string, force: boolean): Promise<void> {
  const runtimeRoot = path.join(workspace, '.agents');
  const state = await readState(workspace);
  const hasRuntime = await pathExists(path.join(runtimeRoot, 'rules')) || await pathExists(path.join(runtimeRoot, 'skills'));
  if (state === undefined) {
    if (hasRuntime) {
      throw new Error('发现未被管理的现有 .agents 内容，请先执行 agentctl init --adopt');
    }
    return;
  }
  if (force) {
    return;
  }
  const currentHash = await computeCurrentRuntimeHash(workspace);
  if (currentHash !== state.runtimeHash) {
    throw new Error('托管目录存在人工修改，请先执行 agentctl diff 或使用 --force');
  }
}

async function hashManagedRuntime(runtimeRoot: string): Promise<string> {
  const stagingRoot = path.join(path.dirname(runtimeRoot), '.agentctl', `hash-${process.pid}-${Date.now()}`);
  try {
    await mkdir(stagingRoot, { recursive: true });
    await copyTree(path.join(runtimeRoot, 'rules'), path.join(stagingRoot, 'rules'));
    await copyTree(path.join(runtimeRoot, 'skills'), path.join(stagingRoot, 'skills'));
    return await computeRuntimeHash(stagingRoot);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

export async function computeCurrentRuntimeHash(workspace: string): Promise<string> {
  return hashManagedRuntime(path.join(workspace, '.agents'));
}

export async function materialize(options: MaterializeOptions): Promise<void> {
  await assertRuntimeClean(options.workspace, options.force);
  const agentsRoot = path.join(options.workspace, '.agents');
  const stagingRoot = path.join(options.workspace, '.agentctl', `staging-${process.pid}-${Date.now()}`);
  const backupRoot = path.join(options.workspace, '.agentctl', `backup-${process.pid}-${Date.now()}`);
  const installedDirectories = new Set<string>();
  let isCommitted = false;
  let isRollbackComplete = false;
  await mkdir(stagingRoot, { recursive: true });

  try {
    await copyTree(options.managedRoot, stagingRoot);
    await assertOverlaySafe(path.join(agentsRoot, 'overrides'));
    await assertOverlaySafe(path.join(agentsRoot, 'overrides.local'));
    await copyTree(path.join(agentsRoot, 'overrides'), stagingRoot);
    await copyTree(path.join(agentsRoot, 'overrides.local'), stagingRoot);
    const runtimeHash = await computeRuntimeHash(stagingRoot);
    const runtimeFiles = await computeRuntimeFileHashes(stagingRoot);

    await mkdir(backupRoot, { recursive: true });
    for (const directory of ['rules', 'skills'] as const) {
      const currentPath = path.join(agentsRoot, directory);
      if (await pathExists(currentPath)) {
        await rename(currentPath, path.join(backupRoot, directory));
      }
      const stagedPath = path.join(stagingRoot, directory);
      if (await pathExists(stagedPath)) {
        await mkdir(agentsRoot, { recursive: true });
        await rename(stagedPath, currentPath);
        installedDirectories.add(directory);
      }
    }

    await writeYaml(path.join(options.workspace, '.agentctl', 'state.yaml'), {
      schema: 1,
      runtimeHash,
      files: runtimeFiles,
      generatedAt: new Date().toISOString(),
    });
    isCommitted = true;
  } catch (error: unknown) {
    if (!isCommitted) {
      for (const directory of ['rules', 'skills'] as const) {
        const backupPath = path.join(backupRoot, directory);
        const currentPath = path.join(agentsRoot, directory);
        if (installedDirectories.has(directory)) {
          await rm(currentPath, { recursive: true, force: true });
        }
        if (await pathExists(backupPath)) {
          await rename(backupPath, currentPath);
        }
      }
      isRollbackComplete = true;
    }
    throw error;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
    if (isCommitted || isRollbackComplete) {
      await rm(backupRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function assertOverlaySafe(overlayRoot: string): Promise<void> {
  const { listFiles } = await import('./file-system.js');
  const forbidden = (await listFiles(overlayRoot)).find((file) => /^skills\/[^/]+\/SKILL\.md$/i.test(file));
  if (forbidden !== undefined) {
    throw new Error(`overlay 不允许覆盖 skill 必需入口: ${forbidden}`);
  }
}

export async function readRuntimeHashFromState(workspace: string): Promise<string | undefined> {
  const statePath = path.join(workspace, '.agentctl', 'state.yaml');
  if (!(await pathExists(statePath))) {
    return undefined;
  }
  const value: unknown = parse(await readFile(statePath, 'utf8'));
  if (typeof value !== 'object' || value === null || !('runtimeHash' in value) || typeof value.runtimeHash !== 'string') {
    throw new Error('state 文件格式无效');
  }
  return value.runtimeHash;
}
