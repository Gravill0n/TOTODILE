# Compiler Pass Contract

Normative for every compiler pass skill (Phase 2, FR-D). A pass that violates this
contract is broken even if its output looks right. Schemas referenced here live in
`app/src/schema/layers.ts` — the schema files are the contract's executable half
(§20.2); this document is the prose half. `yarn validate-guides` enforces the
mechanical clauses in CI.

Companion documents: the PRD (FR-D/FR-E, §6, §23) governs; `IMPLEMENTATION_PLAN.md`
Phase 2 sequences the build.

## 1. Pipeline

Compilation is an ordered sequence of passes (FR-D1). Each pass is one Claude skill,
independently runnable and independently useful. A pass reads the artifacts of prior
passes — never their conversation context — so any pass can be re-run in a fresh
session.

```
source-gathering ──▶ spine ──▶ widget fill (×N, one per widget) ──▶ ra-mapping ──▶ qa
     │                 │              │                                │            │
     ▼                 ▼              ▼                                ▼            ▼
sources.json     layers/spine    layers/widget-<id>            layers/ra-mapping   layers/qa.report.json
+ report         .json+report    .json+report (each)           .json+report        + assembled guide.json
                                                                                   + ra-mapping.json
```

All paths below are relative to `guides/<slug>/`.

| Pass | Reads | Artifact | Report |
|---|---|---|---|
| source-gathering | Pierre's source list, the web | `sources.json` (the artifact — no layer file) | `layers/source-gathering.report.json` |
| spine | `sources.json`, prior `layers/spine.json` if any, rejection notes | `layers/spine.json` | `layers/spine.report.json` |
| widget fill | `layers/spine.json`, `deck.json`, `sources.json`, prior artifact | `layers/widget-<id>.json` | `layers/widget-<id>.report.json` |
| ra-mapping | spine + widget layers, the RA set source | `layers/ra-mapping.json` | `layers/ra-mapping.report.json` |
| qa | everything above | none — assembles `guide.json` + `ra-mapping.json` on success | `layers/qa.report.json` |

`<id>` is the layer ID: `spine`, `widget-<widget-segment>` (e.g. `widget-encounters`
for widget `pokemon-crystal:encounters`), `ra-mapping` — matching PRD §6 entity 7
(spine / per-widget-pass / RA-mapping) and `approvals.json` `layerRecord.id`. One
layer per widget instance keeps each reviewable in one sitting (§15 risk 2).

## 2. Rules that bind every pass

1. **Never invent game content** (§0.2). A datum the sources don't support is either
   omitted or emitted with `confidence: "flagged"` plus an anomaly line explaining
   the doubt. A gap in the sources is an anomaly, never a guess.
2. **Every emitted row carries `sourceRefs` (≥1, resolving in `sources.json`) and a
   `confidence` level** (FR-D2/D3). This is structural — the layer schemas reuse the
   entity schemas (`chapter`, `widget`, `raMapping`), which require both on every
   step, widget row, and mapping entry. No exceptions.
3. **Stable IDs are never re-minted** (§6.8). Before emitting, a pass reads its own
   prior artifact (and the approved layer, once one exists) and re-emits every
   surviving entity under its original ID, even if the entity moved chapters or
   widgets — the ID's middle segment records where it was *minted*, nothing more.
   Renaming or dropping an ID that an approved layer (or a playable guide.json)
   contains is a hard failure: `yarn check-stable-ids <slug>` (from `app/`)
   diffs the working tree against the shipped baseline (`main` by default) and
   every re-run must finish with it green. New entities mint new IDs under the
   §20.3 grammar.
4. **`sources.json` is append-only.** A re-run may add source entries; it never
   edits or removes existing ones.
5. **`approvals.json` is untouchable.** Only the review-lens approval flow writes
   it. Passes communicate with the review lens exclusively through artifacts and
   reports; the lens copies a report into `layerRecord.report` when recording a
   verdict.
6. **Layers are drafts until approved.** Re-running a pass overwrites its artifact
   and report in place on the guide branch — git history, not file copies, is the
   draft trail. Approved content is protected by the hash in `approvals.json` and by
   §23: a guide branch only merges to `main` once its layers are approved.
7. **One pass run = one commit**, message `guide(<slug>): <layer> <short note>`
   (PRD §23.4), on the `guide/<slug>` branch.
