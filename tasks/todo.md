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
      `guideUiStore.ts`, `useGuideUi`; v1→v2 migration test. The map view keeps zoom **and**
      pan (`mapPanX`/`mapPanY`, as a fraction of the scrollable extent) so reopening a visit
      returns to the corner you were reading (M)
- [x] **0.5** Spine selectors + id helpers — `chapterProgress`, `visitIndex`, `visitOfStep`,
      `localId`/`qualifyId` (S)
- [x] **0.6** Move `mastery()` to `lib/mastery.ts`, add `doneIdsOf(slot)` (S)
- [x] **0.7** `yarn add @dnd-kit/core @dnd-kit/sortable` (XS)

### ☑ Checkpoint A — foundations
- [x] `yarn check` green (99 files, 613 tests) · `yarn build` clean · no UI restructured
- [x] Token parity guarded in both schemes; every new token verified in the built stylesheet
- [ ] **Pierre**: eyeball the tokens in a browser (light + dark) — not machine-checkable
- [ ] **Pierre**: sanity-check the `guideUi` shape before anything writes to it
      (`app/src/schema/guideUi.ts` — `widgetOrder`, `pinnedWidgetIds`, and the map view
      `mapZoom` + `mapPanX`/`mapPanY`; nothing writes to the store yet)

## Phase 1 — URL-addressable visits (highest risk, done early)

- [x] **1.1** Guide layout route — single guard + loader; `place`/`cleanup` move under it; add
      `visitRoute` (`chapter/$chapterId/visit/$visitId`) and the index redirect. Deviating from
      the plan, the guard sits in the **loader**, not `beforeLoad`: `beforeLoad` re-runs on every
      navigation, so walking visits would refetch `library.json` + `approvals.json` each time,
      while a loader is cached per match. `shouldReload: false` pins that cache so the guide file
      is read once per guide. Child loaders read the layout's data through `parentMatchPromise`
      instead of re-fetching (M)
- [x] **1.2** Split `GuideScreen` → `GuideShell` + `VisitScreen` (pure, one visit); retire
      `NowScreen`; add `src/testing/renderRoute.tsx` and migrate the affected test files.
      Deviating from the plan, `GuideShell` is the **visit route's** component rather than a
      layout with `<Outlet/>`: the chrome it will grow (map panel, breadcrumb, current-chapter
      marking) is *about the displayed visit*, so the shell needs the visit params directly —
      and `place`/`cleanup` are self-contained screens that must not inherit the play chrome.
      It stays mounted across visit changes either way. 6 test files migrated, not 5:
      `skipAndBurst.test.tsx` also rendered the guide bare, and its burst case moved to the
      3-step vault visit so the burst fits on one page (L)
