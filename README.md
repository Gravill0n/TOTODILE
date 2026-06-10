# TOTODILE

**T**racker **O**f **T**hings, **O**rder, **D**ata, **I**tems, **L**ists & **E**verything —
a personal video-game completion companion.

One offline-first PWA that gathers everything needed to fully complete a game —
above all *what to do in what order* — and checks itself off via
RetroAchievements. The north star: the official Pokémon HeartGold strategy guide,
reborn as an app. (Named for the Pokémon Crystal starter; Crystal is the pilot guide.)

## How it works

**Guides are data, not code.** Each guide is static JSON in this repo: a
chronological **spine** (chapters → steps, with missables and achievements flagged
inline) plus widgets built from exactly **7 primitives** — checklist, matrix, data
table, counter, flowchart, map pins, prep-card. A game genre is just a default
arrangement of those primitives ("deck"), so adding a game or genre means adding
data files, never app code.

**Two postures, one app.** Desktop = browse and review; phone = play companion
that opens straight on your current step. Everything works offline; progress lives
in the browser.

**One Sync button.** Press it after a play session and the achievements you earned
get checked in the guide (read-only against the RetroAchievements API, with a
receipt). First press backfills your full unlock history.

**Human-gated production.** Guides are compiled from real walkthrough sources by a
multi-pass pipeline (Claude Code skills) — every datum carries a source reference
and a confidence flag, and every layer is reviewed and approved in-app before a
guide becomes playable. Nothing is ever invented.

## Status

Pre-implementation: spec and plan are complete, code comes next.

| Document | Purpose |
|----------|---------|
| `prd-react-app-to-regroup-video-game-guides-trackers-FINAL.md` | The full PRD — 25 approved sections |
| `IMPLEMENTATION_PLAN.md` | Phases P0–P5 with hard exit gates |
| `requirements/` | TDD requirement files for every pure-logic unit |
| `CLAUDE.md` | Ground rules for AI sessions working in this repo |

Roadmap at a glance: **P0** schema → **P1** minimal app → **P2** compiler pipeline
(Pokémon Crystal pilot) → **P3** in-app review lens → **P4** RA sync + cleanup
mode → **P5** remaining renderers, print lens, and migration of all guides.

## Tech

TypeScript (strict) · React 19 · Vite (PWA) · Tailwind 4 · TanStack Router ·
Zod · IndexedDB · Biome · Vitest · Yarn 4. Static hosting only — no backend, no
accounts, no telemetry, ever.

## Legacy guides (the current generation)

Until migration, the existing **single-file HTML guides** remain the playable
versions — each a self-contained page with a chronological walkthrough,
inline achievement flags, missable warnings, embedded maps, and a
localStorage-backed checklist:

- **The Legend of Zelda: Ocarina of Time** — `ocarina-of-time/`
- **Professor Layton and the Miracle Mask** — `layton-miracle-mask/`
- **Mario & Luigi: Partners in Time** — `ml-partners-in-time/`
- **Pokémon Crystal** — `pokemon-crystal/`
- **Pokémon Ranger: Shadows of Almia** — `pokemon-ranger-soa/` (sources)

They were produced by the `achievement-guide-builder` skill in
`.claude/skills/achievement-guide-builder/` (source-faithful, user-gated — see its
`SKILL.md`). That skill is being reworked into TOTODILE's multi-pass compiler in
Phase 2. Each HTML guide stays read-only until its TOTODILE replacement is
approved, then survives as the "print lens" output format.
