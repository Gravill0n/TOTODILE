---
name: guide-pass-widgets
description: >-
  TOTODILE compiler pass 3 of 5 — widget fills. Use when Pierre asks to "run
  the widget pass", "fill the <name> widget / encounter table / boss board for
  <slug>", or to re-run one after a rejection. Fills ONE widget instance per
  run (one layer per widget) from the deck's slots, anchored to the spine.
  Requires the spine pass. Not for single-file HTML guides — that is
  achievement-guide-builder.
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

- Reads: `layers/spine.json` (step anchoring, chapter scoping), `deck.json`
  (which slots exist and their primitives), `sources.json`, the prior version
  of this widget's layer if any, rejection notes (read-only).
- Emits: `layers/widget-<seg>.json` + `layers/widget-<seg>.report.json`.

## Workflow

### 1. Pick the slot — gate
Ask which deck slot to fill (or propose the next empty one). The widget's
`type` must match the slot's `primitive` and its `deckPosition` must point at
that slot — the validator enforces both.

### 2. Compose — gate
Propose the widget before filling it: `id` (`<slug>:<seg>`, the `<seg>` also
names the layer file), `title`, `scope` (`global` or a specific chapter), and
what the rows/cells/pins will be drawn from in the sources. For scoped data
(encounter tables, boss boards), anchor to the spine's chapters — the data
must answer "where I currently am" (P4). Wait for sign-off.

### 3. Fill
- Every checkable row/cell/pin/counter: `itemId` (`<slug>:<seg>:<short>`),
  `sourceRefs` (≥1), `confidence`. Informational dataTable rows set
  `checkable: false` but still carry stable IDs.
- **IDs** (§6.8): minted once; on a re-run, read the prior artifact and keep
  every surviving item's ID — even items that move rows or sections.
- Map images (mapPins) download into `guides/<slug>/images/`; unreachable →
  ask Pierre.

### 4. Report + finish
- `layers/widget-<seg>.report.json`: `pass` = `widget`, `layer` =
  `widget-<seg>`; `rowCount` = checkable rows emitted; `flaggedItemIds` =
  exactly the rows marked `flagged`, each with an anomaly line; `inputs` =
  files read with `sha256sum` digests (at minimum `layers/spine.json`,
  `deck.json`, `sources.json`).
- `yarn validate-guides` green. Re-runs also finish with
  `yarn check-stable-ids <slug>` green — the §6.8 hard gate behind the ID rule.
- One commit: `guide(<slug>): widget-<seg> <note>`.
