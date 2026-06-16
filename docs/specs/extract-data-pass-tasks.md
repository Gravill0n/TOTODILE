# Implementation Tasks: `extract-data` compiler pass (idea #6)

_Status: APPROVED 2026-06-16. Source: `extract-data-pass.md`. Build on a `feat/`
branch, land by PR (PRD §23). Commands run from `app/`._

## Overview

A foundation slice: land the data-layer schema, validation, and the
`guide-pass-extract-data` skill with a tested worked example. Each task leaves
the repo `yarn check`-green (the slice is additive — `validate-guides` recognises
`layers/data.json` if present but does not yet require it). Consumer rewiring +
Crystal recompile are the deferred follow-up.

## Architecture decisions carried in

- **Generic category tables** — datasets of flat key→value records; reuse
  `localId` and `record(localId, string)` from `widgets.ts`; no per-category schemas.
- **Image catalog is a first-class dataset** — the pass emits an `images` dataset
  cataloguing the images already in the source snapshot (`{ path, kind, depicts }`
  + sourceRefs), so spine (`mapImage`/`mapPins`) and widgets (sprites/icons) reuse
  them instead of re-hunting. Fits the generic model — no extra schema.
- **Internal intermediate** — `data.json` is validated but never assembled into
  `guide.json`, never approved; record IDs are `localId`, so outside the checkable
  namespace and `check-stable-ids`.
- **Mandatory pass, staged consumers** — contract declares it required; the
  presence-requirement + spine/widget wiring land in the follow-up.

---

### Task ED1: `dataLayer` schema + pass id
**Description:** Add the data-layer entities to `app/src/schema/layers.ts`:
`dataRecord` (`{ id: localId, fields: z.record(localId, z.string()), sourceRefs,
confidence }`), `dataset` (`{ id: localId, label, records: z.array(dataRecord).min(1) }`
with a duplicate-record-id refinement), and `dataLayer` (`{ schemaVersion,
guideId, pass: z.literal("extract-data"), datasets: z.array(dataset).min(1) }`
with a duplicate-dataset-id refinement). Extend the `passId` enum with
`"extract-data"`; add a `passReportFile.superRefine` clause mapping pass
`"extract-data"` → layer base `"data"` (beside the existing `widget` case).
**Acceptance:**
- `dataLayer`/`dataset`/`dataRecord` + inferred types exported.
- Rejects duplicate dataset IDs, duplicate record IDs within a dataset, and a
  record with empty `sourceRefs`.
- `passReportFile` accepts `pass: "extract-data"` / `layer: "data"` and rejects
  `layer: "extract-data"`.
**Verification:** `yarn test tests/schema/layers.test.ts`; `yarn typecheck`.
**Dependencies:** none. **Files:** `app/src/schema/layers.ts`,
`app/tests/schema/helpers.ts` (`validDataLayer()` builder),
`app/tests/schema/layers.test.ts`. **Scope:** S–M.

