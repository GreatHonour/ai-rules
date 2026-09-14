import { describe, expect, it } from 'vitest';

import { collectProjectProfile, createProgram } from '../cli.js';

describe('collectProjectProfile', () => {
  it('非交互初始化未提供框架时使用空数组', async () => {
    await expect(
      collectProjectProfile({
        workspace: '.',
        name: 'demo',
        environments: ['PC'],
      })
    ).resolves.toEqual({
      name: 'demo',
      frontendFrameworks: [],
      backendFrameworks: [],
      environments: ['PC'],
    });
  });

  it('分别保存前端框架和后端框架', async () => {
    await expect(
      collectProjectProfile({
        workspace: '.',
        name: 'demo',
        frontendFrameworks: ['vue3'],
        backendFrameworks: ['nestjs'],
        environments: ['PC'],
      })
    ).resolves.toEqual({
      name: 'demo',
      frontendFrameworks: ['vue3'],
      backendFrameworks: ['nestjs'],
      environments: ['PC'],
    });
  });

  it('init 仅提供分类后的框架参数', () => {
    const initCommand = createProgram().commands.find(command => command.name() === 'init');
    const optionNames = initCommand?.options.map(option => option.long);

    expect(optionNames).toContain('--frontend-frameworks');
    expect(optionNames).toContain('--backend-frameworks');
    expect(optionNames).not.toContain('--frameworks');
    expect(optionNames).not.toContain('--architecture');
  });
});
