# Implementation Plan: TOTODILE design v2 — Library (S1) + Guide (S2) redesign

## Context

The Claude Design project **Totodile Page Design** (`c7426467-…`) holds approved prototypes and
a handoff `README.md` for redesigning the two player-facing screens; the sibling **TOTODILE
Design System** project (`cacbcd0d-…`) holds the token contract they are built on. The problems
being solved:

- **Library** is a 3-column cover-card grid whose covers don't exist (no entry in `library.json`
  has a `cover`), with no search/filter/sort, no progress bar, no achievement count, and the 8
  `planned` backlog entries interleaved with the 3 playable guides.
- **Guide** renders the *entire* spine in one scroll — 587 steps / 133 visits for `zelda-oot` —
  with no per-chapter progress, no map, no URL for where you are, and widgets buried behind two
  160px launcher rails that open a dialog. The design note is blunt: *"widgets are not easily
  accessible"*.

The redesign makes the Library an index (wide row per guide + separate backlog) and makes the
Guide **visit-scoped and URL-addressable** — the place is the page — with a chapter-progress
rail on the left and an always-visible map + widget stack on the right.

Out of scope (handoff §4): editor mode, review lens, Cleanup content, Settings, the compiler
pipeline, the seven widget primitives, RA sync semantics, dark-mode policy.

**The prototypes show what it will look like, not how to build it.** Implement in React 19 +
Tailwind 4 with owned shadcn components — adding the primitives that are missing rather than
hand-rolling their markup.

## Decisions (approved 2026-07-28)

| Decision | Choice |
| --- | --- |
| Tokens | **Port the design-system token contract** (`cacbcd0d-…/tokens/*.css`) into `app/src/index.css`; components style only through tokens |
| Missing primitives | **Add them** — `accordion`, `breadcrumb`, `progress`, `toggle-group` (+`toggle`) via shadcn CLI into `components/ui/` |
| Navigation | **Chapter + visit live in the URL**; a TanStack Router **layout route** carries the shared chrome and `<Outlet/>` renders the visit |
| Per-guide UI state (`widgetOrder`, `pinnedWidgetIds`, `mapZoom` + `mapPanX`/`mapPanY`) | **Sibling IDB store** `guideUi` in the `totodile` DB (v1→v2); `progressExport` stays pure save data |
| Library achievement counts | **Load `ra-mapping.json` in the loader**, gated on `entry.raGameId`; reuse `mastery()` |
| Widget reordering | **`@dnd-kit/core` + `@dnd-kit/sortable`** (2 new deps, approved), with move up/down buttons as the accessible path |
| Delivery | **One PR** off `feat/totodile-design-v2` (branch exists, currently == `main`) |

## Architecture notes

**URL shape** (ids are `<slug>:<local>`; the route carries the local part, as `placeRoute`
already does):

```
#/guide/zelda-oot                                            → redirects to the pointer's visit
#/guide/zelda-oot/chapter/c4/visit/v-kakariko-village-5      → the visit page
#/guide/zelda-oot/place/kakariko-village                     → place screen (unchanged content)
#/guide/zelda-oot/cleanup                                    → cleanup (unchanged content)
```

**Route tree** — `guideRoute` becomes the layout: one loader (entry + guide + ra-mapping), one
`beforeLoad` playability guard replacing the three copies that exist today, one component
holding header + chapter rail + map/widget column, with `<Outlet/>` in the middle column.

```
rootRoute
└── guideRoute            /guide/$slug          layout: GuideShell (chrome + <Outlet/>)
    ├── guideIndexRoute   /                     loader redirect → pointer's visit
    ├── visitRoute        /chapter/$chapterId/visit/$visitId   → VisitScreen
    ├── placeRoute        /place/$loc
    └── cleanupRoute      /cleanup
```

**Constraints that bite this work** (enforced by `app/src/testing/guards/`): no literal hex in
`.tsx` (including `components/ui/`); no `dark:` variants outside `components/ui/`; no
`bg|text|border|ring-accent` utilities — the achievement orange is reached through
`primary`/`ring`; no emoji, lucide only (`← · × ×n` are allowed); features never import each
other, so shared helpers go in `lib/`; relative content URLs only; every `--color-*` added to
`@theme` **must** have a dark counterpart or `themeTokens.test.ts` reds.

**Purity contract (§22.1)** stays: route components do the param/navigate plumbing; the
presentational components below take data + callbacks and remain bare-renderable in tests.

