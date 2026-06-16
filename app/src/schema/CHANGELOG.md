# Schema Changelog

The data-file contract (PRD §8.2): every guide file declares `schemaVersion`;
the app declares what it reads via `SUPPORTED_SCHEMA_VERSIONS` in `common.ts`.

## Conventions

- **Every change to the data contract bumps the version** — including new
  optional fields (§9.2). If a file's shape or meaning changes, the version
  changes; there is no silent additive drift.
- **Every bump ships a migration note** in its entry below: how a vN guide
  becomes a vN+1 guide.
- **Guides migrate at recompile, never in the browser at runtime** (§18.3).
- **Transition window**: while migrating, `SUPPORTED_SCHEMA_VERSIONS` holds
  `[N, N+1]` so the validator and app read both; once every guide in
  `guides/` is recompiled, it drops back to `[N+1]`.
- **Schemas stay non-strict**: Zod strips unknown keys instead of erroring,
  so guide data can run ahead of renderers (§9.2, §18.4 extensibility
  point 2). Pinned by `tests/schema/version.test.ts` — do not switch entity
  schemas to `.strict()`.
- **Stable IDs are exempt from evolution entirely**: no version bump may
  regenerate or re-spell existing IDs (§6.8); the grammar in `common.ts` is
  fixed forever.

## v1 — 2026-06-16 — Location/Visit reframe (Workstream A)

First real version bump (v0 was never frozen — there is no installed base, so
no in-browser migration and **no transition window**: `SUPPORTED_SCHEMA_VERSIONS`
goes straight to `[1]`, dropping v0). Guides are recompiled from scratch under
v1; the v0 compiled artifacts are retired (their `sources.json` is preserved).

Contract changes (PRD §6 / §9.x amendments, approved 2026-06-16):

- **New `location` entity** and a top-level `locations[]` on `guideFile` and
  `spineLayer`: a stable place (`<slug>:<loc>` id, name, optional `mapImage`)
  the location index aggregates around.
- **New `visit` entity**: one occurrence of being at a location within a
  chapter (`<slug>:<visit>` id, `locationId` FK, `order`, `steps[]`). Revisits
  are multiple visits sharing a `locationId`. Visits are structure, not
  checkable.
- **`chapter` now holds `visits[]`** (was `steps[]`). Steps mint under their
  visit (`<slug>:<visit>:<short>`); the ID grammar is unchanged (the middle
  segment is still a minting convention, not validated containment).
- **`step` reshaped**: `text` → `keywords[]` (min 1, terse beats shown by
  default, #11) + optional `detail` (full prose, expandable). Free-text
  `location` and the `section` grouping label are **removed** — place identity
  lives on `visit.locationId`, grouping on the visit.
- **`widgetScope`** gains `{ location, locationId }` and `{ visit, visitId }`
  alongside `global`/`chapter`; **`deckSlot.defaultScope`** gains `"location"`
  (visit stays instance-only).
- New cross-file invariants (validated in `guide.ts` / `layers.ts`):
  `visit.locationId` resolves; location-/visit-scoped widgets resolve;
  location and visit ids are unique per guide; the step + widget-item checkable
  namespace stays unique across the deeper nesting.

Migration: none in the browser. Recompile each guide's spine under v1
(`guide-pass-spine`), authoring locations + visits + keyword beats. Stable IDs
are preserved across the recompile per §6.8.

## v0 — 2026-06-11

Baseline. No migration — first version.

Amended in place during Phase 0 (v0 was not yet frozen — no bump): the ML
PiT translation stress test (Task 7) added two optional spine fields,
`chapter.intro` and `step.section` (a grouping label for consecutive
steps). Real guides carry intro paragraphs and section headings; without
these fields that content had no home.

Amended again in Phase 1 Task 4: `progress.ts` adds the browser-side
progress slot and the progress export file (`kind:
"totodile-progress"`) — the FR-B6 backup/device-move format, part of the
§8.2 contract. Item states are `done | skipped` (FR-B2).

Amended again in Phase 2 Task 1: `layers.ts` adds the compiler pass
artifacts (`spineLayer`, `widgetLayer`; the ra-mapping layer reuses
`raMapping`) and the pass report file (`passReportFile`) per
`COMPILER_PASS_CONTRACT.md`. New files only — no existing shape changed.
The `contentHash` algorithm is pinned: `sha256:` + hex of the artifact
bytes (contract §5).

Amended again in Phase 2 Task 3: `raMappingEntry` gains required
`sourceRefs` + `confidence`, closing the FR-D2 exception (every emitted
row carries both — mapping rows were the only holdouts). Existing
ml-partners-in-time entries migrated mechanically (`sourceRefs:
["src-ra"]`, `confidence: "normal"` — the whole mapping came from the RA
set source during the Phase 0 translation).

Amended again in Phase 4 Task 5: `progress.ts` adds `progressSlot.
acknowledgedMissables` (array of step IDs) — the explicit dismissal of an
upcoming-missable warning (FR-B5), distinct from done/skip. Additive and
defaulted (`[]`), so slots and exports written before it still import; v0 is
not frozen, so no bump (same in-place amendment as the earlier Phase entries).

- The seven §6 repo-side entities: guide spine (chapters → steps with
  missable + achievement annotations), the 7 widget primitives (closed
  set), genre deck, library manifest, RA mapping, source manifest,
  approvals record.
- Stable-ID grammar fixed: colon-joined kebab-case segments; 3-segment
  checkable IDs (steps + widget items) share one namespace per guide, with
  the guide slug enforced as the first segment.
- Every step and widget row carries ≥1 `sourceRef` and a confidence level
  (`normal` / `flagged`).
