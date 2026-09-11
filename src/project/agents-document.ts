import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeTextAtomic } from './manifest.js';

const START_MARKER = '<!-- team-cli:rules:start -->';
const END_MARKER = '<!-- team-cli:rules:end -->';

export interface AgentsRuleReference {
  readonly name: string;
  readonly description: string;
}

/** 创建规则引用受管区块。 */
function createManagedBlock(ruleReferences: readonly AgentsRuleReference[]): string {
  const references = [...ruleReferences]
    .sort((leftReference, rightReference) => leftReference.name.localeCompare(rightReference.name))
    .map(ruleReference => `- ${ruleReference.description} → [${ruleReference.name}](.agents/rules/${ruleReference.name}.md)`);
  return [START_MARKER, ...references, END_MARKER].join('\n');
}

/** 在规范文件索引标题下插入规则引用区块。 */
function updateRuleIndexSection(source: string, managedBlock: string): string | undefined {
  const headingPattern = /^[ \t]{0,3}#{1,6}[ \t]+规范文件索引[ \t]*$/m;
  const headingMatch = headingPattern.exec(source);
  if (headingMatch === null) {
    return undefined;
  }
  const headingEndIndex = headingMatch.index + headingMatch[0].length;
  const nextHeadingPattern = /^[ \t]{0,3}#{1,6}[ \t]+.+$/gm;
  nextHeadingPattern.lastIndex = headingEndIndex;
  const nextHeadingMatch = nextHeadingPattern.exec(source);
  const sectionEndIndex = nextHeadingMatch?.index ?? source.length;
  const section = source.slice(headingEndIndex, sectionEndIndex);
  const ruleReferenceLinePattern = /^[ \t]*-[^\n]*\]\(\.agents\/rules\/[^\n]+\)\r?\n?/gm;
  const sectionWithoutOldReferences = section.replace(ruleReferenceLinePattern, '');
  return `${source.slice(0, headingEndIndex)}\n${managedBlock}\n${sectionWithoutOldReferences}${source.slice(sectionEndIndex)}`;
}

/** 判断文档是否包含规范文件索引标题。 */
function hasRuleIndexHeading(source: string): boolean {
  return /^[ \t]{0,3}#{1,6}[ \t]+规范文件索引[ \t]*$/m.test(source);
}

/** 更新 AGENTS.md 受管区块并逐字保留区块外内容。 */
export function updateAgentsDocument(source: string, ruleReferences: readonly AgentsRuleReference[]): string {
  const managedBlock = createManagedBlock(ruleReferences);
  const startIndex = source.indexOf(START_MARKER);
  const endIndex = source.indexOf(END_MARKER);
  if (startIndex >= 0 && endIndex >= startIndex) {
    return `${source.slice(0, startIndex)}${managedBlock}${source.slice(endIndex + END_MARKER.length)}`;
  }
  const indexedDocument = updateRuleIndexSection(source, managedBlock);
  if (indexedDocument !== undefined) {
    return indexedDocument;
  }
  if (source === '') {
    return `${managedBlock}\n`;
  }
  const separator = source.endsWith('\n') ? '\n' : '\n\n';
  return `${source}${separator}${managedBlock}\n`;
}

/** 原子更新工作区 AGENTS.md。 */
export async function writeAgentsDocument(workspacePath: string, ruleReferences: readonly AgentsRuleReference[]): Promise<void> {
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
  const updatedDocument = updateAgentsDocument(source, ruleReferences);
  if (source !== '' && !source.includes(START_MARKER) && !hasRuleIndexHeading(source)) {
    process.stdout.write(`提示：${documentPath} 缺少受管标记和“规范文件索引”标题，将追加 team-cli rules 区块。\n`);
  }
  await writeTextAtomic(documentPath, updatedDocument);
}
