import { readFile } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { parse, stringify } from 'yaml';
import { atomicWrite, pathExists } from './file-system.js';
const PACKAGE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function assertRecord(value, label) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${label} 必须是对象`);
    }
}
function assertKnownFields(record, fields, label) {
    const unknownFields = Object.keys(record).filter((field) => !fields.includes(field));
    if (unknownFields.length > 0) {
        throw new Error(`${label} 包含未知字段: ${unknownFields.join(', ')}`);
    }
}
function parseRegistries(value) {
    assertRecord(value, 'registries');
    return Object.fromEntries(Object.entries(value).map(([name, registryValue]) => {
        assertRecord(registryValue, `registry ${name}`);
        assertKnownFields(registryValue, ['url', 'ref'], `registry ${name}`);
        if (typeof registryValue.url !== 'string' || registryValue.url.length === 0) {
            throw new Error(`registry ${name}.url 必须是非空字符串`);
        }
        if (registryValue.ref !== undefined && typeof registryValue.ref !== 'string') {
            throw new Error(`registry ${name}.ref 必须是字符串`);
        }
        const registry = registryValue.ref === undefined
            ? { url: registryValue.url }
            : { url: registryValue.url, ref: registryValue.ref };
        return [name, registry];
    }));
}
function parseDependencyMap(value, label) {
    assertRecord(value, label);
    return Object.fromEntries(Object.entries(value).map(([name, dependencyValue]) => {
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
    }));
}
export function parseManifest(contents) {
    const value = parse(contents);
    assertRecord(value, 'manifest');
    assertKnownFields(value, ['schema', 'registries', 'dependencies'], 'manifest');
    if (value.schema !== 1) {
        throw new Error('manifest.schema 必须为 1');
    }
    assertRecord(value.dependencies, 'dependencies');
    assertKnownFields(value.dependencies, ['rules', 'skills'], 'dependencies');
    const manifest = {
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
export function parsePackageSpec(specification) {
    const match = /^(rule|skill):([a-z0-9]+(?:-[a-z0-9]+)*)@(.+)$/.exec(specification);
    if (match === null || semver.validRange(match[3]) === null) {
        throw new Error('包参数必须使用 rule:name@range 或 skill:name@range');
    }
    return { kind: match[1], name: match[2], version: match[3] };
}
export function serializeYaml(value) {
    return stringify(value, { lineWidth: 0, sortMapEntries: true });
}
export async function readManifest(workspace) {
    return parseManifest(await readFile(path.join(workspace, '.agentctl', 'manifest.yaml'), 'utf8'));
}
export async function readLock(workspace) {
    const lockPath = path.join(workspace, '.agentctl', 'lock.yaml');
    if (!(await pathExists(lockPath))) {
        return { schema: 1, packages: [] };
    }
    const value = parse(await readFile(lockPath, 'utf8'));
    assertRecord(value, 'lock');
    if (value.schema !== 1 || !Array.isArray(value.packages)) {
        throw new Error('lock 文件格式无效');
    }
    const packages = value.packages.map((packageValue, packageIndex) => {
        assertRecord(packageValue, `lock.packages[${packageIndex}]`);
        const stringFields = ['name', 'version', 'registry', 'url', 'commit', 'packagePath', 'entry', 'contentHash', 'target'];
        if ((packageValue.kind !== 'rule' && packageValue.kind !== 'skill') ||
            stringFields.some((field) => typeof packageValue[field] !== 'string') ||
            !Array.isArray(packageValue.files) || !packageValue.files.every((file) => typeof file === 'string')) {
            throw new Error(`lock.packages[${packageIndex}] 格式无效`);
        }
        const kind = packageValue.kind;
        return {
            name: packageValue.name,
            kind,
            version: packageValue.version,
            registry: packageValue.registry,
            url: packageValue.url,
            commit: packageValue.commit,
            packagePath: packageValue.packagePath,
            entry: packageValue.entry,
            files: packageValue.files,
            contentHash: packageValue.contentHash,
            target: packageValue.target,
        };
    });
    return { schema: 1, packages };
}
export async function readState(workspace) {
    const statePath = path.join(workspace, '.agentctl', 'state.yaml');
    if (!(await pathExists(statePath))) {
        return undefined;
    }
    const value = parse(await readFile(statePath, 'utf8'));
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
        files: Object.fromEntries(Object.entries(filesValue).map(([file, hash]) => [file, hash])),
        generatedAt: value.generatedAt,
    };
}
export async function writeYaml(filePath, value) {
    await atomicWrite(filePath, serializeYaml(value));
}
//# sourceMappingURL=config.js.map