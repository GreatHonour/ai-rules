import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkoutRegistry } from '../git-registry.js';

describe('Git registry input safety', () => {
  it('rejects option-like repository URLs before invoking Git', async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), 'agentctl-git-'));
    await expect(checkoutRegistry(workspace, '--upload-pack=malicious', 'HEAD')).rejects.toThrow('Git URL');
  });

  it('rejects option-like refs before invoking Git', async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), 'agentctl-git-'));
    await expect(checkoutRegistry(workspace, '.', '--exec=malicious')).rejects.toThrow('Git ref');
  });
});
