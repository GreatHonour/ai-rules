import { readLock, readManifest } from '../config.js';
import { assertLockMatchesManifest } from '../resolver.js';
import { syncLockedPackages } from '../sync.js';

export interface SyncProjectOptions {
  readonly workspace: string;
  readonly force: boolean;
}

export async function syncProject(options: SyncProjectOptions): Promise<void> {
  const manifest = await readManifest(options.workspace);
  const lock = await readLock(options.workspace);
  assertLockMatchesManifest(manifest, lock);
  await syncLockedPackages({ workspace: options.workspace, lock, force: options.force });
}