**Source-text-sensitive tests.** `libraryReskin.test.tsx` greps `GuideCard.tsx` for shadcn
imports; `appShell.test.tsx` pins `<h2>` card titles, one `en` badge, the exact text nodes `25%`
and `Chapter 1 — The Castle Gate`; `backlog.test.tsx` pins a planned title with **no** `<a>`
ancestor and an `[class*="opacity-"]` ancestor. Each task says which to preserve and which are
rewritten on purpose.

**jsdom has no IntersectionObserver** — `useInView` must report "in view" when the API is
absent, so no global stub is needed.

---

## Phase 0 — Foundations

### Task 0.1: Task files
Copy this plan to `tasks/plan.md`; derive `tasks/todo.md` as an ordered checkbox list.
**Verification:** `git status` shows only those two files. **Scope:** XS.

### Task 0.2: Port the design-system tokens
Bring `app/src/index.css` up to the DS contract. Additions, all with dark values from
`tokens/colors.css`: `--color-missable-bg`, `--color-missable-ink`, `--color-warn`,
`--color-warn-bg`, `--color-warn-ink`, `--color-ok`, `--color-ok-bg`. Plus, outside the colour
parity block: `--font-sans` / `--font-mono` in `@theme` (the platform stacks — still no
webfont), `--tracking-label` (0.06em, the `NOW` / `BACKLOG` eyebrows), the `--radius-xs` (2px)
rung, the ink-tinted `--shadow-xs/-sm/-lg` scale, `--ease` + `--duration-fast/-/-slow`, and the
composed `--focus-ring` / `--focus-ring-destructive` in the alias layer.
**Deliberately not ported:** `--font-serif` and `[data-theme]` scopes (DS artifacts only — the
product follows the OS), and `--color-mark` (the icon teal is not a product colour; if it is
ever needed it goes in `:root`, never `@theme`, so the parity guard stays satisfiable).
Spacing/measure tokens are informational — Tailwind's `max-w-4xl`/`max-w-6xl`/`min-h-11` already
land on 56rem/72rem/44px; don't duplicate them.
**Acceptance:**
- [ ] `themeTokens.test.ts` passes — every new `--color-*` has a dark value.
- [ ] `tokenAliasLayer.test.ts` passes — no `.dark`, no `@custom-variant dark`, aliases intact.
- [ ] `bg-missable-bg`, `text-warn-ink`, `font-mono`, `tracking-label`, `shadow-sm` all resolve
      as utilities in a scratch component.
**Verification:** `yarn test guards`; `yarn dev` and eyeball a card + a missable row in light
**and** dark (OS toggle).
**Files:** `app/src/index.css`, `app/src/testing/guards/themeTokens.test.ts` (extend the
expected set). **Scope:** S.

### Task 0.3: Add the missing shadcn primitives
`npx shadcn@latest add accordion breadcrumb progress toggle-group` (pulls `toggle`), respecting
`components.json` (new-york, cssVariables, lucide). Then paper-fit them: semantic token classes
only, no hex, no `dark:` beyond what upstream ships in `components/ui/`.
Use sites: `accordion` → chapter rail; `breadcrumb` → the visit breadcrumb; `progress` → library
rows, chapter rail, guide header; `toggle-group` → the status and sort segmented controls.
**Acceptance:**
- [ ] `coreSet.test.tsx` extended: each new primitive renders and exposes its `data-slot`.
- [ ] No literal hex survives in any added file (`styleGuards.test.ts` covers `components/ui/`).
- [ ] Active `ToggleGroupItem` reads `bg-secondary` + `border-ink`-equivalent, **not** the accent
      (handoff is explicit that the active segment is not accent-coloured).
**Verification:** `yarn test coreSet guards`; `yarn typecheck`.
**Files:** 5 new `components/ui/*.tsx`, `coreSet.test.tsx`. **Scope:** M.

### Task 0.4: `guideUi` store (IDB v2)
Extract the DB open into `features/progress/db.ts` at **version 2**, creating `progress`
(existing) and the new `guideUi` store. Add `schema/guideUi.ts` — `{ guideId, widgetOrder:
string[], pinnedWidgetIds: string[], mapZoom: number }`, all defaulted — plus
`guideUiStore.ts` (`readGuideUi`/`writeGuideUi`) and a `useGuideUi(guideId)` hook that defaults
immediately and hydrates async.
**Acceptance:**
- [ ] A seeded v1 database upgrades to v2 with every progress row intact.
- [ ] `guideUiRecord.parse({ guideId })` fills all three fields.
- [ ] `progressSlot` / `progressExport` untouched — export/import roundtrip unchanged.
**Verification:** `yarn test guideUi progressStore exportImport` (migration test seeds v1 through
`fake-indexeddb` first). **Scope:** M.

