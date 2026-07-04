# Review Lens Improvements: Per-Stage Gating + Merged Slot Cards

## Context

Two pain points from the Crystal pilot review experience:

1. **Review only starts after the whole pipeline runs.** The roster is derived from `qa.report.json` (`app/src/review/layerRoster.ts:39-41`), so nothing is reviewable until the final QA pass. By then, ra-mapping has re-flagged target items that live in spine/widget layers, so the same lines get flagged across multiple cards.
2. **~318 widget layers = ~318 review cards.** Crystal has 78 `widget-enc-*`, 129 `widget-items-*`, 73 `widget-tr-*`, 17+17 chapter-scoped, plus singletons — each its own `LayerReviewCard`. This is exactly PRD §15 risk 2 (editor fatigue).

**Decisions made by Pierre (2026-07-04):**
- **Per-stage gating**: pipeline pauses for review-lens approval after each reviewable stage: spine → [gate] → all widget passes → [gate] → ra-mapping → [gate] → qa. Enforced in the compiler skill contract (skills read `approvals.json`, never write it — PRD §23.4 unchanged).
- **One group verdict** per merged slot card: approve/reject applies to all members; note fans out to every member `layerRecord`. Grouping is UI-only — `approvals.json` keeps one hash-locked record per layer (schema unchanged).
- **Roster from a new `guides/<slug>/layers/manifest.json`** that each reviewable pass upserts, so the lens can build the roster at any pipeline point.

Crystal is already fully approved (321 records, all `approved`), so this lands for future guides and Crystal re-runs. Note: Crystal's committed `approvals.json` contains an out-of-contract `data` record — the next lens export will silently drop it (correct behavior; surface to Pierre, don't hand-edit).

## Architecture decisions

- **Manifest is denormalized**: widget entries carry `{deckPosition, scope, title}` so grouping needs no per-artifact fetches (~318 avoided).
- **Hard cutover** of the roster to manifest (no qa.report.json fallback) — one guide exists and gets backfilled in the same change-set.
- **Playability fix**: `isPlayable` currently returns true for a partial (e.g. spine-only) all-approved `approvals.json` — with per-stage exports this becomes a real bug (guide goes "playable" after stage 1, review route redirects to play). New rule: playable iff QA complete AND every manifest entry has an approved record.
- **No flag suppression in ra-mapping**: `flaggedItemIds` must stay equal to flagged-confidence rows (contract §4, validator parity). Per-stage timing plus a lens-side "target already approved" badge handles the dedupe pain.
- **Stages don't UI-block**: the lens organizes cards into stage sections and shows waiting placeholders; enforcement is the skill gates' job (backfilled guides show everything at once).

---

## Task list

### Phase 1: Foundation (manifest)

#### Task 1: Manifest schema + validator + backfill script
**Description:** New Zod schema `layersManifest`; `yarn validate-guides` verifies it; a permanent script generates it from disk; commit Crystal's backfilled manifest.

Files:
- `app/src/schema/manifest.ts` (new): `manifestLayerKind = ["spine","widget","ra-mapping"]`; `manifestEntry = {id, kind, artifact, report, sha256 (64-hex), widget?: {deckPosition, scope, title}}` (reuse `widgetScope` from `widgets.ts`, `sha256` regex per `layers.ts` reportInput); `layersManifest = {schemaVersion, guideId, entries[]}` with superRefine: no duplicate ids, kind↔id consistency, `widget` meta required iff kind is `widget`. Export from `schema/index.ts`; note in `schema/CHANGELOG.md`.
- `app/scripts/validateGuidesCore.ts`: stop treating `manifest.json` as "unrecognized layer file" (~:380-387); add checks — entry artifact/report exist on disk, `sha256` matches actual bytes, widget meta matches the parsed widget layer, every reviewable artifact on disk has an entry and vice versa.
- `app/scripts/buildLayersManifestCore.ts` + `buildLayersManifest.ts` (new, follow validateGuidesCore pattern): enumerate `layers/`, take spine / `widget-*` / `ra-mapping` artifacts, parse widget layers for meta, hash bytes, emit via `layersManifest.parse`. Add `build-layers-manifest` to `app/package.json`.
- Run it for Crystal; commit `guides/pokemon-crystal/layers/manifest.json` (320 entries).

