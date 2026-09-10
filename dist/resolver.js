import path from 'node:path';
import { checkoutRegistry } from './git-registry.js';
import { loadRegistryIndex, resolvePackageVersion, validatePackage } from './registry.js';
import semver from 'semver';
export async function resolveManifest(workspace, manifest) {
    const lockedPackages = [];
    const registryCheckouts = new Map();
    for (const kind of ['rule', 'skill']) {
        const dependencyMap = kind === 'rule' ? manifest.dependencies.rules : manifest.dependencies.skills;
        for (const [name, dependency] of Object.entries(dependencyMap)) {
            const registry = manifest.registries[dependency.registry];
            if (registry === undefined) {
                throw new Error(`${kind}:${name} 引用了不存在的 registry ${dependency.registry}`);
            }
            const registryKey = `${dependency.registry}:${registry.url}:${registry.ref ?? 'HEAD'}`;
            let checkout = registryCheckouts.get(registryKey);
            if (checkout === undefined) {
                checkout = await checkoutRegistry(workspace, registry.url, registry.ref);
                registryCheckouts.set(registryKey, checkout);
            }
            const index = await loadRegistryIndex(checkout.root);
            const resolved = resolvePackageVersion(index, kind, name, dependency.version);
            const contentHash = await validatePackage(checkout.root, kind, name, resolved);
            lockedPackages.push({
                name,
                kind,
                version: resolved.version,
                registry: dependency.registry,
                url: registry.url,
                commit: checkout.commit,
                packagePath: resolved.path,
                entry: resolved.entry,
                files: resolved.files,
                contentHash,
                target: kind === 'rule' ? `rules/${name}.md` : `skills/${name}`,
            });
        }
    }
    lockedPackages.sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`));
    return { schema: 1, packages: lockedPackages };
}
export function assertLockMatchesManifest(manifest, lock) {
    const expected = new Set();
    for (const name of Object.keys(manifest.dependencies.rules))
        expected.add(`rule:${name}`);
    for (const name of Object.keys(manifest.dependencies.skills))
        expected.add(`skill:${name}`);
    const actual = new Set(lock.packages.map((lockedPackage) => `${lockedPackage.kind}:${lockedPackage.name}`));
    if (expected.size !== actual.size || [...expected].some((key) => !actual.has(key))) {
        throw new Error('manifest 与 lock 不一致，请执行 agentctl upgrade 或重新 add');
    }
    for (const lockedPackage of lock.packages) {
        const dependency = lockedPackage.kind === 'rule'
            ? manifest.dependencies.rules[lockedPackage.name]
            : manifest.dependencies.skills[lockedPackage.name];
        if (dependency === undefined ||
            dependency.registry !== lockedPackage.registry ||
            !semver.satisfies(lockedPackage.version, dependency.version)) {
            throw new Error(`manifest 与 lock 中的 ${lockedPackage.kind}:${lockedPackage.name} 不一致`);
        }
        const registry = manifest.registries[dependency.registry];
        if (registry === undefined || registry.url !== lockedPackage.url) {
            throw new Error(`manifest 与 lock 中的 registry ${dependency.registry} 不一致`);
        }
    }
}
export function packageRoot(registryRoot, packagePath) {
    return path.join(registryRoot, packagePath);
}
//# sourceMappingURL=resolver.js.map