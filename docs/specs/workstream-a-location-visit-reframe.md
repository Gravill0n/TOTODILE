# Spec: Workstream A — Location/Visit Reframe

_Status: DRAFT (Phase 1 of spec-driven-development). Awaiting Pierre's review before Plan._
_Source idea: `docs/ideas/spine-widget-reframe.md`. Decisions: 2026-06-15._

## Objective

Make TOTODILE **place-first**: you navigate by *where you are*, and get the steps,
reference widgets, and achievements for that place — including across repeat visits —
without discarding the spine/compiler/progress investment.

The change introduces two repo-side entities (**Location**, **Visit**) and restructures
the spine to **chapter → visit → step**. A visit is one occurrence of being at a location
in the story; revisits are multiple visits sharing a `locationId`. Steps gain structured
keyword beats. Widgets gain `location` and `visit` scopes. A derived **location index**
aggregates everything for a place across all its visits.

**User stories**
- As Pierre playing, I see terse keyword beats for my current spot, with full prose one tap away.
- As Pierre, I open a location (e.g. Goldenrod City) and see *all* its visits, widgets, and achievements in one place.
- As Pierre, an encounter table attached to a route shows up on every visit to that route.
- As Pierre, "what do I do next" still works — a preferred-next visit guides a blind run.

**Success looks like:** Pokémon Crystal recompiles cleanly under the new model, the app
renders chapter→visit→step navigation + the location index, and `yarn check` is green.

## Tech Stack

Unchanged from PRD §19: TypeScript (strict), React 19, Vite, Tailwind 4, TanStack Router,
**Zod 4** (schemas are the source of truth — `app/src/schema/`), IndexedDB via `idb`,
Biome, Vitest, Yarn 4. No new dependencies in Workstream A (shadcn is Workstream B).

## Commands (run from `app/`)

```
Lint:            yarn lint            # biome check .
Typecheck:       yarn typecheck       # tsc --noEmit
Test:            yarn test            # vitest run
Validate guides: yarn validate-guides # node scripts/validateGuides.ts
Stable IDs:      yarn check-stable-ids
Assemble guide:  yarn assemble-guide
Full gate:       yarn check           # lint + typecheck + test + validate-guides
```

`yarn check` must be green before any merge (PRD §21).

## Project Structure (where changes land)

```
app/src/schema/
  common.ts      → add locationId, visitId; checkable namespace unchanged
  spine.ts       → location + visit entities; chapter now holds visits, visit holds steps
  widgets.ts     → widgetScope += location | visit
  deck.ts        → deckSlot.defaultScope += location
  guide.ts       → guideFile carries locations[]; cross-file scope validation
  layers.ts      → spineLayer reflects new spine shape
  CHANGELOG.md   → v0 → v1 contract change note
app/src/spine/   → NowScreen / ChapterSheet / StepRow render visits + keyword beats
app/src/         → new: location index lens (achievements + widgets per place)
app/scripts/     → validateGuides / checkStableIds updated for new shape
.claude/skills/guide-pass-spine/ → emits locations + visits (was chapters + steps)
guides/pokemon-crystal/          → recompiled from scratch under v1
```

## Data Model Changes (the heart)

### New: Location (repo-side, stable)
```
location = { id: <slug>:<loc>,           // 2-segment, stable forever
             name: string,
             mapImage?: imageRef }
```
Lives in a top-level `locations[]` on the spine layer and on `guide.json`.

### New: Visit (occurrence within a chapter)
```
visit = { id: <slug>:<visit>,            // 2-segment, where steps mint
          locationId: <slug>:<loc>,      // FK → locations[]
          order: int,
          steps: step[] }                // ≥1
```
A visit is **editorial granularity** — a meaningful stop, not a mechanical per-step split.
Multi-visit = multiple visits referencing one `locationId`. Visits are **structure, not
checkable** (no progress state of their own).

