import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import chalk from 'chalk';

// package.json 位于发布脚本的上一级目录。
const PACKAGE_JSON_URL = new URL('../package.json', import.meta.url);
// 直接解析本地 CLI，避免 Windows 无法由 Node.js 直接启动 pnpm.cmd。
const moduleRequire = createRequire(import.meta.url);
const CHANGESETS_CLI_PATH = moduleRequire.resolve('@changesets/cli/bin.js');

/** 生成通过当前 Node.js 执行本地 Changesets CLI 的命令。 */
export function getChangesetCommand(changesetArguments) {
  return {
    command: process.execPath,
    commandArguments: [CHANGESETS_CLI_PATH, ...changesetArguments],
  };
}

/** 读取当前待发布包的名称和版本。 */
async function readPackageDetails() {
  const packageText = await readFile(PACKAGE_JSON_URL, 'utf8');
  const packageDetails = JSON.parse(packageText);
  if (typeof packageDetails.name !== 'string' || typeof packageDetails.version !== 'string') {
    throw new Error('package.json 缺少有效 name 或 version');
  }
  return { name: packageDetails.name, version: packageDetails.version };
}

/** 从 Changesets 输出中提取实际完成发布的包版本。 */
export function getPublishedPackageVersions(commandOutput) {
  const normalizedOutput = stripVTControlCharacters(commandOutput);
  const publishedMarker = 'Successfully published:';
  const publishedStartIndex = normalizedOutput.indexOf(publishedMarker);
  if (publishedStartIndex === -1) {
    return [];
  }
  const publishedOutput = normalizedOutput.slice(publishedStartIndex + publishedMarker.length);
  const gitTagStartIndex = publishedOutput.indexOf('Created git tags');
  const publishedSection = gitTagStartIndex === -1 ? publishedOutput : publishedOutput.slice(0, gitTagStartIndex);
  const packageVersionPattern =
    /(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*@\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?/gi;
  return publishedSection.match(packageVersionPattern) ?? [];
}

/** 执行 Changesets 发布命令并保留其原始终端输出。 */
function runChangesetPublish() {
  return new Promise((resolve, reject) => {
    const changesetCommand = getChangesetCommand(['publish']);
    const publishProcess = spawn(changesetCommand.command, changesetCommand.commandArguments, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let commandOutput = '';

    publishProcess.stdout.on('data', outputChunk => {
      const outputText = outputChunk.toString();
      commandOutput += outputText;
      process.stdout.write(outputText);
    });
    publishProcess.stderr.on('data', outputChunk => {
      const outputText = outputChunk.toString();
      commandOutput += outputText;
      process.stderr.write(outputText);
    });
    publishProcess.once('error', error => reject(new Error(`无法启动 Changesets 发布命令: ${error.message}`)));
    publishProcess.once('close', exitCode => {
      if (exitCode === 0) {
        resolve(commandOutput);
        return;
      }
      reject(new Error(`Changesets 发布失败，退出码: ${exitCode ?? '未知'}`));
    });
  });
}

/** 发布 npm 包并输出面向维护者的明确结果。 */
async function main() {
  const packageDetails = await readPackageDetails();
  const commandOutput = await runChangesetPublish();
  const publishedPackageVersions = getPublishedPackageVersions(commandOutput);
  const currentPackageVersion = `${packageDetails.name}@${packageDetails.version}`;
  if (!publishedPackageVersions.includes(currentPackageVersion)) {
    process.stdout.write(chalk.yellow(`\n没有发布新版本：${currentPackageVersion}\n`));
    process.stdout.write(chalk.yellow('Changesets 未报告新的已发布包，请检查版本号或待处理的 changeset。\n'));
    return;
  }
  process.stdout.write(chalk.green(`\n发布成功：${currentPackageVersion}\n`));
  process.stdout.write(
    chalk.green(`npm 地址：https://www.npmjs.com/package/${packageDetails.name}/v/${packageDetails.version}\n`)
  );
}

const executablePath = process.argv[1];
if (executablePath !== undefined && import.meta.url === pathToFileURL(executablePath).href) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
