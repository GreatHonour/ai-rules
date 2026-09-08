#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const VALID_STATUSES = new Set(["pending", "passed", "failed", "blocked"]);

/**
 * 校验轻量验收清单的结构和平台范围。
 * @param {Record<string, any>} manifest 验收清单
 * @returns {string[]} 错误列表
 */
function validateAcceptance(manifest) {
  const errors = [];
  if (!manifest.deliveryId) errors.push("缺少 deliveryId");
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) errors.push("cases 必须为非空数组");
  const ids = new Set();
  for (const testCase of manifest.cases ?? []) {
    if (!testCase.id || ids.has(testCase.id)) errors.push(`用例 id 缺失或重复: ${testCase.id ?? "<unknown>"}`);
    ids.add(testCase.id);
    for (const field of ["requirement", "feature", "platform"]) {
      if (!testCase[field]) errors.push(`用例 ${testCase.id ?? "<unknown>"} 缺少 ${field}`);
    }
    if (!VALID_STATUSES.has(testCase.status)) errors.push(`用例 ${testCase.id ?? "<unknown>"} 状态无效`);
  }
  return errors;
}

// 命令行入口参数
const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("用法: node validate_acceptance.mjs <acceptance.json>");
  process.exit(2);
}

try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const errors = validateAcceptance(manifest);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("acceptance.json 有效");
} catch (error) {
  console.error(`无法校验 acceptance.json: ${error.message}`);
  process.exit(2);
}
