export interface RegistryCheckout {
    readonly root: string;
    readonly commit: string;
    readonly url: string;
}
export declare function runGit(argumentsList: readonly string[], cwd?: string): Promise<string>;
export declare function resolveRegistryUrl(workspace: string, url: string): string;
export declare function assertSafeGitUrl(url: string): void;
export declare function assertSafeGitRef(ref: string): void;
export declare function assertGitCommit(commit: string): void;
export declare function checkoutRegistry(workspace: string, url: string, ref?: string): Promise<RegistryCheckout>;
export declare function checkoutLockedRegistry(workspace: string, url: string, commit: string): Promise<RegistryCheckout>;
