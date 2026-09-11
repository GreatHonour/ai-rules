/** @type {import('lint-staged').Configuration} */
module.exports = {
  // 提交前对暂存文件执行格式化，被 .prettierignore 排除的文件会被 prettier 跳过
  '*.{ts,js,cjs,mjs,json,md,yml,yaml}': 'prettier --write',
};
