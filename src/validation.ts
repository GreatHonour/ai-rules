import { valid } from 'semver';

/** 判断外部值是否为普通 JSON 对象。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 断言外部值为普通 JSON 对象。 */
export function requireRecord(value: unknown, fieldPath: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${fieldPath} 必须是对象`);
  }
  return value;
}

/** 断言对象只包含契约允许的字段。 */
export function requireExactKeys(
  source: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
  fieldPath: string
): void {
  const allowedKeySet = new Set(allowedKeys);
  const unexpectedKey = Object.keys(source).find(key => !allowedKeySet.has(key));
  if (unexpectedKey !== undefined) {
    throw new Error(`${fieldPath}.${unexpectedKey} 是未允许的字段`);
  }
}

/** 读取非空字符串字段。 */
export function requireString(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldPath} 必须是非空字符串`);
  }
  return value;
}

/** 读取字符串数组字段。 */
export function requireStringArray(value: unknown, fieldPath: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldPath} 必须是字符串数组`);
  }
  return value.map((arrayValue, index) => requireString(arrayValue, `${fieldPath}[${index}]`));
}

/** 读取严格 SemVer 字符串。 */
export function requireSemVer(value: unknown, fieldPath: string): string {
  const version = requireString(value, fieldPath);
  if (valid(version) === null) {
    throw new Error(`${fieldPath} 必须是有效 SemVer`);
  }
  return version;
}

/** 读取 UTC 秒级时间字符串。 */
export function requireUtcDateTime(value: unknown, fieldPath: string): string {
  const dateText = requireString(value, fieldPath);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(dateText);
  const dateParts = dateMatch?.slice(1).map(Number);
  const [year, month, day, hour, minute, second] = dateParts ?? [];
  const hasAllParts = [year, month, day, hour, minute, second].every(part => part !== undefined);
  const normalizedDate = hasAllParts
    ? formatUtcDate(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, second ?? 0)))
    : '';
  if (normalizedDate !== dateText) {
    throw new Error(`${fieldPath} 必须是 UTC yyyy-MM-dd HH:mm:ss 时间`);
  }
  return dateText;
}

/** 格式化 UTC 时间，保证持久化格式唯一。 */
export function formatUtcDate(date: Date): string {
  const isoDate = date.toISOString();
  return `${isoDate.slice(0, 10)} ${isoDate.slice(11, 19)}`;
}

/** 校验公共资源名称，防止路径穿越。 */
export function requireResourceName(value: unknown, fieldPath: string): string {
  const resourceName = requireString(value, fieldPath);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(resourceName)) {
    throw new Error(`${fieldPath} 必须只包含字母、数字和连字符`);
  }
  return resourceName;
}