### Task 0.5: Spine selectors + id helpers
`features/spine/chapterProgress.ts`: `chapterProgress(guide, doneIds)` → per chapter
`{ chapterId, title, done, total, visits: [{ visitId, locationId, locationName, steps }] }`;
`visitIndex(guide)` → flat ordered visits with `prev`/`next`; `visitOfStep(guide, stepId)`.
In `lib/guide.ts` add `localId(id)` / `qualifyId(slug, local)` and replace the inline
`${params.slug}:${params.loc}` in `placeRoute`. Reuse `chapterOf`/`visitOf`/`guideStepIds` —
do not re-flatten by hand.
**Acceptance:**
- [ ] Backtracking handled: one location across several visits yields several entries with their
      own counts (CLAUDE.md compiler note).
- [ ] `localId("zelda-oot:v-kakariko-village-5")` → `"v-kakariko-village-5"`; round-trips.
**Verification:** `yarn test chapterProgress guide` against the `fictional-quest` fixture plus a
synthetic two-visits-one-location guide. **Scope:** S.

### Task 0.6: Share `mastery()`
Move `mastery(raMapping, doneIds)` from `app/src/app/routes/cleanupTasks.ts` to
`app/src/lib/mastery.ts` (import boundaries forbid reaching into `app/**`), add `doneIdsOf(slot)`
beside it, update `CleanupScreen`.
**Verification:** `yarn test cleanup mastery` green, cleanup behaviour unchanged. **Scope:** S.

### Task 0.7: Add dnd-kit
`yarn add @dnd-kit/core @dnd-kit/sortable`.
**Verification:** `yarn install --immutable` clean, `yarn build` green, lockfile committed. **Scope:** XS.

### Checkpoint A — foundations
- [ ] `yarn check` green from `app/`
- [ ] Tokens visibly correct in light **and** dark; no UI restructured yet
- [ ] Pierre sanity-checks the `guideUi` shape before anything writes to it

---

## Phase 1 — URL-addressable visits (highest-risk slice, done early)

### Task 1.1: Guide layout route
Convert `guideRoute` into a layout: `beforeLoad` does the entry lookup + playability redirect
once; `loader` returns `{ entry, guide, raMapping }` (ra-mapping gated on `raGameId`); the
component renders the chrome and `<Outlet/>`. Move `placeRoute` and `cleanupRoute` under it and
delete their duplicated guards. Add `visitRoute`
(`chapter/$chapterId/visit/$visitId`) and `guideIndexRoute` whose loader reads the progress slot
and **redirects** to the pointer's visit (first visit when `currentStepId` is null).
**Acceptance:**
- [ ] `#/guide/zelda-oot` lands on the pointer's visit with the URL rewritten.
- [ ] A deep link to a chapter/visit pair loads directly; unknown ids → `notFound()`.
- [ ] Guide, ra-mapping and playability are fetched **once** per guide, not per child route.
- [ ] Cleanup and place screens still work and still bounce non-playable guides to review.
**Verification:** new `guideRouting.test.tsx` drives a memory-history router through index
redirect, deep link, and bad params; `yarn test appShell locationScreen cleanup` green.
**Files:** `router.tsx`, `lib/guide.ts`. **Scope:** M.

### Task 1.2: Split `GuideScreen` into shell + visit
`GuideShell.tsx` (route component: header, `PostureLayout`, sheets, sync, `<Outlet/>`) owns the
progress slot and passes it down; `VisitScreen.tsx` renders **one visit** — the steps for
`visitId` — and is pure (data + callbacks, no router). `NowScreen.tsx` retires. Navigation
between visits is `navigate()` to the sibling route, never local state.
**Acceptance:**
- [ ] Exactly one visit's steps are in the DOM at a time.
- [ ] Prev/next visit navigation changes the URL and never moves the pointer.
- [ ] Sync (both triggers), the receipt, chapters and widgets sheets behave exactly as today.
**Verification:** add `src/testing/renderRoute.tsx` (`renderGuideAt(slug, path)`, allowed —
`src/testing/**` is guard-exempt) and migrate `nowScreen`, `nowScreenNext`, `widgetsView`,
`guideSync`, `missableBanner` renders onto it. The pointer/auto-advance cases in
`nowScreen.test.tsx:49-90` must still pass; the `Next up —` assertions in `nowScreenNext` are
rewritten for prev/next navigation on purpose.
**Files:** `GuideShell.tsx`, `VisitScreen.tsx`, delete `NowScreen.tsx`/`GuideScreen.tsx`,
`router.tsx`, testing helper. **Scope:** L — split at the seam (shell first with the old body,
then the visit body) if it grows.

