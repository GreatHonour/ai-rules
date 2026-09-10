import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { addPackage } from '../commands/add.js';
import { checkProject } from '../commands/check.js';
import { initializeProject } from '../commands/init.js';
import { syncProject } from '../commands/sync.js';
import { upgradeProject } from '../commands/upgrade.js';
import { readLock } from '../config.js';
import { parse, stringify } from 'yaml';

const execFileAsync = promisify(execFile);

async function createGitRegistry(): Promise<string> {
  const registry = await mkdtemp(path.join(tmpdir(), 'agentctl-registry-'));
  const packageRoot = path.join(registry, 'packages', 'rules', 'naming', '1.0.0');
  await mkdir(packageRoot, { recursive: true });
  await writeFile(path.join(packageRoot, 'naming.md'), '# Naming');
  await writeFile(path.join(registry, 'registry.yaml'), `
schema: 1
packages:
  - name: naming
    kind: rule
    versions:
      - version: 1.0.0
        path: packages/rules/naming/1.0.0
        entry: naming.md
        files: [naming.md]
`);
  await execFileAsync('git', ['init'], { cwd: registry, windowsHide: true });
  await execFileAsync('git', ['add', '.'], { cwd: registry, windowsHide: true });
  await execFileAsync('git', ['-c', 'user.name=agentctl-test', '-c', 'user.email=agentctl@example.invalid', 'commit', '-m', 'init'], {
    cwd: registry,
    windowsHide: true,
  });
  return registry;
}

describe('Git registry workflow', () => {
  it('initializes, locks, syncs, and detects drift', async () => {
    const registry = await createGitRegistry();
    const workspace = await mkdtemp(path.join(tmpdir(), 'agentctl-workspace-'));
    await initializeProject({ workspace, adopt: false });
    await addPackage({
      workspace,
      specification: 'rule:naming@^1.0.0',
      registry: 'team',
      url: registry,
    });
    await syncProject({ workspace, force: false });

    await expect(readFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'utf8')).resolves.toBe('# Naming');
    expect((await checkProject(workspace)).isValid).toBe(true);

    await writeFile(path.join(workspace, '.agents', 'rules', 'naming.md'), '# Manual');
    expect((await checkProject(workspace)).isValid).toBe(false);
    await expect(syncProject({ workspace, force: false })).rejects.toThrow('人工修改');

    await writeFile(path.join(workspace, '.agents', 'rules', 'naming.md'), '# Naming');
    const packageRoot = path.join(registry, 'packages', 'rules', 'naming', '1.1.0');
    await mkdir(packageRoot, { recursive: true });
    await writeFile(path.join(packageRoot, 'naming.md'), '# Naming 1.1');
    await writeFile(path.join(registry, 'registry.yaml'), `
schema: 1
packages:
  - name: naming
    kind: rule
    versions:
      - version: 1.0.0
        path: packages/rules/naming/1.0.0
        entry: naming.md
        files: [naming.md]
      - version: 1.1.0
        path: packages/rules/naming/1.1.0
        entry: naming.md
        files: [naming.md]
`);
    await execFileAsync('git', ['add', '.'], { cwd: registry, windowsHide: true });
    await execFileAsync('git', ['-c', 'user.name=agentctl-test', '-c', 'user.email=agentctl@example.invalid', 'commit', '-m', 'upgrade'], {
      cwd: registry,
      windowsHide: true,
    });

    await upgradeProject({ workspace, force: false });
    expect((await readLock(workspace)).packages[0]?.version).toBe('1.1.0');
    await expect(readFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'utf8')).resolves.toBe('# Naming 1.1');

    const lockPath = path.join(workspace, '.agentctl', 'lock.yaml');
    const lockDocument: unknown = parse(await readFile(lockPath, 'utf8'));
    if (typeof lockDocument !== 'object' || lockDocument === null || !('packages' in lockDocument) || !Array.isArray(lockDocument.packages)) {
      throw new Error('测试 lock 格式无效');
    }
    const firstPackage: unknown = lockDocument.packages[0];
    if (typeof firstPackage !== 'object' || firstPackage === null) throw new Error('测试 package 格式无效');
    Object.assign(firstPackage, { contentHash: '0'.repeat(64) });
    await writeFile(lockPath, stringify(lockDocument));
    expect((await checkProject(workspace)).isValid).toBe(false);
  });
});
