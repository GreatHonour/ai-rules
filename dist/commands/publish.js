import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { atomicWrite, copyTree, listFiles, pathExists } from '../file-system.js';
import { loadRegistryIndex, validatePackage } from '../registry.js';
import { runGit } from '../git-registry.js';
import { serializeYaml } from '../config.js';
export async function publishPackage(options) {
    if (semver.valid(options.version) === null || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.name)) {
        throw new Error('包名或版本不合法');
    }
    if (options.push && !options.commit) {
        throw new Error('--push 必须与 --commit 同时使用');
    }
    const files = await listFiles(options.source);
    if (files.length === 0)
        throw new Error('发布源目录为空');
    if (options.kind === 'rule' && files.length !== 1) {
        throw new Error('rule 包必须只包含一个 Markdown 文件');
    }
    const relativePackagePath = `packages/${options.kind}s/${options.name}/${options.version}`;
    const finalPackageRoot = path.join(options.registryDirectory, relativePackagePath);
    if (await pathExists(finalPackageRoot))
        throw new Error(`版本已存在: ${options.version}`);
    const stagingRoot = path.join(options.registryDirectory, `.agentctl-publish-${process.pid}-${Date.now()}`);
    const stagedPackageRoot = path.join(stagingRoot, relativePackagePath);
    const versionDefinition = {
        version: options.version,
        path: relativePackagePath,
        entry: options.entry,
        files,
    };
    try {
        await copyTree(options.source, stagedPackageRoot);
        await validatePackage(stagingRoot, options.kind, options.name, versionDefinition);
        const indexPath = path.join(options.registryDirectory, 'registry.yaml');
        const current = await pathExists(indexPath)
            ? await loadRegistryIndex(options.registryDirectory)
            : { schema: 1, packages: [] };
        const existing = current.packages.find((candidate) => candidate.kind === options.kind && candidate.name === options.name);
        if (existing?.versions.some((candidate) => candidate.version === options.version)) {
            throw new Error(`版本已存在于索引: ${options.version}`);
        }
        const packages = current.packages.filter((candidate) => candidate !== existing).map((candidate) => ({ ...candidate }));
        packages.push(existing === undefined
            ? { name: options.name, kind: options.kind, versions: [versionDefinition] }
            : { ...existing, versions: [...existing.versions, versionDefinition] });
        packages.sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`));
        try {
            await mkdir(path.dirname(finalPackageRoot), { recursive: true });
            await copyTree(stagedPackageRoot, finalPackageRoot);
            await atomicWrite(indexPath, serializeYaml({ schema: 1, packages }));
        }
        catch (error) {
            if (await pathExists(finalPackageRoot))
                await rm(finalPackageRoot, { recursive: true, force: true });
            throw error;
        }
    }
    finally {
        await rm(stagingRoot, { recursive: true, force: true });
    }
    if (options.commit) {
        await runGit(['add', '--', 'registry.yaml', relativePackagePath], options.registryDirectory);
        await runGit(['commit', '-m', `publish(${options.kind}): ${options.name}@${options.version}`], options.registryDirectory);
        if (options.push)
            await runGit(['push'], options.registryDirectory);
    }
}
//# sourceMappingURL=publish.js.map