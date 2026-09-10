import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { initializeProject } from '../commands/init.js';

describe('initializeProject', () => {
  it('requires adopt before taking over existing runtime files', async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), 'agentctl-init-'));
    await mkdir(path.join(workspace, '.agents', 'rules'), { recursive: true });
    await writeFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'existing');

    await expect(initializeProject({ workspace, adopt: false })).rejects.toThrow('init --adopt');
    await initializeProject({ workspace, adopt: true });

    await expect(readFile(path.join(workspace, '.agents', 'rules', 'naming.md'), 'utf8')).resolves.toBe('existing');
    await expect(readFile(path.join(workspace, '.agentctl', 'state.yaml'), 'utf8')).resolves.toContain('runtimeHash:');
  });
});