### Task 1.3: Rewire the jumps
Every jump now navigates first, then scrolls: chapter sheet → visit route; "Where am I" →
pointer's visit + `scrollToElement(stepDomId)`; first-open landing likewise (still once, via
`hasLandedRef`); missable "Go" → the missable step's visit.
**Verification:** `yarn test guideRouting postureLayout`; manual — browse to chapter 9 of
`zelda-oot`, tap Where am I, land on the pointer. **Scope:** S.

### Checkpoint B — navigation
- [ ] `yarn check` green
- [ ] Copy a visit URL, reload, land in the same place; browser back/forward walk visits
- [ ] Review with Pierre — this is the structural change everything else sits on

---

## Phase 2 — Library (S1)

### Task 2.1: Loader gains RA mappings
`libraryRoute.loader` `Promise.all`s `entry.raGameId !== undefined ? loadRaMapping(entry.id) :
null` into `raMappings: Map<slug, RaMapping | null>`.
**Acceptance:** no fetch at all for guides without `raGameId`; a missing file yields `null`,
never a thrown loader.
**Verification:** `yarn test appShell`; `yarn dev` → Network shows exactly 2 `ra-mapping.json`
requests. **Scope:** S.

### Task 2.2: Header + toolbar
Header: `TOTODILE` eyebrow (`tracking-label`) + `Library` (24/700) on a 2px rule, a
`3 playable · 8 planned` tally, the Settings link, and the existing editor-mode badge. New
`LibraryToolbar.tsx`: search input over `title + game + platform` (case-insensitive substring),
status `ToggleGroup` All/Playable/Planned, sort `ToggleGroup` Activity/Title/Completion. State
is `useState` in `LibraryScreen` — **nothing persisted**.
**Acceptance:**
- [ ] Sort "Activity" reproduces today's `lastActivityAt` ordering exactly (slot-before-no-slot,
      title tiebreak) so `appShell.test.tsx:113` passes unedited.
- [ ] Empty states: `No playable guides match.` / `Nothing in the backlog matches.`
**Verification:** new `libraryToolbar.test.tsx` (type → row count drops; click Title → heading
order changes); `yarn test library appShell backlog`. **Scope:** M.

### Task 2.3: Guide row replaces the cover card
Rewrite `GuideCard.tsx` in place as the wide index row (keep the filename — the reskin guard
greps it; export `GuideRow`). Grid `184px | 1fr | 232px`, card fill, hairline, 12px radius,
hover lifts the border to `primary`. Left: 16:9 cover with a placeholder block when `cover` is
absent (always, today). Middle: `<h2>` title, `game · platform`, `Progress` bar + big mono %,
`Next up — <chapter>`. Right: hairline-separated `STEPS` / `ACHIEVEMENTS` / `LAST PLAYED`, mono
+ `tabular-nums`, `no RA set` when `raGameId` is absent.
**Acceptance:**
- [ ] Title stays `<h2>`; `en` renders as its own text node exactly once; `25%` is its own text
      node; `Next up —` and the chapter title are **separate elements** so
      `getByText("Chapter 1 — The Castle Gate")` still matches.
- [ ] Still imports `@/components/ui/card` **and** `@/components/ui/badge`; no `*-accent`.
- [ ] Achievements = `mastery(raMappings.get(id), doneIdsOf(slot))` → `11 / 97`.
**Verification:** `yarn test appShell libraryReskin` green **without editing those tests** — if
either needs editing, the markup drifted; fix the markup. **Scope:** M.

### Task 2.4: Backlog section
`planned` entries leave the main list for a `BACKLOG` section under a 2px rule: two-column dense
list, 44px rows, title at `opacity-75` over `game · platform`, dashed `RA set` chip when
`raGameId` exists, not navigable.
**Acceptance:** a planned title has no `<a>` ancestor and keeps an `[class*="opacity-"]`
ancestor (`backlog.test.tsx:75` unedited); the exact text node `planned` survives as the section
label or chip; playable and planned rows never cross under any filter/sort.
**Verification:** `yarn test backlog appShell`. **Scope:** S.

### Checkpoint C — Library done
- [ ] `yarn check` green
- [ ] `yarn dev`: search, both segmented controls, real % + achievements on `pokemon-crystal` /
      `zelda-oot`, `no RA set` on `layton-mm`, 8 backlog rows
