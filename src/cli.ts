#!/usr/bin/env node

import type { ReleaseType } from './release/registry-editor.js';
import type { ProjectProfile, Registry } from './types.js';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pathToFileURL } from 'node:url';

import { Command } from 'commander';
import { checkbox } from '@inquirer/prompts';
import chalk from 'chalk';

import { configureProject } from './commands/config.js';
import { initializeProject } from './commands/init.js';
import { releaseRegistry } from './commands/release.js';
import { updateProject } from './commands/update.js';
import { uploadProjectIssues } from './commands/upload.js';
import { runRegistryCheck } from './git/release-check.js';
import { getPackageVersion } from './package-info.js';
import { readManifest } from './project/manifest.js';
import { downloadResources } from './registry/resource-downloader.js';
import { fetchRegistry } from './registry/registry-client.js';

const DEFAULT_REGISTRY_URL = 'https://raw.githubusercontent.com/GreatHonour/ai-rules/main/registry.json';
// CLI 与 manifest 共享安装包中声明的版本。
const PACKAGE_VERSION = getPackageVersion();

export interface ProfileCommandOptions {
  readonly workspace: string;
  readonly registry?: string;
  readonly name?: string;
  readonly frontendFrameworks?: readonly string[];
  readonly backendFrameworks?: readonly string[];
  readonly environments?: readonly string[];
  readonly rules?: readonly string[] | false;
}

/** 读取一行交互输入。 */
async function askQuestion(promptText: string): Promise<string> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return (await prompt.question(promptText)).trim();
  } finally {
    prompt.close();
  }
}

/** 将逗号分隔输入转换为名称数组。 */
function parseCommaSeparated(value: string): readonly string[] {
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '');
}

/** 读取命令参数，非交互环境缺失时明确失败。 */
async function requireOption(currentValue: string | undefined, fieldName: string, promptText: string): Promise<string> {
  if (currentValue !== undefined && currentValue.trim() !== '') {
    return currentValue;
  }
  if (!stdin.isTTY) {
    throw new Error(`非交互环境缺少必需参数: ${fieldName}`);
  }
  const enteredValue = await askQuestion(promptText);
  if (enteredValue === '') {
    throw new Error(`${fieldName} 不能为空`);
  }
  return enteredValue;
}

/** 读取数组命令参数，非交互环境缺失时明确失败。 */
async function requireListOption(
  currentValue: readonly string[] | false | undefined,
  fieldName: string,
  promptText: string
): Promise<readonly string[]> {
  if (currentValue !== undefined) {
    return currentValue === false ? [] : currentValue;
  }
  if (!stdin.isTTY) {
    throw new Error(`非交互环境缺少必需参数: ${fieldName}`);
  }
  const enteredValues = parseCommaSeparated(await askQuestion(promptText));
  if (enteredValues.length === 0) {
    throw new Error(`${fieldName} 不能为空`);
  }
  return enteredValues;
}

/** 读取可选数组参数，非交互环境未提供时使用空数组。 */
async function collectOptionalListOption(
  currentValue: readonly string[] | undefined,
  promptText: string
): Promise<readonly string[]> {
  if (currentValue !== undefined) {
    return currentValue;
  }
  if (!stdin.isTTY) {
    return [];
  }
  return parseCommaSeparated(await askQuestion(promptText));
}

/** 从命令选项采集项目画像。 */
export async function collectProjectProfile(options: ProfileCommandOptions): Promise<ProjectProfile> {
  return {
    name: await requireOption(options.name, '--name', '项目名称: '),
    frontendFrameworks: await collectOptionalListOption(options.frontendFrameworks, '前端框架（逗号分隔，可留空）: '),
    backendFrameworks: await collectOptionalListOption(options.backendFrameworks, '后端框架（逗号分隔，可留空）: '),
    environments: await requireListOption(options.environments, '--environments', '运行环境（逗号分隔）: '),
  };
}

/** 读取明确的是/否确认。 */
async function confirmAction(promptText: string): Promise<boolean> {
  if (!stdin.isTTY) {
    throw new Error('非交互环境需要传入 --yes');
  }
  const answer = (await askQuestion(`${promptText} [y/N] `)).toLowerCase();
  return answer === 'y' || answer === 'yes';
}

