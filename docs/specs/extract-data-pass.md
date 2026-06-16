# Spec + Plan: `extract-data` compiler pass (idea #6)

_Status: APPROVED 2026-06-16 — foundation slice ready to build. Source idea:
`docs/archive/Idea_list.md` ("1 skill between sources and spine to extract and
classify data"); deferred out of Workstream A onto its own track._

## Context

Today the **spine** pass and each **widget** pass independently re-read
`sources.json` and re-extract the same raw facts (Crystal's wild encounters,
items, trades, NPCs…) — duplicated work and a place for the two passes to drift.
This builds the deferred idea #6: a new **`extract-data`** step between
`source-gathering` and `spine` that classifies source facts **once** into
`layers/data.json`, which downstream passes then draw from.

`workstream-a-location-visit-reframe.md` resolved that #6 "stays a SEPARATE pass
… can later feed [the spine] classified input with no schema impact." This is
that pass.

This is a **PRD amendment** (FR-D1 pipeline grows 5→6 passes) and a **schema
change** (`app/src/schema/layers.ts`) — both signed off with this spec
(CLAUDE.md §24).

## Decisions (2026-06-16)

| Fork | Decision |
|---|---|
| Data shape | **Generic category tables** — game-agnostic named datasets of key→value records; no per-category typed schemas. |
| Pipeline role | **Mandatory** pass; spine/widgets consume `data.json` (consumer wiring staged — see Rollout). |
| Review status | **Internal intermediate** — mechanically validated, *not* in the review/approval flow. |
| This slice | **Foundation only** — schema + validation + skill + tested worked example. No Crystal recompile, no consumer rewiring. |

## Design

A 6th pass, position 2 of 6:

```
source-gathering ▶ extract-data ▶ spine ▶ widget ×N ▶ ra-mapping ▶ qa
                        │
                        ▼
                 layers/data.json + report
```

**Artifact** `guides/<slug>/layers/data.json` (+ `data.report.json`), validated
by a new `dataLayer` schema. It is an **intermediate**: never assembled into
`guide.json` (only spine + widgets + ra-mapping are), never reviewed/approved,
and its record IDs are **local** (single-segment) so they stay out of the
checkable namespace and `check-stable-ids` never touches them.

**Shape — generic category tables** (mirrors the `dataTable` primitive; reuses
`localId` / `record(localId, string)` from `widgets.ts`):

```jsonc
{ "schemaVersion": 1, "guideId": "<slug>", "pass": "extract-data",
  "datasets": [
    { "id": "encounters", "label": "Wild encounters",
      "records": [
        { "id": "route-29-pidgey",
          "fields": { "location": "Route 29", "species": "Pidgey",
                      "levels": "2-3", "method": "grass" },
          "sourceRefs": ["src-bulba-locations"], "confidence": "normal" }
      ] },
    { "id": "images", "label": "Available source images",
      "records": [
        { "id": "map-cherrygrove-city",
          "fields": { "path": "crystal-ap-tracker-11.0.4/images/maps/CherrygroveCity.png",
                      "kind": "location-map", "depicts": "Cherrygrove City" },
          "sourceRefs": ["src-ap-tracker"], "confidence": "normal" }
      ] } ] }
```

Every record carries `sourceRefs` (≥1, resolving in `sources.json`) and
`confidence` — the contract §2 invariant holds structurally, same as steps and
widget rows. Flagged records surface through the report's `anomalies`, **not**
`flaggedItemIds` (whose type is the 3-segment `checkableId` and cannot hold local
record IDs) — the data layer is exempt from item-level flag parity because it is
unreviewed.

### Image catalog — a standard `images` dataset

One of the datasets the pass emits is an **`images` catalog**: one record per
image **already present in the source snapshot** that a downstream pass might use,
with `fields` `{ path, kind, depicts }` (`path` relative to the snapshot;
`kind` ∈ location-map / species-sprite / trainer / item-icon / …; `depicts` =
the place/species/trainer name). This is the prime "extract once, reuse" win:

- **spine** picks a location's `mapImage` from the `kind: location-map` records
  (e.g. `CherrygroveCity.png`), then copies the file into
  `guides/<slug>/images/` and references it — no re-hunting the 2,116-image
  snapshot, no downloading.
- **widget** passes pull species sprites / trainer / item icons from the same
  catalog for encounter tables, dex, boss boards.

Invent-nothing still binds: a record is only emitted for a file that actually
exists in the snapshot; a wanted-but-missing asset is an `anomaly`, never a guess.

### Rollout — mandatory, but consumers wired later

The contract declares `extract-data` a required pass and documents spine/widgets
consuming `data.json`, but **rewiring those two skills and recompiling Crystal is
the follow-up slice**. So this slice keeps `validate-guides` *recognising and
validating* `data.json` when present, without yet *requiring* its presence — no
repo guide has one and Crystal isn't recompiled here, so the gate stays green.
The presence-requirement flips on in the follow-up, alongside the recompile.
(Same staging Workstream A used: land schema first, migrate consumers next.)

## Available source assets — what the `images` dataset catalogs

The Crystal source snapshot already holds ~2,116 images under
`pokemon-crystal/sources/`, source-attributable to `src-ap-tracker` / `src-ra` —
exactly the pool the `images` dataset (above) inventories so downstream passes
reuse them:

| Catalog `kind` | Source location (Crystal) | Count | Consumer |
|---|---|---|---|
| `location-map` | `crystal-ap-tracker-11.0.4/images/maps/*.png` (e.g. `CherrygroveCity.png`, `AzaleaTown.png`, `BlackthornGym1F.png`) | ~205 | spine → `location.mapImage`, `mapPins` |
| `species-sprite` | `…/images/pokemon/` | 251 | widgets → encounter tables, dex |
| `trainer` | `…/images/trainers/` | 130 | widgets → boss/gym boards |
| `item-icon` | `…/images/items/` | 65 | widgets → item/prep cards |
| (gift / events / …) | `…/images/{gift,events,…}/` | various | as needed |
| `achievement-badge` | the `… RetroAchievements_files/` scrapes | ~690 (mostly site chrome) | ra-mapping context |

These are on disk already — when the follow-up extracts data and the spine
repopulates `images/`, no downloading is needed. (Note: the compiled
`guides/pokemon-crystal/images/` folder was removed post-A7, so the v1 fixture's
`images/new-bark-town.png` ref is currently dangling — replace from the catalog's
`location-map` records then.)

## Implementation plan

Three tasks (detail + acceptance in `extract-data-pass-tasks.md`):

- **ED1** — `dataLayer`/`dataset`/`dataRecord` schema + `passId` `"extract-data"`
  + `passReportFile` refine, in `app/src/schema/layers.ts`; `validDataLayer()`
  builder. Schema unit tests.
- **ED2** — `validate-guides` recognises `layers/data.json` (+ report, source
  resolution, no flag parity), in `app/scripts/validateGuidesCore.ts`. Script test.
- **ED3** — `COMPILER_PASS_CONTRACT.md` update + `guide-pass-extract-data` skill
  (incl. the **image-catalog rules** — emit an `images` dataset of available
  source images so spine/widgets reuse them) + worked example with an `images`
  dataset, pinned by a test (mirror of C1's `spinePassExample.test.ts`).

**✅ Checkpoint ED:** `yarn check` green; a `data.json` validates end-to-end; the
skill's worked example is schema-pinned. Review before the follow-up.

## Deferred — follow-up slice (own plan)

"`extract-data` adoption": rewire `guide-pass-spine` + `guide-pass-widgets` to
read `data.json` (mandatory consumption); make `validate-guides` *require*
`data.json` once a guide has any layer; run the pass on Crystal sources to emit
`data.json`, then recompile its spine/widgets from it.

## Risks & flags

- **PRD amendment (FR-D1):** pipeline 5→6 passes.
- **Schema change (`layers.ts`):** additive; `SUPPORTED_SCHEMA_VERSIONS` stays
  `[1]` (data layer is v1 from birth). No `approvals.ts` change (unreviewed), no
  `checkStableIdsCore.ts` change (local IDs, not §6.8).
- **Non-breaking this slice:** recognise-if-present, don't require — the gate
  stays green with zero `data.json` files in `guides/`.

## Verification (end-to-end)

1. `yarn typecheck` — schema compiles.
2. `yarn test` — schema, validate-guides, and worked-example tests pass.
3. `yarn validate-guides` — repo still green (recognises `data.json` if present).
4. Manual: drop the worked example into a scratch
   `guides/<slug>/layers/data.json` (+ report) and confirm `validate-guides`
   accepts it.
