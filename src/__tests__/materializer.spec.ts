import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeRuntimeHash, materialize } from '../materializer.js';

async function createWorkspace(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'agentctl-test-'));
}

describe('materialize', () => {
  it('applies team and local overlays in order', async () => {
    const workspace = await createWorkspace();
    const managed = path.join(workspace, 'managed');
    await mkdir(path.join(managed, 'rules'), { recursive: true });
    await mkdir(path.join(workspace, '.agents', 'overrides', 'rules'), { recursive: true });
    await mkdir(path.join(workspace, '.agents', 'overrides.local', 'rules'), { recursive: true });
    await writeFile(path.join(managed, 'rules', 'naming.md'), 'managed');
    await writeFile(path.join(workspace, '.agents', 'overrides', 'rules', 'naming.md'), 'team');
    await writeFile(path.join(workspace, '.agents', 'overrides.local', 'rules', 'naming.md'), 'local');

    await materialize({ workspace, managedRoot: managed, force: false });

    await expect(readFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'utf8')).resolves.toBe('local');
  });

  it('rejects manual changes after a managed sync', async () => {
    const workspace = await createWorkspace();
    const managed = path.join(workspace, 'managed');
    await mkdir(path.join(managed, 'rules'), { recursive: true });
    await writeFile(path.join(managed, 'rules', 'naming.md'), 'managed');
    await materialize({ workspace, managedRoot: managed, force: false });
    await writeFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'manual edit');

    await expect(materialize({ workspace, managedRoot: managed, force: false })).rejects.toThrow('人工修改');
  });

  it('does not allow force to bypass adoption', async () => {
    const workspace = await createWorkspace();
    const managed = path.join(workspace, 'managed');
    await mkdir(path.join(managed, 'rules'), { recursive: true });
    await mkdir(path.join(workspace, '.agents', 'rules'), { recursive: true });
    await writeFile(path.join(managed, 'rules', 'naming.md'), 'managed');
    await writeFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'existing');

    await expect(materialize({ workspace, managedRoot: managed, force: true })).rejects.toThrow('init --adopt');
  });

  it('computes the same hash regardless of file creation order', async () => {
    const first = await createWorkspace();
    const second = await createWorkspace();
    await mkdir(path.join(first, 'rules'), { recursive: true });
    await mkdir(path.join(second, 'rules'), { recursive: true });
    await writeFile(path.join(first, 'rules', 'b.md'), 'b');
    await writeFile(path.join(first, 'rules', 'a.md'), 'a');
    await writeFile(path.join(second, 'rules', 'a.md'), 'a');
    await writeFile(path.join(second, 'rules', 'b.md'), 'b');

    expect(await computeRuntimeHash(first)).toBe(await computeRuntimeHash(second));
  });

  it('rejects overlays that replace a skill entry', async () => {
    const workspace = await createWorkspace();
    const managed = path.join(workspace, 'managed');
    await mkdir(path.join(managed, 'skills', 'review'), { recursive: true });
    await mkdir(path.join(workspace, '.agents', 'overrides', 'skills', 'review'), { recursive: true });
    await writeFile(path.join(managed, 'skills', 'review', 'SKILL.md'), 'managed');
    await writeFile(path.join(workspace, '.agents', 'overrides', 'skills', 'review', 'SKILL.md'), 'override');

    await expect(materialize({ workspace, managedRoot: managed, force: false })).rejects.toThrow('必需入口');
  });
});
