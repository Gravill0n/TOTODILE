# Requirement: Compiler Layer Report Aggregation

Implementation: `src/schema/layerReport.ts` (TypeScript).
PRD refs: FR-D1 (each pass emits layer + report), FR-D2 (confidence flags +
source refs on every row), E2/E3 ACs (§3): report shows row counts, anomalies,
confidence flags.

## Exports

```typescript
export type Confidence = "high" | "medium" | "low";
export type LayerRow = {
  id: string;                    // EntityId
  confidence: Confidence;
  sourceRef: string | null;      // null = the extractor failed to attach a source
};

export type LayerReport = {
  rowCount: number;
  flagged: string[];        // ids with confidence "medium" or "low", input order
  flaggedCount: number;     // === flagged.length
  missingSource: string[];  // ids with sourceRef === null, input order
  duplicateIds: string[];   // ids appearing more than once, first-occurrence order, listed once each
  ok: boolean;              // true iff missingSource and duplicateIds are both empty
};

export function buildLayerReport(rows: readonly LayerRow[]): LayerReport;
```

## Rules

1. `flagged` collects every row whose confidence is not `"high"` (FR-D2: these are
   what the review lens shows). `"high"` rows are never flagged.
2. `missingSource` is a **hard problem** (§0.2 source-faithful): any row with
   `sourceRef: null` makes `ok: false`.
3. `duplicateIds`: an id occurring n ≥ 2 times appears once in the list; makes `ok: false`.
4. A row may appear in several buckets at once (e.g. low confidence AND missing source).
5. `rowCount` counts rows, not unique ids.
6. Empty input → `{ rowCount: 0, flagged: [], flaggedCount: 0, missingSource: [], duplicateIds: [], ok: true }`.
7. Pure function; input not mutated.

## Examples

Rows shorthand: `(id, confidence, sourceRef)`.

| Input | Result highlights |
|-------|-------------------|
| `[(a, high, src1), (b, high, src1)]` | `rowCount: 2, flagged: [], ok: true` |
| `[(a, medium, src1)]` | `flagged: [a], flaggedCount: 1, ok: true` (flags alone don't fail the report) |
| `[(a, low, null)]` | `flagged: [a], missingSource: [a], ok: false` |
| `[(a, high, src1), (a, high, src1)]` | `rowCount: 2, duplicateIds: [a], ok: false` |
| `[(a, high, s), (b, low, s), (a, medium, s)]` | `flagged: [b, a]` (input order), `duplicateIds: [a]`, `ok: false` |
| `[(a, high, s), (a, high, s), (a, high, s)]` | `duplicateIds: [a]` (listed once) |
| `[]` | `ok: true`, all empty, `rowCount: 0` |
