#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// v2 根目录
const V2_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Markdown 相对链接
const LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;

/**
 * 校验单个 Skill 的 frontmatter、体量与相对链接。
 * @param {string} skillPath Skill 目录
 * @returns {Promise<string[]>} 错误列表
 */
async function validateSkill(skillPath) {
  const errors = [];
  const skillFile = join(skillPath, "SKILL.md");
  const content = await readFile(skillFile, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return [`${skillFile}: frontmatter 无效`];

  const name = frontmatter[1].match(/^name:\s*([^\r\n]+)$/m)?.[1]?.trim();
  const description = frontmatter[1].match(/^description:\s*([^\r\n]+)$/m)?.[1]?.trim();
  if (!name || !/^[a-z0-9-]{1,64}$/.test(name)) errors.push(`${skillFile}: name 无效`);
  if (!description || description.includes("TODO") || description.length > 1024) errors.push(`${skillFile}: description 无效`);
  if (content.split(/\r?\n/).length > 40) errors.push(`${skillFile}: 入口超过 40 行，应拆到 references`);

  for (const match of content.matchAll(LINK_PATTERN)) {
    if (/^[a-z]+:/i.test(match[1])) continue;
    try {
      await access(resolve(skillPath, match[1]));
    } catch {
      errors.push(`${skillFile}: 相对链接不存在 ${match[1]}`);
    }
  }
  return errors;
}

/**
 * 查找 v2 根入口和独立子 Skill。
 * @returns {Promise<string[]>} Skill 目录列表
 */
async function findSkills() {
  const entries = await readdir(V2_ROOT, { withFileTypes: true });
  return [V2_ROOT, ...entries.filter((entry) => entry.isDirectory() && entry.name.startsWith("flow-v2-")).map((entry) => join(V2_ROOT, entry.name))];
}

try {
  const skillPaths = await findSkills();
  const validationErrors = (await Promise.all(skillPaths.map(validateSkill))).flat();
  if (validationErrors.length > 0) {
    console.error(validationErrors.join("\n"));
    process.exit(1);
  }
  console.log(`v2 Skill 结构有效，共 ${skillPaths.length} 个入口`);
} catch (error) {
  console.error(`无法校验 v2 Skill: ${error.message}`);
  process.exit(2);
}
