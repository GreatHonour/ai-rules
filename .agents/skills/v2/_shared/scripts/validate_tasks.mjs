#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, normalize, resolve } from "node:path";

// 支持的任务状态
const TASK_STATUSES = new Set(["pending", "completed", "blocked"]);

/**
 * 校验任务标识、依赖和完成证据。
 * @param {Record<string, any>} manifest 任务清单
 * @param {string} evidenceRoot 证据根目录
 * @returns {string[]} 错误列表
 */
function validateTasks(manifest, evidenceRoot) {
  const errors = [];
  const tasks = Array.isArray(manifest.tasks) ? manifest.tasks : [];
  const taskIds = new Set(tasks.map((task) => task.id));
  if (tasks.length === 0) errors.push("tasks 必须为非空数组");
  if (taskIds.size !== tasks.length || taskIds.has(undefined)) errors.push("任务 id 缺失或重复");

  for (const task of tasks) {
    if (!TASK_STATUSES.has(task.status)) errors.push(`任务 ${task.id} 状态无效`);
    if (!Array.isArray(task.depends)) errors.push(`任务 ${task.id} depends 必须为数组`);
    for (const dependency of task.depends ?? []) {
      if (!taskIds.has(dependency)) errors.push(`任务 ${task.id} 依赖不存在的 ${dependency}`);
      if (dependency === task.id) errors.push(`任务 ${task.id} 不能依赖自身`);
    }
    if (task.status === "completed" && !task.verification) errors.push(`任务 ${task.id} 完成但缺少 verification`);
    if (task.status === "completed" && task.verification) {
      const normalizedPath = normalize(task.verification);
      const isSafePath = !isAbsolute(task.verification) && !normalizedPath.split(/[\\/]/).includes("..");
      if (!isSafePath || !existsSync(resolve(evidenceRoot, task.verification))) errors.push(`任务 ${task.id} 的 verification 文件不存在或路径不安全`);
    }
    if (task.status === "blocked" && !task.note) errors.push(`任务 ${task.id} 阻塞但缺少 note`);
  }

  /**
   * 深度遍历任务依赖，检测循环。
   * @param {string} taskId 当前任务
   * @param {Set<string>} visiting 当前递归路径
   * @param {Set<string>} visited 已完成节点
   * @returns {boolean} 是否存在循环
   */
  function hasCycle(taskId, visiting, visited) {
    if (visiting.has(taskId)) return true;
    if (visited.has(taskId)) return false;
    visiting.add(taskId);
    const task = tasks.find((entry) => entry.id === taskId);
    for (const dependency of task?.depends ?? []) {
      if (hasCycle(dependency, visiting, visited)) return true;
    }
    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  }

  const visitedTaskIds = new Set();
  if (tasks.some((task) => hasCycle(task.id, new Set(), visitedTaskIds))) errors.push("任务依赖存在循环");
  return errors;
}

// 命令行入口参数
const tasksPath = process.argv[2];
if (!tasksPath) {
  console.error("用法: node validate_tasks.mjs <tasks.json>");
  process.exit(2);
}

try {
  const taskManifest = JSON.parse(await readFile(tasksPath, "utf8"));
  const errors = validateTasks(taskManifest, dirname(resolve(tasksPath)));
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("tasks 有效");
} catch (error) {
  console.error(`无法校验任务: ${error.message}`);
  process.exit(2);
}
