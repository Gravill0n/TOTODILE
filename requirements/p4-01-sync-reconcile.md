# Requirement: RA Sync Reconciliation + Receipt

Implementation: `src/sync/reconcile.ts` (TypeScript).
PRD refs: FR-C2 (mark mapped items done, never un-mark), FR-C3 (receipt:
newly marked / already done / unlocked-but-unmapped), §8.1 (atomic, additive-only),
P5 AC (§3). This is the **pure core** of sync — fetching is the RA client's job;
this function decides what a sync does.

## Exports

```typescript
export type ItemMap = Record<string, "done" | "skipped">; // absent = todo

export type SyncPlan = {
  toMark: string[];        // step EntityIds to set "done", deduplicated, mapping order
  receipt: {
    newlyMarked: string[];     // raIds whose step will now be marked, input unlock order
    alreadyDone: string[];     // raIds mapped to steps already done, input unlock order
    unmapped: string[];        // raIds unlocked but absent from the mapping, input unlock order
  };
};

export function reconcileSync(
  unlockedRaIds: readonly string[],          // from the RA client (backfill or session)
  mapping: ReadonlyMap<string, string>,      // raId -> step EntityId
  items: ItemMap                             // current progress
): SyncPlan;
```

## Rules

1. Each unlocked raId falls in exactly one receipt bucket:
   - not a key of `mapping` → `unmapped`
   - mapped, and its step is `"done"` → `alreadyDone`
   - mapped, step is todo or `"skipped"` → `newlyMarked`
2. **Additive only**: `toMark` is the only output that changes state, and it only
   ever sets "done". Nothing is ever un-marked; locally-done steps with no RA
   unlock are not touched (manual check wins, §11.4).
3. A step that is `"skipped"` gets marked done by sync (the achievement proves it
   happened) — its raId is `newlyMarked`.
4. Several raIds may map to one step: the step appears **once** in `toMark`; each
   raId still appears in its own receipt bucket. If the step was todo, ALL its
   unlocked raIds are `newlyMarked`.
5. Duplicate raIds in `unlockedRaIds` are processed once (first occurrence).
6. First-sync backfill is not special: the same function handles it (the input is
   simply the full unlock history, FR-C4).
7. Pure: no I/O, inputs not mutated. Empty unlocks → empty plan.

## Examples

Mapping: `{ "100" → sA, "101" → sA, "200" → sB, "300" → sC }`.

| unlocks | items | toMark | newlyMarked | alreadyDone | unmapped |
|---------|-------|--------|-------------|-------------|----------|
| `["100"]` | `{}` | `[sA]` | `["100"]` | `[]` | `[]` |
| `["100","101"]` | `{}` | `[sA]` (once) | `["100","101"]` | `[]` | `[]` |
| `["200"]` | `{sB: "done"}` | `[]` | `[]` | `["200"]` | `[]` |
| `["200"]` | `{sB: "skipped"}` | `[sB]` | `["200"]` | `[]` | `[]` |
| `["999"]` | `{}` | `[]` | `[]` | `[]` | `["999"]` |
| `["100","999","200"]` | `{sB:"done"}` | `[sA]` | `["100"]` | `["200"]` | `["999"]` |
| `["100","100"]` | `{}` | `[sA]` | `["100"]` (once) | `[]` | `[]` |
| `[]` | anything | `[]` | `[]` | `[]` | `[]` |
| any call | — | `items` object unchanged afterward |
