#!/usr/bin/env node
import fs from "node:fs";
const file = process.argv[2];
if (!file) { console.error("用法: node validate-task.mjs <task.json>"); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const tasks = Array.isArray(data) ? data : data.tasks;
if (!Array.isArray(tasks)) throw new Error("task.json must be an array or an object with a tasks array");
const allowed = new Set(["pending", "in_progress", "passed", "failed", "blocked", "skipped", "inconclusive"]);
const errors = [], ids = new Set();
for (const task of tasks ?? []) {
  if (!task.taskId) { errors.push("missing taskId"); continue; }
  if (ids.has(task.taskId)) errors.push(`duplicate taskId: ${task.taskId}`); ids.add(task.taskId);
  if (!allowed.has(task.status)) errors.push(`invalid status: ${task.taskId}`);
  for (const field of ["depends", "evidence", "databaseMigration", "productionRelease"]) if (!Array.isArray(task[field])) errors.push(`${task.taskId} missing/invalid ${field}`);
  if (["passed", "failed"].includes(task.status) && task.evidence.length === 0) errors.push(`${task.taskId} ${task.status} requires evidence`);
  if (["blocked", "skipped"].includes(task.status) && !task.reason) errors.push(`${task.taskId} ${task.status} requires reason`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`task.json valid: ${tasks.length} tasks`);
