import { readFile } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { parse, stringify } from 'yaml';
import type {
  DependencyConfig,
  LockedPackage,
  PackageKind,
  PackageSpec,
  ProjectLock,
  ProjectManifest,
  ProjectState,
  RegistryConfig,
} from './types.js';
import { atomicWrite, pathExists } from './file-system.js';

const PACKAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象`);
  }
}

function assertKnownFields(record: Record<string, unknown>, fields: readonly string[], label: string): void {
  const unknownFields = Object.keys(record).filter((field) => !fields.includes(field));
  if (unknownFields.length > 0) {
    throw new Error(`${label} 包含未知字段: ${unknownFields.join(', ')}`);
  }
}

function parseRegistries(value: unknown): Readonly<Record<string, RegistryConfig>> {
  assertRecord(value, 'registries');
  return Object.fromEntries(
    Object.entries(value).map(([name, registryValue]) => {
      assertRecord(registryValue, `registry ${name}`);
      assertKnownFields(registryValue, ['url', 'ref'], `registry ${name}`);
      if (typeof registryValue.url !== 'string' || registryValue.url.length === 0) {
        throw new Error(`registry ${name}.url 必须是非空字符串`);
      }
      if (registryValue.ref !== undefined && typeof registryValue.ref !== 'string') {
        throw new Error(`registry ${name}.ref 必须是字符串`);
      }
      const registry: RegistryConfig = registryValue.ref === undefined
        ? { url: registryValue.url }
        : { url: registryValue.url, ref: registryValue.ref };
      return [name, registry];
    }),
  );
}

function parseDependencyMap(value: unknown, label: string): Readonly<Record<string, DependencyConfig>> {
  assertRecord(value, label);
  return Object.fromEntries(
    Object.entries(value).map(([name, dependencyValue]) => {
      if (!PACKAGE_NAME_PATTERN.test(name)) {
        throw new Error(`${label} 包名不合法: ${name}`);
      }
      assertRecord(dependencyValue, `${label}.${name}`);
      assertKnownFields(dependencyValue, ['version', 'registry'], `${label}.${name}`);
      if (typeof dependencyValue.version !== 'string' || semver.validRange(dependencyValue.version) === null) {
        throw new Error(`${label}.${name}.version 不是合法 SemVer 范围`);
      }
      if (typeof dependencyValue.registry !== 'string' || dependencyValue.registry.length === 0) {
        throw new Error(`${label}.${name}.registry 必须是非空字符串`);
      }
      return [name, { version: dependencyValue.version, registry: dependencyValue.registry }];
    }),
  );
}

export function parseManifest(contents: string): ProjectManifest {
  const value: unknown = parse(contents);
  assertRecord(value, 'manifest');
  assertKnownFields(value, ['schema', 'registries', 'dependencies'], 'manifest');
  if (value.schema !== 1) {
    throw new Error('manifest.schema 必须为 1');
  }
  assertRecord(value.dependencies, 'dependencies');
  assertKnownFields(value.dependencies, ['rules', 'skills'], 'dependencies');
  const manifest: ProjectManifest = {
    schema: 1,
    registries: parseRegistries(value.registries),
    dependencies: {
      rules: parseDependencyMap(value.dependencies.rules, 'dependencies.rules'),
      skills: parseDependencyMap(value.dependencies.skills, 'dependencies.skills'),
    },
  };
  for (const [kind, dependencies] of Object.entries(manifest.dependencies)) {
    for (const [name, dependency] of Object.entries(dependencies)) {
      if (manifest.registries[dependency.registry] === undefined) {
        throw new Error(`${kind}.${name} 引用了不存在的 registry: ${dependency.registry}`);
      }
    }
  }
  return manifest;
}

export function parsePackageSpec(specification: string): PackageSpec {
  const match = /^(rule|skill):([a-z0-9]+(?:-[a-z0-9]+)*)@(.+)$/.exec(specification);
  if (match === null || semver.validRange(match[3]) === null) {
    throw new Error('包参数必须使用 rule:name@range 或 skill:name@range');
  }
  return { kind: match[1] as PackageKind, name: match[2] as string, version: match[3] as string };
}

export function serializeYaml(value: unknown): string {
  return stringify(value, { lineWidth: 0, sortMapEntries: true });
}

export async function readManifest(workspace: string): Promise<ProjectManifest> {
  return parseManifest(await readFile(path.join(workspace, '.agentctl', 'manifest.yaml'), 'utf8'));
}

export async function readLock(workspace: string): Promise<ProjectLock> {
  const lockPath = path.join(workspace, '.agentctl', 'lock.yaml');
  if (!(await pathExists(lockPath))) {
    return { schema: 1, packages: [] };
  }
  const value: unknown = parse(await readFile(lockPath, 'utf8'));
  assertRecord(value, 'lock');
  if (value.schema !== 1 || !Array.isArray(value.packages)) {
    throw new Error('lock 文件格式无效');
  }
  const packages = value.packages.map((packageValue, packageIndex): LockedPackage => {
    assertRecord(packageValue, `lock.packages[${packageIndex}]`);
    const stringFields = ['name', 'version', 'registry', 'url', 'commit', 'packagePath', 'entry', 'contentHash', 'target'] as const;
    if (
      (packageValue.kind !== 'rule' && packageValue.kind !== 'skill') ||
      stringFields.some((field) => typeof packageValue[field] !== 'string') ||
      !Array.isArray(packageValue.files) || !packageValue.files.every((file) => typeof file === 'string')
    ) {
      throw new Error(`lock.packages[${packageIndex}] 格式无效`);
    }
    const kind: PackageKind = packageValue.kind;
    return {
      name: packageValue.name as string,
      kind,
      version: packageValue.version as string,
      registry: packageValue.registry as string,
      url: packageValue.url as string,
      commit: packageValue.commit as string,
      packagePath: packageValue.packagePath as string,
      entry: packageValue.entry as string,
      files: packageValue.files as string[],
      contentHash: packageValue.contentHash as string,
      target: packageValue.target as string,
    };
  });
  return { schema: 1, packages };
}

export async function readState(workspace: string): Promise<ProjectState | undefined> {
  const statePath = path.join(workspace, '.agentctl', 'state.yaml');
  if (!(await pathExists(statePath))) {
    return undefined;
  }
  const value: unknown = parse(await readFile(statePath, 'utf8'));
  assertRecord(value, 'state');
  if (value.schema !== 1 || typeof value.runtimeHash !== 'string' || typeof value.generatedAt !== 'string') {
    throw new Error('state 文件格式无效');
  }
  const filesValue = value.files ?? {};
  assertRecord(filesValue, 'state.files');
  if (!Object.values(filesValue).every((hash) => typeof hash === 'string')) {
    throw new Error('state.files 格式无效');
  }
  return {
    schema: 1,
    runtimeHash: value.runtimeHash,
    files: Object.fromEntries(Object.entries(filesValue).map(([file, hash]) => [file, hash as string])),
    generatedAt: value.generatedAt,
  };
}

export async function writeYaml(filePath: string, value: unknown): Promise<void> {
  await atomicWrite(filePath, serializeYaml(value));
}
