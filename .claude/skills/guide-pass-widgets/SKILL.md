---
name: guide-pass-widgets
description: >-
  TOTODILE compiler pass 4 of 6 — widget fills. Use when Pierre asks to "run
  the widget pass", "fill the <name> widget / encounter table / boss board for
  <slug>", or to re-run one after a rejection. Fills ONE widget instance per
  run (one layer per widget) from the deck's slots, anchored to the spine.
  Requires the extract-data and spine passes.
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
- **`stepRef`** (added 2026-07-31) — the step where the route hands the player
  this item. Ticking that step ticks the row, so a wrong link silently ticks
  something the player never got.
  - Set it ONLY when a source ties this item to that specific step. The
    strongest evidence is the two texts being the same sourced sentence (a
    berry row's `how` and the step's `detail` both taken from the walkthrough);
    next strongest is a 1:1 pairing inside a container the source itself names
    — one cassette per chapter, one "Grab the Cassette Tape" step in that
    chapter.
  - **No source, no link. Leave it out.** An unlinked row is the normal state
    and costs nothing; a guessed link is invented content (§24, §0.2).
    `confidence: "flagged"` is NOT a way to ship a speculative link — flag the
    row's *data* if it is doubtful, but omit the link.
  - Do not link by elimination across two datasets that share only a coarse
    key. Celeste's map pins and its berry route agree on chapter, side and
    checkpoint, and a checkpoint holds several berries: pairing them by order
    would be a guess dressed up as a join. Those 225 pins are deliberately
    unlinked (of 175 pin/berry pairs only 3 are unambiguous, and linking just
    those would make the behaviour look random to a player).
  - One direction, one step: a row names at most one step, and a step never
    names rows. If two steps could both hand over the item, the route has one
    place it actually happens — pick that one, or leave it out and say why.
  - Report `stepRef` coverage in the pass report's `notes`: how many rows got
    a link, how many could not, and why not. An honest zero is a fine result.
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
