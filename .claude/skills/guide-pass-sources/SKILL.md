---
name: guide-pass-sources
description: >-
  TOTODILE compiler pass 1 of 5 — source gathering. Use when starting a new
  TOTODILE guide ("start a guide for <game>", "compile <game>", "bootstrap
  <slug>") or when adding sources to an existing one ("run the sources pass",
  "add a source to <slug>"). Bootstraps guides/<slug>/ on first run, gathers
  and classifies sources with Pierre's sign-off, and writes the append-only
  sources.json plus its pass report. Not for single-file HTML guides — that is
  achievement-guide-builder.
---

# Compiler pass: source gathering

**Read `COMPILER_PASS_CONTRACT.md` (repo root) before doing anything.** It
governs this pass; this file only adds the pass-specific workflow. Schemas:
`app/src/schema/sources.ts`, `library.ts`, `deck.ts`, `layers.ts`.

Operating constraints (contract §2, non-negotiable): Pierre's sources are
primary truth · invent nothing · `sources.json` is append-only · never touch
`approvals.json` · ask, don't decide.

## Reads / emits

- Reads: Pierre's source list (links, files), the existing `sources.json` if any.
- Emits: `guides/<slug>/sources.json` + `guides/<slug>/layers/source-gathering.report.json`.
- First run also bootstraps the guide (below).

## Workflow

### 0. Bootstrap (first run on a new slug only) — gate
Propose, then wait for Pierre's sign-off before creating anything:
- the slug (kebab-case, stable forever — it keys progress and the folder),
- the `library.json` entry: title, game, platform, language (`en`/`fr`),
  `raGameId` if an RA set exists, **`status: "in-compilation"`** (FR-E5 keeps
  it unplayable until all layers are approved),
- `deck.json`: offer an existing genre deck from another guide first (§6.4 —
  decks are reusable configs); only compose a new one (slots from the 7
  primitives) if nothing fits. Deck choice is Pierre's call.

Then create `guides/<slug>/` with `deck.json` and the library entry.

### 1. Collect and classify — gate
- Take Pierre's links/files; fetch each (WebFetch/curl). Unreachable → ask for
  an upload, never guess at content.
- Classify each source: `wiki` (route/walkthrough), `ra-set` (achievement
  list — public RA game page or a Pierre-provided export; **never** the RA API,
  the key exists nowhere in this repo), `map`, `manual`, `video`, `other`.
- A guide needs at least a route source; an RA guide also needs an `ra-set`
  source; maps strongly preferred. If a dimension is missing, *propose*
  candidates and wait — Pierre's sources always rank above proposed ones.
- Confirm the final list before writing.

### 2. Write `sources.json`
- IDs: `src-<kebab>` (localId grammar), stable forever; `retrievedAt` = the
  date you actually fetched it. Append new entries; never edit or remove
  existing ones — corrections are new entries plus an anomaly noting the
  supersession.

### 3. Report + finish
- `layers/source-gathering.report.json` (`passReportFile`): `pass` and `layer`
  both `source-gathering`; `rowCount` = entries added this run; unreachable
  links and missing dimensions → `anomalies`; `inputs` = `[]` (this pass reads
  no repo files it depends on).
- `yarn validate-guides` (from `app/`) must be green.
- One commit on the `guide/<slug>` branch: `guide(<slug>): sources <note>`.
