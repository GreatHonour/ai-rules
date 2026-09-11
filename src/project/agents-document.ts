import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeTextAtomic } from './manifest.js';

const START_MARKER = '<!-- team-cli:rules:start -->';
const END_MARKER = '<!-- team-cli:rules:end -->';
const RULE_LABELS: Readonly<Record<string, string>> = {
  typescript: 'TypeScript',
};

/** 将规则名转换为文档展示名。 */
function formatRuleLabel(ruleName: string): string {
  return RULE_LABELS[ruleName] ?? `${ruleName.charAt(0).toUpperCase()}${ruleName.slice(1)}`;
}

/** 创建规则引用受管区块。 */
function createManagedBlock(ruleNames: readonly string[]): string {
  const references = [...ruleNames]
    .sort((leftName, rightName) => leftName.localeCompare(rightName))
    .map((ruleName) => `- ${formatRuleLabel(ruleName)} → [.agents/rules/${ruleName}.md](.agents/rules/${ruleName}.md)`);
  return [START_MARKER, ...references, END_MARKER].join('\n');
}

/** 更新 AGENTS.md 受管区块并逐字保留区块外内容。 */
export function updateAgentsDocument(source: string, ruleNames: readonly string[]): string {
  const managedBlock = createManagedBlock(ruleNames);
  const startIndex = source.indexOf(START_MARKER);
  const endIndex = source.indexOf(END_MARKER);
  if (startIndex >= 0 && endIndex >= startIndex) {
    return `${source.slice(0, startIndex)}${managedBlock}${source.slice(endIndex + END_MARKER.length)}`;
  }
  if (source === '') {
    return `${managedBlock}\n`;
  }
  const separator = source.endsWith('\n') ? '\n' : '\n\n';
  return `${source}${separator}${managedBlock}\n`;
}

/** 原子更新工作区 AGENTS.md。 */
export async function writeAgentsDocument(workspacePath: string, ruleNames: readonly string[]): Promise<void> {
  const documentPath = join(workspacePath, 'AGENTS.md');
  let source = '';
  try {
    source = await readFile(documentPath, 'utf8');
  } catch (error: unknown) {
    const errorCode = error instanceof Error && 'code' in error ? Reflect.get(error, 'code') : undefined;
    if (errorCode !== 'ENOENT') {
      throw error;
    }
  }
  const updatedDocument = updateAgentsDocument(source, ruleNames);
  if (source !== '' && !source.includes(START_MARKER)) {
    process.stdout.write(`提示：${documentPath} 缺少受管标记，将追加 team-cli rules 区块。\n`);
  }
  await writeTextAtomic(documentPath, updatedDocument);
}