### Changed: Chapter (now groups visits, not steps)
```
chapter = { id, title, intro?, order, visits: visit[] }   // was: steps: step[]
```

### Changed: Step (checkable leaf — keywords + detail)
```
step = { id: <slug>:<visit>:<short>,     // mints under its visit; grammar unchanged
         order,
         keywords: string[].min(1),      // terse beats, shown by default (#11)
         detail?: string,                // full prose, expandable
         missable?, achievementRefs[], images[], sourceRefs, confidence }
```
- `step.location` (free-text) is **removed**; place identity moves to `visit.locationId`.
- `text` → replaced by `keywords[]` + optional `detail`.

### Changed: widgetScope (all four scopes)
```
widgetScope = global | { chapter, chapterId } | { location, locationId } | { visit, visitId }
```
`deckSlot.defaultScope` enum gains `location` (instance still binds the concrete id).

### Unchanged
- ID grammar (3-segment checkable IDs; middle = mint site, not containment — common.ts:33).
- Checkable namespace: step IDs + widget item IDs share one space per guide.
- Pointer semantics (explicit, spine-order; `advancePointer` walks step order across visits).
- RA mapping targets (step or item IDs) — grammar-compatible, no change to the mapping schema.
- missable / achievementRefs / images / sourceRefs / confidence on steps.

### Derived (not stored)
- **Location index:** for a `locationId`, all its visits' steps + all `location`-scoped
  widgets + achievements earnable there. Powers #8 (achievements view) and the place screen.
- **Preferred-next visit:** next visit in spine order from the pointer's current step.
- **Location graph:** nodes = locations, sequence = visit order. No authored edges in v1.

## Compiler Changes

- `guide-pass-spine` extracts **locations + chapters→visits→steps** (was chapters→steps),
  emitting `keywords[]`/`detail` and `visit.locationId`. Each step/visit keeps sourceRefs +
  confidence. **Decided (2026-06-15): idea #6 (extract/classify) stays a SEPARATE pass on
  its own track — NOT absorbed here.** Workstream A's spine pass keeps extracting from
  sources directly as today; #6 can later feed it classified input with no schema impact.
- `validateGuides` / `checkStableIds`: validate FKs (visit.locationId, widget location/visit
  scope → existing ids), uniqueness of location/visit ids, and the unchanged checkable rules.
- Bump `SCHEMA_VERSION` 0→1; `SUPPORTED_SCHEMA_VERSIONS = [1]` (drop v0 — no installed base).

## App Changes

- `spine/`: render chapter → visit → step; StepRow shows `keywords[]`, expand for `detail`.
- New location index screen/lens: open a place → its visits, widgets, achievements.
- `WidgetDeck`/`WidgetsSheet`: resolve `location` + `visit` scopes alongside global/chapter.
- "Where am I / what next": surface preferred-next visit (pointer unchanged underneath).

## Code Style

Match existing `app/src/schema/` Zod style: discriminated unions for variants,
`superRefine` for cross-field invariants, inferred types exported alongside schemas, the
ID-grammar helpers in `common.ts`. Example (new visit entity, in the house style):

```ts
export const visit = z
  .object({
    id: visitId,
    locationId,
    order: z.int().nonnegative(),
    steps: z.array(step).min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.steps.map((s) => s.id))) {
      ctx.addIssue({ code: "custom", path: ["steps"],
        message: `Duplicate step ID "${id}" in visit "${value.id}"` });
    }
  });
export type Visit = z.infer<typeof visit>;
```

## Testing Strategy

Vitest, tests beside source (`*.test.ts`). Cover:
- Schema: visit/location parse + FK refinements; widgetScope all four kinds; step
  `keywords` min(1) and optional `detail`; chapter→visit→step nesting; duplicate-id refinements.
- Derived logic: location index aggregation across revisits; preferred-next-visit selection;
  `advancePointer` still correct walking steps across visit boundaries.
