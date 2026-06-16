# Implementation Tasks: Workstream A — Location/Visit Reframe

_Phase 3 of spec-driven-development. Source: `workstream-a-location-visit-reframe.md`._
_Status: APPROVED 2026-06-16 — Phase A in implementation on `feat/workstream-a`._

## Overview
Break the approved 5-phase plan into S/M tasks. Each leaves the repo in a working state
(`yarn check` green) except where a task is explicitly mid-PR scaffolding. Commands run
from `app/`.

## Architecture decisions carried in
- **No installed base** → no migration; schema v0 dropped, guides recompiled fresh.
- **ID grammar unchanged** (3-segment); steps mint under their visit.
- **Fixture-first**: a small v1 Crystal fixture lands in Phase A so the gate stays green
  and B/C/D are testable before the full Phase E recompile.

## Refinements to the Phase-2 plan (surfaced during breakdown)
- **R1 — step-flatten moves into Phase A** (was B1). The app + pointer won't compile/run
  without flattening chapter→visit→step into ordered step IDs, so it must land with the schema.
- **R2 — location-index & preferred-next *builders* move into Phase D** (were B2/B3). Their
  only consumers are Phase D screens, so they ride with them. Phase B dissolves into A + D.
- **R3 — Phase A must retire/convert the v0 guide files** or `yarn validate-guides` (part of
  `yarn check`) fails. See Open Question 1 — this is the one thing to confirm before starting.

---

## Phase A — Schema v1 + green build
**Branch:** `feat/schema-v1-location-visit` · lands first, must be gate-green.

### Task A1: ID grammar — locationId, visitId
**Description:** Add the two new 2-segment ID types to the stable-ID grammar.
**Acceptance:**
- `locationId` and `visitId` exported as `<slug>:<segment>` Zod schemas + inferred types.
- Grammar note in `common.ts` updated to mention visits as a mint site.
**Verification:** unit test accepts `pokemon-crystal:azalea-town` / `:v-azalea-1`, rejects bad forms; `yarn typecheck`.
**Dependencies:** None. **Files:** `schema/common.ts`, `schema/common.test.ts`. **Scope:** S.

### Task A2: Spine entities — location, visit, restructured chapter/step
**Description:** Define `location` and `visit`; chapter holds `visits[]`; step gains
`keywords[]` + optional `detail`; remove `step.location` and `step.text`.
**Acceptance:**
- `location`, `visit`, revised `chapter`, revised `step` schemas + types exported.
- `step.keywords` is `min(1)`; `detail` optional; missable/achievementRefs/images/sourceRefs/confidence retained.
- Duplicate-id refinements: step ids unique within a visit; visit/location ids unique.
**Verification:** spine schema unit tests (valid parse + each refinement fails as expected).
**Dependencies:** A1. **Files:** `schema/spine.ts`, `schema/spine.test.ts`. **Scope:** M.

### Task A3: Widget & deck scopes
**Description:** Extend `widgetScope` with `location` and `visit`; `deckSlot.defaultScope`
with `"location"`.
**Acceptance:**
- `widgetScope` discriminated union has global | chapter | location | visit.
- `deckSlot.defaultScope` enum includes `location` (instance binds the concrete id).
**Verification:** widget/deck schema unit tests parse all four scopes.
**Dependencies:** A1. **Files:** `schema/widgets.ts`, `schema/deck.ts`, `schema/widgets.test.ts`. **Scope:** S.

### Task A4: Assembly, cross-file validation, version bump
**Description:** Add `locations[]` to `guideFile` + `spineLayer`; wire FK/uniqueness/nesting
validation; bump schema to v1.
**Acceptance:**
- `guideFile`/`spineLayer` carry `locations[]`; chapters carry visits carry steps.
- Refinements: `visit.locationId` resolves; widget `location`/`visit` scope resolves to an
  existing id; checkable-namespace uniqueness preserved across steps + widget items.
- `SCHEMA_VERSION = 1`, `SUPPORTED_SCHEMA_VERSIONS = [1]`; `CHANGELOG.md` v0→v1 note.
**Verification:** guide/layers schema unit tests (FK + uniqueness fail paths); `yarn typecheck` of schema dir.
**Dependencies:** A2, A3. **Files:** `schema/guide.ts`, `schema/layers.ts`, `schema/common.ts`, `schema/CHANGELOG.md`, `schema/guide.test.ts`. **Scope:** M.

### Task A5: Step-flatten helper (was B1)
**Description:** Flatten chapter→visit→step into ordered step IDs + lookups so the explicit
pointer works across visit boundaries.
**Acceptance:**
- A helper yields steps in spine order across visits/chapters; `advancePointer` skips
  blocked steps correctly across visit boundaries.
