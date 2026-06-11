# TOTODILE — Tracker Of Things, Order, Data, Items, Lists & Everything

Personal project (single user: Pierre). Hand-built HTML achievement guides are being
replaced by **TOTODILE**, a React PWA that renders guides from static JSON. No
backend, ever. (Named for the Pokémon Crystal starter — Crystal is the pilot guide.)

## Read these before doing anything

1. **`prd-react-app-to-regroup-video-game-guides-trackers-FINAL.md`** — THE spec.
   25 approved sections. When code and PRD conflict, the PRD wins until Pierre
   amends it. Section 24 (AI Agent Boundaries) applies to every session.
2. **`IMPLEMENTATION_PLAN.md`** — phases P0–P5 with hard exit gates, dependency-ordered.
   Don't start a phase before the previous gate passes.

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

## Workflow

- AI work goes on a branch (`feat/`, `fix/`, `guide/<slug>`, `chore/`) and lands by
  PR — never commit directly to `main`. Details: PRD §23.
- `yarn check` (lint + typecheck + tests + guide validation, run from `app/`) must be
  green before any merge. Commands contract: PRD §21.
- Stack (pinned, PRD §19): TypeScript strict, React 19, Vite, Tailwind 4, TanStack
  Router, Zod 4, IndexedDB via `idb`, Biome, Vitest, Yarn 4. Naming: PRD §20.3
  (camelCase files, PascalCase components, kebab-case guide slugs).

## Repo layout (target — `app/` and `guides/` may not exist yet)

- `app/` — the React PWA (§20.1 for the full tree); schemas in `app/src/schema/`
  are the single source of truth.
- `guides/<slug>/` — compiled guide data (content truth); `library.json` — manifest.
- `ocarina-of-time/`, `layton-miracle-mask/`, `ml-partners-in-time/`,
  `pokemon-crystal/`, `pokemon-ranger-soa/` — legacy single-file HTML guides.
  **Read-only** until each is migrated and approved (PRD §18.3).
  `ml-partners-in-time/build/guide.json` seeds schema v0.
- `.claude/skills/achievement-guide-builder/` — current guide-building skill;
  being reworked into the multi-pass compiler suite in Phase 2.
- Historical context: `brainstorm-*-20260609-*.md` (ideation log) and the working
  PRD `prd-*-20260609-2128.md` (full approval history) — rarely needed.