/** 读取单个资源的版本升级类型。 */
async function selectReleaseType(resourceName: string): Promise<ReleaseType> {
  if (!stdin.isTTY) {
    throw new Error(`非交互环境无法为 ${resourceName} 选择版本类型`);
  }
  const answer = (await askQuestion(`${resourceName} 升级类型 [patch/minor/major]: `)).toLowerCase();
  if (answer !== 'patch' && answer !== 'minor' && answer !== 'major') {
    throw new Error(`无效版本类型: ${answer}`);
  }
  return answer;
}

/** 通过终端 checkbox 交互选择规则。 */
async function selectRuleNames(registry: Registry, defaultRuleNames: readonly string[]): Promise<readonly string[]> {
  if (!stdin.isTTY) {
    throw new Error('非交互环境缺少必需参数: --rules');
  }
  const selectedNames = await checkbox({
    message: '请选择 rules（空格选中/取消，回车确认）',
    choices: Object.entries(registry.rules).map(([name, entry]) => ({
      name: `${name}(${chalk.dim(entry.desc)})`,
      value: name,
      checked: defaultRuleNames.includes(name),
    })),
  });
  return selectedNames;
}

/** 根据命令参数或交互选择规则。 */
async function collectRuleNames(
  options: ProfileCommandOptions,
  registry: Registry,
  defaultRuleNames: readonly string[] = []
): Promise<readonly string[]> {
  if (options.rules !== undefined) {
    return options.rules === false ? [] : options.rules;
  }
  return selectRuleNames(registry, defaultRuleNames);
}

/** 注册项目初始化命令。 */
function registerInitCommand(program: Command): void {
  program
    .command('init')
    .option('--workspace <path>', '目标工作区', process.cwd())
    .option('--registry <url>', '公开 registry URL', DEFAULT_REGISTRY_URL)
    .option('--name <name>', '项目名称')
    .option('--frontend-frameworks <names...>', '前端框架（可选）')
    .option('--backend-frameworks <names...>', '后端框架（可选）')
    .option('--environments <names...>', '运行环境')
    .option('--rules <names...>', '选择的 rules')
    .option('--no-rules', '明确不选择任何 rule')
    .action(async (options: ProfileCommandOptions) => {
      const registryUrl = options.registry ?? DEFAULT_REGISTRY_URL;
      const project = await collectProjectProfile(options);
      const registry = await fetchRegistry(registryUrl);
      const ruleNames = await collectRuleNames(options, registry);
      const result = await initializeProject(
        { workspacePath: options.workspace, registryUrl, project, ruleNames },
        {
          fetchRegistry: async () => registry,
          downloadResources,
          now: () => new Date(),
          cliVersion: PACKAGE_VERSION,
          cleanupDownloads: true,
        }
      );
      stdout.write('初始化完成\n');
      stdout.write(`已保留备份目录，请确认后手动删除: ${result.backupPath}\n`);
    });
}

/** 注册项目配置命令。 */
function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .option('--workspace <path>', '目标工作区', process.cwd())
    .option('--name <name>', '项目名称')
    .option('--frontend-frameworks <names...>', '前端框架（可选）')
    .option('--backend-frameworks <names...>', '后端框架（可选）')
    .option('--environments <names...>', '运行环境')
    .option('--rules <names...>', '选择的 rules')
    .option('--no-rules', '明确不选择任何 rule')
    .action(async (options: ProfileCommandOptions) => {
      const manifest = await readManifest(options.workspace);
      const registry = await fetchRegistry(manifest.registryUrl);
      const hasProfileOptions =
        options.name !== undefined ||
        options.frontendFrameworks !== undefined ||
        options.backendFrameworks !== undefined ||
        options.environments !== undefined;
      const project = hasProfileOptions ? await collectProjectProfile(options) : undefined;
      const ruleNames = await collectRuleNames(options, registry, Object.keys(manifest.rules));
      const result = await configureProject(
        {
          workspacePath: options.workspace,
          ruleNames,
          ...(project === undefined ? {} : { project }),
        },
        {
          fetchRegistry: async () => registry,
          downloadResources,
          now: () => new Date(),
          cleanupDownloads: true,
        }
      );
      stdout.write('配置已更新\n');
      stdout.write(`已保留备份目录，请确认后手动删除: ${result.backupPath}\n`);
    });
}

