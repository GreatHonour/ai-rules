import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { updateAgentsDocument, writeAgentsDocument } from '../agents-document.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories.splice(0).map(async directoryPath => rm(directoryPath, { recursive: true, force: true }))
  );
});

describe('updateAgentsDocument', () => {
  it('创建按名称排序的受管规则区块', () => {
    expect(
      updateAgentsDocument('', [
        { name: 'vue3', description: 'Vue 3 规则' },
        { name: 'typescript', description: 'TypeScript 规则' },
      ])
    ).toBe(
      [
        '<!-- team-cli:rules:start -->',
        '- TypeScript 规则 → [typescript](.agents/rules/typescript.md)',
        '- Vue 3 规则 → [vue3](.agents/rules/vue3.md)',
        '<!-- team-cli:rules:end -->',
        '',
      ].join('\n')
    );
  });

  it('逐字保留标记外内容并替换旧引用', () => {
    const source = '# 用户规范\n\n<!-- team-cli:rules:start -->\n- old\n<!-- team-cli:rules:end -->\n\n尾部\n';
    const updated = updateAgentsDocument(source, [{ name: 'typescript', description: '类型规范' }]);

    expect(updated).toContain('# 用户规范\n\n<!-- team-cli:rules:start -->');
    expect(updated).toContain('<!-- team-cli:rules:end -->\n\n尾部\n');
    expect(updated).not.toContain('- old');
  });

  it('缺少标记时追加区块', () => {
    expect(updateAgentsDocument('# 用户规范\n', [{ name: 'typescript', description: '类型规范' }])).toContain(
      '# 用户规范\n\n<!-- team-cli:rules:start -->'
    );
  });

  it('优先在规范文件索引下更新规则说明和链接', () => {
    const source =
      '# 项目规则\n\n## 规范文件索引\n\n- 旧说明 → [old](.agents/rules/old.md)\n- 用户补充 → [custom](./custom.md)\n\n## 其他内容\n\n正文\n';
    const updated = updateAgentsDocument(source, [{ name: 'typescript', description: '类型安全规范' }]);

    expect(updated).toContain(
      '## 规范文件索引\n<!-- team-cli:rules:start -->\n- 类型安全规范 → [typescript](.agents/rules/typescript.md)\n<!-- team-cli:rules:end -->'
    );
    expect(updated).toContain('- 用户补充 → [custom](./custom.md)');
    expect(updated).toContain('## 其他内容\n\n正文\n');
    expect(updated).not.toContain('.agents/rules/old.md');
  });

  it('索引标题存在时不输出缺少受管标记的追加提示', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-agents-index-'));
    temporaryDirectories.push(workspacePath);
    await writeFile(join(workspacePath, 'AGENTS.md'), '## 规范文件索引\n', 'utf8');
    const outputSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await writeAgentsDocument(workspacePath, [{ name: 'typescript', description: '类型规范' }]);

    expect(outputSpy).not.toHaveBeenCalledWith(expect.stringContaining('缺少受管标记'));
  });

  it('已有文件缺少标记时在写入前提示', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-agents-document-'));
    temporaryDirectories.push(workspacePath);
    await writeFile(join(workspacePath, 'AGENTS.md'), '# 用户规范\n', 'utf8');
    const outputSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await writeAgentsDocument(workspacePath, [{ name: 'typescript', description: '类型规范' }]);

    expect(outputSpy).toHaveBeenCalledWith(expect.stringContaining('将追加'));
  });
});