- [x] **1.3** Rewire the jumps — chapters (→ the chapter's first visit), Where am I, missable Go.
      First-open landing **scrolls only**, deviating from the plan: the index route already
      picked the visit, and navigating on landing would yank a deep link away from the visit it
      deliberately named. `chapterDomId` retired with the chapter-anchored scroll (S)

### ☑ Checkpoint B — navigation
- [x] `yarn check` green (99 files, 631 tests) · `yarn build` clean
- [ ] **Pierre**: copy a visit URL, reload, land in the same place; back/forward walk visits
- [ ] **Pierre**: review — everything else sits on this

## Phase 2 — Library (S1)

- [x] **2.1** Library loader gains `raMappings`, gated on `raGameId`; threaded to `GuideCard`,
      which shows `earned / total` (or `no RA set`) — rendering it now rather than passing a
      prop nothing reads for two commits; task 2.3 restyles it into the stats column (S)
- [x] **2.2** Header (eyebrow + 2px rule + tally) and `LibraryToolbar` — search + status/sort
      toggle groups, `useState` only. Filtering/ordering lives in `libraryView.ts` beside the
      screen; the playable/planned split lands here (the two empty states need it) and task 2.4
      gives the backlog group its own chrome (M)
- [x] **2.3** Guide row replaces the cover card in `GuideCard.tsx` (filename kept for the reskin
      guard; exports `GuideRow`) — cover or placeholder, progress bar + mono %, `Next up —`,
      STEPS / ACHIEVEMENTS / LAST PLAYED. `appShell` and `libraryReskin` pass unedited (M)
- [x] **2.4** `BACKLOG` section — dense two-column, 44px rows, `RA set` chip, not navigable. New
      `BacklogRow.tsx`; `GuideRow` loses its planned branch. The exact `planned` text node
      survives as the section's count, not a per-row chip — eight repeats under a `BACKLOG`
      label would be noise. Backlog titles are list rows, not `<h2>`s, so the toolbar test's
      heading assertion moved to a text assertion (S)

- [x] **2.5** Colour corrections against `Library.dc.html` (Pierre, 2026-07-29) — progress
      tracks on `paper-dim` (the shadcn `bg-primary/20` default was a washed-out accent), the
      completion figure in `primary`, the search field on `card`, the active segment carrying an
      ink border, `no RA set` / `Last played` in `ink-soft`, the `RA set` chip a dashed hairline
      pill in `ink-soft`, and no hairlines between the stats rows — the column has one rule, down
      its left edge. Pinned by `library.test.tsx` ("colours the row the way Library.dc.html
      does") (S)
- [x] **2.6** The rest of the `Library.dc.html` deltas — `--tracking-eyebrow` (0.12em) added
      beside `--tracking-label` (0.06em, chip caps) because the prototypes use two steps; mono
      `TOTODILE` eyebrow; `COVER` label in the placeholder; 18/600 row title with `text-pretty`;
      `Next up —` at full ink and `Not started` moved onto that line (the percent shows `—`);
      `BACKLOG <n>` over `Planned — not compiled yet`; a `SORT` label before the sort segments.
      `backlog.test.tsx`'s `planned` assertion became `Planned — not compiled yet` — the
      prototype has no per-row chip, so that exact text node is gone by design (S)

### ☑ Checkpoint C — Library done
- [x] `yarn check` green (101 files, 644 tests) · `yarn build` clean
- [ ] **Pierre**: `yarn dev` — real counts on `pokemon-crystal`/`zelda-oot`, `no RA set` on
      `layton-mm`, 8 backlog rows, both segmented controls
- [ ] **Pierre**: compare against `Library.dc.html` + `Library Mobile.dc.html`

## Phase 3 — Three-column layout + chapter rail

- [x] **3.1** `PostureLayout`, matched to `Guide.dc.html` (read through the `claude_design` MCP,
      2026-07-29): full-bleed `248px | 1fr | 352px`; the desktop shell is one viewport tall and
      clips, so the **window never scrolls** — the header bar holds its row across all three
      columns and each column scrolls on its own. Chrome (header + both rails) is `bg-card`, the
      visit column `bg-paper`; `paper-dim` stays what the prototype uses it for (hover surfaces,
      progress tracks). The phone bar's Chapters button gave up the accessible name `Chapters`
      to the rail (it keeps the title; its label is now `Open chapter list`). The rails' scroll
      contract moved from `stickyWidgets.test.tsx` into `postureLayout.test.tsx` — they are
      columns now, not sticky panels. `tasks/plan.md` §3.1/§4/§5/§5.4 carry the prototype's own
      values for the phases still ahead (S)
- [x] **3.2** `ChapterRail` on `Accordion` + `Progress`, current marked with `primary`. Visits
      are hash **anchors with a plain-click handler**, not router `Link`s: middle-click, copy
      and open-in-new-tab work on the real address while the rail stays router-free and
      bare-renderable (§22.1). "Current" is the **displayed** visit (what the URL names), not
      the pointer — the rail says where you are looking. Global widgets moved into the right
      rail with the contextual ones, since the left rail is now the chapter list (M)
- [x] **3.3** `ChapterSheet` reuses `ChapterRail` on phone. The rail's accordion trigger takes
      `aria-label={chapter.title}` so a chapter is still findable by name (the number is
      decoration; the bar announces completion) — `appShell`'s sheet assertion passes unedited.
      `sheets.test` and the `guideRouting` sheet case now expand a chapter and pick a visit, on
      purpose: a chapter is no longer a destination (S)

### ☑ Checkpoint D — layout
- [x] `yarn check` green (102 files, 650 tests) · `yarn build` clean
- [ ] **Pierre**: `yarn dev` — three columns on desktop, phone unchanged, rail % matches the
      header total on `zelda-oot`

## Phase 4 — The visit page

> Build against the prototype values now recorded in [`plan.md` §Phase 4](./plan.md) — sticky
> breadcrumb on `paper`, `Back to NOW` in `primary`, 24px visit heading, named prev/next at the
> bottom. `Guide.dc.html` is readable through the `claude_design` MCP (project
> `c7426467-52ff-4a2f-8ec1-ed7e4e915447`).

- [ ] **4.1** Breadcrumb + visit meta line + prev/next visit (M)
- [ ] **4.2** `useInView` → `Back to NOW` only when the current row is off-screen; no-ops in
      jsdom (S)
- [ ] **4.3** `StepRow` — item icons on every row, unified badge row, current-row treatment,
      skip/mark-through icon buttons (M)
- [ ] **4.4** `MissableCard` inline at the step; delete `MissableBanner` (M)

### ☑ Checkpoint E — the spine reads right
- [ ] `yarn check` green · manual walk of `zelda-oot` chapter 4

## Phase 5 — Right column: map + widgets

> Build against the prototype values now recorded in [`plan.md` §Phase 5](./plan.md) — the right
> column is a flex column on `card`: a fixed map block (236px viewport, zoom controls, credit
> line) over a scrolling widget stack under a 2px-ruled `WIDGETS` header. Note the `.12em`
> eyebrow tracking, which `--tracking-label` (0.06em) does not cover.

- [ ] **5.1** `MapPanel` — pixelated map, 100–400% in 20% steps, zoom **and pan** persisted per
      guide (M)
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
