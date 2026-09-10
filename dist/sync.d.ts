import type { ProjectLock } from './types.js';
export interface SyncOptions {
    readonly workspace: string;
    readonly lock: ProjectLock;
    readonly force: boolean;
}
export declare function syncLockedPackages(options: SyncOptions): Promise<void>;
