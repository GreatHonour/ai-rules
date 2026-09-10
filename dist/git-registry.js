import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathExists } from './file-system.js';
const execFileAsync = promisify(execFile);
export async function runGit(argumentsList, cwd) {
    try {
        const result = await execFileAsync('git', [...argumentsList], {
            cwd,
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        });
        return result.stdout.trim();
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Git 命令失败: git ${argumentsList.join(' ')}\n${error.message}`, { cause: error });
        }
        throw error;
    }
}
export function resolveRegistryUrl(workspace, url) {
    assertSafeGitUrl(url);
    if (/^(?:https?:\/\/|ssh:\/\/|file:\/\/|[^/\\]+@[^:]+:)/.test(url) || path.isAbsolute(url)) {
        return url;
    }
    return path.resolve(workspace, url);
}
export function assertSafeGitUrl(url) {
    if (url.length === 0 || url.startsWith('-') || /[\0\r\n]/.test(url) || /^[A-Za-z][A-Za-z0-9+.-]*::/.test(url)) {
        throw new Error(`Git URL 不安全: ${url}`);
    }
    const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(url)?.[1]?.toLowerCase();
    if (scheme !== undefined && !['https', 'ssh', 'file'].includes(scheme)) {
        throw new Error(`Git URL 协议不受支持: ${scheme}`);
    }
}
export function assertSafeGitRef(ref) {
    if (ref.length === 0 || ref.startsWith('-') || /[\0-\x20~^:?*[\\]/.test(ref) ||
        ref.includes('..') || ref.includes('@{') || ref.endsWith('.') || ref.endsWith('/') || ref.includes('//')) {
        throw new Error(`Git ref 不安全: ${ref}`);
    }
}
export function assertGitCommit(commit) {
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(commit)) {
        throw new Error(`Git commit 必须是完整对象 ID: ${commit}`);
    }
}
export async function checkoutRegistry(workspace, url, ref = 'HEAD') {
    assertSafeGitUrl(url);
    assertSafeGitRef(ref);
    const resolvedUrl = resolveRegistryUrl(workspace, url);
    const cacheKey = createHash('sha256').update(resolvedUrl).digest('hex').slice(0, 20);
    const cacheRoot = path.join(workspace, '.agentctl', 'cache', cacheKey);
    await mkdir(path.dirname(cacheRoot), { recursive: true });
    if (!(await pathExists(path.join(cacheRoot, '.git')))) {
        await runGit(['clone', '--no-checkout', '--', resolvedUrl, cacheRoot]);
    }
    else {
        await runGit(['remote', 'set-url', 'origin', resolvedUrl], cacheRoot);
    }
    await runGit(['fetch', '--force', '--tags', 'origin', '--', ref], cacheRoot);
    const commit = await runGit(['rev-parse', 'FETCH_HEAD'], cacheRoot);
    assertGitCommit(commit);
    await runGit(['checkout', '--detach', '--force', commit], cacheRoot);
    return { root: cacheRoot, commit, url };
}
export async function checkoutLockedRegistry(workspace, url, commit) {
    assertGitCommit(commit);
    return checkoutRegistry(workspace, url, commit);
}
//# sourceMappingURL=git-registry.js.map