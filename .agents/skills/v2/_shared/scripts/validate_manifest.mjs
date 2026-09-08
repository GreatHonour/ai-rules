#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, normalize, resolve } from "node:path";

// 生命周期阶段顺序
const STAGES = ["planned", "specified", "implemented", "verified", "released"];

/**
 * 读取并解析 JSON 文件。
 * @param {string} filePath 文件路径
 * @returns {Promise<Record<string, unknown>>} JSON 对象
 */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

/**
 * 判断值是否为非空数组。
 * @param {unknown} value 待判断值
 * @returns {boolean} 是否为非空数组
 */
function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 判断仓库相对路径是否安全且真实存在。
 * @param {unknown} filePath 待检查路径
 * @param {string} manifestRoot manifest 所在目录
 * @returns {boolean} 路径是否有效
 */
function isExistingRelativePath(filePath, manifestRoot) {
  if (typeof filePath !== "string" || filePath.length === 0 || isAbsolute(filePath)) return false;
  const normalizedPath = normalize(filePath);
  if (normalizedPath.split(/[\\/]/).includes("..")) return false;
  return existsSync(resolve(manifestRoot, filePath));
}

/**
 * 根据交付事实推导生命周期阶段。
 * @param {Record<string, any>} manifest 交付清单
 * @returns {string} 推导阶段
 */
function deriveStage(manifest) {
  let stage = "planned";
  if (manifest.design && manifest.tasks) stage = "specified";
  const requiredRepositories = Array.isArray(manifest.repositories) ? manifest.repositories : [];
  const implementedRepositories = new Set((manifest.sourceFacts ?? []).map((entry) => entry.repository));
  if (stage === "specified" && requiredRepositories.length > 0 && requiredRepositories.every((repository) => implementedRepositories.has(repository))) {
    stage = "implemented";
  }
  if (stage === "implemented" && manifest.acceptance?.result === "passed" && manifest.acceptance?.report && manifest.acceptance?.validatedAt) {
    stage = "verified";
  }

  // 必需仓库必须逐一具有成功生产部署事实
  const deployedRepositories = new Set(
    (manifest.deployments ?? [])
      .filter((entry) => entry.environment === "production" && entry.result === "passed" && entry.anchor && entry.timestamp)
      .map((entry) => entry.repository),
  );
  if (stage === "verified" && requiredRepositories.length > 0 && requiredRepositories.every((repository) => deployedRepositories.has(repository))) {
    stage = "released";
  }
  return stage;
}

/**
 * 校验交付清单并返回错误列表。
 * @param {Record<string, any>} manifest 交付清单
 * @param {string} manifestRoot manifest 所在目录
 * @returns {string[]} 错误列表
 */
function validateManifest(manifest, manifestRoot) {
  const errors = [];
  if (!manifest.deliveryId) errors.push("缺少 deliveryId");
  if (!manifest.version) errors.push("缺少 version");
  if (!hasItems(manifest.documents)) errors.push("documents 必须为非空数组");
  for (const documentPath of manifest.documents ?? []) {
    if (!isExistingRelativePath(documentPath, manifestRoot)) errors.push(`文档路径不存在或不安全: ${documentPath}`);
  }
  if (!hasItems(manifest.repositories)) errors.push("repositories 必须为非空数组");
  if (!hasItems(manifest.environments)) errors.push("environments 必须为非空数组");
  if (manifest.design && !isExistingRelativePath(manifest.design, manifestRoot)) errors.push("design 路径不存在或不安全");
  if (manifest.tasks && !isExistingRelativePath(manifest.tasks, manifestRoot)) errors.push("tasks 路径不存在或不安全");
  if (manifest.acceptance?.report && !isExistingRelativePath(manifest.acceptance.report, manifestRoot)) errors.push("acceptance.report 路径不存在或不安全");
  for (const sourceFact of manifest.sourceFacts ?? []) {
    if (!sourceFact.repository || !sourceFact.branch || !sourceFact.commit || !sourceFact.timestamp) {
      errors.push("sourceFacts 每项必须包含 repository、branch、commit 和 timestamp");
    }
  }
  for (const deployment of manifest.deployments ?? []) {
    if (!deployment.repository || !deployment.environment || !deployment.commit || !deployment.result || !deployment.timestamp || !deployment.anchor) {
      errors.push("deployments 每项必须包含 repository、environment、commit、result、timestamp 和 anchor");
    }
  }
  if (manifest.stage && !STAGES.includes(manifest.stage)) errors.push(`未知 stage: ${manifest.stage}`);
  if (manifest.stage && manifest.stage !== deriveStage(manifest)) {
    errors.push(`stage 与事实不符：记录为 ${manifest.stage}，推导为 ${deriveStage(manifest)}`);
  }
  return errors;
}

// 命令行入口参数
const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("用法: node validate_manifest.mjs <delivery-manifest.json>");
  process.exit(2);
}

try {
  const manifest = await readJson(manifestPath);
  const errors = validateManifest(manifest, dirname(resolve(manifestPath)));
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`manifest 有效，推导阶段: ${deriveStage(manifest)}`);
} catch (error) {
  console.error(`无法校验 manifest: ${error.message}`);
  process.exit(2);
}
