import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { checkoutLockedRegistry } from './git-registry.js';
import { assertSafeRelativePath, pathExists } from './file-system.js';
import { validatePackage } from './registry.js';
import { materialize } from './materializer.js';
async function copyLockedPackage(managedRoot, registryRoot, lockedPackage, claimedTargets) {
    const sourceRoot = path.join(registryRoot, lockedPackage.packagePath);
    if (lockedPackage.kind === 'rule') {
        const target = lockedPackage.target;
        assertSafeRelativePath(target);
        if (claimedTargets.has(target))
            throw new Error(`多个包写入同一目标: ${target}`);
        claimedTargets.add(target);
        const targetPath = path.join(managedRoot, target);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(path.join(sourceRoot, lockedPackage.entry)));
        return;
    }
    for (const file of lockedPackage.files) {
        const target = `${lockedPackage.target}/${file}`;
        assertSafeRelativePath(target);
        if (claimedTargets.has(target))
            throw new Error(`多个包写入同一目标: ${target}`);
        claimedTargets.add(target);
        const targetPath = path.join(managedRoot, target);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, await readFile(path.join(sourceRoot, file)));
    }
}
export async function syncLockedPackages(options) {
    const managedRoot = path.join(options.workspace, '.agentctl', `managed-${process.pid}-${Date.now()}`);
    await mkdir(managedRoot, { recursive: true });
    const checkoutCache = new Map();
    const claimedTargets = new Set();
    try {
        for (const lockedPackage of options.lock.packages) {
            const cacheKey = `${lockedPackage.url}:${lockedPackage.commit}`;
            let checkout = checkoutCache.get(cacheKey);
            if (checkout === undefined) {
                checkout = await checkoutLockedRegistry(options.workspace, lockedPackage.url, lockedPackage.commit);
                checkoutCache.set(cacheKey, checkout);
            }
            const packageVersion = {
                version: lockedPackage.version,
                path: lockedPackage.packagePath,
                entry: lockedPackage.entry,
                files: lockedPackage.files,
            };
            const actualHash = await validatePackage(checkout.root, lockedPackage.kind, lockedPackage.name, packageVersion);
            if (actualHash !== lockedPackage.contentHash) {
                throw new Error(`${lockedPackage.kind}:${lockedPackage.name} 内容 hash 与 lock 不匹配`);
            }
            await copyLockedPackage(managedRoot, checkout.root, lockedPackage, claimedTargets);
        }
        await materialize({ workspace: options.workspace, managedRoot, force: options.force });
    }
    finally {
        if (await pathExists(managedRoot)) {
            await rm(managedRoot, { recursive: true, force: true });
        }
    }
}
//# sourceMappingURL=sync.js.map