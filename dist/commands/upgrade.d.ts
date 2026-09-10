export interface UpgradeOptions {
    readonly workspace: string;
    readonly force: boolean;
}
export declare function upgradeProject(options: UpgradeOptions): Promise<void>;
