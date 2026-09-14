import type { DownloadedBatch, ResourceDownloadRequest } from '../registry/resource-downloader.js';
import type { Manifest, ProjectProfile, Registry } from '../types.js';
import { rm } from 'node:fs/promises';
import { writeAgentsDocument } from '../project/agents-document.js';
import { readManifest } from '../project/manifest.js';
import { syncResources } from '../project/resource-sync.js';
import { downloadResources } from '../registry/resource-downloader.js';
import { fetchRegistry } from '../registry/registry-client.js';
import { formatUtcDate } from '../validation.js';

export interface ConfigureProjectOptions {
  readonly workspacePath: string;
  readonly project?: ProjectProfile;
  readonly ruleNames: readonly string[];
}

export interface ConfigureProjectDependencies {
  readonly fetchRegistry: (registryUrl: string) => Promise<Registry>;
  readonly downloadResources: (requests: readonly ResourceDownloadRequest[]) => Promise<DownloadedBatch>;
  readonly now: () => Date;
  readonly cleanupDownloads: boolean;
}

export interface ConfigureProjectResult {
  readonly backupPath: string;
  readonly manifest: Manifest;
}

const DEFAULT_DEPENDENCIES: ConfigureProjectDependencies = {
  fetchRegistry,
  downloadResources,
  now: () => new Date(),
  cleanupDownloads: true,
};

/** 调整项目画像和 rules 选择并同步受管文件。 */
export async function configureProject(
  options: ConfigureProjectOptions,
  dependencies: ConfigureProjectDependencies = DEFAULT_DEPENDENCIES
): Promise<ConfigureProjectResult> {
  const currentManifest = await readManifest(options.workspacePath);
  const registry = await dependencies.fetchRegistry(currentManifest.registryUrl);
  const selectedRules = Object.fromEntries(
    options.ruleNames.map(ruleName => {
      const entry = registry.rules[ruleName];
      if (entry === undefined) {
        throw new Error(`registry 中不存在 rule: ${ruleName}`);
      }
      return [ruleName, entry];
    })
  );
  const nextManifest: Manifest = {
    ...currentManifest,
    project: options.project ?? currentManifest.project,
    repositoryUrl: registry.repositoryUrl,
    rules: selectedRules,
    updatedAt: formatUtcDate(dependencies.now()),
  };
  const removedRuleNames = Object.keys(currentManifest.rules).filter(ruleName => !(ruleName in selectedRules));
  const requests: readonly ResourceDownloadRequest[] = Object.keys(selectedRules).map(name => ({
    kind: 'rules',
    name,
    repositoryUrl: registry.repositoryUrl,
  }));
  const downloadedBatch = await dependencies.downloadResources(requests);
  try {
    const syncResult = await syncResources(options.workspacePath, downloadedBatch.resources, {
      removedRuleNames,
      manifest: nextManifest,
      afterSwap: async () =>
        writeAgentsDocument(
          options.workspacePath,
          Object.entries(selectedRules).map(([name, entry]) => ({ name, description: entry.desc }))
        ),
    });
    return { manifest: nextManifest, backupPath: syncResult.backupPath };
  } finally {
    if (dependencies.cleanupDownloads) {
      await rm(downloadedBatch.temporaryRoot, { recursive: true, force: true });
    }
  }
}
