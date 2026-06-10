# Requirement: Guide Spine Validation

Implementation: `src/schema/spine.ts` (TypeScript).
PRD refs: §6.2 (spine entity), §9.2 (unknown optional fields ignored), §11.1.
Depends on the EntityId format from `p0-01` (segments: `^[a-z0-9]+(-[a-z0-9]+)*$`,
EntityId = 3 segments joined by `:`).

## Exports

```typescript
export type GuideSpine = {
  schemaVersion: number;
  slug: string;            // segment
  title: string;
  language: "en" | "fr";
  chapters: Chapter[];
};
export type Chapter = { id: string; title: string; steps: Step[] };  // id: segment
export type Step = {
  id: string;              // EntityId
  text: string;
  missable?: { warning: string };
  achievements?: string[]; // RA achievement IDs, digit strings
};

export type SpineResult =
  | { ok: true; spine: GuideSpine }
  | { ok: false; errors: string[] };

export function validateSpine(data: unknown): SpineResult;
```

## Rules

1. `schemaVersion` is an integer ≥ 1. `title` and every `chapter.title` / `step.text`
   are non-empty strings. `language` is exactly `"en"` or `"fr"`.
2. `slug` and every `chapter.id` are valid segments.
3. `chapters` is a non-empty array; each chapter has a non-empty `steps` array.
4. Every `step.id` is a valid EntityId whose first segment equals the spine `slug`
   and whose second segment equals its containing `chapter.id`.
5. Step IDs are unique across the whole guide. A duplicate produces an error
   message containing the duplicated id.
6. `missable`, when present, has a non-empty `warning` string. `achievements`, when
   present, is an array of strings matching `^[0-9]+$` (may be empty).
7. **Unknown extra keys at any level are ignored, never errors** (§9.2). They must
   not appear in the returned `spine` object.
8. On failure, `errors` contains one human-readable string per problem; validation
   collects multiple errors rather than stopping at the first. `validateSpine`
   never throws, including for `null`, numbers, arrays, or strings as input.

## Examples

A minimal valid spine:

```json
{
  "schemaVersion": 1,
  "slug": "pokemon-crystal",
  "title": "Pokémon Crystal — 100%",
  "language": "en",
  "chapters": [
    { "id": "new-bark", "title": "New Bark Town", "steps": [
      { "id": "pokemon-crystal:new-bark:s01", "text": "Choose your starter." },
      { "id": "pokemon-crystal:new-bark:s02", "text": "Beat your rival.",
        "missable": { "warning": "Nickname chance happens once." },
        "achievements": ["12345"] }
    ] }
  ]
}
```

| Variation on the valid spine above | Result |
|------------------------------------|--------|
| As-is | `ok: true`, spine returned |
| Extra key `"author": "me"` at top level | `ok: true`, `spine` has no `author` key |
| Extra key `"note": "x"` on a step | `ok: true`, step has no `note` key |
| `language: "de"` | `ok: false`, error mentions `language` |
| `schemaVersion: 1.5` | `ok: false` |
| `schemaVersion: 0` | `ok: false` |
| `chapters: []` | `ok: false` |
| A chapter with `steps: []` | `ok: false` |
| Step id `"pokemon-crystal:other-chapter:s01"` inside chapter `new-bark` | `ok: false`, error mentions the id |
| Step id `"wrong-slug:new-bark:s01"` | `ok: false` |
| Two steps with id `"pokemon-crystal:new-bark:s01"` | `ok: false`, error contains that id |
| `missable: { "warning": "" }` | `ok: false` |
| `achievements: ["12a45"]` | `ok: false` |
| Input `null` | `ok: false`, no throw |
| Input `"hello"` | `ok: false`, no throw |
| Spine with BOTH bad `language` AND duplicate step id | `ok: false`, `errors.length >= 2` |
