---
name: guide-pass-widgets
description: >-
  TOTODILE compiler pass 4 of 6 — widget fills. Use when Pierre asks to "run
  the widget pass", "fill the <name> widget / encounter table / boss board for
  <slug>", or to re-run one after a rejection. Fills ONE widget instance per
  run (one layer per widget) from the deck's slots, anchored to the spine.
  Requires the extract-data and spine passes. Not for single-file HTML guides —
  that is achievement-guide-builder.
---

# Compiler pass: widget fill

**Read `COMPILER_PASS_CONTRACT.md` (repo root) first.** Schemas:
`app/src/schema/widgets.ts` (the 7 primitives — a closed set, §14.3),
`deck.ts`, `layers.ts` (`widgetLayer`, `passReportFile`).

Operating constraints (contract §2): invent nothing — every row, cell, count,
and threshold comes from a source, reproduced exactly; gaps are
`confidence: "flagged"` + an anomaly. Ask, don't decide.

**One widget instance per run.** Each widget is its own layer
(`layers/widget-<seg>.json`), reviewable in one sitting. Run the pass again
for the next widget.

## Reads / emits

- Reads: **`layers/data.json`** (the extract-data layer — fill rows/cells from
  its datasets, e.g. encounter tables from the `encounters` dataset, and pull
  `mapPins`/sprite images from its `images` catalog), `layers/spine.json` (step
  anchoring, chapter/location/visit scoping), `deck.json` (which slots exist and
  their primitives), `sources.json` (for `sourceRefs` and anything not in
  `data.json`), the prior version of this widget's layer if any, rejection notes
  (read-only).
- Emits: `layers/widget-<seg>.json` + `layers/widget-<seg>.report.json`.

## Workflow

### 0. Gate — spine approved (contract §2 Rule 10)
Before anything else, verify **read-only** against `approvals.json`:
- a record with `id: "spine"` exists with `status: "approved"`;
- it is hash-current: its `contentHash` equals `sha256:` +
  `sha256sum guides/<slug>/layers/spine.json` of the bytes on disk.

Missing record, `draft`, `rejected`, or a stale hash → **stop** and tell
Pierre: "The spine stage is not approved (state: `<missing | draft | rejected
| stale>`). Review it at `/review/<slug>`, export `approvals.json`, commit it,
then re-run this pass." Never write `approvals.json` and never work around
the gate.

### 1. Pick the slot — gate
Ask which deck slot to fill (or propose the next empty one). The widget's
`type` must match the slot's `primitive` and its `deckPosition` must point at
that slot — the validator enforces both.

### 2. Compose — gate
Propose the widget before filling it: `id` (`<slug>:<seg>`, the `<seg>` also
names the layer file), `title`, `scope` (`global`, or a specific `chapter` /
`location` / `visit`), and which `data.json` dataset its rows/cells/pins will be
drawn from. For place data (encounter tables, boss boards), anchor to the
spine — a route's encounter table is `location`-scoped so it shows on every
visit there — the data must answer "where I currently am" (P4). Wait for sign-off.

### 3. Fill
- Every checkable row/cell/pin/counter: `itemId` (`<slug>:<seg>:<short>`),
  `sourceRefs` (≥1), `confidence`. Informational dataTable rows set
  `checkable: false` but still carry stable IDs.
- **IDs** (§6.8): minted once; on a re-run, read the prior artifact and keep
  every surviving item's ID — even items that move rows or sections.
- Map / sprite images (mapPins, icons) come from the extract-data `images`
  catalog — copy the catalogued source file into `guides/<slug>/images/` and
  reference it; only download when the catalog lacks it; unreachable → ask Pierre.

### 4. Report + finish
- `layers/widget-<seg>.report.json`: `pass` = `widget`, `layer` =
  `widget-<seg>`; `rowCount` = checkable rows emitted; `flaggedItemIds` =
  exactly the rows marked `flagged`, each with an anomaly line; `inputs` =
  files read with `sha256sum` digests (at minimum `layers/spine.json`,
  `deck.json`, `sources.json`).
- **Upsert the manifest** (contract §2 Rule 9): `yarn build-layers-manifest
  <slug>` (from `app/`). The widget entry carries the denormalized
  `widget: { deckPosition, scope, title }` — the script derives it from the
  artifact; the review lens groups its slot cards from that meta.
- `yarn validate-guides` green (includes manifest↔artifact parity and
  widget-meta match). Re-runs also finish with `yarn check-stable-ids <slug>`
  green — the §6.8 hard gate behind the ID rule.
- One commit (manifest included): `guide(<slug>): widget-<seg> <note>`. Once
  **all** slots are filled and Pierre approves the widget stage in the lens
  (export + commit), `guide-pass-ra-mapping` unlocks.
