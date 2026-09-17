import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createTasks, getTask, updateTask, checkTasks } from './e2eTasks.mjs';

/** 创建独立测试目录，结束后清理本测试拥有的文件。 */
async function createWorkspace(context) {
  // 测试目录与真实迭代文件隔离。
  const directory = await mkdtemp(join(tmpdir(), 'flow-e2e-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

/** 构造带独立验收内容的初始任务。 */
function makeTask(taskId = 'T1') {
  return {
    task_id: taskId,
    task_name: `表单 ${taskId}`,
    test_content: '填写并提交 → 返回成功',
    depends: [],
    status: 'pending',
    description: '',
    evidence: [],
  };
}

/** 在迭代目录中生成可被任务引用的证据文件。 */
async function createEvidence(directory, fileName, content = '验证证据') {
  // 所有证据统一放在迭代目录的 evidence 子目录。
  const evidenceDirectory = join(directory, 'evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  const evidencePath = join(evidenceDirectory, fileName);
  await writeFile(evidencePath, content);
  return evidencePath;
}

/** 根据真实来源文件初始化一个测试任务集。 */
async function prepareTasks(directory, sourceName = 'task.md', tasks = [makeTask()]) {
  // 来源文件存在是初始化的前置条件。
  const sourcePath = join(directory, sourceName);
  await writeFile(sourcePath, '# 验证来源\n');
  return createTasks(sourcePath, tasks);
}

test('来源命名正确，支持多个 fix 并拒绝覆盖已有进度', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory);
  assert.equal(taskPath, join(directory, 'e2e-task.json'));
  assert.equal(await prepareTasks(directory, 'login-fix.md'), join(directory, 'login-e2e-task-fix.json'));
  assert.equal(await prepareTasks(directory, 'payment-fix.md'), join(directory, 'payment-e2e-task-fix.json'));
  await updateTask(taskPath, 'T1', 'passed');
  await assert.rejects(prepareTasks(directory), /存在/);
  assert.equal((await getTask(taskPath, 'T1')).status, 'passed');
  await assert.rejects(prepareTasks(directory, 'design.md'), /task\.md|fix\.md/);
});

test('任务 ID 直接对应来源编号，JSON 全程使用 depends', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory, 'task.md', [
    { ...makeTask('T1') },
    { ...makeTask('T2'), depends: ['T1'] },
  ]);
  const task1 = await getTask(taskPath, 'T1');
  assert.equal(task1.task_id, 'T1');
  assert.deepEqual(task1.depends, []);
  assert.deepEqual(
    Object.keys(task1).sort(),
    ['blocked_by', 'depends', 'description', 'evidence', 'status', 'task_id', 'task_name', 'test_content'].sort()
  );
  const task2 = await getTask(taskPath, 'T2');
  assert.equal(task2.task_id, 'T2');
  assert.deepEqual(task2.depends, ['T1']);
  assert.deepEqual(task2.blocked_by, [{ task_id: 'T1', status: 'pending' }]);
  await updateTask(taskPath, 'T1', 'passed');
  assert.deepEqual((await getTask(taskPath, 'T2')).blocked_by, []);
  await updateTask(taskPath, 'T2', 'failed', '接口错误');
  assert.equal((await getTask(taskPath, 'T2')).task_id, 'T2');
});

test('读取拒绝重复 task_id，初始化校验 depends 引用', async context => {
  const directory = await createWorkspace(context);
  const taskPath = join(directory, 'e2e-task.json');
  await writeFile(taskPath, JSON.stringify([
    makeTask(),
    makeTask()
  ]));
  await assert.rejects(getTask(taskPath, 'T1'), /重复/);
  const invalidTask = makeTask();
  delete invalidTask.depends;
  await assert.rejects(prepareTasks(directory, 'invalid-fix.md', [invalidTask]), /depends/);
  await assert.rejects(
    prepareTasks(directory, 'unknown-fix.md', [{ ...makeTask('F1'), depends: ['missing'] }]),
    /不存在/
  );
  await assert.rejects(
    prepareTasks(directory, 'self-fix.md', [{ ...makeTask('F1'), depends: ['F1'] }]),
    /自身/
  );
  await assert.rejects(
    prepareTasks(directory, 'duplicate-fix.md', [makeTask('F1'), { ...makeTask('F2'), depends: ['F1', 'F1'] }]),
    /重复/
  );
});

