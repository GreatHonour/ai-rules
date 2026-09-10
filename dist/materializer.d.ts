export interface MaterializeOptions {
    readonly workspace: string;
    readonly managedRoot: string;
    readonly force: boolean;
}
export declare function computeRuntimeHash(runtimeRoot: string): Promise<string>;
export declare function computeRuntimeFileHashes(runtimeRoot: string): Promise<Readonly<Record<string, string>>>;
export declare function computeCurrentRuntimeHash(workspace: string): Promise<string>;
export declare function materialize(options: MaterializeOptions): Promise<void>;
export declare function readRuntimeHashFromState(workspace: string): Promise<string | undefined>;