**Verification:** unit tests for ordering + advance across visits.
**Dependencies:** A2. **Files:** `spine/guideData.ts`, `progress/pointer.ts` (if signature touched), `spine/guideData.test.ts`. **Scope:** S–M.

### Task A6: Restore app + scripts compilation (mechanical)
**Description:** Adapt every type-level consumer to the v1 shape so the whole repo compiles
and renders plainly (visits grouped under chapters, keywords shown as lines). Real
place-first UX is Phase D — this task only restores green.
**Acceptance:**
- `NowScreen`/`ChapterSheet`/`StepRow` read `chapter.visits[*].steps[*]` and `keywords[]`.
- `validateGuides`/`checkStableIds` updated for v1 (incl. deterministic-mint guard).
- `yarn typecheck` and `yarn test` green.
**Verification:** `yarn typecheck`, `yarn test`.
**Dependencies:** A2–A5. **Files:** `spine/NowScreen.tsx`, `spine/ChapterSheet.tsx`, `spine/StepRow.tsx`, `scripts/validateGuides.ts`, `scripts/checkStableIds.ts`. **Scope:** M–L _(if it grows past ~5 files, split renderers from scripts)_.

### Task A7: v1 Crystal fixture + remove v0 compiled artifacts  _(OQ1 resolved: option a)_
**Description:** Land a minimal hand-authored v1 Crystal fixture (1–2 chapters, real
locations/visits/keywords) as the crystal guide, and remove the v0 **compiled** artifacts
for both guides so `validate-guides` passes. **Preserve `sources.json`** (append-only, and
needed to regenerate) — only the compiled outputs go.
**Acceptance:**
- v1 Crystal fixture validates end-to-end; app boots on it.
- v0 compiled files removed (`guide.json`, `ra-mapping.json`, `approvals.json`, `layers/`)
  for `pokemon-crystal` and `ml-partners-in-time`; their `sources.json` retained.
- No remaining file fails v1 validation.
**Verification:** `yarn validate-guides`, `yarn check-stable-ids`, full `yarn check` green.
**Dependencies:** A4. **Files:** `guides/pokemon-crystal/*` (fixture + removals), `guides/ml-partners-in-time/*` (removals, keep `sources.json`). **Scope:** M.
**Note:** removing `approvals.json` here is part of the deliberate from-scratch reset Pierre
authorized (no playthrough/approval state exists yet); it is not the review-flow writing it.

### ✅ Checkpoint A
- [ ] `yarn check` fully green · app runs on the v1 fixture · **review before C/D**.

---

## Phase C — Compiler spine-pass rework
**Branch:** `feat/compiler-v1` · parallel with D after A.

