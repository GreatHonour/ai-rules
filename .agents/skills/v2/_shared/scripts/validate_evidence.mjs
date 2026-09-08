#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, normalize, resolve } from "node:path";

// 支持的用例结论
const RESULTS = new Set(["passed", "failed", "blocked", "inconclusive", "skipped", "pending"]);

/**
 * 判断证据路径是否为安全的仓库相对路径。
 * @param {unknown} evidencePath 证据路径
 * @returns {boolean} 是否安全
 */
function isSafeRelativePath(evidencePath) {
  if (typeof evidencePath !== "string" || evidencePath.length === 0 || isAbsolute(evidencePath)) return false;
  return !normalize(evidencePath).split(/[\\/]/).includes("..");
}

/**
 * 校验证据清单并计算验收结论。
 * @param {Record<string, any>} manifest 证据清单
 * @param {string} evidenceRoot 证据根目录
 * @returns {{errors: string[], result: string}} 校验结果
 */
function validateEvidence(manifest, evidenceRoot) {
  const errors = [];
  const cases = [];
  if (!manifest.deliveryId) errors.push("缺少 deliveryId");
  if (!Array.isArray(manifest.documents) || manifest.documents.length === 0) errors.push("documents 必须为非空数组");

  for (const document of manifest.documents ?? []) {
    if (!document.path) errors.push("文档缺少 path");
    if (!Array.isArray(document.requirements) || document.requirements.length === 0) {
      errors.push(`文档 ${document.path ?? "<unknown>"} 没有需求映射`);
      continue;
    }
    for (const requirement of document.requirements) {
      if (!requirement.id) errors.push("需求缺少 id");
      if (!Array.isArray(requirement.cases) || requirement.cases.length === 0) {
        errors.push(`需求 ${requirement.id ?? "<unknown>"} 没有用例`);
        continue;
      }
      for (const testCase of requirement.cases) {
        cases.push(testCase);
        if (!testCase.id) errors.push("用例缺少 id");
        if (!RESULTS.has(testCase.result)) errors.push(`用例 ${testCase.id ?? "<unknown>"} 结果无效`);
        if (["passed", "failed"].includes(testCase.result)) {
          if (!isSafeRelativePath(testCase.evidence)) errors.push(`用例 ${testCase.id} 缺少安全的相对证据路径`);
          else if (!existsSync(resolve(evidenceRoot, testCase.evidence))) errors.push(`用例 ${testCase.id} 的证据文件不存在`);
          if (!testCase.environment || !testCase.revision || !testCase.capturedAt) errors.push(`用例 ${testCase.id} 缺少证据锚点`);
        }
        if (["blocked", "skipped"].includes(testCase.result) && !testCase.note) errors.push(`用例 ${testCase.id} 缺少原因`);
      }
    }
  }

  let result = "passed";
  if (cases.length === 0 || cases.some((entry) => entry.result === "pending")) result = "pending";
  else if (cases.some((entry) => entry.result === "failed")) result = "failed";
  else if (cases.some((entry) => entry.result === "blocked")) result = "blocked";
  else if (cases.some((entry) => entry.result === "inconclusive")) result = "inconclusive";
  else if (cases.some((entry) => entry.result === "skipped")) result = "pending";
  if (errors.length > 0) result = "pending";
  return { errors, result };
}

// 命令行入口参数
const evidencePath = process.argv[2];
if (!evidencePath) {
  console.error("用法: node validate_evidence.mjs <evidence-manifest.json>");
  process.exit(2);
}

try {
  const evidenceManifest = JSON.parse(await readFile(evidencePath, "utf8"));
  const validation = validateEvidence(evidenceManifest, dirname(resolve(evidencePath)));
  if (validation.errors.length > 0) {
    console.error(validation.errors.join("\n"));
    process.exit(1);
  }
  console.log(`evidence 有效，验收结论: ${validation.result}`);
} catch (error) {
  console.error(`无法校验证据: ${error.message}`);
  process.exit(2);
}
