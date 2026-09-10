export interface DoctorResult {
    readonly isHealthy: boolean;
    readonly messages: readonly string[];
}
export declare function diagnose(workspace: string): Promise<DoctorResult>;
