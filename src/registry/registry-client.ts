import type { Registry, ResourceEntry } from '../types.js';
import {
  requireExactKeys,
  requireRecord,
  requireResourceName,
  requireSemVer,
  requireString,
  requireUtcDateTime,
} from '../validation.js';

/** 校验单个公共资源条目。 */
function validateResourceEntry(value: unknown, fieldPath: string): ResourceEntry {
  const entry = requireRecord(value, fieldPath);
  requireExactKeys(entry, ['version', 'desc', 'updatedAt'], fieldPath);
  return {
    version: requireSemVer(entry.version, `${fieldPath}.version`),
    desc: requireString(entry.desc, `${fieldPath}.desc`),
    updatedAt: requireUtcDateTime(entry.updatedAt, `${fieldPath}.updatedAt`),
  };
}

/** 校验资源映射并保留具体资源名的错误路径。 */
function validateResourceMap(value: unknown, fieldPath: string): Readonly<Record<string, ResourceEntry>> {
  const source = requireRecord(value, fieldPath);
  return Object.fromEntries(
    Object.entries(source).map(([resourceName, entry]) => [
      requireResourceName(resourceName, `${fieldPath}.${resourceName}`),
      validateResourceEntry(entry, `${fieldPath}.${resourceName}`),
    ]),
  );
}

/** 校验并转换公共 registry JSON。 */
export function validateRegistry(value: unknown): Registry {
  const registry = requireRecord(value, 'registry');
  requireExactKeys(registry, ['repositoryUrl', 'rules', 'skills'], 'registry');
  return {
    repositoryUrl: requireString(registry.repositoryUrl, 'registry.repositoryUrl'),
    rules: validateResourceMap(registry.rules, 'registry.rules'),
    skills: validateResourceMap(registry.skills, 'registry.skills'),
  };
}

/** 从公开 URL 获取并校验 registry。 */
export async function fetchRegistry(registryUrl: string): Promise<Registry> {
  let response: Response;
  try {
    response = await fetch(registryUrl);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`无法访问 registry ${registryUrl}: ${message}`);
  }
  if (!response.ok) {
    throw new Error(`无法访问 registry ${registryUrl}: HTTP ${response.status}`);
  }
  let jsonValue: unknown;
  try {
    jsonValue = await response.json();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`registry JSON 非法: ${message}`);
  }
  return validateRegistry(jsonValue);
}
