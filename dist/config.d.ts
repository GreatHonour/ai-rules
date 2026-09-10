import type { PackageSpec, ProjectLock, ProjectManifest, ProjectState } from './types.js';
export declare function parseManifest(contents: string): ProjectManifest;
export declare function parsePackageSpec(specification: string): PackageSpec;
export declare function serializeYaml(value: unknown): string;
export declare function readManifest(workspace: string): Promise<ProjectManifest>;
export declare function readLock(workspace: string): Promise<ProjectLock>;
export declare function readState(workspace: string): Promise<ProjectState | undefined>;
export declare function writeYaml(filePath: string, value: unknown): Promise<void>;