test('按 ID 读取完整任务，更新不影响其他任务且复测可清除旧说明', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory, 'task.md', [makeTask('T1'), makeTask('T2')]);
  const failure = '预期成功，实际 HTTP 500';
  const failureLog = await createEvidence(directory, '表单 T1.log');
  const failureScreenshot = await createEvidence(directory, '表单-T1.png');
  await updateTask(taskPath, 'T1', 'failed', failure, [failureLog, failureScreenshot]);
  const failedTask = await getTask(taskPath, 'T1');
  assert.equal(failedTask.description, failure);
  assert.deepEqual(failedTask.evidence, ['evidence/表单 T1.log', 'evidence/表单-T1.png']);
  const task2 = await getTask(taskPath, 'T2');
  assert.equal(task2.task_id, 'T2');
  assert.equal(task2.status, 'pending');
  assert.equal(task2.description, '');
  const passedScreenshot = await createEvidence(directory, '表单-T1-passed.png');
  await updateTask(taskPath, 'T1', 'passed', '', [passedScreenshot]);
  const passedTask = await getTask(taskPath, 'T1');
  assert.equal(passedTask.description, '');
  assert.deepEqual(passedTask.evidence, ['evidence/表单-T1-passed.png']);
  await assert.rejects(getTask(taskPath, 'missing'), /不存在/);
});

test('旧 error_log 读取后迁移到 evidence 且不再返回旧字段', async context => {
  const directory = await createWorkspace(context);
  const taskPath = join(directory, 'e2e-task.json');
  const legacyTask = { ...makeTask(), status: 'failed', description: '旧失败', error_log: 'logs/legacy.log' };
  delete legacyTask.evidence;
  await writeFile(taskPath, JSON.stringify([legacyTask]));
  const task = await getTask(taskPath, 'T1');
  assert.equal(Object.hasOwn(task, 'error_log'), false);
  assert.deepEqual(task.evidence, ['logs/legacy.log']);
});

test('证据必须存在于迭代目录的 evidence 中，错误更新不落盘', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory);
  const outsideEvidence = join(directory, 'outside.log');
  await writeFile(outsideEvidence, '外部文件');
  const original = await readFile(taskPath, 'utf8');
  await assert.rejects(updateTask(taskPath, 'T1', 'passed', '', [outsideEvidence]), /evidence/);
  await assert.rejects(updateTask(taskPath, 'T1', 'passed', '', [join(directory, 'evidence', 'missing.log')]), /不存在/);
  assert.equal(await readFile(taskPath, 'utf8'), original);
});

test('错误更新不落盘，失败和阻塞说明不能为空', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory);
  const original = await readFile(taskPath, 'utf8');
  for (const [taskId, status, description] of [
    ['missing', 'passed', ''],
    ['T1', 'done', ''],
    ['T1', 'failed', ' '],
    ['T1', 'blocked', ''],
  ]) {
    await assert.rejects(updateTask(taskPath, taskId, status, description));
    assert.equal(await readFile(taskPath, 'utf8'), original);
  }
});

test('空任务、重复 ID 与无验收内容不能生成或通过校验', async context => {
  const directory = await createWorkspace(context);
  await assert.rejects(prepareTasks(directory, 'task.md', []), /空/);

  await assert.rejects(prepareTasks(directory, 'task.md', [{ ...makeTask(), test_content: '' }]), /test_content/);
  await assert.rejects(checkTasks(directory), /任务文件/);
  await writeFile(join(directory, 'e2e-task.json'), '[]');
  await assert.rejects(checkTasks(directory), /空/);
});

test('pending 不得被判完成，即使已经存在失败或阻塞任务', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory, 'task.md', [makeTask('T1'), makeTask('T2'), makeTask('T3')]);
  await updateTask(taskPath, 'T2', 'blocked', '微信设备未连接');
  await updateTask(taskPath, 'T3', 'failed', '实际提交失败');
  const summary = await checkTasks(directory);
  assert.equal(summary.complete, false);
  assert.deepEqual(
    summary.unfinished.map(task => task.task_id),
    ['T1']
  );
  assert.equal(summary.report_path, null);
  await assert.rejects(readFile(join(directory, 'e2e-report.md')), { code: 'ENOENT' });
});

test('blocked 是已执行结果，会生成报告但不得判为通过', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory);
  const deviceLog = await createEvidence(directory, '表单 T1.log');
  await updateTask(taskPath, 'T1', 'blocked', '微信设备未连接', [deviceLog]);
  const summary = await checkTasks(directory);
  assert.equal(summary.complete, true);
  assert.equal(summary.passed, false);
  assert.deepEqual(summary.counts, { pending: 0, passed: 0, failed: 0, blocked: 1 });
  const report = await readFile(summary.report_path, 'utf8');
  assert.match(report, /微信设备未连接/);
  assert.match(report, /evidence\/表单 T1\.log/);
});

