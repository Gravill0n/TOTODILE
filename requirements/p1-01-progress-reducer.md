# Requirement: Progress State Reducer (done / skip / counters)

Implementation: `src/progress/reducer.ts` (TypeScript).
PRD refs: §6.7 (progress store), FR-B1/B2/B3, §9.1 (one behavior everywhere).

A **pure reducer** over per-guide progress state. No I/O, no `Date.now()` —
timestamps arrive in the action.

## Exports

```typescript
export type ProgressState = {
  guideSlug: string;
  schemaVersion: number;
  pointer: string | null;                      // handled by p1-02, carried untouched here
  items: Record<string, "done" | "skipped">;   // absent key = todo
  counters: Record<string, number>;
  updatedAt: string;                           // ISO timestamp of last applied action
};

export type ProgressAction =
  | { kind: "markDone";       id: string; at: string }
  | { kind: "unmarkDone";     id: string; at: string }
  | { kind: "skip";           id: string; at: string }
  | { kind: "unskip";         id: string; at: string }
  | { kind: "incrementCounter"; id: string; at: string }
  | { kind: "decrementCounter"; id: string; at: string }
  | { kind: "resetCounter";     id: string; at: string };

export function applyAction(state: ProgressState, action: ProgressAction): ProgressState;
```

## Rules

1. **Purity / immutability**: the input `state` object (and its nested `items` /
   `counters`) is never mutated; the result is a new object. If an action is a
   no-op (see below), returning the same state object unchanged is allowed.
2. `markDone`: sets `items[id] = "done"`, replacing `"skipped"` if present.
3. `unmarkDone`: removes the entry **only if** it is `"done"`; no-op if absent or `"skipped"`.
4. `skip`: sets `items[id] = "skipped"` **only if** the item is not `"done"`
   (skipping a done item is a no-op — done is stronger than skipped, FR-B2).
5. `unskip`: removes the entry only if it is `"skipped"`; no-op otherwise.
6. `incrementCounter`: `counters[id]` becomes its current value + 1; a missing
   counter starts at 0 (so first increment yields 1).
7. `decrementCounter`: current value − 1, floored at 0; decrementing a missing
   counter is a no-op (stays absent or yields 0 — either is acceptable, but it
   must never go negative).
8. `resetCounter`: removes `counters[id]` (subsequent increment restarts at 1).
9. Every **effective** action sets `updatedAt` to the action's `at`. A no-op
   action leaves `updatedAt` unchanged.
10. `pointer` is never modified by any of these actions.

## Examples

Start: `s0 = { guideSlug: "g", schemaVersion: 1, pointer: "g:c:s1", items: {}, counters: {}, updatedAt: "2026-06-10T00:00:00Z" }`

| Sequence | Resulting `items` / `counters` |
|----------|-------------------------------|
| markDone `x` | `items = { x: "done" }`, `updatedAt` = action's `at` |
| skip `x` then markDone `x` | `{ x: "done" }` |
| markDone `x` then skip `x` | `{ x: "done" }` (skip was a no-op) |
| markDone `x` then unmarkDone `x` | `{}` |
| skip `x` then unmarkDone `x` | `{ x: "skipped" }` (no-op) |
| skip `x` then unskip `x` | `{}` |
| increment `c` ×3 | `counters = { c: 3 }` |
| increment `c`, decrement `c` ×5 | `c` is `0` (floored, never negative) |
| decrement missing `c` | no negative value; `updatedAt` unchanged |
| increment `c`, reset `c`, increment `c` | `{ c: 1 }` |
| any effective action | input state object deep-equal to its original value afterward |
| markDone `x` twice (second `at` later) | second call may be treated as effective or no-op, but `items` is `{ x: "done" }` and never errors |
