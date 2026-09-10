import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
export function toPosixPath(filePath) {
    return filePath.split(path.sep).join('/');
}
export function assertSafeRelativePath(relativePath) {
    const normalized = relativePath.replaceAll('\\', '/');
    if (normalized.length === 0 ||
        normalized.startsWith('/') ||
        /^[A-Za-z]:/.test(normalized) ||
        normalized.split('/').some((segment) => segment === '..' || segment === '')) {
        throw new Error(`路径必须是安全相对路径: ${relativePath}`);
    }
}
export async function pathExists(filePath) {
    try {
        await lstat(filePath);
        return true;
    }
    catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}
export async function listFiles(root) {
    if (!(await pathExists(root))) {
        return [];
    }
    const files = [];
    async function visit(current) {
        const entries = await readdir(current, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const absolutePath = path.join(current, entry.name);
            if (entry.isSymbolicLink()) {
                throw new Error(`不允许符号链接: ${absolutePath}`);
            }
            if (entry.isDirectory()) {
                await visit(absolutePath);
            }
            else if (entry.isFile()) {
                files.push(toPosixPath(path.relative(root, absolutePath)));
            }
        }
    }
    await visit(root);
    return files;
}
export async function hashTree(root) {
    const digest = createHash('sha256');
    for (const relativePath of await listFiles(root)) {
        digest.update(relativePath);
        digest.update('\0');
        digest.update(await readFile(path.join(root, relativePath)));
        digest.update('\0');
    }
    return digest.digest('hex');
}
export async function hashFiles(root) {
    const entries = await Promise.all((await listFiles(root)).map(async (relativePath) => [
        relativePath,
        createHash('sha256').update(await readFile(path.join(root, relativePath))).digest('hex'),
    ]));
    return Object.fromEntries(entries);
}
export async function copyTree(source, destination) {
    if (!(await pathExists(source))) {
        return;
    }
    for (const relativePath of await listFiles(source)) {
        assertSafeRelativePath(relativePath);
        const destinationPath = path.join(destination, relativePath);
        await mkdir(path.dirname(destinationPath), { recursive: true });
        await writeFile(destinationPath, await readFile(path.join(source, relativePath)));
    }
}
export async function atomicWrite(filePath, contents) {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporaryPath, contents, 'utf8');
    try {
        await rename(temporaryPath, filePath);
    }
    finally {
        await rm(temporaryPath, { force: true });
    }
}
export async function atomicWriteMany(updates) {
    const transactionId = `${process.pid}.${Date.now()}`;
    const prepared = [];
    const installed = [];
    let isCommitted = false;
    try {
        for (const update of updates) {
            await mkdir(path.dirname(update.path), { recursive: true });
            const temporaryPath = `${update.path}.${transactionId}.tmp`;
            const backupPath = `${update.path}.${transactionId}.bak`;
            await writeFile(temporaryPath, update.contents, 'utf8');
            prepared.push({ ...update, temporaryPath, backupPath, hadOriginal: await pathExists(update.path) });
        }
        for (const update of prepared) {
            if (update.hadOriginal) {
                await rename(update.path, update.backupPath);
            }
            await rename(update.temporaryPath, update.path);
            installed.push(update);
        }
        isCommitted = true;
    }
    catch (error) {
        for (const update of [...installed].reverse()) {
            await rm(update.path, { force: true });
        }
        for (const update of [...prepared].reverse()) {
            if (update.hadOriginal && await pathExists(update.backupPath))
                await rename(update.backupPath, update.path);
        }
        throw error;
    }
    finally {
        await Promise.allSettled(prepared.map((update) => rm(update.temporaryPath, { force: true })));
        if (isCommitted) {
            await Promise.allSettled(prepared.map((update) => rm(update.backupPath, { force: true })));
        }
    }
}
export function isNodeError(error) {
    return error instanceof Error && 'code' in error;
}
//# sourceMappingURL=file-system.js.map