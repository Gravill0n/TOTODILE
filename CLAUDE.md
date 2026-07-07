# TOTODILE — Tracker Of Things, Order, Data, Items, Lists & Everything

Personal project (single user: Pierre). **TOTODILE** is a React PWA that renders
game-completion guides from static JSON. No backend, ever. (Named for the Pokémon
Crystal starter — Crystal was the pilot guide and is playable; its predecessors,
Pierre's hand-built HTML guides, are retired.) Current phase: compiling the
remaining `library.json` guides through the pass pipeline.

## Read these before doing anything

1. **`prd-react-app-to-regroup-video-game-guides-trackers-FINAL.md`** — THE spec.
   25 approved sections. When code and PRD conflict, the PRD wins until Pierre
   amends it. Section 24 (AI Agent Boundaries) applies to every session.
2. **`COMPILER_PASS_CONTRACT.md`** — normative for every compiler pass run (any
   `guide-pass-*` skill). A pass that violates it is broken even if its output
   looks right.
3. There is no active planning doc: completed specs, plans, and task files live in
   `docs/archive/`; `docs/ideas/` holds the decision records behind them.

## Hard rules (from PRD §24 — full list there)

- **Never invent game content.** Every datum traces to a source in the guide's
  source manifest; gaps are flagged, never guessed (§0.2).
- **Never touch `guides/*/approvals.json`** — only the review-lens approval flow
  writes it. `sources.json` records are append-only.
- **RA API key never appears anywhere** in the repo: no code, logs, fixtures, exports.
  RA is read-only; sync is user-initiated only.
- The 7 widget primitives are a **closed set**; the §14.3 never-list (backend,
  accounts, gamification, reminders, telemetry, third-party use) is final.
- Stable entity IDs are never regenerated across recompiles (§6.8).
- Ask before: adding dependencies, any schema change, touching the §14.2 deferred list.
- **Deployed origin is shared.** The app lives at `gravill0n.github.io/TOTODILE/`;
  every other GitHub Pages project on that account shares the origin, so its
  localStorage/IndexedDB (including the RA key at `totodile.ra`) is readable by
  any sibling project's JS. Never deploy untrusted or third-party code to another
  Pages project on this account; if that ever changes, move TOTODILE to its own
  origin first.

## Workflow

- AI work goes on a branch (`feat/`, `fix/`, `guide/<slug>`, `chore/`) and lands by
  PR — never commit directly to `main`. Details: PRD §23.
- `yarn check` (lint + typecheck + tests + guide validation, run from `app/`) must be
  green before any merge. Commands contract: PRD §21.
- Stack (pinned, PRD §19): TypeScript strict, React 19, Vite, Tailwind 4, TanStack
  Router, Zod 4, IndexedDB via `idb`, Biome, Vitest, Yarn 4. Naming: PRD §20.3
  (camelCase files, PascalCase components, kebab-case guide slugs).

## Repo layout

- `app/` — the React PWA (§20.1 for the full tree; bulletproof-react layout, tests
  colocated in `src/`); schemas in `app/src/schema/` are the single source of truth.
- `guides/<slug>/` — compiled guide data (content truth); `library.json` — the
  manifest (`pokemon-crystal` playable; the rest `planned`).
- `.claude/skills/guide-pass-*/` — the six-pass compiler suite (sources,
  extract-data, spine, widgets, ra-mapping, qa), bound by
  `COMPILER_PASS_CONTRACT.md`.
- `docs/ideas/` — refined-direction decision records. `docs/archive/` — completed
  plans and historical context (brainstorms, the working PRD with full approval
  history, `IMPLEMENTATION_PLAN.md`, workstream and small-build task files) —
  rarely needed.
- The legacy single-file HTML guides and their `achievement-guide-builder` skill
  were removed in July 2026 (git history has them).
