import { describe, expect, it } from 'vitest';
import { parseRegistryIndex, resolvePackageVersion } from '../registry.js';

const INDEX = `
schema: 1
packages:
  - name: naming
    kind: rule
    versions:
      - version: 1.0.0
        path: packages/rules/naming/1.0.0
        entry: naming.md
        files: [naming.md]
      - version: 1.2.0
        path: packages/rules/naming/1.2.0
        entry: naming.md
        files: [naming.md]
`;

describe('registry resolution', () => {
  it('selects the highest matching SemVer version', () => {
    const index = parseRegistryIndex(INDEX);
    expect(resolvePackageVersion(index, 'rule', 'naming', '^1.0.0').version).toBe('1.2.0');
  });

  it('rejects path traversal in registry metadata', () => {
    expect(() =>
      parseRegistryIndex(`
schema: 1
packages:
  - name: bad
    kind: rule
    versions:
      - version: 1.0.0
        path: ../outside
        entry: bad.md
        files: [bad.md]
`),
    ).toThrow('安全相对路径');
  });
});
