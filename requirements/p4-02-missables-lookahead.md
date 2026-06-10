# Requirement: Upcoming-Missables Lookahead

Implementation: `src/spine/missables.ts` (TypeScript).
PRD refs: FR-B5 (missables in the upcoming section surface on the current-step
view; acknowledgment is explicit), P3 AC (§3): "any missable within the upcoming
section is visibly flagged… dismissing is an explicit action".

"Upcoming section" = the **current chapter, from the pointer onward**.

## Exports

```typescript
export type SpineStepRef = {
  id: string;                 // EntityId
  chapterId: string;          // segment
  missable: { warning: string } | null;
};
export type ItemMap = Record<string, "done" | "skipped">;

export function upcomingMissables(
  orderedSteps: readonly SpineStepRef[],   // full spine order
  pointer: string | null,
  items: ItemMap,
  acknowledged: ReadonlySet<string>        // step ids the player explicitly dismissed
): SpineStepRef[];
```

## Rules

1. `pointer: null` (guide complete or fresh-empty edge) → `[]`.
2. Consider only steps in the **same chapter as the pointer step**, at or after
   the pointer's position in spine order (the pointer step itself included).
3. From those, return the steps that:
   - have a `missable`, AND
   - are not `"done"` (a done missable is no longer at risk), AND
   - are not in `acknowledged` (explicit dismissal, FR-B5).
4. `"skipped"` steps with a missable ARE returned — skipping is exactly the
   dangerous case for a missable.
5. Result preserves spine order. Inputs never mutated.
6. If the pointer id is not found in `orderedSteps`, return `[]` (defensive: the
   relocation logic of `p1-02` should prevent this, but never throw).

## Examples

Spine (in order; `M` = has missable):
`s1(ch1)`, `s2(ch1, M)`, `s3(ch1, M)`, `s4(ch2, M)`, `s5(ch2)`.

| pointer | items | acknowledged | Result |
|---------|-------|--------------|--------|
| `s1` | `{}` | `{}` | `[s2, s3]` (ch2's `s4` is beyond the upcoming section) |
| `s2` | `{}` | `{}` | `[s2, s3]` (pointer step itself included) |
| `s3` | `{}` | `{}` | `[s3]` |
| `s1` | `{s2: "done"}` | `{}` | `[s3]` |
| `s1` | `{s2: "skipped"}` | `{}` | `[s2, s3]` (skipped stays flagged, rule 4) |
| `s1` | `{}` | `{s3}` | `[s2]` |
| `s4` | `{}` | `{}` | `[s4]` (ch2 section) |
| `s5` | `{}` | `{}` | `[]` |
| `null` | `{}` | `{}` | `[]` |
| `s9` (unknown) | `{}` | `{}` | `[]`, no throw |
