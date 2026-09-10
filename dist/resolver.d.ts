import type { ProjectLock, ProjectManifest } from './types.js';
export declare function resolveManifest(workspace: string, manifest: ProjectManifest): Promise<ProjectLock>;
export declare function assertLockMatchesManifest(manifest: ProjectManifest, lock: ProjectLock): void;
export declare function packageRoot(registryRoot: string, packagePath: string): string;
