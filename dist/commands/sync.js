import { readLock, readManifest } from '../config.js';
import { assertLockMatchesManifest } from '../resolver.js';
import { syncLockedPackages } from '../sync.js';
export async function syncProject(options) {
    const manifest = await readManifest(options.workspace);
    const lock = await readLock(options.workspace);
    assertLockMatchesManifest(manifest, lock);
    await syncLockedPackages({ workspace: options.workspace, lock, force: options.force });
}
//# sourceMappingURL=sync.js.map