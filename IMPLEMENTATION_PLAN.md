# Implementation Plan — TOTODILE

Derived from `prd-react-app-to-regroup-video-game-guides-trackers-FINAL.md` (2026-06-10).
All section references (§) point into the PRD. Phases are dependency-ordered (§16.3); each has a hard exit gate. A phase is not started until the previous gate passes.

---

## Phase 0 — Schema v0 (the keystone)

Everything else consumes this. Seed by reverse-engineering `ml-partners-in-time/build/guide.json`, then reshape to the PRD data model (§6).

**Tasks**

1. Bootstrap `app/` workspace: Vite + React 19 + TS strict + Tailwind 4 + Biome + Vitest + Yarn 4 (§19) — only enough to host the schema package and tests.
2. Define Zod schemas in `app/src/schema/` (§20.2): guide spine (chapters → steps, missable + achievement annotations), the 7 widget primitives, genre deck, library manifest, RA mapping, source manifest, approvals record (§6.1–6.7).
3. Fix the stable-ID format (`<slug>:<chapter>:<short-id>` style, §20.3) — IDs are forever (§6.8); document it in the schema.
4. Establish `SCHEMA_VERSION` + changelog conventions (§9.2, §18.3).
5. Write `app/scripts/validate-guides` CLI (§21.2).
6. Hand-write the **tiny fictional fixture guide** (~2 chapters, ~10 steps, all 7 primitives, fake RA mapping) (§12.3).
7. Translate the existing ML PiT `build/guide.json` into schema v0 by hand/script — first real-data stress test.

**Exit gate:** fixture guide + translated ML PiT guide both pass `yarn validate-guides`; every §6 entity has valid + invalid test fixtures; `yarn check` is green.

---

## Phase 1 — Minimal app (prove the schema renders)

**Tasks**

1. App shell: library screen from `library.json`, TanStack routes, posture-responsive layout skeleton (§7 S1/S2).
2. Spine rendering + explicit current-step pointer (stored, auto-advance on check, manual move — §6.7) + Now landing (FR-A4).
3. Three renderers: checklist, data table, counter (the P1 set; matrix/map/flowchart/prep-card stubs render as degraded lists, §9.3).
4. Progress store on IndexedDB via `idb`: done/skip semantics, immediate writes, export/import (FR-B).
5. PWA: vite-plugin-pwa, offline precache of guide + images, persistent-storage request (§5.2, §15 risk 8).
6. Theme tokens: paper-guide palette as Tailwind `@theme` (§0.4, §9.1).
7. Load ML PiT as first real content; play with it on the phone.

**Exit gate:** P1/P2 story ACs pass on a real phone (cold open → current step <2s, offline, taps persist); fixture-driven renderer tests green; §12.4 scenario 3 (export/import round-trip) passes.

---

## Phase 2 — Compiler rework (production pipeline)

Rebuild the achievement-guide-builder skill as a multi-pass suite (FR-D). Pilot: **Pokémon Crystal** (pull source work from the `guide-improvements` branch).

**Tasks**

1. Design the pass contract: each pass = one skill, reads prior layer, emits `layers/<pass>.json` + report (row counts, anomalies, confidence flags) (FR-D1/D2, E2).
2. Skills: source-gathering (writes `sources.json`) → spine extraction → widget fills → RA mapping → QA/validator (FR-D4 cross-reference checks).
3. Confidence-flag + source-reference plumbing: every emitted datum carries `sourceRef` and a confidence level (FR-D2/D3).
4. Stable-ID preservation check: recompile must keep all approved-layer IDs or hard-fail (§6.8, §15 risk 3).
5. Run the Crystal pilot end to end on `guide/pokemon-crystal` branch (§23.1).

**Exit gate:** Crystal compiles through all passes; QA pass catches seeded errors in a deliberate test; recompile-with-ID-drift hard-fails (§12.4 scenario 2); reports are reviewable.

---

## Phase 3 — Review lens (close the QA loop)

**Tasks**

1. Editor-mode toggle (§9.3); unapproved guides visibly "unfinished" (FR-E1, E5 AC).
2. Flagged-row review UI: row + source excerpt side by side; flag count per layer (FR-E2, E3).
3. Random spot-check flow with recorded verdicts (FR-E3, E4).
4. Approve/reject: approval hash-locks the layer into `approvals.json` (the ONLY writer of that file, §23.4); rejection note feeds recompile (FR-E4).
5. Use it for real: review and approve the Crystal layers.

**Exit gate:** Crystal fully approved through the lens and playable in the library (FR-E5); at least one real error caught at review (§13.3 metric 8).

---

## Phase 4 — Sync + comfort

**Tasks**

1. Isolated RA client (`sync/`, §9.1): `@retroachievements/api`, key in settings only (§17.4), domain types only escape (§22.3).
2. Sync button: backfill on first press, additive-only marking, atomic failure, receipt (FR-C, §8.1, §11.3).
3. Crystal RA mapping verified during the pilot playthrough (§13.2 metric 5).
4. Skip-state cleanup view grouped by location (FR-B4, P7).
5. Missables surfacing on the current-step view (FR-B5, P3).
6. Matrix renderer (full version).
7. Map-pins and flowchart full renderers (upgrade from degraded lists, §9.3).
8. Prep-card full renderer.

**Exit gate:** P5/P7/P3 story ACs pass; sync tests against the fake RA client cover all three receipt buckets + atomic failure (§12.2).

---

## Phase 5 — Completers

**Tasks**

1. Migrate the remaining four guides (OoT, Layton MM, ML PiT formal recompile, Ranger SoA) incl. localStorage progress migration (FR-D5, E6).
2. Retire legacy HTML guides as each replacement is approved (§18.3).
3. GitHub Pages (or chosen host) wiring (§21.3).

**Exit gate:** §13.1 metrics 1–3 — all 5 guides migrated/approved, HTML guides unopened, and one full app-only playthrough done.

---

## Standing rules while executing

- The PRD is the spec; conflicts resolve in the PRD's favor until Pierre amends it (§24.1).
- The §14.3 never-list and §24 boundaries apply to every phase.
- `yarn check` green before any merge to `main`; AI work always lands by PR (§23.3).
