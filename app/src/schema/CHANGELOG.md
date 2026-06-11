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

## v0 — 2026-06-11

Baseline. No migration — first version.

Amended in place during Phase 0 (v0 was not yet frozen — no bump): the ML
PiT translation stress test (Task 7) added two optional spine fields,
`chapter.intro` and `step.section` (a grouping label for consecutive
steps). Real guides carry intro paragraphs and section headings; without
these fields that content had no home.

- The seven §6 repo-side entities: guide spine (chapters → steps with
  missable + achievement annotations), the 7 widget primitives (closed
  set), genre deck, library manifest, RA mapping, source manifest,
  approvals record.
- Stable-ID grammar fixed: colon-joined kebab-case segments; 3-segment
  checkable IDs (steps + widget items) share one namespace per guide, with
  the guide slug enforced as the first segment.
- Every step and widget row carries ≥1 `sourceRef` and a confidence level
  (`normal` / `flagged`).