- [ ] Compared against `Library.dc.html` + `Library Mobile.dc.html`

---

## Phase 3 — Three-column layout + chapter rail

### Task 3.1: `PostureLayout` grows a real left rail
**Amended 2026-07-29 (Pierre, at checkpoint D), read off `Guide.dc.html` through the
`claude_design` MCP — these are the prototype's own values, not an interpretation:**

```
main    height:100vh; display:flex; flex-direction:column; overflow:hidden;
        background:var(--color-paper)
header  flex-shrink:0; padding:14px 24px; gap:20px;
        border-bottom:1px solid var(--color-line); background:var(--color-card)
grid    flex:1; min-height:0; grid-template-columns:248px minmax(0,1fr) 352px
 left   border-right:1px solid --color-line; overflow-y:auto; padding:16px 12px 24px;
        background:var(--color-card)
 mid    overflow-y:auto; padding:0 32px 48px            (page background — paper)
 right  border-left:1px solid --color-line; display:flex; flex-direction:column;
        min-height:0; background:var(--color-card)
```

Three things this settles:
- **Full bleed, and the window never scrolls.** The shell is exactly one viewport tall and clips;
  the header holds its row and each of the three columns scrolls independently. No `max-w-*`, no
  `sticky` rails — a rail cannot slide away from the visit it describes.
- **Chrome is `card`, content is `paper`** (not `paper-dim`, which the prototype keeps for hover
  surfaces and progress-bar tracks).
- **The header is a bar across all three columns**, so `GuideShell` passes it to `PostureLayout`
  as a `header` prop rather than rendering it inside `children`.

Widths are the prototype's: `lg:grid-cols-[248px_minmax(0,1fr)_352px]`. Keep `lg` as the single
breakpoint — below it, one scrolling column and the unchanged 4-button bar.
**Verification:** `postureLayout.test.tsx`. The rails' scroll contract moved here out of
`stickyWidgets.test.tsx`, which keeps only its sheet cases. **Scope:** S.

### Task 3.2: `ChapterRail`
Built on `Accordion` + `Progress`, fed by `chapterProgress`: per chapter — mono number, title,
percent, bar, `done / total`; expanding reveals its visits (location name + step count). Current
chapter/visit marked with `primary` (number, percent, bar, 2px left edge on the visit). Items are
`Link`s to the visit route, so middle-click and copy-link work.
**Acceptance:** percentages come from the selector; a twice-visited location shows two distinct
entries; the current chapter is expanded on load.
**Verification:** new `chapterRail.test.tsx` — expand, see visits, follow one, URL changes. **Scope:** M.

### Task 3.3: Phone sheet reuses the rail
`ChapterSheet` renders `<ChapterRail>` instead of its flat title list; `onJump(chapterId)`
becomes navigation to a visit route.
**Verification:** `yarn test sheets chapterRail` — sheet still opens from the bottom bar and
closes on Escape / labelled close; `sheets.test.tsx:56` updated to the visit route on purpose. **Scope:** S.

### Checkpoint D — layout
- [ ] `yarn check` green; desktop is three columns, phone unchanged
- [ ] Rail percentages match the header total on `zelda-oot`

---

## Phase 4 — The visit page

**Prototype values (`Guide.dc.html`, read 2026-07-29).** The middle column is the scroll
container, `padding:0 32px 48px`, so everything below is measured inside it:

- **Breadcrumb** — `position:sticky; top:0; z-index:20`, `padding:12px 0`, `background:
  var(--color-paper)` (matching the column, so rows disappear cleanly under it),
  `border-bottom:1px solid --color-line`, 12px `--color-ink-soft`. Reads
  `Chapter 04 — Dodongo's Cavern · Dodongo's Cavern · visit 1 · step N of 14`, with the chapter
  in `--color-ink` at weight 500 and the step count in `--font-mono` + tabular-nums.
- **Right of the breadcrumb**, `margin-left:auto`: `Back to NOW — <beat>` (28px tall, border and
  text both `--color-accent` → our `primary`, `background:var(--color-card)`) shown only when
  scrolled away, then two 28px `←` / `→` buttons on `--color-line` / `--color-ink-soft`.
- **Visit heading** `24px/700, letter-spacing:-.01em`, `margin:20px 0 4px`; meta line under it at
  13px `--color-ink-soft`: `Visit 1 of 3 · 14 steps · 3 achievements · 5 Gold Skulltulas here`.
