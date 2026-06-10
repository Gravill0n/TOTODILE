# Requirement: Deterministic Spot-Check Sampling

Implementation: `src/review/spotCheck.ts` (TypeScript).
PRD refs: FR-E3 (random spot-check of N rows with recorded verdicts), E4 AC (§3).

Sampling must be **deterministic from a seed** so a spot-check session can be
reproduced (same layer + same seed = same rows), while different seeds explore
different rows.

## Exports

```typescript
export function sampleRows(ids: readonly string[], n: number, seed: number): string[];

export type SpotVerdict = { id: string; pass: boolean; note: string };
export type SpotCheckRecord = {
  seed: number;
  checkedAt: string;          // ISO timestamp, passed in by caller
  verdicts: SpotVerdict[];
  allPassed: boolean;         // true iff every verdict has pass: true
};

export function recordSpotCheck(
  seed: number,
  checkedAt: string,
  verdicts: readonly SpotVerdict[]
): SpotCheckRecord;
```

## Rules — sampleRows

1. Returns `min(n, ids.length)` **distinct** elements of `ids` (a subset — never
   an id that wasn't in the input; never the same id twice).
2. Deterministic: identical `(ids, n, seed)` always returns the identical array
   (same elements, same order) across calls and processes. No `Math.random()`.
3. When `n >= ids.length`, returns ALL ids (any order, but still deterministic).
4. Different seeds must be able to produce different selections: for
   `ids = ["a".."j"]` (10 ids) and `n = 3`, there exist two seeds in `{1..20}`
   whose results differ. (Tests should assert this concretely, e.g. collect
   results for seeds 1–20 and require at least 2 distinct outcomes.)
5. Selection covers the whole input space: for the same 10-id input with `n = 3`,
   the union of results over seeds 1–50 contains more than 3 distinct ids
   (i.e. the sampler doesn't always pick the same head/tail of the list).
6. `n <= 0` or empty `ids` → `[]`. Duplicate ids in the input are treated as one.
7. Input array never mutated.

## Rules — recordSpotCheck

8. Copies its inputs into a new record; `allPassed` is true iff `verdicts` is
   non-empty AND every `pass` is true. Empty `verdicts` → `allPassed: false`
   (an empty check proves nothing).
9. Every verdict keeps its `note` verbatim (empty notes allowed on pass: true;
   a `pass: false` verdict with an empty note is still stored as-is — enforcing
   notes on failures is a UI concern).

## Examples

| Case | Result |
|------|--------|
| `sampleRows(["a","b","c","d","e"], 2, 7)` called twice | identical arrays |
| `sampleRows(ids10, 3, s)` for any s | length 3, all from input, no duplicates |
| `sampleRows(ids10, 99, s)` | all 10 ids |
| `sampleRows(ids10, 0, s)` | `[]` |
| `sampleRows([], 5, s)` | `[]` |
| `sampleRows(["a","a","b"], 2, s)` | at most one `"a"` |
| seeds 1–20 over ids10, n=3 | at least 2 distinct results |
| `recordSpotCheck(7, t, [{id:"a",pass:true,note:""}])` | `allPassed: true` |
| one verdict `pass: false` among passes | `allPassed: false` |
| `verdicts: []` | `allPassed: false` |
