# Requirement: Stable Entity ID (parse / format / validate)

Implementation: `src/schema/entityId.ts` (TypeScript).
PRD refs: §6.8 (stable IDs), §20.3 (ID format).

An **EntityId** identifies a step, widget, chapter-scoped item, or checklist row.
It is a string of exactly three colon-separated segments:

```
<guideSlug>:<chapterId>:<localId>
```

## Exports

```typescript
export type EntityIdParts = { guideSlug: string; chapterId: string; localId: string };

export function isValidSegment(s: string): boolean;
export function parseEntityId(id: string): EntityIdParts | null;
export function formatEntityId(parts: EntityIdParts): string;   // throws Error on invalid parts
export function isEntityId(id: string): boolean;
```

## Rules

1. A **segment** matches `^[a-z0-9]+(-[a-z0-9]+)*$` — lowercase letters and digits,
   groups separated by single hyphens. No uppercase, spaces, underscores, leading/trailing
   hyphens, double hyphens, or empty segments.
2. An EntityId is exactly 3 segments joined by `:`. Two or four segments are invalid.
3. `parseEntityId` returns the three parts on success, `null` on any invalid input
   (wrong segment count, invalid segment, empty string, non-conforming characters).
4. `formatEntityId` joins valid parts with `:`; if ANY part fails `isValidSegment`,
   it throws an `Error` whose message names the offending part.
5. `isEntityId(id)` is `true` exactly when `parseEntityId(id) !== null`.
6. Round-trip: for every valid id, `formatEntityId(parseEntityId(id)!) === id`.

## Examples

| Input to `parseEntityId` | Output |
|--------------------------|--------|
| `"pokemon-crystal:violet-city:s01"` | `{ guideSlug: "pokemon-crystal", chapterId: "violet-city", localId: "s01" }` |
| `"ml-partners-in-time:ch01:intro"` | parts as expected |
| `"a:b:c"` | `{ guideSlug: "a", chapterId: "b", localId: "c" }` |
| `"pokemon-crystal:violet-city"` | `null` (2 segments) |
| `"a:b:c:d"` | `null` (4 segments) |
| `"Pokemon-Crystal:ch01:s01"` | `null` (uppercase) |
| `"pokemon_crystal:ch01:s01"` | `null` (underscore) |
| `"pokemon-crystal:ch-01-:s01"` | `null` (trailing hyphen in segment) |
| `"pokemon--crystal:ch01:s01"` | `null` (double hyphen) |
| `"pokemon-crystal::s01"` | `null` (empty segment) |
| `""` | `null` |
| `"pokemon-crystal:ch 01:s01"` | `null` (space) |

| Input to `isValidSegment` | Output |
|---------------------------|--------|
| `"violet-city"` | `true` |
| `"s01"` | `true` |
| `"9"` | `true` |
| `"-abc"` | `false` |
| `"abc-"` | `false` |
| `"a--b"` | `false` |
| `""` | `false` |
| `"Abc"` | `false` |

| Input to `formatEntityId` | Output |
|---------------------------|--------|
| `{ guideSlug: "pokemon-crystal", chapterId: "ch01", localId: "s01" }` | `"pokemon-crystal:ch01:s01"` |
| `{ guideSlug: "Bad", chapterId: "ch01", localId: "s01" }` | throws `Error` mentioning `guideSlug` |
| `{ guideSlug: "ok", chapterId: "", localId: "s01" }` | throws `Error` mentioning `chapterId` |
