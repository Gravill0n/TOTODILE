# Requirement: Source Manifest Validation + SourceRef Checks

Implementation: `src/schema/sources.ts` (TypeScript).
PRD refs: §6.6 (source manifest), FR-D3 (every datum references a source),
§0.2 (source-faithful — the core trust rule).
Segment format as defined in `p0-01`.

## Exports

```typescript
export type SourceManifest = {
  schemaVersion: number;          // integer >= 1
  guideSlug: string;              // segment
  sources: SourceEntry[];
};
export type SourceEntry = {
  id: string;                     // segment, unique within the manifest
  title: string;                  // non-empty
  url: string;                    // http:// or https:// URL
  retrievedAt: string;            // calendar date, format YYYY-MM-DD
};

export type SourceManifestResult =
  | { ok: true; manifest: SourceManifest }
  | { ok: false; errors: string[] };

export function validateSourceManifest(data: unknown): SourceManifestResult;

/**
 * FR-D3 enforcement helper: given all sourceRef values used by a guide's data
 * and its manifest, return the refs that do not resolve to a source id.
 * Result is deduplicated, in first-occurrence order.
 */
export function findUnknownSourceRefs(refs: string[], manifest: SourceManifest): string[];
```

## Rules

1. `sources` must be **non-empty** — a guide with no sources cannot exist (§0.2).
2. Source `id`s are unique; duplicate → error containing the id.
3. `url` must start with `http://` or `https://` and be a parseable URL
   (`ftp://…`, `example.com`, empty → invalid).
4. `retrievedAt` matches `^\d{4}-\d{2}-\d{2}$` AND is a real calendar date
   (`2026-02-30` is invalid, `2024-02-29` is valid — leap year).
5. Unknown extra keys ignored; never throws; multiple errors collected.
6. `findUnknownSourceRefs`: refs that equal some `sources[].id` are fine; all
   others are returned once each, in the order first seen. Empty `refs` → `[]`.

## Examples

Valid manifest:

```json
{ "schemaVersion": 1, "guideSlug": "pokemon-crystal",
  "sources": [
    { "id": "gamefaqs-walkthrough", "title": "GameFAQs Walkthrough by X",
      "url": "https://gamefaqs.gamespot.com/...", "retrievedAt": "2026-06-01" },
    { "id": "ra-list", "title": "RA achievement list",
      "url": "https://retroachievements.org/game/1474", "retrievedAt": "2026-06-02" }
  ] }
```

| Validation case | Result |
|-----------------|--------|
| Valid manifest above | `ok: true` |
| `sources: []` | `ok: false` |
| Duplicate source id | `ok: false`, error contains the id |
| `url: "example.com/page"` | `ok: false` |
| `url: "ftp://example.com/x"` | `ok: false` |
| `retrievedAt: "2026-6-1"` | `ok: false` (format) |
| `retrievedAt: "2026-02-30"` | `ok: false` (not a real date) |
| `retrievedAt: "2024-02-29"` | `ok: true` (leap day) |
| Input `"x"` | `ok: false`, no throw |

| `findUnknownSourceRefs(refs, manifest)` | Result |
|------------------------------------------|--------|
| `["gamefaqs-walkthrough", "ra-list"]` | `[]` |
| `["ra-list", "wiki", "wiki", "gamefaqs-walkthrough"]` | `["wiki"]` |
| `["a", "b", "a"]` (manifest above) | `["a", "b"]` |
| `[]` | `[]` |
