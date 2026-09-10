export declare function toPosixPath(filePath: string): string;
export declare function assertSafeRelativePath(relativePath: string): void;
export declare function pathExists(filePath: string): Promise<boolean>;
export declare function listFiles(root: string): Promise<string[]>;
export declare function hashTree(root: string): Promise<string>;
export declare function hashFiles(root: string): Promise<Readonly<Record<string, string>>>;
export declare function copyTree(source: string, destination: string): Promise<void>;
export declare function atomicWrite(filePath: string, contents: string): Promise<void>;
export interface FileUpdate {
    readonly path: string;
    readonly contents: string;
}
export declare function atomicWriteMany(updates: readonly FileUpdate[]): Promise<void>;
export declare function isNodeError(error: unknown): error is NodeJS.ErrnoException;
