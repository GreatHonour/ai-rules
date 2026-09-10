import type { PackageKind, RegistryIndex, RegistryPackageVersion } from './types.js';
export declare function parseRegistryIndex(contents: string): RegistryIndex;
export declare function resolvePackageVersion(index: RegistryIndex, kind: PackageKind, name: string, versionRange: string): RegistryPackageVersion;
export declare function loadRegistryIndex(registryRoot: string): Promise<RegistryIndex>;
export declare function validatePackage(registryRoot: string, kind: PackageKind, name: string, version: RegistryPackageVersion): Promise<string>;