8. **Ask, don't decide.** Source selection, chapter granularity, missable
   classification, widget composition beyond the deck — Pierre's calls. A pass
   pauses and asks rather than choosing silently (carried over from the legacy
   builder skill's operating constraints).

## 3. Layer artifacts

Validated by `app/src/schema/layers.ts`; `yarn validate-guides` checks every
`layers/*.json` file by name:

| File | Schema | Content |
|---|---|---|
| `layers/spine.json` | `spineLayer` | `{ schemaVersion, guideId, pass: "spine", chapters: [...] }` — the full chapter/step tree, exactly the shape `guide.json.chapters` will take |
| `layers/widget-<seg>.json` | `widgetLayer` | `{ schemaVersion, guideId, pass: "widget", widget: {...} }` — one widget instance, exactly the shape of a `guide.json.widgets` element; `<seg>` must equal the widget ID's second segment |
| `layers/ra-mapping.json` | `raMapping` | identical shape to the final `ra-mapping.json` — assembly is a copy |

Artifacts carry IDs in the full §20.3 grammar (guide slug first segment), so
assembly is a mechanical merge with zero rewriting:
`guide.json = { schemaVersion, guideId, chapters: spine.chapters, widgets: [each widget layer's widget, ordered by deckPosition] }`.

Anything else in `layers/` ending in `.json` is a contract violation (the validator
rejects it). Non-JSON files (e.g. ML PiT's `translation-report.md`, a pre-contract
artifact) are ignored.

## 4. Reports

Every pass run emits `layers/<id>.report.json` (`passReportFile` schema) — the
review lens's raw material (FR-E2, §7 review screen) and the editor's first read:

```jsonc
{
  "schemaVersion": 0,
  "guideId": "pokemon-crystal",
  "pass": "spine",                  // source-gathering | spine | widget | ra-mapping | qa
  "layer": "spine",                 // = the report's filename base, = approvals layerRecord.id
  "generatedAt": "2026-06-20T14:03:00Z",
  "inputs": [                       // provenance: every file the pass read
    { "file": "sources.json", "sha256": "<64 hex>" }
  ],
  "report": {                       // exactly approvals.ts layerReport —
    "rowCount": 412,                //   the lens copies it verbatim on verdict
    "anomalies": [
      "c4: source disagreement on Whirl Islands item order (src-wiki vs src-video)"
    ],
    "flaggedItemIds": ["pokemon-crystal:c4:s12"]
  },
  "notes": ["Chapter split follows the badge order, per Pierre 2026-06-18."]
}
```

- `report.rowCount` counts the artifact's emitted rows: steps (spine), checkable
  rows/cells (widget), entries (ra-mapping), files verified (qa), sources added
  (source-gathering).
- `report.anomalies` — human-readable problem lines: source conflicts, gaps,
  unreachable images, cross-reference findings (qa). Free-form but one problem per
  line, prefixed with the most specific ID available.
- `report.flaggedItemIds` — for spine, widget, and ra-mapping layers this must
  equal the set of rows the artifact marks `confidence: "flagged"`
  (validator-enforced; for ra-mapping that set is the flagged entries'
  `targetItemId`s). For source-gathering and qa it lists any checkable the pass
  wants review eyes on.
- A flagged row **must** also have an anomaly line saying why (the lens shows them
  side by side with the source excerpt, FR-E2/E3).

## 5. Hashing

`contentHash` in `approvals.json` is **`sha256:` + lowercase hex SHA-256 of the
artifact file's exact bytes** as committed. Report `inputs[].sha256` uses the same
digest (without the prefix). The review lens computes the hash at approval; the
recompile check (Task 4) and any reader recompute and compare — no canonicalization,
the bytes are the truth, so passes must not rewrite files they didn't change.

## 6. Re-runs and rejections

A pass re-run (after a rejection, new sources, or a schema migration):

1. Reads the rejection note(s) for its layer from `approvals.json` (read-only) —
   they are the work order (FR-E4).
2. Reads its prior artifact for ID preservation (§2.3).
3. Overwrites artifact + report; the report's `notes` must state what changed and
   which rejection note it answers.
4. Downstream layers whose inputs changed are stale: QA fails if a layer's recorded
   input hash no longer matches the current file, so staleness is caught
   mechanically, not by memory.

## 7. The skill suite (built in Phase 2 Task 2)

```
.claude/skills/
├── guide-pass-sources/      # source-gathering
├── guide-pass-spine/        # spine extraction
├── guide-pass-widgets/      # widget fills (one run per widget instance)
├── guide-pass-ra-mapping/   # RA mapping
└── guide-pass-qa/           # QA / cross-reference checks + assembly
```

Each SKILL.md links to this contract and restates only its own pass spec. The
legacy `achievement-guide-builder` skill remains until the suite replaces it
(§18.3 spirit: nothing breaks half-done).
