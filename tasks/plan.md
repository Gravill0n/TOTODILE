# Desktop widget rails + single-widget modals

Status: **approved** (Pierre, 2026-07-02). Task checklist: [todo.md](todo.md).

## Context

On desktop, the two side widget panels are fixed `w-64` (16rem) columns that render every visible widget in full via `WidgetDeck` — too narrow for tables, maps, and matrices, so everything looks cramped. Pierre wants the side columns replaced by **simple buttons that open modals** where each widget renders full-size. Per his direction: **one side lists global-scoped widgets, the other lists chapter/location/visit-scoped widgets** currently in scope. Phone posture (bottom `WidgetsSheet`) is untouched.

No schema change: the current left/right even/odd split is pure presentation invented in `GuideScreen.tsx:109-110`; the new scope-based split is equally presentational. Deck order (§6.4) stays the ordering contract within each rail.

## Design

- **Left rail = global widgets** (stable set), **right rail = contextual** (chapter/location/visit in scope). Asides slim from `w-64` to `w-40`; `main` is `flex-1 min-w-0` so it absorbs the freed ~12rem automatically (`max-w-6xl` unchanged).
- **`WidgetRail`** (new, `app/src/shell/WidgetRail.tsx`): vertical stack of full-width shadcn `Button`s (`variant="outline" size="sm"`, lucide type icon + truncated title). Props `{ widgets, emptyLabel, header?, onOpen(widgetId) }`. Empty state: muted placeholder ("No global widgets" / "Nothing in scope").
- **`WidgetDialog`** (new, `app/src/shell/WidgetDialog.tsx`): controlled shadcn `Dialog`, `DialogContent` `sm:max-w-4xl` (the `ZoomableImage.tsx:55` wide precedent), visible `DialogTitle` = widget title, body `max-h-[75dvh] overflow-y-auto` wrapping `<WidgetRenderer/>`. Reuses `WidgetHandlers` from `WidgetDeck.tsx` and `ProgressSlice`.
- **Open state** in `GuideScreen`: `openWidgetId: string | null`; looked up in `guide.widgets` (not `visibleWidgets`) so an open dialog survives the pointer moving out of scope. Radix gives Escape/overlay close + focus restore.
- **Whole-game toggle** moves to the top of the contextual rail (it only affects that rail — global always shows), upgraded from raw checkbox to `Switch`+`Label` per the `WidgetsSheet.tsx` pattern, keeping `aria-label="Whole game"`.
- **`WidgetDeck` survives unchanged** — still the phone sheet body. Desktop panels stop importing it.
- Aside `aria-label`s become distinct: `"Global widgets"` / `"Widgets in scope"`. Sticky classes kept verbatim. Both rails render whenever `progress.ready && guide.widgets.length > 0` (fixes the right panel vanishing and shifting the main column when its half is empty).

## Tasks

Branch `feat/desktop-widget-rails`; all commands from `app/`.

### Task 1 (S) — `WidgetRail` component + tests
- **Files:** new `app/src/shell/WidgetRail.tsx`, new `app/tests/shell/widgetRail.test.tsx`.
- Icon map `Record<WidgetType, LucideIcon>` (closed 7-enum, TS-exhaustive): checklist `ListChecks`, matrix `Grid3x3`, dataTable `Table`, counter `Tally5`, flowchart `GitBranch`, mapPins `MapPin`, prepCard `ClipboardList`.
- **Accept:** one button per widget with title as accessible name; click calls `onOpen(id)`; empty list renders `emptyLabel`, zero buttons; `header` renders above list.
- **Verify:** `yarn vitest run tests/shell/widgetRail.test.tsx tests/shell/styleGuards.test.ts tests/shell/emojiSweep.test.ts tests/shell/accentRetired.test.ts`
- **Deps:** none. Unwired — app unchanged, suite green.

