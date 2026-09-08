#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const TARGET_STAGES = new Set(["implemented", "verified", "released"]);

/**
 * 校验交付登记中的仓库、分支、平台和目标阶段。
 * @param {Record<string, any>} delivery 交付登记
 * @returns {string[]} 错误列表
 */
function validateDelivery(delivery) {
  const errors = [];
  if (!delivery.deliveryId) errors.push("缺少 deliveryId");
  if (!TARGET_STAGES.has(delivery.targetStage)) errors.push("targetStage 必须为 implemented、verified 或 released");
  if (!Array.isArray(delivery.repositories) || delivery.repositories.length === 0) errors.push("repositories 必须为非空数组");
  const repositoryIds = new Set();
  for (const repository of delivery.repositories ?? []) {
    if (!repository.id || repositoryIds.has(repository.id)) errors.push(`仓库 id 缺失或重复: ${repository.id ?? "<unknown>"}`);
    repositoryIds.add(repository.id);
    if (!repository.branch) errors.push(`仓库 ${repository.id ?? "<unknown>"} 缺少 branch`);
  }
  if (!Array.isArray(delivery.testEnvironments) || delivery.testEnvironments.length === 0) errors.push("testEnvironments 必须为非空数组");
  if (!Array.isArray(delivery.platforms) || delivery.platforms.length === 0) errors.push("platforms 必须为非空数组");
  if (!delivery.deployAdapter) errors.push("缺少 deployAdapter");
  return errors;
}

// 命令行入口参数
const deliveryPath = process.argv[2];
if (!deliveryPath) {
  console.error("用法: node validate_delivery.mjs <delivery.json>");
  process.exit(2);
}

try {
  const delivery = JSON.parse(await readFile(deliveryPath, "utf8"));
  const errors = validateDelivery(delivery);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("delivery.json 有效");
} catch (error) {
  console.error(`无法校验 delivery.json: ${error.message}`);
  process.exit(2);
}
