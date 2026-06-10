# Requirement: Widget Chapter-Context Filtering

Implementation: `src/spine/widgetFilter.ts` (TypeScript).
PRD refs: FR-A5 (widgets auto-filter to current chapter, explicit whole-game
toggle), P4 AC (§3), §11.2 (standalone widgets are legal).

## Exports

```typescript
export type WidgetRef = { id: string; chapterId: string | null };
export type WidgetScope = "chapter" | "game";

export function widgetsForContext(
  widgets: readonly WidgetRef[],   // in deck order
  currentChapterId: string | null, // null = no current chapter (e.g. fresh guide edge)
  scope: WidgetScope
): WidgetRef[];
```

## Rules

1. `scope: "game"` returns **all** widgets, in input order.
2. `scope: "chapter"` returns, in input order:
   - widgets whose `chapterId === currentChapterId`, plus
   - standalone widgets (`chapterId === null`) — they are always relevant (§11.2).
3. `currentChapterId === null` with `scope: "chapter"` returns only standalone widgets.
4. Input array is never mutated; result is a new array (even when it would equal
   the input).
5. No deduplication, no reordering — the deck order is the display order (§6.4).
6. Empty `widgets` → `[]` for any scope.

## Examples

Widgets (in order): `A(ch: "violet-city")`, `B(ch: null)`, `C(ch: "goldenrod")`, `D(ch: "violet-city")`.

| Call | Result |
|------|--------|
| `widgetsForContext([A,B,C,D], "violet-city", "chapter")` | `[A, B, D]` |
| `widgetsForContext([A,B,C,D], "goldenrod", "chapter")` | `[B, C]` |
| `widgetsForContext([A,B,C,D], "azalea", "chapter")` | `[B]` |
| `widgetsForContext([A,B,C,D], null, "chapter")` | `[B]` |
| `widgetsForContext([A,B,C,D], "violet-city", "game")` | `[A, B, C, D]` |
| `widgetsForContext([], "violet-city", "chapter")` | `[]` |
| result of any call | input array unchanged afterwards |
