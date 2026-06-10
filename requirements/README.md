# TOTODILE — TDD Requirement Files

One file per pure-logic unit from `IMPLEMENTATION_PLAN.md`, written for the
`/bon-cop-bad-cop:tdd-loop` skill. Each file is self-contained: exact signatures,
rules, and example tables (the code-writer agent only ever sees the tests, so the
spec must be fully testable).

## Usage

Run loops from inside `app/` (after Phase 0 task 1 bootstraps it), one at a time:

```
/bon-cop-bad-cop:tdd-loop --requirement-file ../requirements/p0-01-entity-id.md --language typescript
```

Language is TypeScript with Vitest. Implementation paths in each file are relative
to `app/` (e.g. `src/schema/entityId.ts`).

## Order

Files are numbered in dependency order within each phase. Phase 0 files first;
`p0-01` (entity IDs) underpins almost everything else.

| File | Unit | Plan ref |
|------|------|----------|
| p0-01-entity-id.md | Stable entity ID parse/format/validate | Phase 0.3 |
| p0-02-spine-schema.md | Guide spine validation | Phase 0.2 |
| p0-03-widget-schemas.md | The 7 widget primitive schemas | Phase 0.2 |
| p0-04-deck-schema.md | Genre deck validation | Phase 0.2 |
| p0-05-library-manifest.md | Library manifest + activity ordering | Phase 0.2 |
| p0-06-ra-mapping.md | RA mapping schema + cross-check | Phase 0.2 |
| p0-07-source-manifest.md | Source manifest + sourceRef checks | Phase 0.2 |
| p0-08-approvals.md | Canonical hash + approval verification | Phase 0.2 |
| p0-09-id-preservation.md | Recompile stable-ID diff (hard-fail) | Phase 2.4 (logic lands in P0) |
| p1-01-progress-reducer.md | Done/skip/counter state transitions | Phase 1.4 |
| p1-02-pointer.md | Current-step pointer semantics | Phase 1.2 |
| p1-03-export-import.md | Progress export/import | Phase 1.4 |
| p1-04-chapter-filter.md | Widget chapter-context filtering | Phase 1.3 |
| p2-01-layer-report.md | Compiler pass report aggregation | Phase 2.1 |
| p2-02-qa-crossref.md | QA pass cross-reference checks | Phase 2.2 |
| p3-01-spot-check.md | Deterministic random spot-check sampling | Phase 3.3 |
| p4-01-sync-reconcile.md | Sync reconciliation + receipt buckets | Phase 4.2 |
| p4-02-missables-lookahead.md | Upcoming-missables surfacing | Phase 4.5 |
| p4-03-cleanup-grouping.md | Cleanup view grouping | Phase 4.4 |

## Not covered by TDD loops (by design)

UI rendering, PWA/service-worker behavior, IndexedDB wiring, the compiler *skills*
themselves, and visual review-lens flows are integration/manual concerns
(PRD §12.2) — they are built directly, guarded by the fixture guide and the
§12.4 integration scenarios, not by adversarial unit loops.

## Shared vocabulary (used consistently across all files)

- **EntityId**: string `"<guideSlug>:<chapterId>:<localId>"` — see p0-01.
- **ItemState**: `"done" | "skipped"`; an absent entry means *todo*.
- **ProgressState**: `{ guideSlug, schemaVersion, pointer, items, counters, updatedAt }` — see p1-01.
- All functions are **pure** (no I/O, no Date.now() — timestamps are parameters).
- PRD references (§) point to `prd-react-app-to-regroup-video-game-guides-trackers-FINAL.md`.
