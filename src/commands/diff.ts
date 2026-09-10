import path from 'node:path';
import { readLock, readState } from '../config.js';
import { listFiles } from '../file-system.js';
import { computeCurrentRuntimeHash } from '../materializer.js';
import { hashFiles } from '../file-system.js';

export async function describeDiff(workspace: string): Promise<readonly string[]> {
  const lock = await readLock(workspace);
  const state = await readState(workspace);
  const messages = lock.packages.map(
    (lockedPackage) => `${lockedPackage.kind}:${lockedPackage.name}@${lockedPackage.version} ${lockedPackage.commit.slice(0, 12)}`,
  );
  if (state === undefined) {
    messages.push('运行时状态: 未托管');
  } else {
    const currentHash = await computeCurrentRuntimeHash(workspace);
    messages.push(currentHash === state.runtimeHash ? '运行时状态: 无漂移' : '运行时状态: 存在人工修改');
    const currentFiles = await readCurrentFileHashes(workspace);
    const allFiles = new Set([...Object.keys(state.files), ...Object.keys(currentFiles)]);
    for (const file of [...allFiles].sort((left, right) => left.localeCompare(right))) {
      if (state.files[file] === undefined) messages.push(`托管新增: ${file}`);
      else if (currentFiles[file] === undefined) messages.push(`托管删除: ${file}`);
      else if (state.files[file] !== currentFiles[file]) messages.push(`托管修改: ${file}`);
    }
  }
  for (const scope of ['overrides', 'overrides.local'] as const) {
    for (const file of await listFiles(path.join(workspace, '.agents', scope))) {
      messages.push(`${scope}: ${file}`);
    }
  }
  return messages;
}

async function readCurrentFileHashes(workspace: string): Promise<Readonly<Record<string, string>>> {
  const results: Record<string, string> = {};
  for (const directory of ['rules', 'skills'] as const) {
    const hashes = await hashFiles(path.join(workspace, '.agents', directory));
    for (const [file, hash] of Object.entries(hashes)) results[`${directory}/${file}`] = hash;
  }
  return results;
}