### Task C1: Rework `guide-pass-spine` skill for v1
**Description:** Update the spine-pass skill to emit locations + chapters→visits→steps with
`keywords[]`/`detail`, sourceRefs + confidence, and deterministic ID minting; document the
prose→keyword-beat splitting rules. (#6 extract/classify stays a separate pass — not here.)
**Acceptance:**
- Skill instructions produce a layer that validates against the v1 `spineLayer`.
- Keyword-splitting + deterministic-mint rules written into the skill.
**Verification:** dry-run on a Crystal chapter → output validates; manual review of rules.
**Dependencies:** Phase A. **Files:** `.claude/skills/guide-pass-spine/*`. **Scope:** M (editorial).

### ✅ Checkpoint C
- [x] Spine pass emits valid v1 layers on a sample chapter. _(C1 done 2026-06-16:
  skill reworked for locations + chapter→visit→step + keyword beats; worked
  example `examples/spine.sample.json` pinned by `tests/skills/spinePassExample.test.ts`.)_

---

## Phase D — App place-first UX
**Branch:** `feat/app-location-visit` · parallel with C after A. Additive, green on its own.

### Task D1: Location-index builder (was B2)
**Description:** Derived aggregation: for a `locationId`, all its visits' steps + location-scoped
widgets + achievements.
**Acceptance:** builder returns correct aggregation across revisits on the fixture.
**Verification:** unit tests. **Dependencies:** A. **Files:** new `spine/locationIndex.ts` + test. **Scope:** S–M.

### Task D2: Preferred-next-visit selector (was B3)
**Description:** From the pointer's current step, compute the next visit in spine order.
**Acceptance:** correct next-visit incl. when current visit's steps remain vs. exhausted.
**Verification:** unit tests. **Dependencies:** A5. **Files:** new `spine/preferredNext.ts` + test. **Scope:** S.

### Task D3: Keyword/detail step rendering
**Description:** `StepRow` shows `keywords[]` by default; `detail` expandable.
**Acceptance:** keywords render as terse beats; detail toggles; no layout shift on expand.
**Verification:** component test + manual. **Dependencies:** A6. **Files:** `spine/StepRow.tsx` + test. **Scope:** S.

### Task D4: Location/visit widget scope resolution + display
**Description:** `WidgetDeck`/`WidgetsSheet` resolve and surface `location`- and
`visit`-scoped widgets (location widgets appear on every visit there).
**Acceptance:** a location-scoped widget shows on all visits to that location; visit-scoped
shows only on its visit; global/chapter unchanged.
**Verification:** tests + manual on fixture. **Dependencies:** A. **Files:** `shell/WidgetDeck.tsx`, `shell/WidgetsSheet.tsx` + test. **Scope:** M.

### Task D5: Location-index screen (#8)
**Description:** A place screen: open a location → its visits, widgets, achievements.
**Acceptance:** renders the index for a fixture location incl. multi-visit aggregation;
reachable from navigation.
**Verification:** renders on fixture; manual. **Dependencies:** D1. **Files:** new screen + `shell/router.tsx` + test. **Scope:** M.

### Task D6: Preferred-next surfacing on NowScreen
**Description:** Surface the preferred-next visit as the "what next" affordance.
**Acceptance:** NowScreen shows preferred-next; pointer check/skip behavior unchanged.
**Verification:** manual + existing pointer tests stay green. **Dependencies:** D2. **Files:** `spine/NowScreen.tsx` + test. **Scope:** S.

### ✅ Checkpoint D
- [x] Place-first UX works on the fixture · `yarn check` green · review before E.
  _(D1–D6 done 2026-06-16 on `feat/workstream-a`: location index + builder,
  preferred-next selector, expandable keyword/detail rows, centralized widget
  scope resolution, the place screen + route, and the "what next" affordance.)_

---

## Phase E — Pokémon Crystal full recompile
**Branch:** `guide/pokemon-crystal-v1` · after C.

### Task E1: Recompile Crystal spine to v1
**Description:** Run the reworked spine pass over Crystal sources → full v1 spine
(locations, visits, keyword beats), replacing the fixture.
**Acceptance:** full Crystal spine validates against v1; locations/visits cover the route.
**Verification:** `yarn validate-guides` on the full spine. **Dependencies:** C1. **Files:** `guides/pokemon-crystal/layers/spine.json` (+ locations). **Scope:** L (content).

### Task E2: Re-anchor Crystal widgets to location/visit scopes
**Description:** Move encounter tables etc. to `location` scope where appropriate; set
visit scope only where a widget is occurrence-specific.
**Acceptance:** widget scopes resolve; encounter tables attach to their route/location.
**Verification:** `yarn validate-guides`. **Dependencies:** E1. **Files:** `guides/pokemon-crystal/layers/widget-*.json`. **Scope:** M.

### Task E3: Assemble, gate, spot-review
**Description:** Assemble guide.json, run the full gate, spot-review flagged rows.
**Acceptance:** `yarn check` green; flagged rows reviewed.
**Verification:** `yarn assemble-guide`, `yarn check`. **Dependencies:** E1, E2. **Files:** `guides/pokemon-crystal/guide.json`, `ra-mapping.json`. **Scope:** M.

### ✅ Checkpoint E (Complete)
- [ ] Crystal plays end-to-end under v1 · all spec success criteria met · ready for review.

---

## Risks & mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| A6 grows past ~5 files / breaks much at once | Med | Split renderers vs scripts into two tasks if it does; rely on `yarn typecheck` as the consumer checklist |
| v0→v1 cutover leaves the gate red (R3/OQ1) | High | Resolve OQ1 before starting; A7 lands a valid v1 fixture and retires v0 files |
| Keyword-splitting quality in the spine pass | Med | Rules written into the skill (C1); fixture reviewed before full recompile |
| Pointer wrong across visit boundaries | Med | A5 dedicated flatten + advance tests |
| Crystal recompile (E1) is a large manual lift | Med | Time-boxed, isolated PR; fixture proves the pipeline first |

## Open Questions
1. ~~How to keep `yarn check` green during the v0→v1 cutover?~~ **Resolved 2026-06-15
   (option a):** Task A7 lands a v1 Crystal fixture and removes the v0 compiled artifacts for
   both guides, preserving `sources.json`.
2. Should Phase D ship the location graph as a **list** (per §9.3 list-style-first) for v1?
   Assumed yes; visual graph deferred.
