import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishPackage } from '../commands/publish.js';

describe('publishPackage', () => {
  it('generates a validated registry change without committing', async () => {
    const registryDirectory = await mkdtemp(path.join(tmpdir(), 'agentctl-publish-registry-'));
    const source = await mkdtemp(path.join(tmpdir(), 'agentctl-publish-source-'));
    await mkdir(path.join(source, 'references'), { recursive: true });
    await writeFile(path.join(source, 'SKILL.md'), '# Review');
    await writeFile(path.join(source, 'references', 'rules.md'), '# Rules');

    await publishPackage({
      source,
      registryDirectory,
      kind: 'skill',
      name: 'review',
      version: '1.0.0',
      entry: 'SKILL.md',
      commit: false,
      push: false,
    });

    await expect(readFile(path.join(registryDirectory, 'packages', 'skills', 'review', '1.0.0', 'SKILL.md'), 'utf8'))
      .resolves.toBe('# Review');
    await expect(readFile(path.join(registryDirectory, 'registry.yaml'), 'utf8')).resolves.toContain('version: 1.0.0');
  });

  it('requires commit when push is requested', async () => {
    await expect(publishPackage({
      source: '.',
      registryDirectory: '.',
      kind: 'rule',
      name: 'naming',
      version: '1.0.0',
      entry: 'naming.md',
      commit: false,
      push: true,
    })).rejects.toThrow('--push 必须与 --commit 同时使用');
  });

  it('rejects a rule package containing multiple files', async () => {
    const registryDirectory = await mkdtemp(path.join(tmpdir(), 'agentctl-publish-registry-'));
    const source = await mkdtemp(path.join(tmpdir(), 'agentctl-publish-rule-'));
    await writeFile(path.join(source, 'naming.md'), '# Naming');
    await writeFile(path.join(source, 'extra.md'), '# Extra');

    await expect(publishPackage({
      source,
      registryDirectory,
      kind: 'rule',
      name: 'naming',
      version: '1.0.0',
      entry: 'naming.md',
      commit: false,
      push: false,
    })).rejects.toThrow('只包含一个');
  });

  it('keeps package and index changes when Git commit fails', async () => {
    const registryDirectory = await mkdtemp(path.join(tmpdir(), 'agentctl-publish-not-git-'));
    const source = await mkdtemp(path.join(tmpdir(), 'agentctl-publish-rule-'));
    await writeFile(path.join(source, 'naming.md'), '# Naming');

    await expect(publishPackage({
      source,
      registryDirectory,
      kind: 'rule',
      name: 'naming',
      version: '1.0.0',
      entry: 'naming.md',
      commit: true,
      push: false,
    })).rejects.toThrow('Git 命令失败');

    await expect(readFile(path.join(registryDirectory, 'packages', 'rules', 'naming', '1.0.0', 'naming.md'), 'utf8'))
      .resolves.toBe('# Naming');
    await expect(readFile(path.join(registryDirectory, 'registry.yaml'), 'utf8')).resolves.toContain('name: naming');
  });
});
