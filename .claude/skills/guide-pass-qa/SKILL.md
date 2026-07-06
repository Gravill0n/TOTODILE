---
name: guide-pass-qa
description: >-
  TOTODILE compiler pass 6 of 6 — QA and assembly. Use when Pierre asks to
  "run QA", "run the QA pass on <slug>", "assemble <slug>", or before handing
  a guide to review. Validates every layer, checks staleness, assembles the
  draft guide.json + ra-mapping.json mechanically, spot-reads flagged rows,
  and writes the QA report. Rejects problems back to the owning pass — it
  never edits content itself. Not for single-file HTML guides — that is
  achievement-guide-builder.
---

# Compiler pass: QA / assembly

**Read `COMPILER_PASS_CONTRACT.md` (repo root) first.** This pass is the
FR-D4 gate: schema violations and broken cross-references must die here,
before human review.

**This pass never edits guide content.** Every finding routes back to the
pass that owns the data (spine, a widget, ra-mapping, sources). QA fixes
nothing silently — not even a typo.

## Reads / emits

- Reads: everything under `guides/<slug>/` (layers, reports, sources, deck,
  library entry). `approvals.json` read-only, as always.
- Emits: `layers/qa.report.json`; on success, the assembled draft
  `guide.json` + `ra-mapping.json` (written by the script, not by hand).

## Workflow

### 0. Gate — every reviewable layer approved (contract §2 Rule 10)
Before anything else, verify **read-only** against `approvals.json`, for
**every entry in `layers/manifest.json`** (spine, all widgets, ra-mapping):
- a record with that `id` exists with `status: "approved"`;
- it is hash-current: its `contentHash` equals `sha256:` +
  `sha256sum guides/<slug>/layers/<id>.json` of the bytes on disk.

Any layer missing, `draft`, `rejected`, or hash-stale → **stop** and tell
Pierre: "The `<layer(s)>` are not approved (state: `<…>`). Review at
`/review/<slug>`, export `approvals.json`, commit it, then re-run QA."
Never write `approvals.json` and never work around the gate. QA itself adds
**no** manifest entry (Rule 9 — spine/widget/ra-mapping only).

### 1. Mechanical checks (scripts, from `app/`)
```bash
yarn validate-guides            # schema + cross-file invariants, layer contract, manifest parity + digests
yarn assemble-guide <slug>      # staleness check, then merge layers → guide.json (+ ra-mapping.json)
yarn check-stable-ids <slug>    # §6.8 hard gate: no protected ID from the shipped baseline may vanish
```
`check-stable-ids` diffs against `main` by default; pass `--against <ref>` when
the approved baseline lives elsewhere (e.g. re-running mid-branch after an
approval that has not merged yet).
`assemble-guide` refuses if any pass report's recorded input digest no longer
matches the file on disk (a stale layer — contract §6) or if the merged guide
violates `guideFile` (duplicate checkable IDs across layers, bad scope refs).
A refusal is a finding for the owning pass, not something to work around.
Re-run `yarn validate-guides` after assembly so the written `guide.json` is
checked in place.

### 2. Judgment checks
- **Flag spot-read**: open every `flaggedItemIds` entry across all reports
  next to its source; confirm the flag is honest (the doubt is real and the
  anomaly line explains it). Quietly-confident-but-wrong is the failure mode
  the review lens cannot catch (FR-E3 feeds on these flags).
- **Coverage**: every achievement in the ra-set source is either mapped or
  deliberately unmapped in the ra-mapping report's anomalies — none simply
  forgotten (FR-D4 "achievement with no step").
- **Images**: every `images/` reference in the layers exists on disk.
- **Missables**: each missable step states its deadline (P3 depends on it).

### 3. Report + finish
- `layers/qa.report.json`: `pass`/`layer` = `qa`; `rowCount` = files verified;
  every finding (mechanical or judgment) → `anomalies`, prefixed with the
  owning layer (`spine: …`, `widget-encounters: …`); rows needing review
  eyes → `flaggedItemIds`; `inputs` = every layer artifact with `sha256sum`
  digests (this records what QA actually saw).
- Verdict in plain words to Pierre: ready for review-lens approval, or which
  passes need re-runs and why.
- One commit: `guide(<slug>): qa <note>` (includes the assembled files when
  QA passed).
