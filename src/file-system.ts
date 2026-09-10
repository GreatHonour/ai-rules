import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function assertSafeRelativePath(relativePath: string): void {
  const normalized = relativePath.replaceAll('\\', '/');
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split('/').some((segment) => segment === '..' || segment === '')
  ) {
    throw new Error(`路径必须是安全相对路径: ${relativePath}`);
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function listFiles(root: string): Promise<string[]> {
  if (!(await pathExists(root))) {
    return [];
  }

  const files: string[] = [];
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`不允许符号链接: ${absolutePath}`);
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        files.push(toPosixPath(path.relative(root, absolutePath)));
      }
    }
  }

  await visit(root);
  return files;
}

export async function hashTree(root: string): Promise<string> {
  const digest = createHash('sha256');
  for (const relativePath of await listFiles(root)) {
    digest.update(relativePath);
    digest.update('\0');
    digest.update(await readFile(path.join(root, relativePath)));
    digest.update('\0');
  }
  return digest.digest('hex');
}

export async function hashFiles(root: string): Promise<Readonly<Record<string, string>>> {
  const entries = await Promise.all((await listFiles(root)).map(async (relativePath) => [
    relativePath,
    createHash('sha256').update(await readFile(path.join(root, relativePath))).digest('hex'),
  ] as const));
  return Object.fromEntries(entries);
}

export async function copyTree(source: string, destination: string): Promise<void> {
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

export async function atomicWrite(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, contents, 'utf8');
  try {
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export interface FileUpdate {
  readonly path: string;
  readonly contents: string;
}

export async function atomicWriteMany(updates: readonly FileUpdate[]): Promise<void> {
  const transactionId = `${process.pid}.${Date.now()}`;
  type PreparedUpdate = FileUpdate & {
    readonly temporaryPath: string;
    readonly backupPath: string;
    readonly hadOriginal: boolean;
  };
  const prepared: PreparedUpdate[] = [];
  const installed: PreparedUpdate[] = [];
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
  } catch (error: unknown) {
    for (const update of [...installed].reverse()) {
      await rm(update.path, { force: true });
    }
    for (const update of [...prepared].reverse()) {
      if (update.hadOriginal && await pathExists(update.backupPath)) await rename(update.backupPath, update.path);
    }
    throw error;
  } finally {
    await Promise.allSettled(prepared.map((update) => rm(update.temporaryPath, { force: true })));
    if (isCommitted) {
      await Promise.allSettled(prepared.map((update) => rm(update.backupPath, { force: true })));
    }
  }
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