### Task 2 (S) — `WidgetDialog` component + tests
- **Files:** new `app/src/shell/WidgetDialog.tsx`, new `app/tests/shell/widgetDialog.test.tsx` (fixtures: `app/tests/fixtures/repo/guides/fictional-quest/guide.json`, pattern in `widgetsView.test.tsx`).
- **Accept:** `role="dialog"` with widget title; widget body interactive (checklist toggle fires `onToggle`); Escape/close button call `onClose`; body wrapper has `max-h` + `overflow-y-auto`; content has `sm:max-w-4xl`.
- **Verify:** `yarn vitest run tests/shell/widgetDialog.test.tsx`
- **Deps:** none (parallel with Task 1).

### Checkpoint A — both components green in isolation, full suite still green.

### Task 3 (M) — Wire `GuideScreen`: scope split, rails, dialog, toggle move
- **Files:** `app/src/shell/GuideScreen.tsx`, `app/tests/shell/widgetsView.test.tsx`.
- Replace lines 107-121: split `visibleWidgets` by `scope.kind === "global"`; rebuild toggle as `Switch`+`Label`; `leftPanel`/`rightPanel` become `<WidgetRail/>`s (right carries the toggle as `header`); render `<WidgetDialog/>` beside the other overlays, gated on `openWidget && progress.ready`.
- **Tests:** the two widget-internals tests (counter persist, checklist toggle) must open the dialog via the rail button first; add a new test: click rail button → `role="dialog"` shows title + body. Phone sheet tests unchanged.
- **Accept:** `widgetsView.test.tsx` green incl. new dialog test; sheets/appShell green.
- **Verify:** `yarn vitest run tests/shell/widgetsView.test.tsx tests/shell/appShell.test.tsx tests/shell/sheets.test.tsx`
- **Deps:** Tasks 1, 2.

### Task 4 (S) — Slim asides in `PostureLayout` + distinct labels
- **Files:** `app/src/shell/PostureLayout.tsx`, `app/tests/shell/stickyWidgets.test.tsx`.
- `w-64` → `w-40` on both asides; labels `"Global widgets"` / `"Widgets in scope"`; sticky/scroll classes verbatim; update `stickyWidgets.test.tsx` label lookups.
- **Accept:** `stickyWidgets` + `postureLayout` tests green.
- **Verify:** `yarn vitest run tests/shell/stickyWidgets.test.tsx tests/shell/postureLayout.test.tsx`
- **Deps:** after Task 3 (labels match content).

### Checkpoint B / Task 5 (S) — Full sweep + manual eyeball
- `yarn check` green. `yarn dev`, eyeball at ≥1024px: rails as buttons; dialog opens wide and scrolls on a tall widget; **mapPins widget in dialog** (nested Dialog via ZoomableImage — check stacking); whole-game switch reveals out-of-scope contextual widgets; keyboard flow (Tab→Enter→Escape→focus back on button); phone width still shows bottom sheet. Refresh stale comments (`GuideScreen.tsx:107-108`, `PostureLayout.tsx:16-18`). Open PR from `feat/desktop-widget-rails`.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| MapPins renders `ZoomableImage` (a Dialog) inside `WidgetDialog` — nested Radix dialogs | Med | Radix supports nesting; verify stacking manually in Task 5; worst case a z-index/portal tweak |
| jsdom ignores `lg:` so tests can't prove desktop visibility | Low | Manual eyeball in Task 5; tests cover behavior, not breakpoints |
| Duplicate title text while dialog open (rail button + DialogTitle) | Low | Tests use `within(getByRole("dialog"))` |
| Grep style guards (no hex, no `dark:`, no emoji, token parity) on new files | Low | Use existing tokens (`text-ink-soft`, `border-line`, `bg-card`) |
| `w-40` rail width is a taste guess | Low | One-line tweak; growing `max-w-6xl` deferred to Pierre |

## Reuse inventory

`Button`, `Dialog*`, `Switch`, `Label` from `app/src/components/ui/`; `WidgetRenderer` (`app/src/primitives/WidgetRenderer.tsx`); `WidgetHandlers` (`app/src/shell/WidgetDeck.tsx`); `ProgressSlice` (`app/src/progress/progressSlice.ts`); `widgetScope.ts` unchanged; wide-modal classes from `ZoomableImage.tsx:55`; lucide-react (existing dep). **No new dependencies, no schema changes.**