- **Bottom prev/next** are wider (36px tall, `--shadow-xs`, hover `--color-paper-dim`) and name
  their destination: `← Death Mountain Trail · visit 2` / `Goron City · visit 3 →`.
- **Step row** — `flex; align-items:flex-start; gap:14px`. The current row is the only one with
  any border: `1px solid --color-accent`, `--radius-lg`, `background:--color-card`,
  `--shadow-sm`, `padding:16px`, checkbox 20px, beats 18px/24px, `NOW` eyebrow above (11px,
  .12em, 700, accent). Every other row is `padding:10px 8px`, **no border at all** (the
  shorthand resets the hairline — the rows are separated by rhythm, not rules), checkbox 16px,
  beats 14px/20px. `opacity:.5` done, `.7` skipped; `line-through` done, `italic` skipped.
- **Step icon** — 36×36 on *every* row, `border:1px solid --color-line`, `--radius-sm`,
  `background-color:--color-card`, image at 30px, `image-rendering:pixelated`.
- **Badge row** — achievement is a *filled* accent pill (`--color-paper` text, 10px, trophy
  glyph, label `×N` when >1 else `1`); missable an outlined `--color-missable` pill; skipped a
  dashed `--color-line` pill in ink-soft; `Details` an 11px underlined ink-soft button. Skip and
  mark-through are 26px square icon buttons (`--color-line` hairline, `--radius-sm`, ink-soft)
  pushed right with `margin-left:auto`. Detail prose is 13px/19px ink-soft.
- **Missable card** (above its step, `margin:10px 0 2px`, `padding:12px`) —
  `border:1px solid --color-missable`, `--radius-md`, `background:--color-missable-bg`,
  16px `TriangleAlert`, `MISSABLE AHEAD` eyebrow (11px, .1em, 500, missable), deadline at
  13px/19px in `--color-missable-ink`, and a 28px transparent `Acknowledge` button outlined in
  missable. Shown when the step is missable, not acknowledged, not done, and at or after the
  pointer.

### Task 4.1: Breadcrumb, meta line, prev/next
`VisitScreen` gains the sticky `Breadcrumb` (`Chapter 04 — Dodongo's Cavern · Dodongo's Cavern ·
visit 1 · step 5 of 14`) with prev/next visit buttons, the visit heading + meta line (`Visit 1 of
3 · 14 steps · 3 achievements · N Gold Skulltulas here`), and prev/next repeated at the bottom.
Location links to the place screen survive.
**Acceptance:** prev/next disabled at the ends; breadcrumb counts derive from the selectors.
**Verification:** `yarn test visitScreen guideRouting`. **Scope:** M.

### Task 4.2: `Back to NOW` via IntersectionObserver
New `features/spine/useInView.ts` — observes the current step row, returns one boolean, and
**returns `true` when `IntersectionObserver` is undefined** (jsdom). The breadcrumb shows
`Back to NOW — <first beat>` only when the row is out of view.
**Acceptance:** no duplicate NOW affordance while the row is visible; existing jsdom tests pass
with no global stub. **Verification:** `yarn test useInView`; manual scroll check. **Scope:** S.

### Task 4.3: Step row anatomy
`StepRow`: add the item icon (32–36px, hairline, `[image-rendering:pixelated]`, from
`step.images[0]`) to **non-current** rows too — today images render only on the current card —
keeping the `ZoomableImage` lightbox. Unify the badge row (achievement `Trophy` + `×n`, outline
`missable`, dashed `skipped`, `Details` disclosure); current row gets 1px `border-primary`,
8px radius, card fill, `NOW` eyebrow, larger type. Skip and mark-through become icon buttons on
every row.
**Acceptance:** Details still expands via the Radix `Collapsible` (`playReskin.test.tsx:41`) with
`aria-expanded` tracking; imageless steps render no icon gap; `zoomWiring.test.tsx` still passes
plus a new non-current-row case. **Verification:** `yarn test stepRow playReskin zoomWiring`. **Scope:** M.

### Task 4.4: Inline missable card
New `MissableCard.tsx` above each un-acknowledged missable step **in the displayed visit**:
`border-missable` + `bg-missable-bg` (now a real token), `TriangleAlert`, `MISSABLE AHEAD`
eyebrow, deadline quoted whole, `Acknowledge`. Delete `MissableBanner.tsx` and its sticky mount;
`upcomingMissables` keeps its lookahead logic, filtered to the visit at render time.
**Acceptance:** acknowledge still persists to `slot.acknowledgedMissables` (the assertion at
`missableBanner.test.tsx:34` moves over verbatim); no sticky banner remains.
**Known tradeoff:** missables in *later* visits are no longer surfaced ahead of time — accepted by
the handoff; if it bites during the manual walk, the follow-up is a missable marker in the
chapter rail, not a restored banner. **Verification:** `yarn test missable`. **Scope:** M.

