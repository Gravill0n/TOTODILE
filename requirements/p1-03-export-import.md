# Requirement: Progress Export / Import

Implementation: `src/progress/exportImport.ts` (TypeScript).
PRD refs: FR-B6/B7 (file backup / device move), §11.1 (import rejection leaves
existing progress untouched), §17.4 (exports must never contain an API key).
`ProgressState` shape as defined in `p1-01`.

## Exports

```typescript
export const EXPORT_FORMAT = "guide-progress";
export const EXPORT_VERSION = 1;

export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;            // passed in, not Date.now()
  progress: ProgressState;
};

export function exportProgress(state: ProgressState, exportedAt: string): string; // JSON text

export type ImportResult =
  | { ok: true; progress: ProgressState }
  | { ok: false; reason: "invalidJson" | "wrongFormat" | "badVersion" | "wrongGuide" | "malformed" };

export function importProgress(raw: string, expectedGuideSlug: string): ImportResult;
```

## Rules — export

1. Output is valid JSON parsing back to the `ExportFile` shape.
2. **Whitelist serialization**: only `guideSlug`, `schemaVersion`, `pointer`,
   `items`, `counters`, `updatedAt` are copied from the state into `progress`.
   Any extra properties present on the input object (e.g. a stray `apiKey` field)
   MUST NOT appear anywhere in the output text (§17.4).
3. Round-trip: `importProgress(exportProgress(s, t), s.guideSlug)` yields
   `ok: true` with `progress` deep-equal to the whitelisted fields of `s`.

## Rules — import

4. Failure detection order (first match wins):
   - unparseable JSON → `"invalidJson"`
   - `format !== "guide-progress"` → `"wrongFormat"`
   - `version !== 1` → `"badVersion"`
   - `progress.guideSlug !== expectedGuideSlug` → `"wrongGuide"`
   - `progress` missing/structurally invalid (items values other than
     `"done"`/`"skipped"`, counters values not numbers ≥ 0, pointer not
     string-or-null) → `"malformed"`
5. `importProgress` NEVER throws, for any string input.
6. Import is pure: it returns the parsed progress; it does not write anywhere.
   (The caller decides to replace state only on `ok: true` — §11.1's "existing
   progress untouched" follows from purity.)

## Examples

`s = { guideSlug: "pokemon-crystal", schemaVersion: 1, pointer: "pokemon-crystal:ch1:s2", items: { "pokemon-crystal:ch1:s1": "done" }, counters: { "pokemon-crystal:ch1:resets": 4 }, updatedAt: "2026-06-10T12:00:00Z" }`

| Case | Result |
|------|--------|
| `importProgress(exportProgress(s, t), "pokemon-crystal")` | `ok: true`, round-trips |
| Export of `{...s, apiKey: "SECRET123"} as any` | output string does NOT contain `"SECRET123"` or `"apiKey"` |
| `importProgress("not json{", …)` | `{ ok: false, reason: "invalidJson" }` |
| Valid JSON `{"format":"other","version":1,…}` | `"wrongFormat"` |
| `{"format":"guide-progress","version":2,…}` | `"badVersion"` |
| Export of `s` imported with expected slug `"ocarina-of-time"` | `"wrongGuide"` |
| `progress.items` containing `{"x":"maybe"}` | `"malformed"` |
| `progress.counters` containing `{"c":-1}` | `"malformed"` |
| `progress.pointer: 42` | `"malformed"` |
| `importProgress("null", …)` | `ok: false` (no throw) |
| `importProgress("", …)` | `"invalidJson"` |
