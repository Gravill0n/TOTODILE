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
- [x] **T4 — Mid-pipeline content resolution** (M) — done 2026-07-04, commit 9da1e8c
  - `reviewContent.ts`: guide.json passthrough or in-memory spine+widgets merge (no `guideFile.parse`)
  - `loadRaMapping` falls back to `layers/ra-mapping.json`; review route wired
  - Tests: `reviewContent.test.ts` (7) + reviewLens spine-stage end-to-end case

### Checkpoint B
- [x] Spine-stage fixture guide is reviewable end-to-end (reviewLens mid-pipeline test) and NOT playable (approvalsData regression tests)

## Phase 3: Merged slot cards

- [x] **T5a — Slot groups render** (M) — done 2026-07-06, commits f8a806e (slotGroups), 6ef5512 (VerdictControls), 7c4512a (SlotGroupCard + wiring)
  - `slotGroups.ts` (new, model on `buildLocationIndex`), `SlotGroupCard.tsx` (new, all widget slots), `VerdictControls.tsx` (extracted), `ReviewScreen.tsx` wiring + deck load
  - Crystal: 318 widget cards → 9 slot cards
  - Tests: `slotGroups.test.ts` (7), reviewLens same-slot→one-card assertion
  - Note: group verdict fans out via a per-member loop for now — T5b replaces it with atomic `recordAll`/`clearAll`
- [x] **T5b — Group verdict fan-out + group spot-check** (M) — done 2026-07-06, commits fe7a99a (spot-check helpers), faba59d (recordAll/clearAll), 2c0a83d (wiring)
  - `useLayerVerdicts.ts`: `recordAll`/`clearAll` (one date, single state update); `spotCheck.ts`: `groupUnflaggedRows` + `owningWidgetLayerId` routing
  - `buildApprovals.ts` unchanged (pinned by partial-roster test); note fans out to every member record
  - Tests: `useLayerVerdicts` (new), `approveFlow` group fan-out ×2, `spotCheckFlow` group routing, `spotCheck` ×3, `buildApprovals` partial-roster case

### Checkpoint C
- [ ] Group-approve slot 5 → 17 identical verdicts; export diffs cleanly vs committed approvals.json (dropped `data` orphan expected — flag in PR, never hand-edit)

## Phase 4: Stage sections + contract

- [x] **T6 — Stage sections + waiting states + export copy + target-approved badge** (S/M) — done 2026-07-06, commits 32b1eed (stages.ts), f50b4ca (sections + export copy), 992d4f1 (badge)
  - `stages.ts` (new); `ReviewScreen.tsx` 3 fixed sections + placeholders naming unlock skill; export helper names the earliest incomplete stage
  - ra-mapping flagged row targeting an approved layer gets "target already approved" badge
  - Tests: `stages.test.ts` (7), reviewLens ×3 (placeholders, section badges, target-approved), flaggedRows unit case
  - Bonus fix bcf3952: both review hooks' initial IndexedDB load could clobber verdicts recorded while it was in flight (surfaced as a flaky T5b flow test) — load now merges under in-session recordings
- [x] **T7 — Compiler contract + skill gates (docs only)** (S) — done 2026-07-06, commit 75eb1d4
  - `COMPILER_PASS_CONTRACT.md`: gate markers in §1, Rules 9 (manifest upsert via `build-layers-manifest`) + 10 (stage gate, read-only approvals check, stop wording), §3 table row + exemption, §5 lens carries manifest hash, §6 re-run refreshes manifest
  - 6 × `.claude/skills/guide-pass-*/SKILL.md`: step-0 gates (widgets/ra-mapping/qa) + manifest upsert steps (spine/widgets/ra-mapping) + ra-mapping flag-hygiene note, never-in-manifest notes (sources/extract-data)

### Checkpoint: Complete
- [ ] `yarn check` green
- [ ] Manual walk of `/review/pokemon-crystal` (stages, 9 cards, group approve, export diff)
- [ ] Spine-stage fixture: reviewable, not playable, correct placeholders
- [ ] PR opened; `data` orphan record flagged in description
