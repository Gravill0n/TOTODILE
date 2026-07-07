# TOTODILE — Bulletproof-React Restructure + Simplification Pass

## Context

Pierre wants `app/` reworked to follow [bulletproof-react](https://github.com/alan2207/bulletproof-react) (feature folders, unidirectional deps `shared → features → app`, no cross-feature imports, absolute `@/` imports, enforced boundaries) plus a behavior-preserving code-simplification pass. The app today (~92 files / 8.1k lines, 87 test files mirrored under `app/tests/`) is already feature-*shaped* but has three dependency tangles (`progress→spine`, `sync→review`, `primitives→progress`), mixed relative/alias imports, and duplicated patterns (8× fetch→parse loaders, 2× idb boilerplate, 7× identical primitive prop types, widget-union enumerated by hand in two places, a 272-line progress hook).

**Decisions made by Pierre (2026-07-07):** full bulletproof-react layout (requires PRD §20.1 amendment — the PRD wins until amended, so that lands first as the gate); boundary enforcement via a Vitest guard test (no new dependency); tests colocated in `src/` (moving all 87 from `tests/`).

**Hard constraints:** behavior-preserving; no schema content changes (`src/schema/` path frozen — `app/scripts/` validators import it); no new dependencies; never touch `guides/*/approvals.json`; `yarn check` green at every checkpoint; move-only commits separated from edit commits; work by PR, never direct to main.

After plan approval, first action: copy this plan to `tasks/plan.md` and the task list to `tasks/todo.md` (requested by the /plan invocation), then branch.

## Target tree

```
app/src/
├── main.tsx, index.css          # stay at src root (index.html entry)
├── app/
│   ├── router.tsx               # from shell/router.tsx
│   └── routes/                  # LibraryScreen, GuideCard, GuideScreen, CleanupScreen,
│                                # cleanupTasks.ts, LocationScreen, SettingsScreen
├── features/
│   ├── spine/                   # NowScreen, StepRow, ChapterSheet, MissableBanner, missables,
│   │                            # preferredNext, locationIndex + widget chrome from shell:
│   │                            # PostureLayout, WidgetDeck/Dialog/Rail/Sheet, widgetScope
│   ├── progress/                # progressStore, useGuideProgress, pointer (+ slotMutations)
│   ├── review/                  # all 20 files minus loadRaMapping
│   └── sync/                    # raClient, raCredentials, syncGuide, syncReceipt, SyncReceipt, types
├── components/
│   ├── ui/                      # shadcn — path unchanged (components.json aliases hold)
│   ├── primitives/              # 7 renderer folders + WidgetRenderer + FlagMark (+ widgetProps.ts)
│   └── ZoomableImage.tsx
├── lib/                         # utils.ts (cn), persistentStorage, guide.ts (pure helpers),
│   │                            # idb.ts, widgetItems.ts
│   └── content/                 # fetchJson.ts, library.ts, guide.ts, raMapping.ts
├── types/progressSlice.ts       # kills primitives→progress (type-only)
├── schema/                      # UNTOUCHED — contract, scripts import it
└── testing/                     # helpers.ts, fixtureRepo.ts, fixtures/repo/…, guards/
```

Placement rationale (verified consumers): widget chrome + `widgetScope` are imported only by GuideScreen → `features/spine`; `GuideCard` only by LibraryScreen, `cleanupTasks` only by CleanupScreen → colocate in `app/routes/` (no one-file features); `libraryData` → `lib/content/library.ts`; `persistentStorage` → `lib/` (imported by main.tsx). `guideData.ts` splits: pure helpers (`chapterOf`, `visitOf`, `guideStepIds`, `stepHeadline`, DOM-id/asset helpers) → `lib/guide.ts` so progress and spine both reach them without a feature edge; `loadGuide` → `lib/content/guide.ts`. `loadRaMapping` → `lib/content/raMapping.ts` (sync and router need it; kills `sync→review`). Feature folders stay flat; no new barrels; `schema/index.ts` barrel stays.

## Phases & tasks

Commit discipline for every move task: **commit 1 = `git mv` only; commit 2 = import fixes + `yarn format`** (keeps `git diff -M` reviewable). Phase 0 records the baseline (87 test files, N tests from `yarn test`); every checkpoint re-asserts it.

### Phase 0 — Gate: PRD amendment (PR-1 opens)

- **T0.1 (S)** Amend PRD §20.1 to the target tree (note colocated tests, `src/testing/`, boundary guard enforcement; §20.2/§20.3 unchanged); touch CLAUDE.md repo-layout line. Approving PR-1 **is** Pierre's §20.1 sign-off — no src moves land before it.
  - AC: PRD tree matches target verbatim; CLAUDE.md accurate; Pierre approved.
  - Verify: `yarn check` (sanity); manual read.

### Phase 1 — Test colocation (before src moves, so folders carry tests along)

- **T1.1 (M)** Scaffold `src/testing/`: `git mv tests/fixtures/repo → src/testing/fixtures/repo`, `tests/schema/helpers.ts → src/testing/helpers.ts`; new `fixtureRepo.ts` (central `fixtureRepoRoot` via `import.meta.url` + `readFixtureJson`) replacing ~13 hand-built path hops; update ~34 import sites to `@/testing/*`.
  - AC: no test resolves fixture paths by relative hops except `fixtureRepo.ts`; test count = baseline.
  - Verify: `yarn check`; `grep -rn "fixtures/repo\|schema/helpers" tests/ src/ | grep -v testing` → empty.
- **T1.2 (M)** Colocate schema/components/lib/primitives tests beside subjects (current layout); `tests/scripts/*` → `scripts/`; guard-style tests (styleGuards, emojiSweep, themeTokens, accentRetired, tokenAliasLayer, componentsConfig, skills examples) → `src/testing/guards/`. Re-check tree-walking guards don't newly match colocated `*.test.*` files.
  - AC: vitest default globs discover everything (zero config change); count = baseline.
  - Verify: `yarn check`; `find src scripts tests -name '*.test.*' | wc -l` = 87.
- **T1.3 (M)** Colocate shell/spine/progress/review/sync tests; delete empty `app/tests/`; drop `"tests"` from tsconfig include (same commit). jsdom pragmas untouched.
  - AC: `tests/` gone; count = baseline; every test beside its subject.
  - Verify: `yarn check`.

**Checkpoint 1:** green; **PR-1 boundary** (PRD amendment + test colocation — zero production-code surface).

### Phase 2 — Untangle in place (old layout; includes fetchJson simplification)

- **T2.1 (S)** Extract pure guide helpers verbatim to `src/lib/guide.ts`; update 5 importers incl. `progress/useGuideProgress.ts` (**kills progress→spine**); split guideData tests.
  - AC: no `../spine/guideData` imports outside spine; functions byte-identical.
  - Verify: `yarn check`.
- **T2.2 (M)** `lib/content/`: `fetchJson`/`fetchOptionalJson` (404→null; error strings reproduce today's exactly, per-call-site `what` phrase); hoist `loadLibrary`, `loadGuide`, `loadRaMapping` (keep its two-path fallback; `qaReportExists` stays bare fetch); rebuild remaining review loaders on the helper in place; `sync/syncGuide.ts` → `@/lib/content/raMapping` (**kills sync→review**); delete `shell/libraryData.ts`, `spine/guideData.ts`.
  - AC: `await fetch(` only in `fetchJson.ts`, `qaReportExists`, sync client; loader tests pass **unmodified**.
  - Verify: `yarn check`; `yarn test src/review src/sync src/lib`.
- **T2.3 (S)** `git mv progressSlice.ts → src/types/progressSlice.ts`; update 11 importers to `import type … from "@/types/progressSlice"` (**kills primitives→progress**).
  - AC: `grep -rn "progress/" src/primitives` → empty.
  - Verify: `yarn check`.

**Checkpoint 2:** green + `yarn build`; all three tangles dead before any folder moves. (PR-2 opens here.)

### Phase 3 — The restructure (move-only + import-fix commits)

- **T3.1 (S)** `git mv src/primitives → src/components/primitives` (tests travel); retarget ~4 importers.
- **T3.2 (M)** `git mv src/spine → src/features/spine`; move widget chrome + `widgetScope` (+ 7 tests) from shell into it; within-feature imports relative, cross-folder `@/`; retarget GuideScreen/LocationScreen/router.
  - AC: no `../` import escapes `features/spine/`.
- **T3.3 (S)** `git mv` progress and sync → `features/`; retarget ~5 importers.
  - Verify: `grep -rln "@retroachievements" src | grep -v features/sync` → empty.
- **T3.4 (S)** `git mv src/review → src/features/review`; retarget router/LibraryScreen/SettingsScreen.
- **T3.5 (M)** Dissolve shell: `router.tsx` → `src/app/`; screens + GuideCard + cleanupTasks (+ tests) → `src/app/routes/`; `persistentStorage` → `src/lib/`; update `main.tsx`; delete `src/shell/`.
  - AC: `main.tsx` stays at src root; `yarn build` succeeds; nothing outside main.tsx imports `src/app/**`.
  - Verify: `yarn check`; `yarn build`; `yarn preview` smoke (library → guide → review lens in editor mode).
- **T3.6 (XS)** Alias sweep: convert any remaining cross-top-level-folder `../` import to `@/`.
  - Verify: `yarn check`; grep evidence in commit message.

**Checkpoint 3:** green + build; tree matches amended PRD §20.1; test count = baseline.

### Phase 4 — Boundary enforcement

- **T4.1 (M)** `src/testing/guards/importBoundaries.test.ts` (node env, walk + import-regex, styleGuards precedent). One `it()` per rule, offenders listed file:line; production files only (`*.test.*` and `src/testing/**` exempt). Rules: ① feature→feature ② shared→{features,app} ③ anyone→`src/app/**` except `main.tsx` ④ relative import escaping its top-level scope (forces `@/`) ⑤ schema→anything in src outside schema ⑥ `@retroachievements/api` outside `features/sync`.
  - AC: passes on Phase-3 tree; demonstrated red on an injected feature→feature import (shown in PR, not committed).
  - Verify: `yarn check`; mutation demo.
- **T4.2 (XS)** Reconciliation: PRD tree vs `find src -maxdepth 2 -type d`; components.json aliases; coverage exclude for `src/testing/**` only if the report shows pollution.

**Checkpoint 4:** green + build; boundaries machine-enforced. **PR-2 boundary** (untangle + restructure + guard).

### Phase 5 — Behavior-preserving simplifications (PR-3)

- **T5.1 (S)** `src/lib/idb.ts` `createLazyDb(name, version, upgrade)` → `{db(), close()}`; adopt in progressStore + reviewStore. DB names/versions/keyPaths/upgrade bodies byte-identical; `closeProgressDb`/`closeReviewDb` exports kept.
  - AC: store/exportImport tests pass unmodified; no public signature changes.
- **T5.2 (S)** `components/primitives/widgetProps.ts`: generic `WidgetProps<W>` for the 5 toggle-shaped renderers; MapPins extends with `resolveAsset`; Counter keeps its distinct shape. Types only, zero JSX changes.
- **T5.3 (M)** `src/lib/widgetItems.ts`: `widgetBinaryItems(widget)` — one switch over the 6 binary-item widget types (matrix/dataTable label derivations moved verbatim; counters excluded). `flaggedRows.ts` and `cleanupTasks.ts` source rows/labels from it, keeping their counter cases and composition. **WidgetRenderer's switch is left alone** — closed-set dispatcher, not duplication.
  - AC: `flaggedRows.test.ts` and `cleanupTasks.test.ts` pass **unmodified** (fixture guide pins all 7 widget label derivations).
- **T5.4 (M)** `features/progress/slotMutations.ts`: pure mutators (toggleDone/toggleSkip/markThrough/markManyDone/acknowledgeMissable/movePointer/adjustCounter/resetCounter) extracted verbatim from `useGuideProgress`, shared advance-pointer fragment factored once, timestamp as explicit `at` param. Hook shrinks to load effect + `mutateSlot` write-through + `withStats` (recompute kept — FR-A3 contract) + thin wrappers.
  - AC: pointer/progressStore/exportImport/skipAndBurst/nowScreen/guideSync/cleanup tests pass unmodified; hook ≤ ~120 lines; mutators pure.

**Checkpoint 5 (final):** `yarn check` + `yarn build` + `yarn preview` full smoke (library → guide → widgets sheet → cleanup → settings export → review lens); test count = baseline + new guard/unit tests. **PR-3 boundary.**

## PR strategy

Three PRs at checkpoint boundaries — homogeneous diffs over small ones for solo review:
1. **PR-1** `chore/colocate-tests` — PRD amendment (commit 1 = the §20.1 sign-off gate) + test colocation. No production code.
2. **PR-2** `chore/bulletproof-restructure` — untangle + moves + boundary guard (guard lands with the structure so main is never unenforced). Split at Checkpoint 2 if too big.
3. **PR-3** `chore/simplification-pass` — logic diffs (idb, widgetProps, widgetItems, slotMutations), each verified by unmodified existing tests.

## Risks (top ones)

| Risk | Mitigation |
|------|-----------|
| Vitest silently drops moved tests | No custom include exists (defaults cover src+scripts); baseline count asserted at every checkpoint |
| Biome format churn poisons rename detection | Move-only commits byte-identical; format only in edit commits |
| fetchJson drifts error messages/404 semantics | Strings passed verbatim per call site; loader tests must pass unmodified |
| Tree-walking guard tests (styleGuards etc.) newly match colocated tests | T1.2 re-checks predicates after colocation |
| scripts/ break if schema moves | schema/ frozen in place; `yarn validate-guides` in every checkpoint |
| Entry breaks (`index.html` → `/src/main.tsx`) | main.tsx/index.css stay at src root; `yarn build` at Checkpoints 2–5 |
| Simplifications drift labels/pointer semantics | Phase 5 rule: no existing-test edits allowed, additions only |
| Content contamination | No task touches `guides/**`, `library.json`, `approvals.json`; RA key stays in localStorage |

## Verification (end-to-end)

- Every task: `yarn check` from `app/` (lint + typecheck + tests + validate-guides).
- Checkpoints 2/3/5: `yarn build`; 3/5: `yarn preview` manual smoke on the Crystal guide (library loads, guide opens, widgets sheet, progress persists across reload, cleanup screen, settings export, review lens reachable in editor mode).
- Phase 4: mutation demo — inject a feature→feature import, watch the guard fail, revert.
- Baseline discipline: 87 test files / N tests recorded in Phase 0, re-asserted at every checkpoint.
