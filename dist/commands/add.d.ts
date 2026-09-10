export interface AddOptions {
    readonly workspace: string;
    readonly specification: string;
    readonly registry: string;
    readonly url?: string;
    readonly ref?: string;
}
export declare function addPackage(options: AddOptions): Promise<void>;
