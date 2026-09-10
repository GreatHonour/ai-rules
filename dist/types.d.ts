export type PackageKind = 'rule' | 'skill';
export interface RegistryConfig {
    readonly url: string;
    readonly ref?: string;
}
export interface DependencyConfig {
    readonly version: string;
    readonly registry: string;
}
export interface ProjectManifest {
    readonly schema: 1;
    readonly registries: Readonly<Record<string, RegistryConfig>>;
    readonly dependencies: {
        readonly rules: Readonly<Record<string, DependencyConfig>>;
        readonly skills: Readonly<Record<string, DependencyConfig>>;
    };
}
export interface RegistryPackageVersion {
    readonly version: string;
    readonly path: string;
    readonly entry: string;
    readonly files: readonly string[];
}
export interface RegistryPackage {
    readonly name: string;
    readonly kind: PackageKind;
    readonly versions: readonly RegistryPackageVersion[];
}
export interface RegistryIndex {
    readonly schema: 1;
    readonly packages: readonly RegistryPackage[];
}
export interface LockedPackage {
    readonly name: string;
    readonly kind: PackageKind;
    readonly version: string;
    readonly registry: string;
    readonly url: string;
    readonly commit: string;
    readonly packagePath: string;
    readonly entry: string;
    readonly files: readonly string[];
    readonly contentHash: string;
    readonly target: string;
}
export interface ProjectLock {
    readonly schema: 1;
    readonly packages: readonly LockedPackage[];
}
export interface ProjectState {
    readonly schema: 1;
    readonly runtimeHash: string;
    readonly files: Readonly<Record<string, string>>;
    readonly generatedAt: string;
}
export interface PackageSpec {
    readonly kind: PackageKind;
    readonly name: string;
    readonly version: string;
}
