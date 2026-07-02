# Todo — desktop widget rails + single-widget modals

Plan: [plan.md](plan.md) · Branch: `feat/desktop-widget-rails` · Commands from `app/`

- [x] **Task 1 (S)** — `WidgetRail` (`app/src/shell/WidgetRail.tsx`) + `tests/shell/widgetRail.test.tsx`
  - Verify: `yarn vitest run tests/shell/widgetRail.test.tsx tests/shell/styleGuards.test.ts tests/shell/emojiSweep.test.ts tests/shell/accentRetired.test.ts`
- [x] **Task 2 (S)** — `WidgetDialog` (`app/src/shell/WidgetDialog.tsx`) + `tests/shell/widgetDialog.test.tsx` (parallel with Task 1)
  - Verify: `yarn vitest run tests/shell/widgetDialog.test.tsx`
- [x] **Checkpoint A** — full suite green with both components unwired (80 files / 466 tests)
- [x] **Task 3 (M)** — wire `GuideScreen`: global/contextual scope split, rails as panels, dialog overlay, Switch-based whole-game toggle on the contextual rail; rework `widgetsView.test.tsx` internals tests to open the dialog first + new dialog-open test
  - Verify: `yarn vitest run tests/shell/widgetsView.test.tsx tests/shell/appShell.test.tsx tests/shell/sheets.test.tsx`
- [x] **Task 4 (S)** — `PostureLayout` asides `w-64` → `w-40`, labels "Global widgets" / "Widgets in scope"; update `stickyWidgets.test.tsx`
  - Verify: `yarn vitest run tests/shell/stickyWidgets.test.tsx tests/shell/postureLayout.test.tsx`
- [ ] **Checkpoint B / Task 5 (S)** — `yarn check` green; manual eyeball ≥1024px (rails, wide scrolling dialog, mapPins nested-dialog stacking, whole-game switch, keyboard flow, phone sheet intact); refresh stale comments; open PR
