import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

export interface GitCommandOptions {
  readonly environment?: Readonly<Record<string, string>>;
}

/** 在指定工作区执行 Git 并返回标准输出。 */
export async function runGit(
  workspacePath: string,
  argumentsList: readonly string[],
  options: GitCommandOptions = {},
): Promise<string> {
  try {
    const execution = await executeFile('git', argumentsList, {
      cwd: workspacePath,
      encoding: 'utf8',
      env: options.environment === undefined ? process.env : { ...process.env, ...options.environment },
      maxBuffer: 10 * 1024 * 1024,
    });
    return execution.stdout;
  } catch (error: unknown) {
    const stderr = error instanceof Error && 'stderr' in error ? Reflect.get(error, 'stderr') : undefined;
    const message = typeof stderr === 'string' && stderr.trim() !== ''
      ? stderr.trim()
      : error instanceof Error ? error.message : String(error);
    throw new Error(`Git 命令失败: git ${argumentsList.join(' ')}\n${message}`);
  }
}
