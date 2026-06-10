# Requirement: Canonical Hash + Layer Approval Verification

Implementation: `src/schema/approvals.ts` (TypeScript).
PRD refs: §6.7 (hash-locked approvals), FR-E4 (approval locks the layer).
May use Node's `crypto` module (these functions run in the validate CLI and tests;
the browser build uses the same logic via the bundler's crypto support).

## Exports

```typescript
export type ApprovalRecord = {
  layer: "spine" | "widgets" | "raMapping" | "qa";
  hash: string;                  // 64 lowercase hex chars (SHA-256)
  approvedAt: string;            // ISO-8601 timestamp
  note?: string;
};

/**
 * Hash of the canonical JSON form of a value:
 * - object keys serialized in sorted (code point) order, recursively
 * - arrays keep their order
 * - no whitespace
 * - SHA-256, lowercase hex
 */
export function canonicalHash(value: unknown): string;

/** Does this layer content match its approval record? */
export function verifyApproval(layerContent: unknown, record: ApprovalRecord): boolean;
```

## Rules

1. `canonicalHash` is **key-order independent**: `{a: 1, b: 2}` and `{b: 2, a: 1}`
   hash identically, including for nested objects.
2. Array order **matters**: `[1, 2]` and `[2, 1]` hash differently.
3. Any value difference (string vs number `"1"` vs `1`, added key, changed deep
   value) changes the hash.
4. Output is always exactly 64 lowercase hex characters, deterministic across calls.
5. Anchor to the algorithm: `canonicalHash({a: 1})` MUST equal the SHA-256 hex of
   the exact string `{"a":1}` as computed independently in the test (e.g. with
   `node:crypto`'s `createHash("sha256")`). Do NOT hardcode hash literals in
   tests — always compute the expected value from the canonical string.
6. `verifyApproval(content, record)` is `true` iff `canonicalHash(content) === record.hash`.
7. Neither function throws for plain JSON-compatible input (objects, arrays,
   strings, numbers, booleans, null).

## Examples

| Case | Result |
|------|--------|
| `canonicalHash({a: 1, b: [1, 2]}) === canonicalHash({b: [1, 2], a: 1})` | `true` |
| `canonicalHash({a: [1, 2]}) === canonicalHash({a: [2, 1]})` | `false` |
| `canonicalHash({a: 1}) === canonicalHash({a: "1"})` | `false` |
| `canonicalHash({a: {x: 1, y: 2}}) === canonicalHash({a: {y: 2, x: 1}})` | `true` |
| `canonicalHash(null)` | 64 lowercase hex chars |
| same input hashed twice | identical output |
| `verifyApproval(content, { ...record, hash: canonicalHash(content) })` | `true` |
| `verifyApproval(modifiedContent, record)` after ANY change to content | `false` |