### Checkpoint E — the spine reads right
- [ ] `yarn check` green
- [ ] Manual walk of `zelda-oot` chapter 4: icons on rows, missable card where the player acts

---

## Phase 5 — Right column: map + widgets

**Prototype values (`Guide.dc.html`, read 2026-07-29).** The right column is
`display:flex; flex-direction:column; min-height:0` on `--color-card`, split in two:

- **Map block** — `flex-shrink:0`, `padding:14px 16px 12px`, `border-bottom:1px solid
  --color-line`. Header row: `MAP` eyebrow (11px, `letter-spacing:.12em`, `--color-ink-soft`),
  the location name at 12px, then three 28px square buttons (zoom out · `{{ zoom }}` label in
  `--font-mono` with `min-width:34px` · zoom in · reset) on `--color-paper`. The image sits in a
  **236px-tall** `overflow:auto` box, `border:1px solid --color-line`, `--radius-sm`, background
  `--color-paper`, with `width:{{ zoomWidth }}; max-width:none; image-rendering:pixelated`.
  Credit line under it at 10px: `<location> — <source> · zoom is remembered`.
- **Widget stack** — `flex:1; min-height:0; overflow-y:auto`, `padding:12px 16px 24px`. Section
  header: `WIDGETS` eyebrow + `Drag to reorder` at 10px, over a **2px** `--color-line` rule.
  Each widget card is `padding:10px 12px`, `border:1px solid --color-line`, `--radius-sm`,
  `background:var(--color-card)`.

Note the eyebrows here use `letter-spacing:.12em`, not the `--tracking-label` 0.06em ported in
task 0.2 (which came from the `NOW` / `BACKLOG` labels). Add a second step to the scale rather
than stretching one token over both.

### Task 5.1: `MapPanel`
Top of the right column: the displayed visit's `location.mapImage`, pixelated, hairline,
credited, in its own `overflow-auto` box with zoom out / in / reset (100–400%, 20% steps —
implemented as image width; `react-zoom-pan-pinch` stays the lightbox mechanism). The whole view
persists per guide via `useGuideUi().setMapView` — zoom **and** scroll position, so reopening a
visit returns to the corner of the map you were reading.
**Acceptance:** zoom and pan survive remount and visit change, clamp at 100/400 and 0–1;
renders nothing (no empty frame) when the location has no map; the pan is restored as a fraction
of the scrollable extent, so it lands in the same place on desktop and phone.
**Verification:** new `mapPanel.test.tsx` — zoom twice, scroll, remount, read 140% at the same
corner. **Scope:** M.

### Task 5.2: `WidgetStack` replaces the rails and the dialog
Evolve `WidgetDeck` into `WidgetStack.tsx`: each widget is a card that opens **in place**
(`Collapsible`) with its existing renderer inside, a scope label under the title (`GLOBAL` /
`LOCATION · <name>` / `CHAPTER · NN`), and the `Whole game` toggle keeping its current meaning.
Delete `WidgetRail.tsx` and `WidgetDialog.tsx` (and their tests); `WidgetsSheet` renders the same
stack, and on phone the stack also sits under the steps.
**Acceptance:** all 7 primitives render live (not preview) with handlers firing — the counter
persistence and checklist cases from `widgetsView.test.tsx:84,107` move over intact; scope
filtering and `Whole game` behave exactly as today (`widgetScope.ts` untouched), with one
`Whole game` control per posture.
**Verification:** `yarn test widgets widgetsView`; `widgetRail`/`widgetDialog` tests deleted
deliberately. **Scope:** L — build the stack first, then remove the rail/dialog.

### Task 5.3: Pin + reorder
dnd-kit `DndContext`/`SortableContext` with pointer **and keyboard** sensors, plus `Move up` /
`Move down` buttons on every card. Pinned widgets group at the top with `border-primary`.
`widgetOrder` + `pinnedWidgetIds` persist per guide via `useGuideUi`; widgets absent from the
stored order fall back to `deckPosition`.
**Acceptance:** order and pins survive a reload; a recompiled guide that adds a widget appends it
rather than dropping the saved order; reordering is fully keyboard-operable.
**Verification:** `widgetOrder.test.tsx` drives the buttons (not the drag) and asserts the
persisted record; manual drag check. **Scope:** M.

