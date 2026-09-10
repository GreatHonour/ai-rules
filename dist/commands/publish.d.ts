import type { PackageKind } from '../types.js';
export interface PublishOptions {
    readonly source: string;
    readonly registryDirectory: string;
    readonly kind: PackageKind;
    readonly name: string;
    readonly version: string;
    readonly entry: string;
    readonly commit: boolean;
    readonly push: boolean;
}
export declare function publishPackage(options: PublishOptions): Promise<void>;
