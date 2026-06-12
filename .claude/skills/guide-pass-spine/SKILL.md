---
name: guide-pass-spine
description: >-
  TOTODILE compiler pass 2 of 5 — spine extraction. Use when Pierre asks to
  "run the spine pass", "extract the spine/route/walkthrough for <slug>", or to
  re-run it after a rejection. Extracts the chapter/step tree from the route
  source(s) into layers/spine.json with sourceRefs and confidence on every
  step, through outline and sample gates. Requires the sources pass to have
  run. Not for single-file HTML guides — that is achievement-guide-builder.
---

# Compiler pass: spine extraction

**Read `COMPILER_PASS_CONTRACT.md` (repo root) first.** Schemas:
`app/src/schema/spine.ts` (step/chapter shapes), `layers.ts` (`spineLayer`,
`passReportFile`), `common.ts` (the ID grammar).

Operating constraints (contract §2): invent nothing — every place, NPC, item,
count, and input comes from a source and is reproduced exactly; connective
prose may be lightly reworded, facts never (third-party prose is reworded,
facts are not copyrightable). No step is too small, but granularity is capped
by the source — a gap is `confidence: "flagged"` + an anomaly, never a guess.
Ask, don't decide.

## Reads / emits

- Reads: `sources.json` (route + map sources), the prior `layers/spine.json`
  if any (ID preservation, §6.8), rejection notes for the spine layer in
  `approvals.json` (read-only — they are the work order).
- Emits: `layers/spine.json` + `layers/spine.report.json`; images into
  `guides/<slug>/images/`.

## Workflow

### 1. Outline — gate
Propose the chapter breakdown following the route source's structure: chapter
IDs (`<slug>:c<n>`), titles, order, and roughly where the RA achievements land
(steps carry `achievementRefs`). Classify missables now and flag any you are
unsure about as questions. Wait for sign-off; write no step content yet.

### 2. Sample — gate
Extract **only the first one or two chapters** fully: steps with `text`,
`location`, `missable` (with its deadline), `achievementRefs`, `images`,
`sourceRefs` (≥1), `confidence`. This calibrates granularity, tone, and image
placement. Show the sample (the JSON plus a readable summary); adjust to
feedback before continuing.

### 3. Full extraction
- Chapter by chapter, same discipline. Use `step.section` for source section
  headings; `chapter.intro` for chapter preambles.
- **IDs** (§6.8): steps are `<slug>:c<n>:s<n>`, minted once. On a re-run,
  read the prior artifact first and re-emit every surviving step under its
  original ID even if it moved chapters (the middle segment records where it
  was *minted*). Never renumber to "clean up".
- **Images**: download (curl) into `guides/<slug>/images/`, reference by
  relative path with real alt text. Unreachable → ask Pierre for the file;
  never emit a broken ref.

### 4. Report + finish
- `layers/spine.report.json`: `pass`/`layer` = `spine`; `rowCount` = total
  steps; `flaggedItemIds` = exactly the steps marked `flagged` (the validator
  enforces parity); every flag also gets an `anomalies` line saying why;
  `inputs` = the files read, with digests (`sha256sum <file>`), at minimum
  `sources.json`; on a re-run, `notes` states what changed and which rejection
  note it answers.
- `yarn validate-guides` green (it schema-checks the layer, flag parity, and
  that every `sourceRefs` entry resolves). Re-runs also finish with
  `yarn check-stable-ids <slug>` green — the §6.8 hard gate behind the ID rule.
- One commit: `guide(<slug>): spine <note>`.
