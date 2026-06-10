# Requirement: Stable-ID Preservation Check (recompile guard)

Implementation: `src/schema/idPreservation.ts` (TypeScript).
PRD refs: §6.8 (IDs stable across recompiles — the invariant), §10.3 (the most
fragile joint), §15 risk 3 (validator hard-fails ID drift).

When a guide is recompiled, every entity ID present in the previously **approved**
layer must still exist in the recompiled output. New IDs may be added; existing
IDs may never disappear or be renamed (renaming = disappear + add).

## Exports

```typescript
export type IdPreservationResult = {
  ok: boolean;            // false iff missing.length > 0
  missing: string[];      // approved IDs absent from the recompile (sorted ascending)
  added: string[];        // new IDs not in the approved set (sorted ascending)
};

export function checkIdPreservation(
  approvedIds: Iterable<string>,
  recompiledIds: Iterable<string>
): IdPreservationResult;
```

## Rules

1. `ok` is `true` exactly when every approved ID appears among the recompiled IDs.
2. `added` never affects `ok` — growth is always allowed.
3. Duplicate IDs in either input are treated as a single occurrence.
4. Comparison is exact string equality (no case folding, no trimming).
5. Both result arrays are sorted ascending (default lexicographic string order),
   regardless of input order, so reports are deterministic.
6. Empty approved set: always `ok: true` (first compile has nothing to preserve).
7. Inputs are not mutated; works with arrays, Sets, or any iterable.

## Examples

Shorthand: ids are strings like `"g:c:s1"`.

| approvedIds | recompiledIds | Result |
|-------------|---------------|--------|
| `["g:c:s1", "g:c:s2"]` | `["g:c:s1", "g:c:s2"]` | `{ ok: true, missing: [], added: [] }` |
| `["g:c:s1"]` | `["g:c:s1", "g:c:s2"]` | `{ ok: true, missing: [], added: ["g:c:s2"] }` |
| `["g:c:s1", "g:c:s2"]` | `["g:c:s2"]` | `{ ok: false, missing: ["g:c:s1"], added: [] }` |
| `["g:c:s1"]` | `["g:c:s1-renamed"]` | `{ ok: false, missing: ["g:c:s1"], added: ["g:c:s1-renamed"] }` |
| `[]` | `["g:c:s1"]` | `{ ok: true, missing: [], added: ["g:c:s1"] }` |
| `["g:c:s1"]` | `[]` | `{ ok: false, missing: ["g:c:s1"], added: [] }` |
| `["g:c:s1", "g:c:s1"]` | `["g:c:s1"]` | `{ ok: true, missing: [], added: [] }` |
| `["g:c:S1"]` | `["g:c:s1"]` | `{ ok: false, ... }` (case-sensitive) |
| `["b", "a"]` | `[]` | `missing === ["a", "b"]` (sorted) |