/** 注册版本更新命令。 */
function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .option('--workspace <path>', '目标工作区', process.cwd())
    .option('--yes', '无需交互确认')
    .action(async (options: { readonly workspace: string; readonly yes?: boolean }) => {
      const registryModule = await import('./registry/registry-client.js');
      const downloaderModule = await import('./registry/resource-downloader.js');
      const result = await updateProject(options.workspace, {
        fetchRegistry: registryModule.fetchRegistry,
        downloadResources: downloaderModule.downloadResources,
        confirm: async plan => {
          for (const update of plan.updates) {
            stdout.write(
              `${update.kind}.${update.name}: ${update.localEntry.version} -> ${update.remoteEntry.version} (${update.remoteEntry.updatedAt})\n`
            );
          }
          return options.yes === true ? true : confirmAction('确认应用以上更新？');
        },
        now: () => new Date(),
        cleanupDownloads: true,
      });
      for (const rollback of result.rollbacks) {
        stdout.write(
          `回退异常 ${rollback.kind}.${rollback.name}: 本地 ${rollback.localVersion} > 远端 ${rollback.remoteVersion}\n`
        );
      }
      for (const skillName of result.skippedSkills) {
        stdout.write(`跳过本地非 flow skill: ${skillName}\n`);
      }
      if (result.backupPath !== undefined) {
        stdout.write(`已保留备份目录，请确认后手动删除: ${result.backupPath}\n`);
      }
      stdout.write(`${result.status === 'updated' ? '更新完成' : result.status === 'cancelled' ? '已取消' : '已是最新'}\n`);
    });
}

/** 注册公共资源发布命令。 */
function registerReleaseCommand(program: Command): void {
  program
    .command('release')
    .option('--workspace <path>', '公共源仓库', process.cwd())
    .action(async (options: { readonly workspace: string }) => {
      const changeModule = await import('./release/change-detector.js');
      const released = await releaseRegistry(options.workspace, {
        detectChanges: changeModule.detectWorkingResourceChanges,
        selectReleaseType: async resource => selectReleaseType(`${resource.kind}.${resource.name}`),
        describeResource: async resource =>
          requireOption(undefined, `${resource.kind}.${resource.name} desc`, `${resource.kind}.${resource.name} 描述: `),
        now: () => new Date(),
      });
      stdout.write(
        released.length === 0
          ? '没有资源变化\n'
          : `${released.map(entry => `${entry.kind}.${entry.name}: ${entry.previousVersion ?? '新增'} -> ${entry.nextVersion ?? '删除'}`).join('\n')}\n`
      );
    });
}

/** 注册 registry 校验命令。 */
function registerRegistryCheckCommand(program: Command): void {
  program
    .command('registry:check')
    .option('--workspace <path>', '公共源仓库', process.cwd())
    .option('--base <ref>', '合并目标 Git ref')
    .action(async (options: { readonly workspace: string; readonly base?: string }) => {
      await runRegistryCheck(options.workspace, options.base);
      stdout.write('registry 校验通过\n');
    });
}

/** 注册 issue 上传命令。 */
function registerUploadCommand(program: Command): void {
  program
    .command('upload <issue-name>')
    .option('--workspace <path>', '目标工作区', process.cwd())
    .option('--remote <name>', 'Git remote', 'origin')
    .action(async (issueName: string, options: { readonly workspace: string; readonly remote: string }) => {
      const result = await uploadProjectIssues(options.workspace, issueName, options.remote);
      stdout.write(`已推送 ${result.branchName}，提交 ${result.commit}\n`);
    });
}

/** 创建 team-cli 命令入口。 */
export function createProgram(): Command {
  const program = new Command().name('team-cli').description('管理团队 rules、skills 与 issue 上传').version(PACKAGE_VERSION);
  registerInitCommand(program);
  registerConfigCommand(program);
  registerUpdateCommand(program);
  registerReleaseCommand(program);
  registerRegistryCheckCommand(program);
  registerUploadCommand(program);
  return program;
}

/** 执行命令并统一映射失败退出码。 */
export async function main(argumentsList: readonly string[] = process.argv): Promise<void> {
  try {
    await createProgram().parseAsync(argumentsList);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

const executablePath = process.argv[1];
if (executablePath !== undefined && import.meta.url === pathToFileURL(executablePath).href) {
  await main();
}
