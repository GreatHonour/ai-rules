export interface SyncProjectOptions {
    readonly workspace: string;
    readonly force: boolean;
}
export declare function syncProject(options: SyncProjectOptions): Promise<void>;
