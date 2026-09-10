import { readFile } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { parse } from 'yaml';
import { assertSafeRelativePath, hashTree, listFiles } from './file-system.js';
function assertRecord(value, label) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${label} 必须是对象`);
    }
}
export function parseRegistryIndex(contents) {
    const value = parse(contents);
    assertRecord(value, 'registry');
    if (value.schema !== 1 || !Array.isArray(value.packages)) {
        throw new Error('registry.yaml 格式无效');
    }
    const packages = value.packages.map((packageValue, packageIndex) => {
        assertRecord(packageValue, `packages[${packageIndex}]`);
        if (typeof packageValue.name !== 'string' ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packageValue.name) ||
            (packageValue.kind !== 'rule' && packageValue.kind !== 'skill') ||
            !Array.isArray(packageValue.versions)) {
            throw new Error(`packages[${packageIndex}] 元数据无效`);
        }
        const versions = packageValue.versions.map((versionValue, versionIndex) => {
            assertRecord(versionValue, `versions[${versionIndex}]`);
            if (typeof versionValue.version !== 'string' || semver.valid(versionValue.version) === null ||
                typeof versionValue.path !== 'string' || typeof versionValue.entry !== 'string' ||
                !Array.isArray(versionValue.files) || !versionValue.files.every((file) => typeof file === 'string')) {
                throw new Error(`${packageValue.name} 的版本元数据无效`);
            }
            assertSafeRelativePath(versionValue.path);
            assertSafeRelativePath(versionValue.entry);
            for (const file of versionValue.files) {
                assertSafeRelativePath(file);
            }
            return {
                version: versionValue.version,
                path: versionValue.path,
                entry: versionValue.entry,
                files: [...versionValue.files],
            };
        });
        if (new Set(versions.map((version) => version.version)).size !== versions.length) {
            throw new Error(`${packageValue.name} 包含重复版本`);
        }
        if (packageValue.kind === 'rule' && versions.some((version) => version.files.length !== 1)) {
            throw new Error(`rule:${packageValue.name} 每个版本必须只包含一个规则文件`);
        }
        return { name: packageValue.name, kind: packageValue.kind, versions };
    });
    const packageKeys = packages.map((packageDefinition) => `${packageDefinition.kind}:${packageDefinition.name}`);
    if (new Set(packageKeys).size !== packageKeys.length) {
        throw new Error('registry.yaml 包含重复包');
    }
    return { schema: 1, packages };
}
export function resolvePackageVersion(index, kind, name, versionRange) {
    const packageDefinition = index.packages.find((candidate) => candidate.kind === kind && candidate.name === name);
    if (packageDefinition === undefined) {
        throw new Error(`注册表中不存在 ${kind}:${name}`);
    }
    const version = semver.maxSatisfying(packageDefinition.versions.map((candidate) => candidate.version), versionRange);
    const resolved = packageDefinition.versions.find((candidate) => candidate.version === version);
    if (resolved === undefined) {
        throw new Error(`${kind}:${name} 没有满足 ${versionRange} 的版本`);
    }
    return resolved;
}
export async function loadRegistryIndex(registryRoot) {
    return parseRegistryIndex(await readFile(path.join(registryRoot, 'registry.yaml'), 'utf8'));
}
export async function validatePackage(registryRoot, kind, name, version) {
    const packageRoot = path.resolve(registryRoot, version.path);
    const registryResolved = path.resolve(registryRoot);
    if (!packageRoot.startsWith(`${registryResolved}${path.sep}`)) {
        throw new Error(`包路径逃逸注册表: ${version.path}`);
    }
    const actualFiles = await listFiles(packageRoot);
    const declaredFiles = [...version.files].sort((left, right) => left.localeCompare(right));
    if (JSON.stringify(actualFiles) !== JSON.stringify(declaredFiles)) {
        throw new Error(`${kind}:${name}@${version.version} 的文件清单与实际内容不一致`);
    }
    if (!actualFiles.includes(version.entry)) {
        throw new Error(`${kind}:${name}@${version.version} 缺少入口 ${version.entry}`);
    }
    if (kind === 'skill' && version.entry !== 'SKILL.md') {
        throw new Error(`skill:${name} 的入口必须是 SKILL.md`);
    }
    if (kind === 'rule' && path.extname(version.entry).toLowerCase() !== '.md') {
        throw new Error(`rule:${name} 的入口必须是 Markdown 文件`);
    }
    return hashTree(packageRoot);
}
//# sourceMappingURL=registry.js.map