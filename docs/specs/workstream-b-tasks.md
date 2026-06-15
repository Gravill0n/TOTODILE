# Implementation Tasks: Workstream B — shadcn/ui Migration

_Phase 3 of spec-driven-development. Source: `workstream-b-shadcn-migration.md`._
_Status: DRAFT — awaiting review. **Do not start until Workstream A Phase E is merged.**_

## Overview
Reskin the full post-A app with shadcn/ui. Foundation first, then independent presentational
reskin slices, then verification. Each slice keeps its screen's behavior and existing tests
green. Commands run from `app/`.

## Architecture decisions carried in
- **Alias model:** paper palette = single taste-source; shadcn semantic tokens alias it.
- **Dark = system-only `@media`** — no `.dark`, no toggle, no `next-themes`.
- **React-state-only**; deps limited to the listed shadcn set.
- **Runs after A** — reskins the final v1 screens once.

---

## Phase F — Foundation
**Branch:** `feat/shadcn-foundation` · lands first.

### Task F1: `@` alias, deps, `cn()`
**Description:** Add the `@`→`./src` alias (vite + tsconfig + vitest), install the shadcn deps,
add `cn()`.
**Acceptance:**
- Deps added: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`.
- `@/...` imports resolve in `vite dev`, `tsc`, and `vitest`.
- `src/lib/utils.ts` exports `cn = (…i) => twMerge(clsx(i))`.
**Verification:** `yarn typecheck`; a test that imports a module via `@/…` runs under `yarn test`.
**Dependencies:** None. **Files:** `vite.config.ts`, `tsconfig.json`, `src/lib/utils.ts`, `package.json`. **Scope:** S.

### Task F2: `shadcn init` + components.json
**Description:** Run the shadcn initializer for Tailwind v4 / Vite.
**Acceptance:**
- `components.json` present: new-york style, `cssVariables: true`, icon library `lucide`,
  `css: src/index.css`, aliases pointing at `@/components` & `@/lib/utils`.
**Verification:** `npx shadcn@latest add button` succeeds (proves config); `yarn typecheck`.
**Dependencies:** F1. **Files:** `components.json`, `src/index.css` (scaffold only). **Scope:** S.

### Task F3: Token alias layer + media-query dark
**Description:** Wire shadcn semantic tokens as aliases over the paper palette; import
`tw-animate-css`; replace the generated `.dark` block with the `@media (prefers-color-scheme:
dark)` paper swap.
**Acceptance:**
- `index.css` has the full standard shadcn token set aliased to paper vars (`--background`,
  `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`,
  `--destructive`, `--border`, `--input`, `--ring`, `--radius`) + `@theme inline` mapping.
- No `.dark` class anywhere; dark values come from the existing `@media` paper swap.
- `index.html` theme-color + PWA manifest still mirror `--color-paper`.
**Verification:** dev build renders; manual: a Button shows paper colors in light AND system-dark.
**Dependencies:** F2. **Files:** `src/index.css`. **Scope:** M.

### Task F4: Core component set
**Description:** Add the initial shadcn primitives.
**Acceptance:** `button dialog sheet card checkbox collapsible badge scroll-area switch label
separator tooltip skeleton` added under `src/components/ui/`; Biome-clean; typecheck green.
**Verification:** `yarn lint`, `yarn typecheck`, `yarn test`.
**Dependencies:** F3. **Files:** `src/components/ui/*`. **Scope:** S.

### ✅ Checkpoint F
- [ ] Proof screen (Button + Sheet) renders in paper palette, light + system-dark · `yarn check` green · **review before reskin**.

---

## Phase R — Reskin slices (after F; any order, each green on its own)

### Task R1: App chrome / nav
**Description:** `PostureLayout` bottom nav → `Button` + lucide icons (Menu, Puzzle, MapPin, RefreshCw).
**Acceptance:** nav renders; all four actions fire; disabled/syncing states preserved.
**Verification:** tests green; manual. **Dependencies:** F. **Files:** `shell/PostureLayout.tsx`. **Scope:** S.

### Task R2: Sheets → Radix Sheet
**Description:** `WidgetsSheet` + `ChapterSheet` use shadcn `Sheet` (focus trap, scroll lock, escape).
**Acceptance:** open/close works; whole-game `Switch` works; focus trapped; closes on escape.
**Verification:** Testing Library (focus/escape) + existing tests green. **Dependencies:** F. **Files:** `shell/WidgetsSheet.tsx`, `spine/ChapterSheet.tsx`. **Scope:** M.

### Task R3: Play view
**Description:** `NowScreen`, `StepRow` (keyword beats + `detail` via `Collapsible`), `MissableBanner` (Badge/alert).
**Acceptance:** pointer check/skip unchanged; detail expands without layout shift; missable treatment uses `--color-missable`.
**Verification:** existing pointer/play tests green; component test for expand. **Dependencies:** F. **Files:** `spine/NowScreen.tsx`, `spine/StepRow.tsx`, `spine/MissableBanner.tsx`. **Scope:** M.

### Task R4a: Widget primitives — checkable lists
**Description:** Reskin `Checklist`, `Counter`, `PrepCard` with `Card`/`Checkbox` + `cn`.
**Acceptance:** toggles/counters behave; flagged rows show; tests green.
**Verification:** existing primitive tests green; manual. **Dependencies:** F. **Files:** `primitives/checklist/*`, `primitives/counter/*`, `primitives/prepCard/*`. **Scope:** M.

### Task R4b: Widget primitives — grids
**Description:** Reskin `Matrix`, `DataTable` (ScrollArea for overflow).
**Acceptance:** grids scroll; cells/rows render; checkable cells toggle; tests green.
**Verification:** existing tests green; manual. **Dependencies:** F. **Files:** `primitives/matrix/*`, `primitives/dataTable/*`. **Scope:** M.

### Task R4c: Widget primitives — visual + deck chrome
**Description:** Reskin `MapPins`, `Flowchart`, `FlagMark` (→ lucide), and `WidgetDeck` card chrome.
**Acceptance:** pins/flowchart render; FlagMark is a lucide icon + Badge; deck cards use `Card`.
**Verification:** existing tests green; manual. **Dependencies:** F. **Files:** `primitives/mapPins/*`, `primitives/flowchart/*`, `primitives/FlagMark.tsx`, `shell/WidgetDeck.tsx`. **Scope:** M.

### Task R5: Library + Settings
**Description:** `LibraryScreen`, `GuideCard` (Card/Badge — incl. planned-status treatment), `SettingsScreen` (Input/Label/Switch).
**Acceptance:** cards render incl. completion %/language badges; settings inputs work.
**Verification:** existing tests green; manual. **Dependencies:** F. **Files:** `shell/LibraryScreen.tsx`, `shell/GuideCard.tsx`, `shell/SettingsScreen.tsx`. **Scope:** M.

### Task R6: Review lens
**Description:** Reskin `ReviewScreen` + cards/rows (Tabs/Badge/Button as fits).
**Acceptance:** review flow (verdicts, spot-checks, flagged rows) intact and styled.
**Verification:** existing review tests green; manual. **Dependencies:** F. **Files:** `review/*` (group by ≤5/PR). **Scope:** M.

### Task R7: Sync receipt
**Description:** Reskin `SyncReceipt` (Dialog/Badge; unmapped bucket styling).
**Acceptance:** receipt renders mapped/unmapped buckets; opens/closes.
**Verification:** existing sync tests green; manual. **Dependencies:** F. **Files:** `sync/SyncReceipt.tsx`. **Scope:** S.

### Task R8: Emoji → lucide sweep
**Description:** Replace every remaining emoji affordance with a lucide icon.
**Acceptance:** `grep -Rn` for emoji in `src/` returns nothing (outside guide content/data).
**Verification:** grep guard; tests green. **Dependencies:** R1–R7. **Files:** any with leftover emoji. **Scope:** S.

### ✅ Checkpoint R
- [ ] Every screen reskinned · all interaction tests green · `yarn check` green · review before V.

---

## Phase V — Verify & clean
**Branch:** `feat/shadcn-cleanup`.

### Task V1: Guards + dead-style removal
**Description:** Add a test asserting no literal hex colors and no `dark:` variants in
`src/components`/feature components; remove hand-rolled style utilities now superseded.
**Acceptance:** guard test passes; no dead style code remains.
**Verification:** `yarn test`, `yarn lint`. **Dependencies:** Phase R. **Files:** new guard test + cleanups. **Scope:** S.

### Task V2: PWA preview smoke + dark parity
**Description:** Build + `vite preview`; verify offline/PWA still works and dark mode is correct
across screens.
**Acceptance:** preview build runs; offline caching intact; light/dark visual parity confirmed.
**Verification:** `yarn build` + `yarn preview`; manual offline + dark pass.
**Dependencies:** Phase R. **Files:** none (verification). **Scope:** S.

### ✅ Checkpoint V (Complete)
- [ ] Visual parity light + dark · offline works · `yarn check` green · ready for review.

---

## Risks & mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Incomplete aliased token set | Med | F3 aliases the full standard set; F-checkpoint proof screen catches gaps early |
| `.dark` vs `@media` dark gaps | Med | Dark reuses existing `@media` paper swap; explicit dark pass in V2 |
| Behavior regressions during reskin | Med | Slices presentational; per-slice existing tests must stay green |
| `@` alias resolve (vite/tsc/vitest) | Low | F1 configures all three + a smoke import test |
| Started before A merges | High | Hard gate: B does not begin until A Phase E is merged |
| Bundle weight | Low | Per-component Radix only; lucide tree-shaken; monitor |

## Open Questions
1. ~~Sheet vs custom overlay?~~ Assumed **adopt Radix Sheet** (free a11y). Confirm at R2.
2. Final component set — trim/extend during Phase F (e.g. is `Tabs` actually needed by review?).
3. Bundle budget — assume none, monitor in V2.
4. **Hard dependency:** start only after Workstream A Phase E merges.
