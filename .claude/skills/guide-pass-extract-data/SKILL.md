---
name: guide-pass-extract-data
description: >-
  TOTODILE compiler pass 2 of 6 — data extraction. Use when Pierre asks to "run
  the extract-data pass", "extract/classify the data for <slug>", or to re-run it
  after a change. Classifies raw source facts ONCE into layers/data.json — generic
  category tables (encounters, items, trades, …) plus an `images` catalog of the
  assets already in the sources — so the spine and widget passes draw from it
  instead of each re-reading sources. Requires the sources pass. Not for
  single-file HTML guides — that is achievement-guide-builder.
---

# Compiler pass: data extraction (schema v1)

**Read `COMPILER_PASS_CONTRACT.md` (repo root) first.** Schema:
`app/src/schema/layers.ts` (`dataLayer`, `dataset`, `dataRecord`,
`passReportFile`). A complete worked artifact lives in
`examples/data.sample.json` (validated by
`app/tests/skills/extractDataExample.test.ts`) — copy its shape.

This is **pass 2 of 6**, between `source-gathering` and `spine`. It is
**mandatory** (spine + widgets consume its output) but **intermediate**:
`layers/data.json` is never assembled into `guide.json` and is **not reviewed/
approved** — it is mechanically validated only (schema + every `sourceRefs`
resolves in `sources.json`). Its record IDs are **local** (single-segment), so
they stay out of the checkable namespace and `check-stable-ids` never touches
them.

Operating constraints (contract §2): **invent nothing** — every value comes from
a source and is reproduced exactly; connective wording may be lightly reworded,
facts never. A gap is `confidence: "flagged"` + an anomaly line, never a guess.
Ask, don't decide.

## The model — generic category tables

`data.json` holds `datasets[]`. Each **dataset** is one fact category
(`id` = a local kebab slug like `encounters`, a human `label`, `records[]`).
Each **record** is one atomic fact: a local `id`, a flat `fields` map (string
keys → string values, reproduced exactly from source), `sourceRefs` (≥1), and
`confidence`. Game-agnostic by design — it mirrors the `dataTable` primitive, so
no per-game typed schemas.

## Reads / emits

- Reads: `sources.json`, the prior `layers/data.json` if any (ID preservation),
  the source materials themselves (the snapshot files `sources.json` points at).
- Emits: `layers/data.json` + `layers/data.report.json`.

## The `images` catalog (a standard dataset)

Always emit an **`images`** dataset: one record per image **already present in
the source snapshot** that a downstream pass might use, so spine/widgets pick
from it rather than re-hunting (and never re-download). Each record's `fields`:

- `path` — the image's path within the source snapshot (e.g.
  `crystal-ap-tracker-11.0.4/images/maps/CherrygroveCity.png`);
- `kind` — `location-map` | `species-sprite` | `trainer` | `item-icon` | … ;
- `depicts` — the place / species / trainer / item it shows.

`sourceRefs` point at the snapshot source (e.g. `src-ap-tracker`). Catalog only
files that **actually exist** in the snapshot — a wanted-but-missing asset is an
anomaly, never a record. Downstream: the spine reads `kind: location-map`
records for a location's `mapImage`; widget passes read sprites / icons for
encounter tables, dex, and boss boards.

## Workflow

### 1. Categories — gate
Propose the **dataset set** for this guide — the fact categories worth
classifying (e.g. `encounters`, `items`, `trades`, `trainers`, plus the required
`images`) and, for each, the `fields` its records will carry. Anchor every
category to the sources that supply it. Wait for sign-off; write no records yet.

### 2. Fill
- One record per atomic fact; `fields` reproduced exactly from source. Every
  record: local `id`, `sourceRefs` (≥1), `confidence`.
- **Deterministic local IDs** — mint each record `id` from stable content keys
  (e.g. `<location>-<species>`, `map-<place>`), never sequence position, so a
  re-run reproduces them. On a re-run, read the prior `data.json` and re-emit
  every surviving record under its original `id`.
- Build the `images` catalog per the rules above.
- Gaps / source conflicts → `confidence: "flagged"` + an anomaly line.

### 3. Report + finish
- `layers/data.report.json`: `pass` = `extract-data`, `layer` = `data`;
  `rowCount` = total records across all datasets; `inputs` = files read with
  `sha256sum` digests (at minimum `sources.json`); flagged records are explained
  in `anomalies` (the data layer carries no `flaggedItemIds` — its IDs are local,
  not checkables, and it is unreviewed). On a re-run, `notes` states what changed.
- `yarn validate-guides` green (it schema-checks the layer and that every record
  `sourceRefs` entry resolves).
- One commit: `guide(<slug>): data <note>`.
