# Requirement: Widget Primitive Validation (the 7 primitives)

Implementation: `src/schema/widgets.ts` (TypeScript).
PRD refs: §6.3 (widget instances), FR-A1 (closed set of 7), §9.2 (unknown fields ignored).
EntityId / segment formats as defined in `p0-01`.

## Exports

```typescript
export type WidgetType =
  "checklist" | "matrix" | "dataTable" | "counter" | "flowchart" | "mapPins" | "prepCard";

export type Widget = {
  id: string;                 // EntityId
  type: WidgetType;
  title: string;              // non-empty
  chapterId: string | null;   // segment, or null = standalone (whole-game) widget
  sourceRef?: string;         // segment, reference into the source manifest
} & TypeSpecificFields;       // see per-type rules below

export type WidgetResult =
  | { ok: true; widget: Widget }
  | { ok: false; errors: string[] };

export function validateWidget(data: unknown): WidgetResult;
```

## Common rules

1. `type` must be one of the 7 values above — anything else fails with an error
   message containing the rejected type string. **There is no extension mechanism**
   (the primitive set is closed, PRD §9.1).
2. `id` is a valid EntityId; `title` non-empty; `chapterId` is a valid segment or `null`.
3. Unknown extra keys are ignored, never errors, and do not appear in the returned widget.
4. `validateWidget` never throws; multiple problems produce multiple error strings.
5. All nested item/row/node IDs are valid EntityIds and unique **within the widget**.

## Per-type rules

| Type | Required fields | Constraints |
|------|-----------------|-------------|
| `checklist` | `items: { id, text }[]` | non-empty array; `text` non-empty |
| `matrix` | `rows: { id, label }[]`, `columns: { key, label }[]`, `cells: { rowId, columnKey, value }[]` | rows/columns non-empty; every `cells[].rowId` is an existing row id; every `columnKey` an existing column `key` (segment); no duplicate (rowId, columnKey) pair |
| `dataTable` | `columns: { key, label }[]`, `rows: { id, cells: Record<string, string> }[]` | column `key`s are unique segments; every key in a row's `cells` is a declared column key |
| `counter` | `target: number \| null` | when a number: integer ≥ 1 |
| `flowchart` | `nodes: { id, text, next: string[] }[]` | non-empty; every entry of `next` is the id of a node in this widget |
| `mapPins` | `image: string`, `pins: { id, x, y, label }[]` | `image` non-empty; `x` and `y` are numbers in [0, 1] inclusive |
| `prepCard` | `sections: { title, items: { id, text }[] }[]` | non-empty sections; each section has non-empty `items` |

## Examples

Valid checklist:

```json
{ "id": "pokemon-crystal:violet-city:catch-list", "type": "checklist",
  "title": "Catchable here", "chapterId": "violet-city",
  "items": [ { "id": "pokemon-crystal:violet-city:c-pidgey", "text": "Pidgey" } ] }
```

| Case | Result |
|------|--------|
| Valid checklist above | `ok: true` |
| Same with `chapterId: null` | `ok: true` (standalone widgets are legal, §11.2) |
| Same with extra key `"color": "red"` | `ok: true`, no `color` key in output |
| `type: "timeline"` | `ok: false`, error contains `"timeline"` |
| Checklist with `items: []` | `ok: false` |
| Checklist with two items sharing one id | `ok: false` |
| Matrix cell referencing unknown `rowId` | `ok: false`, error contains that rowId |
| Matrix with duplicate (rowId, columnKey) cell | `ok: false` |
| dataTable row with a cell key not in `columns` | `ok: false` |
| Counter `target: 0` | `ok: false` |
| Counter `target: null` | `ok: true` |
| Counter `target: 2.5` | `ok: false` |
| Flowchart node with `next: ["missing-id"]` | `ok: false` |
| Flowchart node with `next: []` | `ok: true` (terminal node) |
| mapPins pin with `x: 1.2` | `ok: false` |
| mapPins pin with `x: 0` and `y: 1` | `ok: true` (bounds inclusive) |
| prepCard with a section whose `items` is `[]` | `ok: false` |
| Input `null` / `42` / `"str"` | `ok: false`, no throw |