- Guide validation: Crystal v1 fixture passes `validate-guides` + `check-stable-ids`.
- Renderers: keyword/detail expansion; location/visit-scoped widget resolution.

## Boundaries

- **Always:** keep `yarn check` green before merge; schemas in `app/src/schema/` are the
  source of truth; every step/widget row keeps ≥1 sourceRef + confidence (§6.6); IDs stay
  3-segment kebab; work on a `feat/` branch, land by PR (never commit to `main`).
- **Ask first:** any *further* schema change beyond this spec; adding a dependency; touching
  the §14.2 deferred list; changing the deck contract shape.
- **Never:** invent game content (§24 — trace to sources or flag); write `approvals.json`
  outside the review flow; add an 8th primitive; expose the RA API key; regenerate stable
  IDs once a real playthrough's progress exists.

## Success Criteria

1. `app/src/schema/` defines `location` + `visit`; chapter holds visits; step has
   `keywords[]` + optional `detail`; widgetScope has all four kinds. `yarn typecheck` green.
2. Schema + derived-logic unit tests pass (`yarn test`).
3. `guide-pass-spine` emits the v1 shape; Pokémon Crystal recompiled from scratch validates
   (`yarn validate-guides` + `yarn check-stable-ids` green).
4. App renders chapter→visit→step with keyword/detail and resolves location/visit-scoped
   widgets; a location index shows all visits + widgets + achievements for one place.
5. Preferred-next-visit drives "what next"; pointer behavior unchanged for checking/skip.
6. `yarn check` green; PRD amendments (below) recorded.

## PRD amendments this requires (§24 — confirm before Plan)

- **§6 entity model:** add Location; Spine becomes chapter → **visit** → step; step gains
  `keywords[]`/`detail`, loses free-text `location`.
- **§6 / §9.x widget scope:** scope set becomes global | chapter | location | visit;
  deck `defaultScope` gains `location`.
- **§9.2 / CHANGELOG:** schema v0 → v1 (no migration; v0 support dropped).
- **§14.2:** (map-pins/flowchart full renderers already ledgered) — location graph is the
  derived nav lens, consistent with §9.3 list-style-first.

## Open Questions

1. ~~Does idea #6 become a sub-step of `guide-pass-spine`?~~ **Resolved 2026-06-15: stays a
   separate pass, out of Workstream A scope.**
2. Visit-scoped widgets: confirmed in scope (Q2) — but do any *current* Crystal widgets
   actually need visit scope, or is location enough for the pilot? (Validate during recompile.)
3. Location graph rendering fidelity for v1: simple ordered list of places vs. a visual graph
   (§9.3 says list-style ships first — assume list, defer visual graph).
4. Does the **chapter** keep a `location`-like summary, or is it purely a titled arc? (Assume
   titled arc; the location index covers place aggregation.)

---

# Implementation Plan (Phase 2)

_Status: DRAFT — awaiting review before Phase 3 (Tasks)._

## Components & dependencies

```
A. Schema (Zod)        ── foundation; everything below depends on it
B. Derived logic       ── depends on A
C. Compiler + scripts  ── depends on A   ┐ parallel after A
D. App rendering        ── depends on A + B ┘
E. Crystal recompile   ── depends on C (and a fixture unblocks B/D early)
```

## Phased order with checkpoints

### Phase A — Schema & version bump (sequential, foundation, one PR)
This is a deliberate breaking change landed together; `yarn typecheck` enumerates every
consumer that must be updated before merge.
- A1 `common.ts`: add `locationId` (2-seg) + `visitId` (2-seg) regex + types.
- A2 `spine.ts`: `location` + `visit` entities; `chapter.visits[]` (was `steps[]`);
  `step.keywords[]` + optional `detail`; remove `step.location`/`step.text`.
