import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { updateAgentsDocument, writeAgentsDocument } from '../agents-document.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map(async (directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

describe('updateAgentsDocument', () => {
  it('创建按名称排序的受管规则区块', () => {
    expect(updateAgentsDocument('', ['vue3', 'typescript'])).toBe([
      '<!-- team-cli:rules:start -->',
      '- TypeScript → [.agents/rules/typescript.md](.agents/rules/typescript.md)',
      '- Vue3 → [.agents/rules/vue3.md](.agents/rules/vue3.md)',
      '<!-- team-cli:rules:end -->',
      '',
    ].join('\n'));
  });

  it('逐字保留标记外内容并替换旧引用', () => {
    const source = '# 用户规范\n\n<!-- team-cli:rules:start -->\n- old\n<!-- team-cli:rules:end -->\n\n尾部\n';
    const updated = updateAgentsDocument(source, ['typescript']);

    expect(updated).toContain('# 用户规范\n\n<!-- team-cli:rules:start -->');
    expect(updated).toContain('<!-- team-cli:rules:end -->\n\n尾部\n');
    expect(updated).not.toContain('- old');
  });

  it('缺少标记时追加区块', () => {
    expect(updateAgentsDocument('# 用户规范\n', ['typescript'])).toContain('# 用户规范\n\n<!-- team-cli:rules:start -->');
  });

  it('已有文件缺少标记时在写入前提示', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'team-cli-agents-document-'));
    temporaryDirectories.push(workspacePath);
    await writeFile(join(workspacePath, 'AGENTS.md'), '# 用户规范\n', 'utf8');
    const outputSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await writeAgentsDocument(workspacePath, ['typescript']);

    expect(outputSpy).toHaveBeenCalledWith(expect.stringContaining('将追加'));
  });
});
