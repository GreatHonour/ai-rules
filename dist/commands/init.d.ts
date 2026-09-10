export interface InitializeOptions {
    readonly workspace: string;
    readonly adopt: boolean;
}
export declare function initializeProject(options: InitializeOptions): Promise<void>;
