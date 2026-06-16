---
name: guide-pass-spine
description: >-
  TOTODILE compiler pass 2 of 5 — spine extraction. Use when Pierre asks to
  "run the spine pass", "extract the spine/route/walkthrough for <slug>", or to
  re-run it after a rejection. Extracts locations + the chapter→visit→step tree
  from the route source(s) into layers/spine.json with keyword beats, sourceRefs
  and confidence on every step, through outline and sample gates. Requires the
  sources pass to have run. Not for single-file HTML guides — that is
  achievement-guide-builder.
---

# Compiler pass: spine extraction (schema v1)

**Read `COMPILER_PASS_CONTRACT.md` (repo root) first.** Schemas:
`app/src/schema/spine.ts` (`location`, `visit`, `chapter`, `step` shapes),
`layers.ts` (`spineLayer`, `passReportFile`), `common.ts` (the ID grammar).
A complete worked artifact lives in `examples/spine.sample.json` (it is what
`tests/skills/spinePassExample.test.ts` validates) — copy its shape.

Operating constraints (contract §2): invent nothing — every place, NPC, item,
count, and input comes from a source and is reproduced exactly; connective
prose may be lightly reworded, facts never (third-party prose is reworded,
facts are not copyrightable). No step is too small, but granularity is capped
by the source — a gap is `confidence: "flagged"` + an anomaly, never a guess.
Ask, don't decide.

## The v1 shape (what changed)

The spine is now **locations + chapter → visit → step**:

- **`locations[]`** (top level): every distinct place the route names — a stable
  `location = { id, name, mapImage? }`. The location index aggregates everything
  earnable at a place across all its visits, so one entry per place, deduped.
- **`visit`** = one occurrence of being at a location within a chapter
  (`{ id, locationId, order, steps[] }`). Consecutive steps at the same place are
  one visit; **returning to a place later is a NEW visit with the same
  `locationId`** (a revisit). Visits are structure, not checkable — they hold no
  progress state.
- **`chapter`** now holds `visits[]` (was `steps[]`) — a titled arc; place
  aggregation is the location index's job, not the chapter's.
- **`step`** is the checkable leaf: `keywords[]` (≥1 terse beats, shown by
  default) + optional `detail` (full prose). The old free-text `location` and
  the `section` grouping label are **gone** — place identity is `visit.locationId`,
  grouping is the visit itself.

## Reads / emits

- Reads: `sources.json` (route + map sources), the prior `layers/spine.json`
  if any (ID preservation, §6.8), rejection notes for the spine layer in
  `approvals.json` (read-only — they are the work order).
- Emits: `layers/spine.json` + `layers/spine.report.json`; images into
  `guides/<slug>/images/`.

## Keyword-splitting rules (prose → beats + detail)

Every step carries **both**:

- **`detail`** — the full, source-faithful prose for the step. Connective
  wording may be lightly reworded; every fact (place, NPC, item, count, input,
  level) is reproduced exactly. This is the source of truth a reviewer checks.
- **`keywords[]`** — 1–4 **terse imperative beats** that summarise the
  *actionable* content of `detail`, in action order. Rules:
  - Each beat is a short imperative phrase (~2–6 words): "Take the lantern",
    "Buy 3 rope", "Beat the Sentry Captain".
  - **Every beat traces to `detail`/the source** — a beat may compress or omit,
    never add. If it is not in `detail`, it is not a beat.
  - Keep load-bearing specifics that change what the player does (counts,
    names, levels): "Buy **3** rope", "Rival at **Lv 5**".
  - Don't restate the missable/achievement banner in a beat — those render from
    `missable`/`achievementRefs`. The deadline text lives only in `missable`.
  - A step always has ≥1 beat; if a step is one atomic action, one beat is fine
    and `detail` may be omitted only when the beat already says everything.

## Workflow

### 1. Outline — gate
Propose, following the route source's structure:
- the **chapter** breakdown — chapter IDs (`<slug>:c<n>`), titles, order;
- the **location set** — each place the chapters touch, with its proposed
  `locationId`;
- the **visit sequence** per chapter — the ordered stops, calling out which are
  **revisits** (same `locationId` seen again);
- roughly where the RA achievements land (steps carry `achievementRefs`).

Classify missables now and flag any you are unsure about as questions. Wait for
sign-off; write no step content yet.

### 2. Sample — gate
Extract **only the first one or two chapters** fully, in the
`examples/spine.sample.json` shape: `locations[]` for the places they touch;
`visits` with `locationId`/`order`/`steps`; steps with `keywords[]` (≥1),
`detail`, `missable` (with its deadline), `achievementRefs`, `images`,
`sourceRefs` (≥1), `confidence`. This calibrates granularity, the beat/detail
split, tone, and image placement. Show the sample (the JSON plus a readable
summary); adjust to feedback before continuing.

### 3. Full extraction
- Chapter by chapter, same discipline. Use `chapter.intro` for chapter
  preambles. Group consecutive same-place steps into one visit; open a new
  visit (same `locationId`) on every return.
- **Deterministic ID minting (§6.8)** — IDs are derived from stable content
  keys, never sequence position, so a re-run reproduces them:
  - **location**: `<slug>:<kebab-of-place-name>`, e.g.
    `pokemon-crystal:cherrygrove-city`. Stable forever; one per place.
  - **visit**: `<slug>:v-<location-segment>-<k>`, where `k` is the k-th visit to
    that location in spine order, e.g. `pokemon-crystal:v-cherrygrove-city-2`
    for the second visit.
  - **step**: minted **under its visit** — `<slug>:<visit-segment>:s<n>`. The
    middle segment records where the step was *minted*; it is a convention, not
    a validated containment, so it never has to change again.
  - **Preserve prior IDs on re-run / migration.** Read the prior artifact first
    and re-emit every surviving step under its **original** ID even if it moved
    visits or chapters. A guide migrated from v0 keeps its v0 step IDs
    (`<slug>:c<n>:s<n>`) — do **not** re-mint them under visits. Never renumber
    to "clean up"; `yarn check-stable-ids` is the hard gate.
- `visit.order` is sequential within its chapter; `step.order` is sequential
  within its visit.
- **Images**: download (curl) into `guides/<slug>/images/`, reference by
  relative path with real alt text; a location may carry a `mapImage`.
  Unreachable → ask Pierre for the file; never emit a broken ref.

### 4. Report + finish
- `layers/spine.report.json`: `pass`/`layer` = `spine`; `rowCount` = total
  steps; `flaggedItemIds` = exactly the steps marked `flagged` (the validator
  enforces parity); every flag also gets an `anomalies` line saying why;
  `inputs` = the files read, with digests (`sha256sum <file>`), at minimum
  `sources.json`; on a re-run, `notes` states what changed and which rejection
  note it answers.
- `yarn validate-guides` green (it schema-checks the layer, the visit→location
  FK, location/visit ID uniqueness, flag parity, and that every `sourceRefs`
  entry resolves). Re-runs also finish with `yarn check-stable-ids <slug>`
  green — the §6.8 hard gate behind the ID rule.
- One commit: `guide(<slug>): spine <note>`.
