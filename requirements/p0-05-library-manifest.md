# Requirement: Library Manifest Validation + Activity Ordering

Implementation: `src/schema/library.ts` (TypeScript).
PRD refs: §6.1 (library manifest), FR-A3 (library ordered by last activity).
Segment format as defined in `p0-01`.

## Exports

```typescript
export type LibraryManifest = {
  schemaVersion: number;          // integer >= 1
  guides: LibraryEntry[];
};
export type LibraryEntry = {
  slug: string;                   // segment, unique
  title: string;                  // non-empty
  language: "en" | "fr";
  approved: boolean;              // false = visible only in editor mode (FR-E5)
  path: string;                   // non-empty, relative path to the guide folder
};

export type LibraryResult =
  | { ok: true; manifest: LibraryManifest }
  | { ok: false; errors: string[] };

export function validateLibrary(data: unknown): LibraryResult;

/**
 * Order guides for the library screen: most recently active first.
 * `activity` maps slug -> ISO-8601 timestamp of last progress write, or is
 * missing/null for never-played guides.
 */
export function orderByActivity(
  manifest: LibraryManifest,
  activity: Record<string, string | null>
): LibraryEntry[];
```

## Rules — validation

1. `guides` MAY be empty (a fresh library is valid).
2. Slugs are unique; a duplicate produces an error containing the slug.
3. Unknown extra keys ignored; never throws; multiple errors collected.

## Rules — ordering

4. Guides with an activity timestamp come first, sorted descending by timestamp
   (most recent first).
5. Guides with no activity (missing key or `null` value) come after all active
   ones, sorted alphabetically by `title` (case-insensitive).
6. Equal timestamps: tie-break alphabetically by `title` (case-insensitive).
7. The input manifest is not mutated; the result is a new array.

## Examples

Manifest guides (abbreviated to slug/title):
`a = (pokemon-crystal, "Crystal")`, `b = (ml-partners-in-time, "Partners in Time")`,
`c = (ocarina-of-time, "Ocarina")`.

| `activity` | `orderByActivity` result |
|------------|--------------------------|
| `{ "pokemon-crystal": "2026-06-09T10:00:00Z", "ml-partners-in-time": "2026-06-10T08:00:00Z" }` | `[b, a, c]` |
| `{}` | `[a, b, c]` → alphabetical by title: Crystal, Ocarina, Partners… = `[a, c, b]` |
| `{ "ocarina-of-time": null }` | all inactive → alphabetical by title `[a, c, b]` |
| same timestamp for `a` and `b` | active pair sorted by title (`a` "Crystal" before `b` "Partners in Time"), then `c` |

| Validation case | Result |
|-----------------|--------|
| `{ "schemaVersion": 1, "guides": [] }` | `ok: true` |
| Two entries with slug `pokemon-crystal` | `ok: false`, error contains `pokemon-crystal` |
| `language: "es"` | `ok: false` |
| `approved: 1` | `ok: false` (strict boolean) |
| Extra key `"cover": "x.png"` on an entry | `ok: true`, key dropped |
| Input `null` | `ok: false`, no throw |
