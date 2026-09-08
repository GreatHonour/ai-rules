#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// 校验脚本目录
const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * 执行校验器并断言退出码类别。
 * @param {string} scriptName 脚本文件名
 * @param {Record<string, unknown>} payload 输入对象
 * @param {boolean} shouldPass 是否预期通过
 * @param {string} temporaryPath 临时目录
 * @returns {Promise<void>}
 */
async function assertValidation(scriptName, payload, shouldPass, temporaryPath) {
  const inputPath = join(temporaryPath, `${scriptName}-${shouldPass ? "valid" : "invalid"}.json`);
  await writeFile(inputPath, JSON.stringify(payload), "utf8");
  const execution = spawnSync(process.execPath, [resolve(SCRIPT_ROOT, scriptName), inputPath], { encoding: "utf8" });
  const didPass = execution.status === 0;
  if (didPass !== shouldPass) {
    throw new Error(`${scriptName} 预期 ${shouldPass ? "通过" : "失败"}，实际退出码 ${execution.status}\n${execution.stdout}${execution.stderr}`);
  }
}

// 独立临时测试目录
const temporaryPath = await mkdtemp(join(tmpdir(), "flow-v2-"));
try {
  await mkdir(join(temporaryPath, "evidence"));
  await mkdir(join(temporaryPath, "docs"));
  await writeFile(join(temporaryPath, "evidence/c1.json"), "{}", "utf8");
  await writeFile(join(temporaryPath, "evidence/t1.txt"), "passed", "utf8");
  await writeFile(join(temporaryPath, "evidence/acceptance.md"), "passed", "utf8");
  await writeFile(join(temporaryPath, "docs/requirement.md"), "requirement", "utf8");
  await writeFile(join(temporaryPath, "docs/design.md"), "design", "utf8");
  await writeFile(join(temporaryPath, "docs/tasks.json"), "{}", "utf8");
  const validManifest = {
    deliveryId: "delivery-1",
    version: "1.0.0",
    documents: ["docs/requirement.md"],
    repositories: ["repo-a"],
    environments: ["test", "production"],
    design: "docs/design.md",
    tasks: "docs/tasks.json",
    sourceFacts: [{ repository: "repo-a", branch: "main", commit: "abc", timestamp: "2026-09-08T00:00:00Z" }],
    acceptance: { result: "passed", report: "evidence/acceptance.md", validatedAt: "2026-09-08T00:30:00Z" },
    deployments: [{ repository: "repo-a", environment: "production", commit: "abc", result: "passed", timestamp: "2026-09-08T01:00:00Z", anchor: "pipeline/1" }],
    stage: "released"
  };
  await assertValidation("validate_manifest.mjs", validManifest, true, temporaryPath);
  await assertValidation("validate_manifest.mjs", { ...validManifest, deployments: [] }, false, temporaryPath);

  const validEvidence = {
    deliveryId: "delivery-1",
    documents: [{ path: "docs/requirement.md", requirements: [{ id: "R1", cases: [{ id: "C1", result: "passed", environment: "test", revision: "abc", capturedAt: "2026-09-08T00:00:00Z", evidence: "evidence/c1.json" }] }] }]
  };
  await assertValidation("validate_evidence.mjs", validEvidence, true, temporaryPath);
  await assertValidation("validate_evidence.mjs", { ...validEvidence, documents: [{ path: "docs/requirement.md", requirements: [] }] }, false, temporaryPath);

  const validTasks = { tasks: [{ id: "T1", title: "任务一", status: "completed", depends: [], verification: "evidence/t1.txt" }] };
  await assertValidation("validate_tasks.mjs", validTasks, true, temporaryPath);
  await assertValidation("validate_tasks.mjs", { tasks: [{ id: "T1", status: "pending", depends: ["T1"] }] }, false, temporaryPath);
  console.log("v2 校验器测试全部通过：3 个成功样例，3 个失败样例");
} finally {
  await rm(temporaryPath, { recursive: true, force: true });
}