- A3 `widgets.ts`: `widgetScope += { location } | { visit }`.
- A4 `deck.ts`: `deckSlot.defaultScope += "location"`.
- A5 `guide.ts` + `layers.ts`: `locations[]` on guideFile/spineLayer; FK validation
  (`visit.locationId`, widget location/visit scope → existing ids); uniqueness for
  location/visit ids; chapter→visit→step nesting refinements.
- A6 `SCHEMA_VERSION` 0→1; `SUPPORTED_SCHEMA_VERSIONS=[1]`; `CHANGELOG.md` v1 note.
- **Checkpoint:** `yarn typecheck` green; schema unit tests green.

### Phase B — Derived logic (after A)
- B1 step flattening: chapter→visit→step → ordered `stepIds` (`spine/guideData.ts`) so
  `advancePointer` walks correctly across visit boundaries.
- B2 location-index builder: aggregate visits + location-scoped widgets + achievements by
  `locationId`.
- B3 preferred-next-visit selector: from the pointer's current step → next visit in order.
- **Checkpoint:** unit tests for B1–B3 green (incl. advance across visits).

### Phase C — Compiler & validation (after A; parallel with D)
- C1 `validateGuides` + `checkStableIds`: new FK/uniqueness checks; deterministic ID minting
  guard; drop v0.
- C2 `guide-pass-spine` skill rework: emit `locations` + `visits` + `keywords[]`/`detail`;
  write the prose→keyword-beat splitting rules into the skill.
- C3 hand-authored **v1 Crystal fixture** (1–2 chapters) — start during Phase A; unblocks B/D tests.
- **Checkpoint:** fixture passes `yarn validate-guides` + `yarn check-stable-ids`.

### Phase D — App rendering (after A + B; parallel with C)
- D1 spine renderers (`NowScreen`/`ChapterSheet`/`StepRow`): chapter→visit→step; keyword
  beats shown, `detail` expandable.
- D2 widget scope resolution (`WidgetDeck`/`WidgetsSheet`): handle `location` + `visit`.
- D3 location-index screen (#8): place → its visits, widgets, achievements.
- D4 "where am I / what next": surface preferred-next visit.
- **Checkpoint:** app renders the v1 fixture; manual smoke.

### Phase E — Crystal recompile (after C — the big content lift, own PR)
- E1 run reworked spine pass on Crystal sources → v1 spine.
- E2 re-anchor widgets to location/visit scopes where appropriate.
- E3 assemble + `yarn check` green; spot-review flagged rows.
- **Checkpoint:** `yarn check` green; Crystal plays end-to-end under v1.

## Risks & mitigations
| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Destructive `text`→`keywords/detail` + full recompile is the biggest lift | Fixture-first (C3): build & test schema/app on a 1–2 chapter v1 fixture before the full Crystal recompile |
| 2 | Breaking schema cascades to many consumers | Land Phase A as one focused PR; `yarn typecheck` enumerates consumers; don't merge until green |
| 3 | Pointer correctness across visit boundaries | B1 flattening helper + targeted `advancePointer` tests spanning visits |
| 4 | Spine-pass rework is editorial + large manual Crystal lift | Keyword-split rules written into the skill; recompile time-boxed as its own phase |
| 5 | Forward stable-ID requirement (post-playthrough) | Deterministic minting from stable content keys baked into the pass now; `checkStableIds` guards future recompiles |
| 6 | `visit` widget scope may be unused in Crystal (OQ#2) | Support in schema; validate real need during E; no visit-scope UI beyond resolution until a widget needs it |

## Suggested PR slicing (PRD §23 — branch + PR, never to main)
1. `feat/schema-v1-location-visit` (Phase A) — **must land first**, gate-green.
2. `feat/spine-derived-logic` (Phase B).
3. `feat/compiler-v1` (Phase C).
4. `feat/app-location-visit` (Phase D).
5. `guide/pokemon-crystal-v1` (Phase E).

Phases B/C/D branch off `main` after A merges; C and D run in parallel.
