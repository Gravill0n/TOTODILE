# TODO — Bulletproof-React Restructure + Simplification Pass

Full plan with acceptance criteria, placement map, and risks: [plan.md](plan.md).
Every task ends with `yarn check` green (from `app/`). Move-only commits separate from
edit commits. Three PRs at the marked boundaries — never direct to `main`.

Previous cycle (review-lens stage gating) retired to git history (`a926dec`); its two
open manual checkpoints (Checkpoint C export diff, Crystal review walk) remain tracked
on PR #15.

## Phase 0: Gate — PRD amendment (branch `chore/colocate-tests`, PR-1)

- [x] **T0.1 — Amend PRD §20.1 + CLAUDE.md** (S) — target tree, colocated tests,
      boundary-guard note. Approving PR-1 = Pierre's §20.1 sign-off; no src moves before it.

### Checkpoint 0
- [x] `yarn check` green; baseline recorded: 87 test files / 544 tests

## Phase 1: Test colocation (same PR-1)

- [x] **T1.1 — Scaffold `src/testing/`** (M) — fixtures/repo + helpers moved; new
      `fixtureRepo.ts` centralizes fixture paths; ~34 import sites → `@/testing/*`
- [x] **T1.2 — Colocate schema/components/lib/primitives/scripts tests; guards → `src/testing/guards/`** (M)
      — re-check tree-walking guards (styleGuards, emojiSweep, themeTokens) after colocation
- [x] **T1.3 — Colocate shell/spine/progress/review/sync tests; delete `app/tests/`; tsconfig include** (M)

### Checkpoint 1 — PR-1 boundary
- [x] `yarn check` green; 87 test files / 544 tests, all colocated — PR #16

## Phase 2: Untangle in place (branch `chore/bulletproof-restructure`, PR-2)

- [x] **T2.1 — Pure guide helpers → `lib/guide.ts`** (S) — kills progress→spine
- [x] **T2.2 — `lib/content/`: fetchJson + hoist loadLibrary/loadGuide/loadRaMapping; review loaders rebuilt** (M)
      — kills sync→review; error strings byte-identical; loader tests pass unmodified
- [x] **T2.3 — `ProgressSlice` → `types/progressSlice.ts`** (S) — kills primitives→progress (11 importers)

### Checkpoint 2
- [x] `yarn check` + `yarn build` green; all three tangles gone before any folder moves

## Phase 3: The restructure (move-only + import-fix commits)

- [x] **T3.1 — `primitives/` → `components/primitives/`** (S)
- [x] **T3.2 — `spine/` + shell widget chrome (PostureLayout, WidgetDeck/Dialog/Rail/Sheet, widgetScope) → `features/spine/`** (M)
- [x] **T3.3 — `progress/`, `sync/` → `features/`** (S) — verify RA isolation grep
- [x] **T3.4 — `review/` → `features/review/`** (S)
- [x] **T3.5 — Dissolve `shell/`: router → `app/`, screens + GuideCard + cleanupTasks → `app/routes/`, persistentStorage → `lib/`** (M)
      — main.tsx stays at src root; `yarn build` + `yarn preview` smoke
- [x] **T3.6 — Alias sweep: no cross-folder relative imports** (XS)

### Checkpoint 3
- [x] `yarn check` + `yarn build` green; tree = amended PRD §20.1; test count = baseline (544)

## Phase 4: Boundary enforcement

- [x] **T4.1 — `src/testing/guards/importBoundaries.test.ts`** (M) — 6 rules (feature→feature,
      shared→feature/app, →app except main.tsx, relative escaping scope, schema isolation,
      RA client isolation); mutation demo in PR description
- [x] **T4.2 — Docs/config reconciliation** (XS) — PRD tree vs reality, components.json, coverage exclude if needed

### Checkpoint 4 — PR-2 boundary
- [x] `yarn check` + `yarn build` green; boundaries machine-enforced (550 tests) — PR #17

## Phase 5: Simplifications (branch `chore/simplification-pass`, PR-3)

Rule: no existing-test edits in this phase — additions only.

- [ ] **T5.1 — `lib/idb.ts` lazy-DB factory; adopt in progressStore + reviewStore** (S)
- [ ] **T5.2 — Shared `WidgetProps<W>` for primitives** (S) — types only, zero JSX change
- [ ] **T5.3 — `lib/widgetItems.ts` shared binary-item enumerator for flaggedRows + cleanupTasks** (M)
      — WidgetRenderer switch intentionally untouched (closed-set dispatcher)
- [ ] **T5.4 — Extract pure `slotMutations.ts` from `useGuideProgress`** (M) — hook ≤ ~120 lines

### Checkpoint 5: Complete — PR-3 boundary
- [ ] `yarn check` + `yarn build` green; test count = baseline + new guard/unit tests
- [ ] `yarn preview` full smoke: library → guide → widgets sheet → cleanup → settings export → review lens (editor mode)
- [ ] All three PRs merged; PRD §20.1 matches `find src -maxdepth 2 -type d`