test('同目录多来源汇总，报告只展开失败项且不会漏掉相同 ID 的另一个来源', async context => {
  const directory = await createWorkspace(context);
  const taskPath = await prepareTasks(directory, 'task.md', [makeTask('T1'), makeTask('T2')]);
  const fixPath = await prepareTasks(directory, 'login-fix.md', [makeTask('T3'), makeTask('T4')]);
  await updateTask(taskPath, 'T1', 'failed', '提交返回 500');
  await updateTask(taskPath, 'T2', 'passed');
  await updateTask(fixPath, 'T3', 'passed');
  await updateTask(fixPath, 'T4', 'passed');
  const summary = await checkTasks(directory);
  assert.equal(summary.complete, true);
  assert.equal(summary.passed, false);
  assert.deepEqual(summary.counts, { pending: 0, passed: 3, failed: 1, blocked: 0 });
  const report = await readFile(summary.report_path, 'utf8');
  assert.match(report, /提交返回 500/);
  assert.match(report, /e2e-task\.json/);
  assert.doesNotMatch(report, /login-e2e-task-fix\.json.*失败/);
  await updateTask(taskPath, 'T1', 'passed');
  const passed = await checkTasks(directory);
  assert.equal(passed.passed, true);
  const passedReport = await readFile(passed.report_path, 'utf8');
  assert.match(passedReport, /无失败任务/);
  assert.doesNotMatch(passedReport, /无文件证据/);
});

test('CLI 支持 JSON 标准输入、单任务输出与完成/失败/未完成退出码', async context => {
  const directory = await createWorkspace(context);
  const sourcePath = join(directory, 'task.md');
  await writeFile(sourcePath, '# 来源');
  const logPath = await createEvidence(directory, '表单 T1.log');
  const screenshotPath = await createEvidence(directory, '表单-T1.png');
  const scriptPath = fileURLToPath(new URL('./e2eTasks.mjs', import.meta.url));
  /** 调用真实命令行入口，保留输出供断言。 */
  function runCommand(commandArguments, input) {
    return spawnSync(process.execPath, [scriptPath, ...commandArguments], { input, encoding: 'utf8' });
  }
  const initialized = runCommand(['init', sourcePath], JSON.stringify([makeTask()]));
  assert.equal(initialized.status, 0, initialized.stderr);
  const taskPath = JSON.parse(initialized.stdout).task_file;
  assert.equal(runCommand(['check', directory]).status, 2);
  const getResult = JSON.parse(runCommand(['get', taskPath, 'T1']).stdout);
  assert.equal(getResult.task_id, 'T1');
  assert.equal(getResult.status, 'pending');
  const failedUpdate = runCommand([
    'update', taskPath, 'T1', 'failed', '接口失败', '--log', logPath, '--evidence', screenshotPath
  ]);
  assert.equal(failedUpdate.status, 0, failedUpdate.stderr);
  assert.deepEqual(JSON.parse(runCommand(['get', taskPath, 'T1']).stdout).evidence, [
    'evidence/表单 T1.log',
    'evidence/表单-T1.png',
  ]);
  assert.equal(runCommand(['check', directory]).status, 1);
  assert.equal(runCommand(['update', taskPath, 'T1', 'blocked', '设备不可用']).status, 0);
  assert.equal(runCommand(['check', directory]).status, 1);
  const passedUpdate = runCommand(['update', taskPath, 'T1', 'passed', '--evidence', screenshotPath]);
  assert.equal(passedUpdate.status, 0, passedUpdate.stderr);
  assert.deepEqual(JSON.parse(runCommand(['get', taskPath, 'T1']).stdout).evidence, ['evidence/表单-T1.png']);
  assert.equal(runCommand(['check', directory]).status, 0);
  assert.match(await readFile(join(directory, 'e2e-report.md'), 'utf8'), /evidence\/表单-T1\.png/);
  assert.equal(runCommand(['update', taskPath, 'T1', 'failed', '失败', '--log']).status, 1);
  assert.equal(runCommand(['update', taskPath, 'T1', 'passed', '--evidence']).status, 1);
  assert.equal(runCommand(['update', taskPath, 'T1', 'passed', '--unknown']).status, 1);
});
