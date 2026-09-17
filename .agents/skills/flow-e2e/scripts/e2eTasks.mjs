import { readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

// 允许的任务状态及本轮汇总文件范围。
const TASK_STATUSES = ['pending', 'passed', 'failed', 'blocked'];
const TASK_FILE_PATTERN = /^(?:e2e-task|.+-e2e-task-fix)\.json$/;

/** 校验任务内容、唯一 ID 和结果说明，避免将无效数据判为通过。 */
function validateTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('任务数组不能为空');
  // 同一文件中的任务 ID 必须唯一。
  const taskIds = new Set();
  for (const task of tasks) {
    if (!task || typeof task !== 'object') throw new Error('任务必须是对象');
    for (const field of ['task_id', 'task_name', 'test_content']) {
      if (typeof task[field] !== 'string' || !task[field].trim()) throw new Error(`任务缺少 ${field}`);
    }
    if (task.task_id !== task.task_id.trim()) throw new Error('task_id 不能包含首尾空白');
    if (taskIds.has(task.task_id)) throw new Error(`任务 ID 重复：${task.task_id}`);
    taskIds.add(task.task_id);
    if (!Array.isArray(task.depends)) throw new Error('depends 必须是数组');
    if (!TASK_STATUSES.includes(task.status)) throw new Error(`非法任务状态：${task.status}`);
    if (typeof task.description !== 'string') throw new Error('description 必须是字符串');
    if (!Array.isArray(task.evidence)) throw new Error('evidence 必须是数组');
    const evidencePaths = new Set();
    for (const evidencePath of task.evidence) {
      if (typeof evidencePath !== 'string' || !evidencePath.trim()) throw new Error('证据地址必须是非空字符串');
      if (evidencePaths.has(evidencePath)) throw new Error(`${task.task_id} 的证据地址重复：${evidencePath}`);
      evidencePaths.add(evidencePath);
    }
    if (['failed', 'blocked'].includes(task.status) && !task.description.trim()) {
      throw new Error(`${task.task_id} 的失败或阻塞说明不能为空`);
    }
    if (['pending', 'passed'].includes(task.status) && task.description !== '') {
      throw new Error(`${task.task_id} 的 pending 或 passed 状态不能保留说明`);
    }
  }
  for (const task of tasks) {
    // 依赖必须引用同一文件中的其他任务，避免静默跳过验收前置条件。
    const dependencyIds = new Set();
    for (const dependencyId of task.depends) {
      if (typeof dependencyId !== 'string' || !dependencyId.trim()) {
        throw new Error('依赖任务 ID 必须是非空字符串');
      }
      if (dependencyId === task.task_id) throw new Error(`${task.task_id} 不能依赖自身`);
      if (dependencyIds.has(dependencyId)) throw new Error(`${task.task_id} 的依赖 ID 重复：${dependencyId}`);
      if (!taskIds.has(dependencyId)) throw new Error(`${task.task_id} 的依赖任务不存在：${dependencyId}`);
      dependencyIds.add(dependencyId);
    }
  }
  return tasks;
}

/** 将旧 error_log 合并到 evidence，并从任务结构中移除旧字段。 */
function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return tasks;
  return tasks.map(task => {
    if (!task || typeof task !== 'object') return task;
    const { error_log: legacyErrorLog, ...normalizedTask } = task;
    // 兼容读取旧状态；新文件只写 evidence。
    const evidence = Array.isArray(normalizedTask.evidence) ? [...normalizedTask.evidence] : [];
    if (typeof legacyErrorLog === 'string' && legacyErrorLog.trim() && !evidence.includes(legacyErrorLog)) {
      evidence.push(legacyErrorLog);
    }
    return { ...normalizedTask, evidence };
  });
}

/** 读取任务文件，兼容带 UTF-8 BOM 的 JSON。 */
async function readTasks(taskFilePath) {
  const parsedTasks = JSON.parse((await readFile(taskFilePath, 'utf8')).replace(/^\uFEFF/, ''));
  return validateTasks(normalizeTasks(parsedTasks));
}

/** 在内存中定位单个任务，未知 ID 不产生任何写入。 */
function findTask(tasks, taskId) {
  // 返回原条目，供读取或串行更新使用。
  const task = tasks.find(candidate => candidate.task_id === taskId);
  if (!task) throw new Error(`任务不存在：${taskId}`);
  return task;
}

