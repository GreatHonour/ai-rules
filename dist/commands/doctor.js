import { access } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';
import { runGit } from '../git-registry.js';
import { resolveRegistryUrl } from '../git-registry.js';
import { readManifest } from '../config.js';
import { pathExists } from '../file-system.js';
export async function diagnose(workspace) {
    const messages = [`Node.js: ${process.version}`];
    let isHealthy = Number(process.versions.node.split('.')[0]) >= 20;
    try {
        messages.push(`Git: ${await runGit(['--version'])}`);
    }
    catch (error) {
        isHealthy = false;
        messages.push(`Git 错误: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
        await access(workspace, constants.R_OK | constants.W_OK);
        messages.push(`工作区可读写: ${path.resolve(workspace)}`);
    }
    catch {
        isHealthy = false;
        messages.push(`工作区不可读写: ${path.resolve(workspace)}`);
    }
    const manifestPath = path.join(workspace, '.agentctl', 'manifest.yaml');
    if (await pathExists(manifestPath)) {
        try {
            const manifest = await readManifest(workspace);
            for (const [name, registry] of Object.entries(manifest.registries)) {
                try {
                    const resolvedUrl = resolveRegistryUrl(workspace, registry.url);
                    await runGit(['ls-remote', '--exit-code', '--', resolvedUrl, registry.ref ?? 'HEAD']);
                    messages.push(`注册表可达: ${name}`);
                }
                catch (error) {
                    isHealthy = false;
                    messages.push(`注册表错误 (${name}): ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        catch (error) {
            isHealthy = false;
            messages.push(`manifest 错误: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    else {
        messages.push('注册表检查: 项目未初始化，已跳过');
    }
    return { isHealthy, messages };
}
//# sourceMappingURL=doctor.js.map