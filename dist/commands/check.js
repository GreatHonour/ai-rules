import path from 'node:path';
import { readLock, readManifest, readState } from '../config.js';
import { listFiles, pathExists } from '../file-system.js';
import { computeCurrentRuntimeHash } from '../materializer.js';
import { assertLockMatchesManifest } from '../resolver.js';
import { checkoutLockedRegistry } from '../git-registry.js';
import { validatePackage } from '../registry.js';
export async function checkProject(workspace) {
    const messages = [];
    try {
        const manifest = await readManifest(workspace);
        const lock = await readLock(workspace);
        assertLockMatchesManifest(manifest, lock);
        messages.push(`依赖锁定一致: ${lock.packages.length} 个包`);
        const checkouts = new Map();
        for (const lockedPackage of lock.packages) {
            const checkoutKey = `${lockedPackage.url}:${lockedPackage.commit}`;
            let checkout = checkouts.get(checkoutKey);
            if (checkout === undefined) {
                checkout = await checkoutLockedRegistry(workspace, lockedPackage.url, lockedPackage.commit);
                checkouts.set(checkoutKey, checkout);
            }
            const actualHash = await validatePackage(checkout.root, lockedPackage.kind, lockedPackage.name, {
                version: lockedPackage.version,
                path: lockedPackage.packagePath,
                entry: lockedPackage.entry,
                files: lockedPackage.files,
            });
            if (actualHash !== lockedPackage.contentHash) {
                throw new Error(`${lockedPackage.kind}:${lockedPackage.name} 内容 hash 与 lock 不匹配`);
            }
            messages.push(`来源完整: ${lockedPackage.kind}:${lockedPackage.name}@${lockedPackage.version}`);
        }
        const state = await readState(workspace);
        if (state === undefined) {
            messages.push('错误: 缺少 state.yaml，现有运行时尚未被接管或同步');
        }
        else {
            const currentHash = await computeCurrentRuntimeHash(workspace);
            messages.push(currentHash === state.runtimeHash ? '托管目录未发生漂移' : '错误: 托管目录存在人工修改');
        }
        const teamFiles = await listFiles(path.join(workspace, '.agents', 'overrides'));
        const localFiles = await listFiles(path.join(workspace, '.agents', 'overrides.local'));
        const localSet = new Set(localFiles);
        for (const file of teamFiles) {
            messages.push(localSet.has(file) ? `覆盖: ${file} (local > team)` : `覆盖: ${file} (team)`);
        }
        for (const file of localFiles.filter((file) => !teamFiles.includes(file))) {
            messages.push(`覆盖: ${file} (local)`);
        }
    }
    catch (error) {
        messages.push(`错误: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { isValid: !messages.some((message) => message.startsWith('错误:')), messages };
}
export async function isInitialized(workspace) {
    return pathExists(path.join(workspace, '.agentctl', 'manifest.yaml'));
}
//# sourceMappingURL=check.js.map