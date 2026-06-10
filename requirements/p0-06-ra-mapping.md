# Requirement: RA Mapping Validation + Cross-Check

Implementation: `src/schema/raMapping.ts` (TypeScript).
PRD refs: §6.5 (standalone RA mapping file), FR-C1, §11.1 (mapping referencing a
missing step is flagged at compile time).
EntityId / segment formats as defined in `p0-01`.

## Exports

```typescript
export type RaMapping = {
  schemaVersion: number;       // integer >= 1
  guideSlug: string;           // segment
  gameId: number;              // RA game id, integer >= 1
  entries: RaEntry[];
};
export type RaEntry = {
  raId: string;                // RA achievement id, matches ^[0-9]+$
  stepId: string;              // EntityId of the step where it is earned
};

export type RaMappingResult =
  | { ok: true; mapping: RaMapping }
  | { ok: false; errors: string[] };

export function validateRaMapping(data: unknown): RaMappingResult;

/**
 * Compile-time cross-check: which entries point at steps that do not exist?
 * Returns the offending entries in input order (empty array = all good).
 */
export function crossCheckMapping(mapping: RaMapping, stepIds: ReadonlySet<string>): RaEntry[];
```

## Rules

1. `entries` MAY be empty (mapping file can exist before the mapping pass fills it).
2. `raId` values are unique within the mapping — the same achievement cannot map
   to two steps. Duplicate → error containing the raId.
3. Two different `raId`s MAY map to the same `stepId` (several achievements can
   pop on one step) — this is valid.
4. Every `stepId` is a valid EntityId whose first segment equals `guideSlug`.
5. Unknown extra keys ignored; never throws; multiple errors collected.
6. `crossCheckMapping` does structural trust: assume `mapping` already validated.
   It returns entries whose `stepId` is not in `stepIds`, preserving entry order.

## Examples

Valid mapping:

```json
{ "schemaVersion": 1, "guideSlug": "pokemon-crystal", "gameId": 1474,
  "entries": [
    { "raId": "9001", "stepId": "pokemon-crystal:new-bark:s01" },
    { "raId": "9002", "stepId": "pokemon-crystal:new-bark:s01" }
  ] }
```

| Validation case | Result |
|-----------------|--------|
| Valid mapping above | `ok: true` (two raIds on one step is legal) |
| `entries: []` | `ok: true` |
| Two entries with `raId: "9001"` | `ok: false`, error contains `9001` |
| `raId: "9001a"` | `ok: false` |
| `gameId: 0` | `ok: false` |
| `gameId: 14.74` | `ok: false` |
| `stepId` with slug `other-game` | `ok: false` |
| Extra key on an entry | `ok: true`, dropped |
| Input `undefined` | `ok: false`, no throw |

| `crossCheckMapping` case | Result |
|--------------------------|--------|
| both stepIds present in the set | `[]` |
| set contains only `…:s01` but an entry points to `…:s99` | `[that entry]` |
| empty set | all entries, in input order |
