#!/usr/bin/env node
import fs from "node:fs";
const [, , file, taskId, status, ...args] = process.argv;
const allowed = new Set(["pending","in_progress","passed","failed","blocked","skipped","inconclusive"]);
const evidence=args.filter(x=>x.startsWith("--evidence=")).map(x=>x.slice(11)); const reason=args.find(x=>x.startsWith("--reason="))?.slice(9) ?? "";
if(!file||!taskId||!allowed.has(status)){console.error("Usage: node sync-task.mjs <task.json> <taskId> <status> [--evidence=path] [--reason=text]");process.exit(2)}
const parsed=JSON.parse(fs.readFileSync(file,"utf8")); const tasks=Array.isArray(parsed)?parsed:parsed.tasks; if(!Array.isArray(tasks)) throw Error("task.json must be an array or {tasks:[]}");
const task=tasks.find(x=>x.taskId===taskId); if(!task) throw Error(`Unknown task: ${taskId}`);
if(["passed","failed"].includes(status)&&!evidence.length) throw Error(`${status} requires evidence`); if(["blocked","skipped"].includes(status)&&!reason) throw Error(`${status} requires reason`);
task.status=status; if(evidence.length) task.evidence=evidence; if(reason) task.reason=reason; fs.writeFileSync(file,JSON.stringify(Array.isArray(parsed)?tasks:{...parsed,tasks},null,2)+"\n");