### Task ED2: `validate-guides` recognises `layers/data.json`
**Description:** Teach `app/scripts/validateGuidesCore.ts` the new artifact:
extend the `LayerArtifact` union with a `"data"` kind; recognise
`layerId === "data"` → load via `dataLayer` (today rejected as "unrecognized
layer file"); `sourceRefsOf` returns each record's `[id, sourceRefs]` for source
resolution; `flaggedIdsOf` returns `∅` for data (no item-level flag parity). The
existing report-pairing loop already requires `data.report.json`.
**Acceptance:**
- A temp tree with a valid `data.json` + `data.report.json` validates clean.
- A record with a dangling `sourceRef` is reported.
- `data.json` is no longer "unrecognized".
**Verification:** `yarn test tests/scripts/validateGuides.test.ts`;
`yarn validate-guides` (repo still green — no repo guide has `data.json`).
**Dependencies:** ED1. **Files:** `app/scripts/validateGuidesCore.ts`,
`app/tests/scripts/validateGuides.test.ts`. **Scope:** M.

### Task ED3: contract + `guide-pass-extract-data` skill + worked example
**Description:** Update `COMPILER_PASS_CONTRACT.md` — pipeline diagram + table
gain the `extract-data` row (reads `sources.json`; emits `layers/data.json` +
report); the `rowCount` bullet gains "records (extract-data)"; add a short
**Rollout** note (spine/widgets consume it; wiring = follow-up) stating the pass
is mandatory but intermediate/unreviewed. Create
`.claude/skills/guide-pass-extract-data/SKILL.md` in the `guide-pass-spine` house
style: reads `sources.json` (+ prior `data.json`), emits `layers/data.json` +
report; **classification rules** — one dataset per fact category Pierre signs off
on at a gate; one record per atomic fact; `fields` flat key→value reproduced
exactly from source; local `id` minted deterministically from stable content
keys (never sequence); invent nothing, gaps → `confidence: "flagged"` + anomaly;
ask-don't-decide on categories. **Image-catalog rules** — emit an `images`
dataset with one record per image already in the source snapshot a downstream
pass may use: `fields` `{ path (snapshot-relative), kind (location-map /
species-sprite / trainer / item-icon / …), depicts }` + `sourceRefs` to the
snapshot source; only catalog files that actually exist (a wanted-but-missing
asset is an anomaly); spine reads `kind: location-map` for `mapImage`, widgets
read sprites/icons. Ship
`.claude/skills/guide-pass-extract-data/examples/data.sample.json` (with an
`encounters`-style dataset **and** an `images` dataset) and pin it with
`app/tests/skills/extractDataExample.test.ts` (mirror of `spinePassExample.test.ts`).
**Acceptance:**
- Example validates against `dataLayer`; test asserts ≥2 datasets (including an
  `images` dataset) and records carrying `fields` + `sourceRefs`.
- Skill documents the category gate, deterministic local-id minting, the
  image-catalog rules, and the invent-nothing / source-resolution invariants.
**Verification:** `yarn test`; `yarn check` green.
**Dependencies:** ED1 (ED2 recommended). **Files:** `COMPILER_PASS_CONTRACT.md`,
`.claude/skills/guide-pass-extract-data/SKILL.md`,
`.claude/skills/guide-pass-extract-data/examples/data.sample.json`,
`app/tests/skills/extractDataExample.test.ts`. **Scope:** M (editorial).

### ✅ Checkpoint ED
- [x] `yarn check` green · a `data.json` validates end-to-end (schema +
  validate-guides) · the skill's worked example is schema-pinned · **review
  before the follow-up slice.** _(ED1–ED3 done 2026-06-16 on `feat/workstream-a`.)_

---

## Follow-up slice — `extract-data` adoption

- [x] **AD1** — `validate-guides` *requires* `data.json` once a downstream layer
  (spine/widget/ra-mapping) exists. _(done 2026-06-16; source-gathering-only and
  no-layers trees are left alone.)_
- [x] **AD2** — Rewire `guide-pass-spine` + `guide-pass-widgets` SKILLs to read
  `data.json` (facts from its datasets, images from its catalog); contract
  Reads + rollout note updated. _(done 2026-06-16; editorial.)_
- [ ] **AD3 (content lift — Pierre's category gate)** — Run the pass on Crystal
  sources → `data.json`; recompile its spine/widgets from it (re-anchoring to the
  on-disk source maps/sprites). **Not yet built** — needs the category sign-off
  and is source-by-source content work.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Pipeline 5→6 is a PRD/contract change | Signed off in `extract-data-pass.md`; contract updated in ED3 |
| "Mandatory" declared before consumers wired | Recognise-if-present this slice; require + wire in the follow-up (staged like Workstream A) |
| Generic records too loose to be useful | Category gate in the skill (Pierre signs off the dataset set per guide); proven on the worked example before any recompile |
