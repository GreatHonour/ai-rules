import path from 'node:path';
import { parsePackageSpec, readManifest, serializeYaml } from '../config.js';
import { atomicWriteMany } from '../file-system.js';
import { resolveManifest } from '../resolver.js';
function addDependency(manifest, packageSpec, registryName, registryConfig) {
    const registries = { ...manifest.registries };
    if (registryConfig !== undefined) {
        registries[registryName] = registryConfig;
    }
    if (registries[registryName] === undefined) {
        throw new Error(`registry ${registryName} 不存在，请同时提供 --url`);
    }
    return {
        schema: 1,
        registries,
        dependencies: {
            rules: packageSpec.kind === 'rule'
                ? { ...manifest.dependencies.rules, [packageSpec.name]: { version: packageSpec.version, registry: registryName } }
                : { ...manifest.dependencies.rules },
            skills: packageSpec.kind === 'skill'
                ? { ...manifest.dependencies.skills, [packageSpec.name]: { version: packageSpec.version, registry: registryName } }
                : { ...manifest.dependencies.skills },
        },
    };
}
export async function addPackage(options) {
    const packageSpec = parsePackageSpec(options.specification);
    const current = await readManifest(options.workspace);
    const registryConfig = options.url === undefined
        ? undefined
        : options.ref === undefined ? { url: options.url } : { url: options.url, ref: options.ref };
    const manifest = addDependency(current, packageSpec, options.registry, registryConfig);
    const lock = await resolveManifest(options.workspace, manifest);
    await atomicWriteMany([
        { path: path.join(options.workspace, '.agentctl', 'manifest.yaml'), contents: serializeYaml(manifest) },
        { path: path.join(options.workspace, '.agentctl', 'lock.yaml'), contents: serializeYaml(lock) },
    ]);
}
//# sourceMappingURL=add.js.map