### Task 5.4: Guide header
`← Library` · title · `Progress` bar + % + `123 / 587` · `Trophy 11 / 97` · `Sync`. Fills the
full-width sticky bar `PostureLayout` grew in Task 3.1 (amended) — the slot exists and already
carries the title, Sync and Cleanup; this task adds the back link and the two figures.
`SyncReceipt` behaviour unchanged (`syncGuide`, 6s auto-dismiss on success, errors persist),
rendered as a desktop bottom-right toast / above the phone bar. The `11 / 97` uses the
ra-mapping already loaded by the layout route (Task 1.1).
**Acceptance:** both sync triggers still work (`guideSync.test.tsx:104,118` unedited); `←` is the
back glyph (no `arrow-left` in the DS set; the emoji guard allows `←`).
**Verification:** `yarn test guideSync syncReceipt`. **Scope:** S.

### Checkpoint F — feature complete
- [ ] `yarn check` green from `app/`
- [ ] Full manual walk of `zelda-oot` and `pokemon-crystal`, desktop **and** phone viewport
- [ ] Compared against all four approved prototypes

---

## Phase 6 — Land it

### Task 6.1: PRD amendment
CLAUDE.md is explicit: *when code and PRD conflict, the PRD wins until Pierre amends it*. The S1
grid, the whole-spine S2 body, the sticky missable banner, the widget rail/dialog and the route
map are all described in `prd-…-FINAL.md` §7/§14/§17. Draft the amended wording for Pierre in the
same PR, and drop the handoff into `docs/ideas/design-v2-handoff.md` as the decision record.
**Acceptance:** no PRD section still describes a screen or URL that no longer exists. **Scope:** S.

### Task 6.2: PR
PR from `feat/totodile-design-v2` to `main` with before/after screenshots of both screens on both
postures; body lists the deleted components (`NowScreen`, `MissableBanner`, `WidgetRail`,
`WidgetDialog`) and the retired tests.
**Verification:** `yarn check` green on the final commit.

---

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Splitting `GuideScreen` forces a router into ~5 existing test files | High — biggest churn in the plan | One shared `renderGuideAt()` helper in `src/testing/`; migrate mechanically in Task 1.2 before any visual work |
| Source-text tests (`libraryReskin`, `appShell`, `backlog`) break on correct markup | High — noisy red suite | Tasks 2.3/2.4 pin the exact text nodes; an edit to those tests is a signal to fix the markup instead |
| IDB v1→v2 upgrade corrupts real progress | High — Pierre's only save data | Migration test seeds a v1 DB; export progress from Settings before first `yarn dev` on this branch |
| New `--color-*` tokens without dark values red the guard | Medium | Task 0.2 ports colours only from the DS dark block; `--color-mark` deliberately excluded |
| Visit-scoping breaks "find that step I remember" | Medium | Chapter rail + visit list + shareable URLs are the replacement; place screens stay |
| Losing lookahead missables outside the current visit | Medium | Flagged in 4.4; follow-up is a rail marker, not a restored banner |
| `WidgetStack` (5.2) is the largest single task | Medium | Pre-split seam noted |
| Shadcn CLI may pull a newer Radix or rewrite `components.json` | Low | Review the CLI diff; `componentsConfig.test.ts` fails loudly if the config drifts |

## Verification (end to end)

1. `cd app && yarn check` — lint + typecheck + Vitest + `validateGuides`. Guide data is untouched,
   so `validate-guides` must never move.
2. `yarn dev`, then walk:
   - **Library**: search `zel`, flip both segments, confirm steps/achievements/last-played on
     `zelda-oot`, `no RA set` on `layton-mm`, 8 non-clickable backlog rows.
   - **Guide** (`zelda-oot`, ≥1280px): `#/guide/zelda-oot` redirects to the pointer's visit; copy
     the URL, reload, same place; back/forward walk visits; rail percentages match the header;
     scroll away → `Back to NOW`; map zoom survives reload; reorder + pin two widgets and reload.
   - **Guide** (≤768px): bottom bar's four actions, chapter sheet accordion, widget stack under
     the steps, missable card inline.
   - **Sync** on `pokemon-crystal` with RA credentials: receipt shows three buckets, auto-dismisses.
   - **Dark**: flip the OS theme on both screens — paper dims, no neutral black, no hex leak.
3. Export progress from Settings before and after the migration; the two JSON files must differ
   only in `lastActivityAt`.
