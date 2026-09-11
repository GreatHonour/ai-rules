import type { DownloadedBatch, ResourceDownloadRequest } from '../registry/resource-downloader.js';
import type { Manifest, ProjectProfile, Registry } from '../types.js';
import { rm } from 'node:fs/promises';
import { writeAgentsDocument } from '../project/agents-document.js';
import { syncResources } from '../project/resource-sync.js';
import { downloadResources } from '../registry/resource-downloader.js';
import { fetchRegistry } from '../registry/registry-client.js';
import { formatUtcDate } from '../validation.js';

export interface InitializeProjectOptions {
  readonly workspacePath: string;
  readonly registryUrl: string;
  readonly project: ProjectProfile;
  readonly ruleNames: readonly string[];
}

export interface InitializeProjectDependencies {
  readonly fetchRegistry: (registryUrl: string) => Promise<Registry>;
  readonly downloadResources: (requests: readonly ResourceDownloadRequest[]) => Promise<DownloadedBatch>;
  readonly now: () => Date;
  readonly cliVersion: string;
  readonly cleanupDownloads: boolean;
}

const DEFAULT_DEPENDENCIES: InitializeProjectDependencies = {
  fetchRegistry,
  downloadResources,
  now: () => new Date(),
  cliVersion: '1.0.0',
  cleanupDownloads: true,
};

/** 从 registry 选择并校验用户指定的 rules。 */
function selectRules(registry: Registry, ruleNames: readonly string[]): Manifest['rules'] {
  return Object.fromEntries(ruleNames.map((ruleName) => {
    const entry = registry.rules[ruleName];
    if (entry === undefined) {
      throw new Error(`registry 中不存在 rule: ${ruleName}`);
    }
    return [ruleName, entry];
  }));
}

/** 选择 registry 中默认受管的全部 flow-* skills。 */
function selectFlowSkills(registry: Registry): Manifest['skills'] {
  return Object.fromEntries(Object.entries(registry.skills)
    .filter(([skillName]) => skillName.startsWith('flow-'))
    .map(([skillName, entry]) => [skillName, { ...entry, managed: true as const }]));
}

/** 创建本次初始化的 manifest。 */
function createManifest(
  options: InitializeProjectOptions,
  registry: Registry,
  dependencies: InitializeProjectDependencies,
): Manifest {
  const timestamp = formatUtcDate(dependencies.now());
  return {
    schemaVersion: 1,
    project: options.project,
    registryUrl: options.registryUrl,
    repositoryUrl: registry.repositoryUrl,
    rules: selectRules(registry, options.ruleNames),
    skills: selectFlowSkills(registry),
    cliVersion: dependencies.cliVersion,
    updatedAt: timestamp,
  };
}

/** 将已选资源转换为下载请求。 */
function createDownloadRequests(manifest: Manifest): readonly ResourceDownloadRequest[] {
  return [
    ...Object.keys(manifest.rules).map((name) => ({ kind: 'rules' as const, name, repositoryUrl: manifest.repositoryUrl })),
    ...Object.keys(manifest.skills).map((name) => ({ kind: 'skills' as const, name, repositoryUrl: manifest.repositoryUrl })),
  ];
}

/** 初始化项目 rules、flow skills、manifest 与 AGENTS.md。 */
export async function initializeProject(
  options: InitializeProjectOptions,
  dependencies: InitializeProjectDependencies = DEFAULT_DEPENDENCIES,
): Promise<Manifest> {
  const registry = await dependencies.fetchRegistry(options.registryUrl);
  const manifest = createManifest(options, registry, dependencies);
  const downloadedBatch = await dependencies.downloadResources(createDownloadRequests(manifest));
  try {
    await syncResources(options.workspacePath, downloadedBatch.resources, {
      manifest,
      afterSwap: async () => writeAgentsDocument(options.workspacePath, Object.keys(manifest.rules)),
    });
    return manifest;
  } finally {
    if (dependencies.cleanupDownloads) {
      await rm(downloadedBatch.temporaryRoot, { recursive: true, force: true });
    }
  }
}
