import type { ResourceKind } from '../types.js';
import { execFile } from 'node:child_process';
import { cp, lstat, mkdtemp, readdir, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative } from 'node:path';
import { promisify } from 'node:util';

import { requireResourceName, requireString } from '../validation.js';

const executeFile = promisify(execFile);

export interface ResourceDownloadRequest {
  readonly kind: ResourceKind;
  readonly name: string;
  readonly repositoryUrl: string;
}

export interface DownloadedResource {
  readonly kind: ResourceKind;
  readonly name: string;
  readonly sourcePath: string;
}

export interface DownloadedBatch {
  readonly temporaryRoot: string;
  readonly resources: readonly DownloadedResource[];
}

/** 根据资源类型和安全名称推导公共仓库内路径。 */
export function createResourcePath(kind: ResourceKind, name: string): string {
  const resourceName = requireResourceName(name, `${kind}.${name}`);
  return kind === 'rules' ? join('.agents', 'rules', `${resourceName}.md`) : join('.agents', 'skills', resourceName);
}

/** 判断子路径是否仍位于给定根目录内。 */
function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const relativePath = relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

/** 拒绝资源中的符号链接，防止复制时逃逸。 */
export async function assertNoSymbolicLinks(resourcePath: string): Promise<void> {
  const resourceRoot = await realpath(resourcePath);
  const pendingPaths = [resourcePath];
  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop();
    if (currentPath === undefined) {
      continue;
    }
    const pathMetadata = await lstat(currentPath);
    if (pathMetadata.isSymbolicLink()) {
      throw new Error(`资源包含不安全的符号链接: ${currentPath}`);
    }
    const resolvedPath = await realpath(currentPath);
    if (!isWithinRoot(resourceRoot, resolvedPath)) {
      throw new Error(`资源路径逃逸: ${currentPath}`);
    }
    if (pathMetadata.isDirectory()) {
      const childNames = await readdir(currentPath);
      pendingPaths.push(...childNames.map(childName => join(currentPath, childName)));
    }
  }
}

/** 浅克隆一个公共源仓库。 */
async function cloneRepository(repositoryUrl: string, clonePath: string): Promise<void> {
  const validatedUrl = requireString(repositoryUrl, 'repositoryUrl');
  if (validatedUrl.includes('#')) {
    throw new Error('repositoryUrl 不能包含 fragment');
  }
  try {
    await executeFile('git', ['clone', '--depth', '1', '--', validatedUrl, clonePath]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`下载公共仓库失败: ${message}`);
  }
}

/** 从已克隆仓库校验并复制单个资源。 */
async function copyResource(
  request: ResourceDownloadRequest,
  clonePath: string,
  outputPath: string
): Promise<DownloadedResource> {
  const resourcePath = createResourcePath(request.kind, request.name);
  const sourcePath = join(clonePath, resourcePath);
  let sourceMetadata;
  try {
    sourceMetadata = await stat(sourcePath);
  } catch {
    throw new Error(`资源 ${request.name} 不存在: ${resourcePath}`);
  }
  if (request.kind === 'rules' && !sourceMetadata.isFile()) {
    throw new Error(`rule ${request.name} 必须是文件`);
  }
  if (request.kind === 'skills' && !sourceMetadata.isDirectory()) {
    throw new Error(`skill ${request.name} 必须是目录`);
  }
  await assertNoSymbolicLinks(sourcePath);
  await cp(sourcePath, outputPath, {
    recursive: sourceMetadata.isDirectory(),
    filter: copiedPath => basename(copiedPath) !== '.git',
  });
  return { kind: request.kind, name: request.name, sourcePath: outputPath };
}

/** 按仓库分组下载完整资源批次；任一失败时删除整个临时目录。 */
export async function downloadResources(requests: readonly ResourceDownloadRequest[]): Promise<DownloadedBatch> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'team-cli-download-'));
  try {
    const resources: DownloadedResource[] = [];
    const requestsByRepository = new Map<string, ResourceDownloadRequest[]>();
    for (const request of requests) {
      const repositoryRequests = requestsByRepository.get(request.repositoryUrl) ?? [];
      repositoryRequests.push(request);
      requestsByRepository.set(request.repositoryUrl, repositoryRequests);
    }
    let repositoryIndex = 0;
    let resourceIndex = 0;
    for (const [repositoryUrl, repositoryRequests] of requestsByRepository) {
      const clonePath = join(temporaryRoot, `clone-${repositoryIndex}`);
      await cloneRepository(repositoryUrl, clonePath);
      for (const request of repositoryRequests) {
        const outputPath = join(temporaryRoot, 'resources', `${resourceIndex}-${request.name}`);
        resources.push(await copyResource(request, clonePath, outputPath));
        resourceIndex += 1;
      }
      repositoryIndex += 1;
    }
    return { temporaryRoot, resources };
  } catch (error: unknown) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}