/** 写完临时文件后替换目标，避免中途失败留下截断的 JSON 或报告。 */
async function writeAtomic(filePath, content) {
  // 临时文件与目标同目录，且仅由本次调用创建。
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

/** 根据来源文档命名并创建初始任务文件，拒绝覆盖已有进度。 */
export async function createTasks(sourcePath, tasks) {
  // 来源文档决定输出目录与文件名前缀。
  const sourceFilePath = resolve(sourcePath);
  const sourceName = basename(sourceFilePath);
  const fixMatch = sourceName.match(/^(.+)-fix\.md$/);
  if (sourceName !== 'task.md' && !fixMatch) throw new Error('来源必须是 task.md 或 xx-fix.md');
  await readFile(sourceFilePath, 'utf8');

  if (!Array.isArray(tasks)) throw new Error('任务数组不能为空');
  // 复制输入并补齐证据字段，落盘字段与模板保持一致。
  const normalizedTasks = normalizeTasks(tasks);
  validateTasks(normalizedTasks);

  if (normalizedTasks.some(task => task.status !== 'pending' || task.description !== '' || task.evidence.length > 0)) {
    throw new Error('新任务必须是 pending，description 为空，evidence 为空数组');
  }

  const taskFilePath = join(dirname(sourceFilePath), fixMatch ? `${fixMatch[1]}-e2e-task-fix.json` : 'e2e-task.json');
  try {
    await writeFile(taskFilePath, `${JSON.stringify(normalizedTasks, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`任务文件已存在，请继续已有进度：${taskFilePath}`);
    throw error;
  }
  return taskFilePath;
}

/** 按任务 ID 返回单条完整任务，避免向执行者输出全部清单。 */
export async function getTask(taskFilePath, taskId) {
  const tasks = await readTasks(taskFilePath);
  const task = findTask(tasks, taskId);
  // 只有全部依赖通过后任务才可执行。
  const blockedDeps = [];
  for (const dependencyId of task.depends) {
    const dependencyTask = findTask(tasks, dependencyId);
    if (dependencyTask.status !== 'passed') {
      blockedDeps.push({ task_id: dependencyId, status: dependencyTask.status });
    }
  }
  return { ...task, blocked_by: blockedDeps };
}

/** 校验本次证据存在于迭代目录的 evidence 中，并转换为稳定的相对地址。 */
async function normalizeEvidencePaths(taskFilePath, requestedPaths) {
  if (!Array.isArray(requestedPaths)) throw new Error('evidence 必须是数组');
  const taskDirectory = dirname(resolve(taskFilePath));
  const evidenceDirectory = resolve(taskDirectory, 'evidence');
  const normalizedPaths = [];
  for (const requestedPath of requestedPaths) {
    if (typeof requestedPath !== 'string' || !requestedPath.trim()) throw new Error('证据地址必须是非空字符串');
    const absolutePath = isAbsolute(requestedPath)
      ? resolve(requestedPath)
      : resolve(taskDirectory, requestedPath);
    const relativeToEvidence = relative(evidenceDirectory, absolutePath);
    if (!relativeToEvidence || relativeToEvidence === '..' || relativeToEvidence.startsWith(`..${sep}`) || isAbsolute(relativeToEvidence)) {
      throw new Error(`证据必须位于当前迭代目录的 evidence 中：${requestedPath}`);
    }
    let evidenceStat;
    try {
      evidenceStat = await stat(absolutePath);
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`证据文件不存在：${requestedPath}`);
      throw error;
    }
    if (!evidenceStat.isFile()) throw new Error(`证据地址必须指向文件：${requestedPath}`);
    const storedPath = relative(taskDirectory, absolutePath).split(sep).join('/');
    if (normalizedPaths.includes(storedPath)) throw new Error(`证据地址重复：${storedPath}`);
    normalizedPaths.push(storedPath);
  }
  return normalizedPaths;
}

/** 串行更新指定任务的状态、说明和证据，校验通过后原子保存。 */
export async function updateTask(taskFilePath, taskId, status, description = '', evidencePaths = []) {
  // 只改变对应条目的执行结果，保留其他任务与验收内容。
  const tasks = await readTasks(taskFilePath);
  const task = findTask(tasks, taskId);
  const oldStatus = task.status;
  if (['pending', 'passed'].includes(status) && description !== '') {
    throw new Error(`${status} 状态不能填写说明`);
  }
  if (status === 'pending' && evidencePaths.length > 0) throw new Error('pending 状态不能保留证据');
  const normalizedEvidence = await normalizeEvidencePaths(taskFilePath, evidencePaths);
  task.status = status;
  task.description = description;
  task.evidence = normalizedEvidence;
  validateTasks(tasks);
  await writeAtomic(taskFilePath, `${JSON.stringify(tasks, null, 2)}\n`);

  // 控制台输出状态变更
  const statusSymbol = { pending: '○', passed: '✓', failed: '✗', blocked: '⊗' };
  console.error(`[${taskId}] ${oldStatus} → ${status} ${statusSymbol[status] || ''}`);

  return task;
}

/** 将任务名称等单行文本转义，避免破坏报告结构。 */
function escapeMarkdown(text) {
  return text.replace(/[\r\n]+/g, ' ').replace(/[\\`*_[\]<>#|]/g, '\\$&');
}

/** 将任务专属的文件证据追加到报告，空数组不产生冗余区块。 */
function appendEvidence(sections, evidence) {
  if (!evidence.length) return;
  sections.push('- 证据：');
  sections.push(...evidence.map(evidencePath => `    - ${escapeMarkdown(evidencePath)}`));
}

/** 生成最终汇总，列出各终态任务及其证据。 */
function renderReport(groups, counts) {
  // 报告来源限定为本次目录扫描得到的任务文件。
  const total = counts.passed + counts.failed + counts.blocked;
  // 同时保留失败与阻塞信息，避免汇总结论掩盖任一类结果。
  const resultLabels = [];
  if (counts.failed) resultLabels.push('失败');
  if (counts.blocked) resultLabels.push('阻塞');
  const conclusion = resultLabels.length ? `存在${resultLabels.join('和')}任务` : '全部通过，无失败任务';
  const sections = [
    '# E2E 验证报告',
    '',
    `- 生成时间：${new Date().toISOString()}`,
    `- 任务文件：${groups.map(group => escapeMarkdown(group.fileName)).join('、')}`,
    `- 汇总：共 ${total} 项，通过 ${counts.passed}，失败 ${counts.failed}，阻塞 ${counts.blocked}`,
    `- 结论：${conclusion}`,
    '',
    '## 通过任务',
  ];

  // 通过任务也保留证据，支持完成后的结果审计。
  if (!counts.passed) {
    sections.push('', '无通过任务。');
  } else {
    for (const group of groups) {
      for (const task of group.tasks.filter(candidate => candidate.status === 'passed')) {
        sections.push(
          '',
          `### ${escapeMarkdown(group.fileName)} / ${escapeMarkdown(task.task_id)}：${escapeMarkdown(task.task_name)}`,
          '',
          '- 结果：passed'
        );
        appendEvidence(sections, task.evidence);
      }
    }
  }

  sections.push('', '## 失败任务');
  if (!counts.failed) {
    sections.push('', '无失败任务。');
  } else {
    for (const group of groups) {
      for (const task of group.tasks.filter(candidate => candidate.status === 'failed')) {
        sections.push(
          '',
          `### ${escapeMarkdown(group.fileName)} / ${escapeMarkdown(task.task_id)}：${escapeMarkdown(task.task_name)}`,
          '',
          '- 结果：failed',
          '- 验收内容：',
          ...task.test_content.split(/\r?\n/).map(line => `    ${line}`),
          '- 失败说明：',
          ...task.description.split(/\r?\n/).map(line => `    ${line}`)
        );
        appendEvidence(sections, task.evidence);
      }
    }
  }

  sections.push('', '## 阻塞任务');
  if (!counts.blocked) {
    sections.push('', '无阻塞任务。');
  } else {
    for (const group of groups) {
      for (const task of group.tasks.filter(candidate => candidate.status === 'blocked')) {
        sections.push(
          '',
          `### ${escapeMarkdown(group.fileName)} / ${escapeMarkdown(task.task_id)}：${escapeMarkdown(task.task_name)}`,
          '',
          '- 结果：blocked',
          '- 阻塞原因：',
          ...task.description.split(/\r?\n/).map(line => `    ${line}`)
        );
        appendEvidence(sections, task.evidence);
      }
    }
  }

  return `${sections.join('\n')}\n`;
}

/** 校验迭代目录内全部任务文件，全部执行结束后自动生成失败报告。 */
export async function checkTasks(directory) {
  // 逐个汇总同目录任务，避免不同修复报告相互覆盖。
  const iterationDirectory = resolve(directory);
  const fileNames = (await readdir(iterationDirectory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && TASK_FILE_PATTERN.test(entry.name))
    .map(entry => entry.name)
    .sort();
  if (!fileNames.length) throw new Error('目录内没有 E2E 任务文件');
  const groups = [];
  const counts = { pending: 0, passed: 0, failed: 0, blocked: 0 };
  const unfinished = [];
  for (const fileName of fileNames) {
    const tasks = await readTasks(join(iterationDirectory, fileName));
    groups.push({ fileName, tasks });
    for (const task of tasks) {
      counts[task.status] += 1;
      if (task.status === 'pending') {
        unfinished.push({
          task_file: fileName,
          task_id: task.task_id,
          status: task.status,
          description: task.description,
        });
      }
    }
  }
  // 只有 pending 任务才算未完成，blocked 任务也生成报告
  const hasPending = counts.pending > 0;
  const isComplete = !hasPending;
  const reportPath = isComplete ? join(iterationDirectory, 'e2e-report.md') : null;
  if (isComplete) await writeAtomic(reportPath, renderReport(groups, counts));

  // 控制台输出汇总信息
  const total = counts.passed + counts.failed + counts.blocked + counts.pending;
  console.error(`\n执行汇总：通过 ${counts.passed}/${total}，失败 ${counts.failed}/${total}，阻塞 ${counts.blocked}/${total}，待执行 ${counts.pending}/${total}`);

  const isPassed = isComplete && counts.failed === 0 && counts.blocked === 0;
  return { complete: isComplete, passed: isPassed, counts, unfinished, report_path: reportPath };
}

/** 严格解析 update 的可选说明和证据参数，避免意外参数被吞掉。 */
function parseUpdateOptions(optionArguments) {
  // 说明只能有一个位置参数，证据参数可以按需重复。
  let description = '';
  const evidencePaths = [];
  let argumentIndex = 0;
  if (optionArguments[argumentIndex] && !['--evidence', '--log'].includes(optionArguments[argumentIndex])) {
    if (optionArguments[argumentIndex].startsWith('--')) {
      throw new Error(`未知参数：${optionArguments[argumentIndex]}`);
    }
    description = optionArguments[argumentIndex];
    argumentIndex += 1;
  }
  while (argumentIndex < optionArguments.length) {
    const option = optionArguments[argumentIndex];
    if (!['--evidence', '--log'].includes(option)) throw new Error(`未知参数：${option}`);
    const evidencePath = optionArguments[argumentIndex + 1];
    if (!evidencePath || evidencePath.startsWith('--')) throw new Error(`${option} 必须提供证据路径`);
    evidencePaths.push(evidencePath);
    argumentIndex += 2;
  }
  return { description, evidencePaths };
}

/** 执行命令行入口，使用 JSON 输出便于 Agent 读取。 */
async function runCli(cliArguments) {
  // 四个命令分别接受来源、任务文件或迭代目录。
  const [command, targetPath, taskId, status, ...rest] = cliArguments;
  if (command === 'init' && cliArguments.length === 2) {
    let inputJson = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) inputJson += chunk;
    const tasks = JSON.parse(inputJson.replace(/^\uFEFF/, ''));
    const taskFilePath = await createTasks(targetPath, tasks);
    return { task_file: taskFilePath, task_ids: tasks.map(task => task.task_id) };
  }
  if (command === 'get' && cliArguments.length === 3) return getTask(targetPath, taskId);
  if (command === 'update' && cliArguments.length >= 4) {
    const { description, evidencePaths } = parseUpdateOptions(rest);
    return updateTask(targetPath, taskId, status, description, evidencePaths);
  }
  if (command === 'check' && cliArguments.length === 2) {
    const summary = await checkTasks(targetPath);
    process.exitCode = !summary.complete ? 2 : summary.passed ? 0 : 1;
    return summary;
  }
  throw new Error(
    '用法：init <来源.md>（JSON 标准输入）| get <任务.json> <task_id> | update <任务.json> <task_id> <状态> [说明] [--evidence 证据路径]... [--log 日志路径] | check <迭代目录>'
  );
}

// 导入时仅暴露方法，直接执行时才处理命令行。
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(await runCli(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