**Acceptance criteria:**
- [ ] `yarn build-layers-manifest pokemon-crystal` produces a manifest with 320 entries (spine + 318 widgets + ra-mapping), widget entries carrying correct deckPosition/scope/title
- [ ] `yarn validate-guides` passes with the manifest committed; fails with findings on stale sha256 / missing entry / meta mismatch
**Verification:** new `app/tests/schema/manifest.test.ts` (superRefine cases), `app/tests/scripts/buildLayersManifest.test.ts` (fixture dir → entries+digests), extend `validateGuides.test.ts`; `yarn check` green.
**Dependencies:** none. **Scope:** M (5 files + tests)

#### Task 2: Roster cutover to manifest
**Description:** `loadLayerRoster` reads `layers/manifest.json` instead of `qa.report.json`; `LayerReport` gains `widget?` metadata.

Files: `app/src/review/layerRoster.ts` (fetch manifest, 404→`[]`, parse, fetch each entry's `.report.json` as today, `contentHash = "sha256:"+entry.sha256`, drop `kindOf`, keep sort), `app/tests/review/layerRoster.test.ts` (rewrite stubs), `reviewLens.test.tsx` / `reviewReskin.test.tsx` stubs gain `manifest.json`.

**Acceptance criteria:**
- [ ] Roster for Crystal is identical to today's (same ids, order, hashes) — lens renders unchanged
- [ ] No manifest → empty roster; malformed manifest → throw
**Verification:** updated tests pass; manual: `/review/<slug>` on a manifest-backed fixture. `yarn check`.
**Dependencies:** T1. **Scope:** S

### Checkpoint A
- [ ] `yarn check` green; Crystal lens renders as before the change; manifest committed and validator-enforced.

### Phase 2: Per-stage review paths

#### Task 3: Playability requires pipeline completion
**Description:** Fix the latent partial-approvals bug. `isPlayable(approvals, manifest, qaComplete)`: true iff qaComplete && approvals non-empty && all approved && every manifest entry id approved (manifest `null` → legacy behavior). Add `loadPlayability(slug)` fetching approvals + manifest + `qa.report.json` existence (status-only check).

Files: `app/src/review/approvalsData.ts`, `app/src/shell/router.tsx` (library loader :57-70, guide/cleanup/place guards :87/:107/:131, review bounce :158-160), `app/tests/review/approvalsData.test.ts`, affected shell router tests.

**Acceptance criteria:**
- [ ] Spine-only all-approved approvals + no qa report → NOT playable (regression-pinned)
- [ ] Manifest entry missing from approvals → not playable; Crystal remains playable
**Verification:** truth-table tests; `yarn check`.
**Dependencies:** T1 (parallel with T4). **Scope:** M

#### Task 4: Mid-pipeline content resolution
**Description:** The lens must render flagged rows before `guide.json` exists. New `app/src/review/reviewContent.ts` — `loadReviewGuide(slug, roster)`: try `loadGuide`; on 404 assemble in-memory from `layers/spine.json` + roster widget artifacts (same mechanical merge as `assembleGuideCore.ts:121-129`, widgets sorted by deckPosition, **skip** `guideFile.parse` — cross-layer invariants are QA's job; verify no lens code depends on guideFile-only refinements). No spine → null. Extend `reviewLoaders.ts` ra-mapping loader with `layers/ra-mapping.json` fallback. Wire into review route loader (`router.tsx:163-171`).

**Acceptance criteria:**
- [ ] guide.json present → identical behavior to today
- [ ] Spine-only pipeline state: spine card renders flagged rows; widget stage shows nothing broken
**Verification:** new `app/tests/review/reviewContent.test.ts` (passthrough / assembled / spine-only); `yarn check`.
**Dependencies:** T2. **Scope:** M

### Checkpoint B
- [ ] A fixture guide at spine-stage (manifest with 1 entry, no guide.json, no qa report) is reviewable and NOT playable end-to-end.

### Phase 3: Merged slot cards

#### Task 5a: Slot groups render
**Description:** Group widget layers by `widget.deckPosition` into one card per deck slot.

Files:
- `app/src/review/slotGroups.ts` (new): `buildSlotGroups(widgets: LayerReport[]): SlotGroup[]` — model on `spine/locationIndex.ts:18-47`; `SlotGroup = {deckPosition, title, layers[]}`; title from `deck.json` slot `defaultTitle` (load deck in review route loader), fallback first member's `widget.title`; a widget layer missing meta → singleton group, never dropped.
- `app/src/review/SlotGroupCard.tsx` (new): used for every widget slot (singletons too — one code path). Header: title, `slot N`, member count, summed flags/rows, folded group status (all approved→Approved, any rejected→Rejected, all draft→Unreviewed, else Mixed). Body: per flagged member a subsection (member id + scope label resolved via guide + `FlaggedRowView`s via existing `resolveFlaggedRows`), flag-free members collapsed to one count line; member anomalies inside subsections.
- `app/src/review/VerdictControls.tsx` (new): extract approve/reject/change block from `LayerReviewCard.tsx:130-203`; both cards use it. `LayerReviewCard` remains for spine/ra-mapping.
- `app/src/review/ReviewScreen.tsx`: widgets render via `buildSlotGroups` → `SlotGroupCard`; add deck prop; progress line adds "K/N slots".

**Acceptance criteria:**
- [ ] Crystal shows 9 widget cards instead of 318 (slots 0,1,6,7 singletons; 2×78, 3×73, 4×129, 5×17, 8×17)
- [ ] Flagged members visible inside their group card with source-linked rows
**Verification:** new `slotGroups.test.ts`; `reviewLens.test.tsx` asserts two same-slot widgets → one card; `yarn check`.
**Dependencies:** T2, T4. **Scope:** M

#### Task 5b: Group verdict fan-out + group spot-check
**Description:** One verdict click writes N member verdicts; spot-check samples across the group.

Files:
- `app/src/review/useLayerVerdicts.ts`: add `recordAll(layerIds, status, note?)` / `clearAll(layerIds)` — one date, N `putLayerVerdict` calls, single state update. `reviewStore.ts` unchanged.
- `app/src/review/spotCheck.ts`: `groupUnflaggedRows(layers, index)` = union of members' unflagged pools; existing `sampleRows` unchanged. Verdicts route to the owning layer: map itemId prefix `<slug>:<seg>:` → `widget-<seg>` (same convention as `spotCheck.ts:24`); `SlotGroupCard` records under the owning layerId. Panel header: "sampled across N member layers".
- `SlotGroupCard.tsx`: wire `VerdictControls` to `recordAll`/`clearAll`; rejection note placeholder tells Pierre to name the failing members (widget-pass re-run reads notes per layer).
- `buildApprovals.ts`: **no change** — each member id resolves its own (identical) verdict from the map.

**Acceptance criteria:**
- [ ] Group approve → every member has an identical draft verdict (via `readGuideVerdicts`); export contains all members approved with same date/note
- [ ] Group reject requires a note; note appears on every member record; export still schema-valid
- [ ] Spot-check verdicts land on the owning member's `layerRecord.spotChecks`
**Verification:** `approveFlow.test.tsx`, `spotCheckFlow.test.tsx`/`spotCheck.test.ts`, `buildApprovals.test.ts` (add partial-roster export case); `yarn check`.
**Dependencies:** T5a. **Scope:** M

### Checkpoint C
- [ ] Crystal walk-through: 9 slot cards; group-approve slot 5 (17 members) → 17 identical verdicts; export diffs cleanly against committed approvals.json (modulo the dropped `data` orphan — expected).

### Phase 4: Stage sections + contract

#### Task 6: Stage sections, waiting states, export copy, target-approved badge
**Description:** Organize the lens into 3 fixed stage sections and message the gate workflow.

Files:
- `app/src/review/stages.ts` (new): `ReviewStage = "spine"|"widgets"|"ra-mapping"`, `STAGE_ORDER`, `stageOf(kind)`, `stageStates(roster, effectiveStatus)` → empty | in-review | approved | rejected per stage.
- `ReviewScreen.tsx`: three sections in order, header badges; empty stage → waiting placeholder naming the unlock ("Approve the spine, export approvals.json, commit, then run `guide-pass-widgets`" / same for `guide-pass-ra-mapping`). Existing later-stage cards are never UI-blocked. Export button helper copy: stage fully approved → "…export and commit to unlock the next stage"; otherwise name the incomplete stage.
- `flaggedRows.ts` / `FlaggedRowView`: ra-mapping flagged row whose `targetItemId` belongs to an approved layer gets a "target already approved" badge — Pierre judges only the mapping, not the row content (the flag-dedupe payoff).

**Acceptance criteria:**
- [ ] Spine-only fixture: widgets + ra-mapping sections show waiting placeholders; spine section reviewable
- [ ] Fully-populated guide renders all three sections with correct status badges
- [ ] Flagged ra-mapping row targeting an approved item shows the badge
**Verification:** new `stages.test.ts`; `reviewLens.test.tsx` additions; `yarn check`.
**Dependencies:** T5. **Scope:** S/M

#### Task 7: Compiler contract + skill gates (docs only)
**Description:** Make the pipeline actually wait.

Files:
- `COMPILER_PASS_CONTRACT.md`: §1 pipeline diagram gains `[review gate]` markers after spine / widget fill / ra-mapping. §2 new Rule 9 (every reviewable pass upserts its `layers/manifest.json` entry; sources/extract-data/qa never appear) and Rule 10 (before running, a pass verifies the previous stage in `approvals.json` read-only: widgets need spine approved + hash-current; ra-mapping needs that + every `widget-*` manifest entry approved + hash-current; qa needs everything; missing/rejected/draft/stale → stop, hand back to Pierre; passes never write approvals.json). §3 table: add `manifest.json` row, exempt from "anything else is a violation". §6: re-runs refresh the manifest sha256.
- `.claude/skills/guide-pass-spine/SKILL.md`: finish step upserts manifest entry (create file on first run); no entry gate.
- `.claude/skills/guide-pass-widgets/SKILL.md`: new "0. Gate — spine approved" before "1. Pick the slot"; finish upserts entry incl. `widget` meta.
- `.claude/skills/guide-pass-ra-mapping/SKILL.md`: gate (spine + all widgets approved, hash-current); manifest upsert; flag-hygiene note: flags state *mapping* doubt, never re-litigate approved target rows.
- `.claude/skills/guide-pass-qa/SKILL.md`: gate (all manifest entries approved + hash-current); note validate-guides now checks manifest; QA adds no entry.
- `guide-pass-sources` / `guide-pass-extract-data` SKILL.md: one line each — never in the manifest, no gate.

**Acceptance criteria:**
- [ ] Contract and all 6 skills consistent with each other and with the manifest schema field names
- [ ] Gates specify exact check (record status + `contentHash` vs `sha256sum` of current bytes) and the stop message
**Verification:** doc review; `yarn check` (unchanged code). **Dependencies:** T1 (parallel with Phases 2-3). **Scope:** S

### Checkpoint: Complete
- [ ] `yarn check` green from `app/`
- [ ] Manual walk of `/review/pokemon-crystal`: stage sections, 9 slot cards, group approve, export, diff vs committed approvals.json
- [ ] Spine-stage fixture: reviewable, not playable, correct waiting placeholders
- [ ] PR per workflow (branch `feat/review-lens-stage-gating` or similar); flag the dropped `data` orphan record in the PR description

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Partial approvals makes guide playable early | High | T3 fixes + regression test (do it before any per-stage export is possible) |
| Group note fans out verbatim to up to 129 layers; re-runs read notes per layer | Med | Card copy instructs naming failing members; revisit per-member reject if it bites |
| Mid-pipeline fetch volume (~320 reports + ~320 artifacts once) | Low | Accept for local editor tool; lazy-load later only if needed |
| Post-approval artifact drift blocks next stage via hash gate | Low (by design) | Fix path is re-run + re-review, documented in contract §6 |
| ra-mapping flag noise persists despite staging | Low | Target-approved badge (T6); only then consider suppression (would break contract §4 parity) |

## Notes for implementation
- On approval, first copy this plan to `tasks/plan.md` and the task list to `tasks/todo.md` (per the /plan command), then start T1 on a `feat/` branch.
- Never touch `guides/*/approvals.json` by hand at any point (PRD §23.4) — including the `data` orphan.
- Schema changes are limited to the new `manifest.ts` (approved by Pierre 2026-07-04); `approvals.ts` is untouched.
