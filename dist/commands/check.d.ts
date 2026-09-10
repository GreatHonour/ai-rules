export interface CheckResult {
    readonly isValid: boolean;
    readonly messages: readonly string[];
}
export declare function checkProject(workspace: string): Promise<CheckResult>;
export declare function isInitialized(workspace: string): Promise<boolean>;
