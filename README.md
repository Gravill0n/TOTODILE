# TOTODILE

**T**racker **O**f **T**hings, **O**rder, **D**ata, **I**tems, **L**ists & **E**verything —
a personal video-game completion companion.

One offline-first PWA that gathers everything needed to fully complete a game —
above all *what to do in what order* — and checks itself off via
RetroAchievements. The north star: the official Pokémon HeartGold strategy guide,
reborn as an app. (Named for the Pokémon Crystal starter; Crystal is the pilot guide.)

## How it works

**Guides are data, not code.** Each guide is static JSON in `guides/<slug>/`: a
location-indexed **spine** (chapters → visits → steps, with missables and
achievements flagged inline) plus widgets built from exactly **7 primitives** —
checklist, matrix, data table, counter, flowchart, map pins, prep-card. A game
genre is just a default arrangement of those primitives ("deck"), so adding a
game or genre means adding data files, never app code.

**Two postures, one app.** Desktop = browse and review; phone = play companion
that opens straight on your current step. Everything works offline; progress lives
in the browser.

**One Sync button.** Press it after a play session and the achievements you earned
get checked in the guide (read-only against the RetroAchievements API, with a
receipt). First press backfills your full unlock history.

**Human-gated production.** Guides are compiled from real walkthrough sources by a
six-pass pipeline (the `guide-pass-*` Claude Code skills in `.claude/skills/`,
governed by `COMPILER_PASS_CONTRACT.md`) — every datum carries a source reference
and a confidence flag, and every layer is reviewed and approved in-app before a
guide becomes playable. Nothing is ever invented.

## Status

The app is built and in use. **Pokémon Crystal** — the pilot — is fully compiled,
reviewed, and playable (every layer approved in the review lens); the other games
in `library.json` are planned entries awaiting compilation.

What exists today:

- **App** (`app/`) — library, guide overview, location and "now" play screens,
  the seven widget renderers, in-app review lens, cleanup mode, RA sync with
  receipts, offline-capable PWA.
- **Compiler** — the six pass skills (sources → extract-data → spine → widget
  fills → RA mapping → QA) with per-stage review gates and mechanical validation
  (`yarn validate-guides`, `yarn check-stable-ids`).
- **Content** — `guides/pokemon-crystal/` (playable) and the `library.json`
  manifest listing what comes next.

Next up: compiling the remaining guides through the pipeline, one
`guide/<slug>` branch at a time.

| Document | Purpose |
|----------|---------|
| `prd-react-app-to-regroup-video-game-guides-trackers-FINAL.md` | The full PRD — 25 approved sections; the spec |
| `COMPILER_PASS_CONTRACT.md` | Normative contract every compiler pass obeys |
| `CLAUDE.md` | Ground rules for AI sessions working in this repo |
| `docs/ideas/` | Refined-direction decision records |
| `docs/archive/` | Completed plans, brainstorms, and the working PRD — history |

## Tech

TypeScript (strict) · React 19 · Vite (PWA) · Tailwind 4 · TanStack Router ·
Zod · IndexedDB · shadcn-style owned components (Radix + cva + lucide) · Biome ·
Vitest · Yarn 4. Static hosting only — no backend, no accounts, no telemetry,
ever.

`yarn check` (from `app/`) runs lint + typecheck + tests + guide validation and
must be green before any merge.

## History

The previous generation — five hand-built, single-file HTML guides (Ocarina of
Time, Layton and the Miracle Mask, M&L Partners in Time, Pokémon Crystal,
Pokémon Ranger: Shadows of Almia) and the `achievement-guide-builder` skill
that produced them — was retired and removed from the repo in July 2026, once
the TOTODILE pipeline was proven end-to-end on Crystal. They live on in git
history.
