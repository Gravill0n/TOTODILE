# TOTODILE design v2 — task list

Full detail, acceptance criteria and verification steps: [`tasks/plan.md`](./plan.md).
Branch: `feat/totodile-design-v2` · one PR to `main` · `yarn check` green from `app/` at every
checkpoint.

## Phase 0 — Foundations

- [x] **0.1** Task files — this list + `tasks/plan.md` (XS)
- [x] **0.2** Port the design-system tokens into `app/src/index.css` — 7 signal-tint colours with
      dark values, `--font-sans`/`--font-mono`, `--tracking-label`, `--radius-xs`, ink-tinted
      shadows. Not ported: `--font-serif`, `[data-theme]`, `--color-mark`, and — deviating from
      the plan — the motion and focus-ring vars, because Tailwind's `--ease-in-out`,
      `duration-*` and the shadcn `ring-ring/50 ring-[3px]` pattern already carry exactly those
      values; a parallel var would only invite divergence (S)
- [x] **0.3** Add missing shadcn primitives — `accordion`, `breadcrumb`, `progress`,
      `toggle-group` (+`toggle`); paper-fit them; extend `coreSet.test.tsx` (M)
- [x] **0.4** `guideUi` IDB store — `features/progress/db.ts` at v2, `schema/guideUi.ts`,
      `guideUiStore.ts`, `useGuideUi`; v1→v2 migration test (M)
- [x] **0.5** Spine selectors + id helpers — `chapterProgress`, `visitIndex`, `visitOfStep`,
      `localId`/`qualifyId` (S)
- [ ] **0.6** Move `mastery()` to `lib/mastery.ts`, add `doneIdsOf(slot)` (S)
- [ ] **0.7** `yarn add @dnd-kit/core @dnd-kit/sortable` (XS)

### ☑ Checkpoint A — foundations
- [ ] `yarn check` green · tokens correct in light **and** dark · no UI restructured
- [ ] Pierre sanity-checks the `guideUi` shape before anything writes to it

## Phase 1 — URL-addressable visits (highest risk, done early)

- [ ] **1.1** Guide layout route — `beforeLoad` guard + single loader; `place`/`cleanup` move
      under it; add `visitRoute` (`chapter/$chapterId/visit/$visitId`) and the index redirect (M)
- [ ] **1.2** Split `GuideScreen` → `GuideShell` (chrome + `<Outlet/>`) + `VisitScreen` (pure,
      one visit); retire `NowScreen`; add `src/testing/renderRoute.tsx` and migrate the 5
      affected test files (L — split at the seam if it grows)
- [ ] **1.3** Rewire the jumps — chapters, Where am I, first-open landing, missable Go (S)

### ☑ Checkpoint B — navigation
- [ ] `yarn check` green · visit URLs reload in place · back/forward walk visits
- [ ] Review with Pierre — everything else sits on this

## Phase 2 — Library (S1)

- [ ] **2.1** Library loader gains `raMappings`, gated on `raGameId` (S)
- [ ] **2.2** Header (eyebrow + 2px rule + tally) and `LibraryToolbar` — search + status/sort
      toggle groups, `useState` only (M)
- [ ] **2.3** Guide row replaces the cover card in `GuideCard.tsx` — cover, progress bar + mono %,
      `Next up —`, STEPS / ACHIEVEMENTS / LAST PLAYED (M)
- [ ] **2.4** `BACKLOG` section — dense two-column, 44px rows, `RA set` chip, not navigable (S)

### ☑ Checkpoint C — Library done
- [ ] `yarn check` green · real counts on `pokemon-crystal`/`zelda-oot`, `no RA set` on
      `layton-mm`, 8 backlog rows
- [ ] Compared against `Library.dc.html` + `Library Mobile.dc.html`

## Phase 3 — Three-column layout + chapter rail

- [ ] **3.1** `PostureLayout`: `max-w-7xl`, `w-56` chapters rail, `w-80` map/widgets rail (S)
- [ ] **3.2** `ChapterRail` on `Accordion` + `Progress`, visits as `Link`s, current marked with
      `primary` (M)
- [ ] **3.3** `ChapterSheet` reuses `ChapterRail` on phone (S)

### ☑ Checkpoint D — layout
- [ ] `yarn check` green · three columns on desktop, phone unchanged · rail % matches header

## Phase 4 — The visit page

- [ ] **4.1** Breadcrumb + visit meta line + prev/next visit (M)
- [ ] **4.2** `useInView` → `Back to NOW` only when the current row is off-screen; no-ops in
      jsdom (S)
- [ ] **4.3** `StepRow` — item icons on every row, unified badge row, current-row treatment,
      skip/mark-through icon buttons (M)
- [ ] **4.4** `MissableCard` inline at the step; delete `MissableBanner` (M)

### ☑ Checkpoint E — the spine reads right
- [ ] `yarn check` green · manual walk of `zelda-oot` chapter 4

## Phase 5 — Right column: map + widgets

- [ ] **5.1** `MapPanel` — pixelated map, 100–400% in 20% steps, zoom persisted per guide (M)
- [ ] **5.2** `WidgetStack` replaces `WidgetRail` + `WidgetDialog`; opens in place; scope labels;
      shared with the phone sheet (L — stack first, then delete)
- [ ] **5.3** Pin + reorder — dnd-kit with keyboard sensor, move up/down buttons, persisted
      order and pins (M)
- [ ] **5.4** Guide header — `← Library`, progress bar + `123 / 587`, `Trophy 11 / 97`, Sync (S)

### ☑ Checkpoint F — feature complete
- [ ] `yarn check` green · full walk of `zelda-oot` + `pokemon-crystal`, desktop and phone
- [ ] Compared against all four approved prototypes

## Phase 6 — Land it

- [ ] **6.1** PRD amendment for §7/§14/§17 + `docs/ideas/design-v2-handoff.md` (S)
- [ ] **6.2** PR with before/after screenshots; list deleted components and retired tests

## Deleted by the end of this work

`NowScreen.tsx` · `MissableBanner.tsx` · `WidgetRail.tsx` · `WidgetDialog.tsx` — and their tests
(`widgetRail.test.tsx`, `widgetDialog.test.tsx`, `missableBanner.test.tsx` → `missableCard`).
