---
name: guide-pass-ra-mapping
description: >-
  TOTODILE compiler pass 4 of 5 — RA mapping. Use when Pierre asks to "run the
  RA mapping pass", "map the achievements for <slug>", or to re-run it after a
  rejection. Maps each RetroAchievements achievement to the checkable step or
  widget item where it is earned, from the ra-set source on file — never the
  RA API. Requires the spine pass (and ideally the widget passes). Not for
  single-file HTML guides — that is achievement-guide-builder.
---

# Compiler pass: RA mapping

**Read `COMPILER_PASS_CONTRACT.md` (repo root) first.** Schemas:
`app/src/schema/raMapping.ts`, `layers.ts` (`passReportFile`).

Operating constraints (contract §2): invent nothing; ask, don't decide.
**Hard rule: the RA API key exists nowhere in this repo and this pass never
calls the RA API.** The achievement list comes from the `ra-set` source
recorded in `sources.json` — the public RA game page or an export Pierre
provides. Missing or stale ra-set source → back to the sources pass.

## Reads / emits

- Reads: the `ra-set` source, `layers/spine.json` + `layers/widget-*.json`
  (the checkable namespace: step IDs and item IDs), the library entry's
  `raGameId`, the prior `layers/ra-mapping.json` if any, rejection notes
  (read-only).
- Emits: `layers/ra-mapping.json` (the `raMapping` schema — identical to the
  final `ra-mapping.json`; assembly is a copy) + `layers/ra-mapping.report.json`.

## Workflow

### 1. Build the mapping table — gate
For every achievement in the ra-set source, propose the `targetItemId` (a step
or widget item) where it is earned. Conventions:
- Several achievements may target one step (progression + challenge on a boss).
- An achievement with no natural home is **left unmapped** — listed in
  `anomalies`, never force-fitted (unmapped achievements legally surface in
  the Sync receipt's "unmapped" bucket, §6.5).
- Every entry carries `sourceRefs` (≥1: the ra-set source, plus whatever
  source pinned the target step) and `confidence` (FR-D2).
- A mapping you are unsure about: emit it with `confidence: "flagged"` and an
  anomaly line saying why; its `targetItemId` lands in the report's
  `flaggedItemIds` (the validator enforces parity, like every other layer).
Present the full table (achievement → target, plus the unmapped list) and
wait for sign-off.

### 2. Emit
- `layers/ra-mapping.json`: `raGameId` must match the library entry; entries
  reference only IDs that exist in the spine/widget layers (the validator
  cross-checks the assembled guide; QA catches drift).
- Re-runs: mappings are keyed by `raAchievementId` — preserve existing targets
  unless the rejection note or new content says otherwise.

### 3. Report + finish
- `layers/ra-mapping.report.json`: `pass`/`layer` = `ra-mapping`; `rowCount` =
  entries; unmapped achievements → `anomalies`; doubtful targets →
  `flaggedItemIds`; `inputs` = files read with `sha256sum` digests (spine and
  widget layers at minimum).
- `yarn validate-guides` green. Re-runs also finish with
  `yarn check-stable-ids <slug>` green (targets must keep resolving against
  preserved IDs).
- One commit: `guide(<slug>): ra-mapping <note>`.
