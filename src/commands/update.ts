import type { DownloadedBatch, ResourceDownloadRequest } from '../registry/resource-downloader.js';
import type { Manifest, NamedResource, Registry, ResourceEntry, ResourceKind } from '../types.js';
import { rm } from 'node:fs/promises';
import { compare } from 'semver';
import { writeAgentsDocument } from '../project/agents-document.js';
import { readManifest } from '../project/manifest.js';
import { syncResources } from '../project/resource-sync.js';
import { downloadResources } from '../registry/resource-downloader.js';
import { fetchRegistry } from '../registry/registry-client.js';
import { formatUtcDate } from '../validation.js';

export interface PlannedUpdate extends NamedResource {
  readonly localEntry: ResourceEntry;
  readonly remoteEntry: ResourceEntry;
}

export interface RollbackWarning {
  readonly kind: ResourceKind;
  readonly name: string;
  readonly localVersion: string;
  readonly remoteVersion: string;
}

export interface UpdatePlan {
  readonly updates: readonly PlannedUpdate[];
  readonly rollbacks: readonly RollbackWarning[];
  readonly skippedSkills: readonly string[];
}

export interface UpdateProjectDependencies {
  readonly fetchRegistry: (registryUrl: string) => Promise<Registry>;
  readonly downloadResources: (requests: readonly ResourceDownloadRequest[]) => Promise<DownloadedBatch>;
  readonly confirm: (plan: UpdatePlan) => Promise<boolean>;
  readonly now: () => Date;
  readonly cleanupDownloads: boolean;
}

export interface UpdateProjectResult extends UpdatePlan {
  readonly status: 'current' | 'cancelled' | 'updated';
}

const DEFAULT_DEPENDENCIES: UpdateProjectDependencies = {
  fetchRegistry,
  downloadResources,
  confirm: async () => true,
  now: () => new Date(),
  cleanupDownloads: true,
};

/** 比较一类 manifest 资源与远端 registry。 */
function compareResourceMap(
  kind: ResourceKind,
  localResources: Readonly<Record<string, ResourceEntry>>,
  remoteResources: Readonly<Record<string, ResourceEntry>>,
  plan: { updates: PlannedUpdate[]; rollbacks: RollbackWarning[]; skippedSkills: string[] },
): void {
  for (const [name, localEntry] of Object.entries(localResources)) {
    const remoteEntry = remoteResources[name];
    if (remoteEntry === undefined) {
      throw new Error(`远端 registry 缺少 ${kind}.${name}`);
    }
    const versionOrder = compare(remoteEntry.version, localEntry.version);
    if (versionOrder < 0) {
      plan.rollbacks.push({ kind, name, localVersion: localEntry.version, remoteVersion: remoteEntry.version });
      continue;
    }
    if (versionOrder === 0) {
      continue;
    }
    if (kind === 'skills' && !name.startsWith('flow-')) {
      plan.skippedSkills.push(name);
      continue;
    }
    plan.updates.push({ kind, name, entry: remoteEntry, localEntry, remoteEntry });
  }
}

/** 仅依据 SemVer 规划可应用更新、回退异常和跳过项。 */
export function planUpdates(manifest: Manifest, registry: Registry): UpdatePlan {
  const mutablePlan = { updates: [] as PlannedUpdate[], rollbacks: [] as RollbackWarning[], skippedSkills: [] as string[] };
  compareResourceMap('rules', manifest.rules, registry.rules, mutablePlan);
  compareResourceMap('skills', manifest.skills, registry.skills, mutablePlan);
  return mutablePlan;
}

/** 根据实际可应用更新构造下一版 manifest。 */
function createUpdatedManifest(manifest: Manifest, plan: UpdatePlan, repositoryUrl: string, now: Date): Manifest {
  const updateMap = new Map(plan.updates.map((update) => [`${update.kind}:${update.name}`, update.remoteEntry]));
  const rules = Object.fromEntries(Object.entries(manifest.rules).map(([name, entry]) => [
    name,
    updateMap.get(`rules:${name}`) ?? entry,
  ]));
  const skills = Object.fromEntries(Object.entries(manifest.skills).map(([name, entry]) => {
    const updatedEntry = updateMap.get(`skills:${name}`);
    return [name, updatedEntry === undefined ? entry : { ...updatedEntry, managed: true as const }];
  }));
  return { ...manifest, repositoryUrl, rules, skills, updatedAt: formatUtcDate(now) };
}

/** 检查、确认并事务式更新工作区受管资源。 */
export async function updateProject(
  workspacePath: string,
  dependencies: UpdateProjectDependencies = DEFAULT_DEPENDENCIES,
): Promise<UpdateProjectResult> {
  const manifest = await readManifest(workspacePath);
  const registry = await dependencies.fetchRegistry(manifest.registryUrl);
  const plan = planUpdates(manifest, registry);
  if (plan.updates.length === 0) {
    return { ...plan, status: 'current' };
  }
  if (!await dependencies.confirm(plan)) {
    return { ...plan, status: 'cancelled' };
  }
  const downloadRequests = plan.updates.map((update) => ({
    kind: update.kind,
    name: update.name,
    repositoryUrl: registry.repositoryUrl,
  }));
  const downloadedBatch = await dependencies.downloadResources(downloadRequests);
  try {
    const nextManifest = createUpdatedManifest(manifest, plan, registry.repositoryUrl, dependencies.now());
    await syncResources(workspacePath, downloadedBatch.resources, {
      manifest: nextManifest,
      afterSwap: async () => writeAgentsDocument(workspacePath, Object.keys(nextManifest.rules)),
    });
    return { ...plan, status: 'updated' };
  } finally {
    if (dependencies.cleanupDownloads) {
      await rm(downloadedBatch.temporaryRoot, { recursive: true, force: true });
    }
  }
}
