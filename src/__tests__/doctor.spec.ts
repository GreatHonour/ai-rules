import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { diagnose } from '../commands/doctor.js';

describe('diagnose', () => {
  it('reports an unreachable configured registry', async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), 'agentctl-doctor-'));
    await mkdir(path.join(workspace, '.agentctl'), { recursive: true });
    await writeFile(path.join(workspace, '.agentctl', 'manifest.yaml'), `
schema: 1
registries:
  private:
    url: ./missing-registry
dependencies:
  rules: {}
  skills: {}
`);

    const result = await diagnose(workspace);
    expect(result.isHealthy).toBe(false);
    expect(result.messages.join('\n')).toContain('private');
  });
});
