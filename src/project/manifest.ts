import type { ManagedSkillEntry, Manifest, ProjectProfile, ResourceEntry } from '../types.js';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  requireExactKeys,
  requireRecord,
  requireResourceName,
  requireSemVer,
  requireString,
  requireStringArray,
  requireUtcDateTime,
} from '../validation.js';

/** 校验 manifest 中的公共资源条目。 */
function validateResourceEntry(value: unknown, fieldPath: string): ResourceEntry {
  const entry = requireRecord(value, fieldPath);
  requireExactKeys(entry, ['version', 'desc', 'updatedAt'], fieldPath);
  return {
    version: requireSemVer(entry.version, `${fieldPath}.version`),
    desc: requireString(entry.desc, `${fieldPath}.desc`),
    updatedAt: requireUtcDateTime(entry.updatedAt, `${fieldPath}.updatedAt`),
  };
}

/** 校验 manifest 中受管 skill 条目。 */
function validateManagedSkillEntry(value: unknown, fieldPath: string): ManagedSkillEntry {
  const entry = requireRecord(value, fieldPath);
  requireExactKeys(entry, ['version', 'desc', 'updatedAt', 'managed'], fieldPath);
  if (entry.managed !== true) {
    throw new Error(`${fieldPath}.managed 必须为 true`);
  }
  return {
    version: requireSemVer(entry.version, `${fieldPath}.version`),
    desc: requireString(entry.desc, `${fieldPath}.desc`),
    updatedAt: requireUtcDateTime(entry.updatedAt, `${fieldPath}.updatedAt`),
    managed: true,
  };
}

/** 校验资源名称到资源条目的映射。 */
function validateResourceMap(value: unknown, fieldPath: string): Readonly<Record<string, ResourceEntry>> {
  const source = requireRecord(value, fieldPath);
  return Object.fromEntries(
    Object.entries(source).map(([resourceName, entry]) => [
      requireResourceName(resourceName, `${fieldPath}.${resourceName}`),
      validateResourceEntry(entry, `${fieldPath}.${resourceName}`),
    ])
  );
}

/** 校验受管 skill 映射。 */
function validateSkillMap(value: unknown, fieldPath: string): Readonly<Record<string, ManagedSkillEntry>> {
  const source = requireRecord(value, fieldPath);
  return Object.fromEntries(
    Object.entries(source).map(([resourceName, entry]) => [
      requireResourceName(resourceName, `${fieldPath}.${resourceName}`),
      validateManagedSkillEntry(entry, `${fieldPath}.${resourceName}`),
    ])
  );
}

/** 校验 schema v2 项目画像。 */
function validateProjectProfile(value: unknown): ProjectProfile {
  const project = requireRecord(value, 'manifest.project');
  requireExactKeys(project, ['name', 'frontendFrameworks', 'backendFrameworks', 'environments'], 'manifest.project');
  return {
    name: requireString(project.name, 'manifest.project.name'),
    frontendFrameworks: requireStringArray(project.frontendFrameworks, 'manifest.project.frontendFrameworks'),
    backendFrameworks: requireStringArray(project.backendFrameworks, 'manifest.project.backendFrameworks'),
    environments: requireStringArray(project.environments, 'manifest.project.environments'),
  };
}

/** 将 schema v1 项目画像迁移为当前结构。 */
function migrateLegacyProjectProfile(value: unknown): ProjectProfile {
  const project = requireRecord(value, 'manifest.project');
  requireExactKeys(project, ['name', 'frameworks', 'architecture', 'environments'], 'manifest.project');
  requireString(project.architecture, 'manifest.project.architecture');
  return {
    name: requireString(project.name, 'manifest.project.name'),
    frontendFrameworks: requireStringArray(project.frameworks, 'manifest.project.frameworks'),
    backendFrameworks: [],
    environments: requireStringArray(project.environments, 'manifest.project.environments'),
  };
}

/** 校验并转换项目 manifest JSON。 */
export function validateManifest(value: unknown): Manifest {
  const manifest = requireRecord(value, 'manifest');
  requireExactKeys(
    manifest,
    ['schemaVersion', 'project', 'registryUrl', 'repositoryUrl', 'rules', 'skills', 'cliVersion', 'updatedAt'],
    'manifest'
  );
  if (manifest.schemaVersion !== 1 && manifest.schemaVersion !== 2) {
    throw new Error('manifest.schemaVersion 必须为 1 或 2');
  }
  const project =
    manifest.schemaVersion === 1 ? migrateLegacyProjectProfile(manifest.project) : validateProjectProfile(manifest.project);
  return {
    schemaVersion: 2,
    project,
    registryUrl: requireString(manifest.registryUrl, 'manifest.registryUrl'),
    repositoryUrl: requireString(manifest.repositoryUrl, 'manifest.repositoryUrl'),
    rules: validateResourceMap(manifest.rules, 'manifest.rules'),
    skills: validateSkillMap(manifest.skills, 'manifest.skills'),
    cliVersion: requireSemVer(manifest.cliVersion, 'manifest.cliVersion'),
    updatedAt: requireUtcDateTime(manifest.updatedAt, 'manifest.updatedAt'),
  };
}

/** 读取并校验工作区 manifest。 */
export async function readManifest(workspacePath: string): Promise<Manifest> {
  const manifestPath = join(workspacePath, '.agents', 'manifest.json');
  let manifestText: string;
  try {
    manifestText = await readFile(manifestPath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法读取 ${manifestPath}: ${message}`);
  }
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(manifestText) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`manifest JSON 非法: ${message}`);
  }
  return validateManifest(manifestValue);
}

/** 在目标同目录通过临时文件原子写入 JSON。 */
export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/** 在目标同目录通过临时文件原子写入文本。 */
export async function writeTextAtomic(filePath: string, content: string): Promise<void> {
  const parentPath = dirname(filePath);
  await mkdir(parentPath, { recursive: true });
  const temporaryPath = join(parentPath, `.${randomUUID()}.team-cli.tmp`);
  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

/** 原子写入工作区 manifest。 */
export async function writeManifest(workspacePath: string, manifest: Manifest): Promise<void> {
  await writeJsonAtomic(join(workspacePath, '.agents', 'manifest.json'), manifest);
}
