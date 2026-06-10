# Requirement: Genre Deck Validation

Implementation: `src/schema/deck.ts` (TypeScript).
PRD refs: §6.4 (genre deck = config, not code), FR-A2.
Segment format as defined in `p0-01`.

A **deck** is the ordered arrangement of a guide's widgets, with display labels.

## Exports

```typescript
export type Deck = {
  schemaVersion: number;       // integer >= 1
  guideSlug: string;           // segment
  layout: DeckEntry[];
};
export type DeckEntry = {
  widgetId: string;            // EntityId
  label: string;               // non-empty display label
  pinned: boolean;             // pinned widgets surface on the current-step view
};

export type DeckResult =
  | { ok: true; deck: Deck }
  | { ok: false; errors: string[] };

export function validateDeck(data: unknown): DeckResult;

/** Cross-check a structurally valid deck against the guide's actual widget ids. */
export function checkDeckRefs(deck: Deck, widgetIds: string[]): string[];
// returns the widgetIds referenced by the deck that do NOT exist (empty array = ok)
```

## Rules

1. Structure: `schemaVersion` integer ≥ 1, `guideSlug` a valid segment, `layout`
   an array (MAY be empty — a guide can start with no widgets).
2. Every `widgetId` is a valid EntityId whose first segment equals `guideSlug`.
3. No duplicate `widgetId` within `layout`.
4. `label` non-empty; `pinned` strictly boolean (not truthy/falsy coercion).
5. Unknown extra keys ignored (never errors), absent from the returned deck.
6. `validateDeck` never throws; collects multiple errors.
7. `checkDeckRefs` preserves deck order in its result and returns each missing id once.

## Examples

Valid deck:

```json
{ "schemaVersion": 1, "guideSlug": "pokemon-crystal",
  "layout": [
    { "widgetId": "pokemon-crystal:violet-city:catch-list", "label": "Catches", "pinned": true },
    { "widgetId": "pokemon-crystal:all:badge-matrix", "label": "Badges", "pinned": false }
  ] }
```

| Case | Result |
|------|--------|
| Valid deck above | `ok: true` |
| `layout: []` | `ok: true` |
| Duplicate `widgetId` entries | `ok: false`, error contains the id |
| `widgetId: "other-game:ch01:w1"` under `guideSlug: "pokemon-crystal"` | `ok: false` |
| `pinned: "yes"` | `ok: false` |
| `label: ""` | `ok: false` |
| Extra key `"theme": "dark"` | `ok: true`, key dropped |
| Input `[]` (array at top level) | `ok: false`, no throw |

| `checkDeckRefs(deck, widgetIds)` | Result |
|----------------------------------|--------|
| deck above, ids = both listed widgets | `[]` |
| deck above, ids = only `catch-list` | `["pokemon-crystal:all:badge-matrix"]` |
| deck above, ids = `[]` | both ids, in layout order |
