# TODO — Review Lens: Per-Stage Gating + Merged Slot Cards

Full plan with acceptance criteria and file lists: [plan.md](plan.md).
Every task ends with `yarn check` green (from `app/`). Work on a `feat/` branch, land by PR.

## Phase 1: Foundation (manifest)

- [x] **T1 — Manifest schema + validator + backfill script** (M) — done 2026-07-04, branch `feat/review-lens-manifest` (commits ce9557e, cc3c82a, fe608a8)
  - `app/src/schema/manifest.ts` (new) + export from `index.ts` + `CHANGELOG.md`
  - `app/scripts/validateGuidesCore.ts` — manifest checks (bytes hash, entry↔artifact parity, widget meta match)
  - `app/scripts/buildLayersManifestCore.ts` + CLI + `build-layers-manifest` package script
  - Generate + commit `guides/pokemon-crystal/layers/manifest.json` (320 entries)
  - Tests: `schema/manifest.test.ts`, `scripts/buildLayersManifest.test.ts`, extend `validateGuides.test.ts`
- [x] **T2 — Roster cutover to manifest** (S) — done 2026-07-04, commit 2ffc5b8
  - `layerRoster.ts` reads manifest (404→[]); `LayerReport.widget?` added
  - `layerRoster.test.ts` rewritten; `reviewLens`/`approveFlow`/`spotCheckFlow` stubs updated (reviewReskin needed none)

### Checkpoint A
- [x] Crystal lens renders identically to before (roster verified: 320 ids + digests match the qa-derived one); manifest committed and validator-enforced

## Phase 2: Per-stage review paths (T3 ∥ T4 after their deps)

- [x] **T3 — Playability requires pipeline completion** (M) — done 2026-07-04, commit 89b50e0
  - `isPlayable(approvals, manifest, qaComplete)` + `loadPlayability(slug)`; all 4 router guards updated
  - Regression pinned: spine-only all-approved export ≠ playable; Crystal's data orphan tolerated
- [ ] **T4 — Mid-pipeline content resolution** (M) — depends T2
  - `app/src/review/reviewContent.ts` (new): guide.json passthrough or in-memory spine+widgets assembly (skip `guideFile.parse`)
  - `reviewLoaders.ts`: ra-mapping `layers/` fallback; wire review route loader
  - Tests: `reviewContent.test.ts`

### Checkpoint B
- [ ] Spine-stage fixture guide is reviewable end-to-end and NOT playable

## Phase 3: Merged slot cards

- [ ] **T5a — Slot groups render** (M) — depends T2, T4
  - `slotGroups.ts` (new, model on `buildLocationIndex`), `SlotGroupCard.tsx` (new, all widget slots), `VerdictControls.tsx` (extracted), `ReviewScreen.tsx` wiring + deck load
  - Crystal: 318 widget cards → 9 slot cards
  - Tests: `slotGroups.test.ts`, reviewLens same-slot→one-card assertion
- [ ] **T5b — Group verdict fan-out + group spot-check** (M) — depends T5a
  - `useLayerVerdicts.ts`: `recordAll`/`clearAll`; `spotCheck.ts`: `groupUnflaggedRows` + owning-layer routing
  - `buildApprovals.ts` unchanged; note fans out to every member record
  - Tests: `approveFlow`, `spotCheckFlow`/`spotCheck`, `buildApprovals` partial-roster case

### Checkpoint C
- [ ] Group-approve slot 5 → 17 identical verdicts; export diffs cleanly vs committed approvals.json (dropped `data` orphan expected — flag in PR, never hand-edit)

## Phase 4: Stage sections + contract

- [ ] **T6 — Stage sections + waiting states + export copy + target-approved badge** (S/M) — depends T5
  - `stages.ts` (new); `ReviewScreen.tsx` 3 fixed sections + placeholders naming unlock skill
  - ra-mapping flagged row targeting an approved layer gets "target already approved" badge
  - Tests: `stages.test.ts`, reviewLens additions
- [ ] **T7 — Compiler contract + skill gates (docs only)** (S) — depends T1, ∥ Phases 2-3
  - `COMPILER_PASS_CONTRACT.md`: gate markers in §1, Rules 9 (manifest upsert) + 10 (stage gate, read-only approvals check), §3 table row, §6 re-run note
  - 6 × `.claude/skills/guide-pass-*/SKILL.md`: gates + manifest upsert steps (spine/widgets/ra-mapping/qa), never-in-manifest notes (sources/extract-data)

### Checkpoint: Complete
- [ ] `yarn check` green
- [ ] Manual walk of `/review/pokemon-crystal` (stages, 9 cards, group approve, export diff)
- [ ] Spine-stage fixture: reviewable, not playable, correct placeholders
- [ ] PR opened; `data` orphan record flagged in description
