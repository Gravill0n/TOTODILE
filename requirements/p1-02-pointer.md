# Requirement: Current-Step Pointer Semantics

Implementation: `src/spine/pointer.ts` (TypeScript).
PRD refs: §6.7 (explicit pointer: stored, auto-advances when its step is checked,
manually movable, NEVER derived from "first unchecked"), §11.2 (pointer relocation
when a step disappears), §24.3 (no other auto-advance logic — hard stop).

## Exports

```typescript
export type ItemMap = Record<string, "done" | "skipped">; // absent = todo

/**
 * Called after a step is marked done. Advances the pointer ONLY if the checked
 * step IS the pointer step. Returns the new pointer.
 */
export function advanceOnCheck(
  orderedStepIds: readonly string[],   // full spine order
  pointer: string | null,
  checkedStepId: string,
  items: ItemMap                       // state AFTER the check was applied
): string | null;

/** Manual move. Returns the new pointer, or throws Error if stepId is unknown. */
export function setPointer(orderedStepIds: readonly string[], stepId: string): string;

/**
 * After a guide update: keep the pointer if its step survived; otherwise move to
 * the nearest EARLIER step (by old order) that still exists; if none, the first
 * step of the new order.
 */
export function relocatePointer(
  oldOrder: readonly string[],
  newOrder: readonly string[],
  pointer: string | null
): { pointer: string | null; moved: boolean };
```

## Rules — advanceOnCheck

1. If `checkedStepId !== pointer`, the pointer is returned **unchanged** — checking
   other steps NEVER moves the pointer (§24.3).
2. If the checked step is the pointer: the new pointer is the next step *after* it
   in spine order whose state is neither `"done"` nor `"skipped"`.
3. If every later step is done/skipped, the pointer becomes `null` (guide complete
   from here on; no wrap-around to earlier steps).
4. A `null` pointer stays `null` regardless of the checked step.

## Rules — setPointer

5. Any existing step may be chosen, regardless of its done/skip state.
6. Unknown `stepId` throws an `Error` containing the id.

## Rules — relocatePointer

7. `pointer === null` → `{ pointer: null, moved: false }`.
8. Pointer present in `newOrder` → unchanged, `moved: false`.
9. Otherwise walk **backwards** from the pointer's position in `oldOrder`; the
   first id also present in `newOrder` becomes the pointer, `moved: true`.
10. If no earlier step survives, pointer = `newOrder[0]`, `moved: true`.
11. If `newOrder` is empty, pointer = `null`, `moved: true`.

## Examples

Order `[s1, s2, s3, s4]` (ids abbreviated; real ids are EntityIds).

| Call | Result |
|------|--------|
| advanceOnCheck(order, `s2`, checked `s2`, items `{s2: done}`) | `s3` |
| advanceOnCheck(order, `s2`, checked `s2`, items `{s2: done, s3: skipped}`) | `s4` |
| advanceOnCheck(order, `s2`, checked `s2`, items `{s2: done, s3: done, s4: skipped}`) | `null` |
| advanceOnCheck(order, `s2`, checked `s4`, items `{s4: done}`) | `s2` (unchanged) |
| advanceOnCheck(order, `null`, checked `s1`, …) | `null` |
| advanceOnCheck(order, `s4`, checked `s4`, items `{s1: todo…, s4: done}`) | `null` (no wrap-around) |
| setPointer(order, `s3`) | `s3` |
| setPointer(order, `s9`) | throws, message contains `s9` |
| relocatePointer(`[s1,s2,s3]`, `[s1,s2,s3]`, `s2`) | `{ pointer: s2, moved: false }` |
| relocatePointer(`[s1,s2,s3]`, `[s1,s3]`, `s2`) | `{ pointer: s1, moved: true }` |
| relocatePointer(`[s1,s2,s3]`, `[s3]`, `s2`) | `{ pointer: s3, moved: true }` (rule 10: no earlier survivor → first of new order) |
| relocatePointer(`[s1,s2]`, `[]`, `s1`) | `{ pointer: null, moved: true }` |
| relocatePointer(`[s1,s2]`, `[s1,s2,s1b]`, `null`) | `{ pointer: null, moved: false }` |
