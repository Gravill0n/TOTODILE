# Requirement: Cleanup View Grouping

Implementation: `src/progress/cleanup.ts` (TypeScript).
PRD refs: FR-B4 (cleanup lists all non-done items grouped by location/chapter),
FR-B2 (skip ≠ done), P7 AC (§3): "cleanup view lists all unchecked items grouped
by region/chapter; steps I explicitly skipped earlier appear in it".

## Exports

```typescript
export type SpineStepRef = { id: string; chapterId: string };   // spine order
export type ItemMap = Record<string, "done" | "skipped">;

export type CleanupGroup = {
  chapterId: string;
  entries: { id: string; status: "todo" | "skipped" }[];   // spine order
};

export function cleanupGroups(
  orderedSteps: readonly SpineStepRef[],
  items: ItemMap
): CleanupGroup[];
```

## Rules

1. A step belongs in cleanup iff it is **not done**: absent from `items`
   (→ status `"todo"`) or `"skipped"` (→ status `"skipped"`).
2. Groups follow **spine chapter order** (order of first appearance of each
   chapterId in `orderedSteps`); entries within a group follow spine order.
3. Chapters whose every step is done are **omitted** (no empty groups).
4. All steps done → `[]` (cleanup complete — this is the §13 finish line).
5. Pure; inputs not mutated; no deduplication assumptions (step ids are unique
   per spine validation `p0-02`).

## Examples

Spine: `s1(ch1)`, `s2(ch1)`, `s3(ch2)`, `s4(ch2)`, `s5(ch3)`.

| items | Result |
|-------|--------|
| `{}` | `[{ch1: [s1 todo, s2 todo]}, {ch2: [s3 todo, s4 todo]}, {ch3: [s5 todo]}]` |
| `{s1:"done", s2:"done"}` | groups for ch2 and ch3 only |
| `{s1:"done", s2:"skipped"}` | ch1 group = `[s2 skipped]`, then ch2, ch3 |
| `{s3:"skipped"}` | ch1 `[s1, s2 todo]`, ch2 `[s3 skipped, s4 todo]`, ch3 `[s5 todo]` |
| all five done | `[]` |
| `{s4:"done"}` | ch2 group contains only `s3` |

(Notation abbreviated: each entry is `{ id, status }`; group objects are
`{ chapterId, entries }`.)
