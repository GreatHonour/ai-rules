import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readManifest, serializeYaml } from '../config.js';
import { atomicWrite, pathExists } from '../file-system.js';
import { resolveManifest } from '../resolver.js';
import { syncLockedPackages } from '../sync.js';
export async function upgradeProject(options) {
    const manifest = await readManifest(options.workspace);
    const nextLock = await resolveManifest(options.workspace, manifest);
    const lockPath = path.join(options.workspace, '.agentctl', 'lock.yaml');
    const previousLock = await pathExists(lockPath) ? await readFile(lockPath, 'utf8') : undefined;
    await atomicWrite(lockPath, serializeYaml(nextLock));
    try {
        await syncLockedPackages({ workspace: options.workspace, lock: nextLock, force: options.force });
    }
    catch (error) {
        if (previousLock !== undefined)
            await atomicWrite(lockPath, previousLock);
        throw error;
    }
}
//# sourceMappingURL=upgrade.js.map