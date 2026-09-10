import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from '../file-system.js';
import { computeRuntimeFileHashes, computeRuntimeHash } from '../materializer.js';
import { writeYaml } from '../config.js';
import { atomicWrite } from '../file-system.js';
export async function initializeProject(options) {
    const agentctlRoot = path.join(options.workspace, '.agentctl');
    const agentsRoot = path.join(options.workspace, '.agents');
    const manifestPath = path.join(agentctlRoot, 'manifest.yaml');
    const hasRuntime = await pathExists(path.join(agentsRoot, 'rules')) || await pathExists(path.join(agentsRoot, 'skills'));
    if (hasRuntime && !options.adopt && !(await pathExists(path.join(agentctlRoot, 'state.yaml')))) {
        throw new Error('发现已有 .agents 内容，请使用 agentctl init --adopt 明确接管');
    }
    await mkdir(agentctlRoot, { recursive: true });
    await mkdir(path.join(agentsRoot, 'overrides'), { recursive: true });
    await mkdir(path.join(agentsRoot, 'overrides.local'), { recursive: true });
    const gitignorePath = path.join(options.workspace, '.gitignore');
    const currentGitignore = await pathExists(gitignorePath) ? await readFile(gitignorePath, 'utf8') : '';
    const ignoredPaths = ['.agentctl/cache/', '.agents/overrides.local/'];
    const missingPaths = ignoredPaths.filter((ignoredPath) => !currentGitignore.split(/\r?\n/).includes(ignoredPath));
    if (missingPaths.length > 0) {
        const separator = currentGitignore.length > 0 && !currentGitignore.endsWith('\n') ? '\n' : '';
        await atomicWrite(gitignorePath, `${currentGitignore}${separator}${missingPaths.join('\n')}\n`);
    }
    if (!(await pathExists(manifestPath))) {
        await writeYaml(manifestPath, {
            schema: 1,
            registries: {},
            dependencies: { rules: {}, skills: {} },
        });
    }
    const lockPath = path.join(agentctlRoot, 'lock.yaml');
    if (!(await pathExists(lockPath))) {
        await writeYaml(lockPath, { schema: 1, packages: [] });
    }
    if (options.adopt) {
        const adoptionRoot = path.join(agentctlRoot, `adopt-${process.pid}-${Date.now()}`);
        await mkdir(adoptionRoot, { recursive: true });
        try {
            const { copyTree } = await import('../file-system.js');
            await copyTree(path.join(agentsRoot, 'rules'), path.join(adoptionRoot, 'rules'));
            await copyTree(path.join(agentsRoot, 'skills'), path.join(adoptionRoot, 'skills'));
            await writeYaml(path.join(agentctlRoot, 'state.yaml'), {
                schema: 1,
                runtimeHash: await computeRuntimeHash(adoptionRoot),
                files: await computeRuntimeFileHashes(adoptionRoot),
                generatedAt: new Date().toISOString(),
            });
        }
        finally {
            const { rm } = await import('node:fs/promises');
            await rm(adoptionRoot, { recursive: true, force: true });
        }
    }
}
//# sourceMappingURL=init.js.map