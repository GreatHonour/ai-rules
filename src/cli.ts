#!/usr/bin/env node
import process from 'node:process';
import { Command } from 'commander';
import { initializeProject } from './commands/init.js';
import { addPackage } from './commands/add.js';
import { syncProject } from './commands/sync.js';
import { checkProject } from './commands/check.js';
import { describeDiff } from './commands/diff.js';
import { diagnose } from './commands/doctor.js';
import { upgradeProject } from './commands/upgrade.js';
import { publishPackage } from './commands/publish.js';
import type { PackageKind } from './types.js';

interface WorkspaceOption { readonly workspace: string }
interface ForceOption extends WorkspaceOption { readonly force: boolean }
interface InitOption extends WorkspaceOption { readonly adopt: boolean }
interface AddOption extends WorkspaceOption {
  readonly registry: string;
  readonly url?: string;
  readonly ref?: string;
}
interface PublishCliOption {
  readonly registryDirectory: string;
  readonly kind: PackageKind;
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly commit: boolean;
  readonly push: boolean;
}

const program = new Command();
program.name('agentctl').description('统一管理 Agent 规则和 skill').version('0.1.0');

program.command('init')
  .description('初始化项目配置')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .option('--adopt', '接管已有 .agents 内容', false)
  .action(async (options: InitOption) => {
    await initializeProject(options);
    console.log(options.adopt ? '项目已初始化并记录现有 .agents 基线' : '项目已初始化');
  });

program.command('add <package>')
  .description('添加 rule:name@range 或 skill:name@range')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .option('-r, --registry <name>', '注册表别名', 'default')
  .option('--url <url>', '新增或更新注册表 URL')
  .option('--ref <ref>', '注册表 Git ref')
  .action(async (specification: string, options: AddOption) => {
    await addPackage({ ...options, specification });
    console.log(`已锁定 ${specification}`);
  });

program.command('sync')
  .description('按 lock 同步运行时目录')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .option('--force', '覆盖人工修改', false)
  .action(async (options: ForceOption) => {
    await syncProject(options);
    console.log('同步完成');
  });

program.command('check')
  .description('只读检查项目一致性')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .action(async (options: WorkspaceOption) => {
    const result = await checkProject(options.workspace);
    result.messages.forEach((message) => console.log(message));
    if (!result.isValid) process.exitCode = 1;
  });

program.command('diff')
  .description('显示锁定、漂移和覆盖关系')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .action(async (options: WorkspaceOption) => {
    (await describeDiff(options.workspace)).forEach((message) => console.log(message));
  });

program.command('upgrade')
  .description('在 SemVer 范围内升级并同步')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .option('--force', '覆盖人工修改', false)
  .action(async (options: ForceOption) => {
    await upgradeProject(options);
    console.log('升级完成');
  });

program.command('publish <source>')
  .description('将包发布到本地 Git 注册表工作区')
  .requiredOption('--registry-directory <path>', '注册表工作区目录')
  .requiredOption('--kind <kind>', 'rule 或 skill')
  .requiredOption('--name <name>', '包名')
  .requiredOption('--version <version>', 'SemVer 版本')
  .requiredOption('--entry <path>', '包入口文件')
  .option('--commit', '创建 Git 提交', false)
  .option('--push', '提交后推送', false)
  .action(async (source: string, options: PublishCliOption) => {
    if (options.kind !== 'rule' && options.kind !== 'skill') throw new Error('--kind 必须是 rule 或 skill');
    await publishPackage({ source, ...options });
    console.log(`已生成 ${options.kind}:${options.name}@${options.version} 注册表变更`);
  });

program.command('doctor')
  .description('检查运行环境')
  .option('-w, --workspace <path>', '项目目录', process.cwd())
  .action(async (options: WorkspaceOption) => {
    const result = await diagnose(options.workspace);
    result.messages.forEach((message) => console.log(message));
    if (!result.isHealthy) process.exitCode = 1;
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
