# Pokémon Crystal Guide — Improvements Design

**Date:** 2026-06-07
**Status:** Approved (design); pending implementation plan
**Scope:** This project only (`pokemon-crystal/`). The installed
`achievement-guide-builder` skill is **not** modified.

## Background

`pkmn-crystal-poc-exemple.html` is a hand-edited slice of the generated guide
showing the target format. This design folds those improvements back into the
project's generation pipeline so the whole guide (and future regenerations)
match, without touching the installed skill.

Current pipeline:

- `make_guide.py` → authors `guide.json` (achievement facts pulled verbatim from
  `sources/base.json` + `sources/subset.json`; route prose / howto authored by a
  human).
- The skill's `build.py` → renders `guide.json` → `output/pkmn-crystal-poc.html`,
  embedding `assets/styles.css` + `assets/app.js`.

## Approach

Bring the renderer into the repo instead of editing the installed skill:

- Copy `build.py`, `assets/styles.css`, `assets/app.js`, and
  `references/schema.md` from the installed skill into a local **`builder/`**
  folder.
- All format / CSS / JS changes happen on those local copies.
- `make_guide.py` continues to author `guide.json` (now emitting new block
  types); `builder/build.py` renders it.

Rejected alternatives: (1) merge rendering into `make_guide.py` — couples
content and presentation in one oversized file; (2) patch the skill in place —
violates project-only scope and would alter every future guide.

### Constraints carried over from the skill (still binding)

- **Invent nothing.** Every place, NPC, item, count, rate, level, and trainer
  team must come from a source and be reproduced exactly. Connective prose may be
  lightly reworded; facts are not. Gaps become `missing_info` markers, never
  guesses.
- The user's sources rank above proposed ones. `slug` stays stable
  (`pkmn-crystal-poc`) so saved progress survives regeneration.

## Section 1 — New data blocks in the schema

A chapter/route section may contain three new structured block types in
`guide.json`, in addition to the existing steps and inline achievement refs:

| Block        | Fields (all sourced)                                            | Renders as                       |
| ------------ | --------------------------------------------------------------- | -------------------------------- |
| `encounters` | rows of `{ mon, slots: { morning, day, night }, method? }`      | narrow, left-aligned table       |
| `items`      | rows of `{ id, name, where }`                                   | gold-accented checkable block    |
| `trainers`   | rows of `{ id, name, team?, reward?, note? }`                   | red-accented checkable block     |

- Each `item` and `trainer` row carries a **stable id** (e.g. `item-rt29-potion`,
  `trainer-rt30-youngster-joey`) so its checkbox persists in localStorage.
- A slot that doesn't apply renders as `·` (not "0%"), to distinguish
  "doesn't appear" from a real low rate.

**Sourcing:** encounter rates, item locations, and trainer teams are not in
Mewlax's POC guide; they come from **Bulbapedia / Poképedia** (already listed
sources). Anything not found is marked `missing_info`. Trainer data may be
partial — partial is acceptable, invented is not. *(Approved.)*

## Section 2 — Route step rendering: multi-line

A route step's `text` may be **a list of short sentences/lines** instead of a
single paragraph. The renderer puts each entry on its own line. This replaces
the hand-typed `<br>` breaks in the example and is the preferred reading format.

- Schema: `text` accepts either a string (single line) or an array of strings
  (one line each).
- `where` / `npc` lead-ins are unchanged.

## Section 3 — Achievement rendering & format changes

In `builder/build.py` + `builder/assets/styles.css`:

1. **Remove the dual representation.** Today each achievement emits a
   `.ach-callout` flag *and* a full `.achievement` card back-to-back. Drop the
   `.ach-callout` flag entirely.

2. **Two render modes, chosen automatically by category:**
   - **Catch/evolve (POC subset achievements)** → **compact row**:
     `☐ · badge · name · short note · points · rarity`, where the short note is
     `— catch` or `— evolve at Lv. X` (the level comes from the existing
     `howto`/note, so no fact is lost).
   - **Base-set achievements (progression / missable / challenge)** → **full
     card** (badge, quoted description, howto, missable ribbon) as in the
     example.
   - Selection is driven by which set the achievement belongs to
     (subset → compact, base → full). **No per-achievement override.**

3. **Render the three new blocks** (encounters / items / trainers) with the
   approved styling: narrow table; prominent gold Items block labeled as
   counting toward 100% items; prominent red Trainers block.

4. **Fix invalid HTML.** The example placed `<article>` / `<figure>` as direct
   children of `<ol class="route">`. The renderer emits route steps as proper
   `<li>`s and emits cards/figures/blocks as valid siblings so markup validates
   and the step counter behaves.

5. **Strategy text that exceeds a compact row** (e.g. "Hoppip only knows Tackle
   — train it patiently") attaches as a short **route note line** near the row,
   not as a promoted full card (the category rule forbids promotion).

6. **Accent** stays `#4fa8d8`, moved into the main `:root` block rather than an
   appended override.

## Section 4 — Tracking & progress

In `builder/app.js` and the tracker / TOC rendering:

1. **Generalize the trackable attribute** from `data-ach-id` to `data-track-id`
   plus `data-track-kind` (`achievement` | `item` | `trainer`). Same localStorage
   key (game slug), same two-way sync between in-route checkbox and tracker
   panel. Existing achievement ids are unchanged, so saved progress survives.

2. **Three separate counters** so items/trainers don't muddy the headline
   achievement number:
   - Header keeps `🏆 N achievements · ✓ done` as the primary count.
   - Add `🎁 items` and `⚔️ trainers` counts beside it.
   - The sticky tracker panel and per-chapter TOC counts show the same
     breakdown per group.

3. **Tracker & TOC are retained** (they exist in the generated guide; they were
   only absent from the hand-trimmed fragment), grouped by chapter with the new
   item/trainer sub-counts.

## Section 5 — Content: Chapter 0 "The Basics"

Authored in `make_guide.py` (content only, no schema change — fits the existing
`h3` + `ol.route` markup with `Rule` / `Tip` / `Note` lead-ins):

- POC rules, Crystal-specific tips, Moon Stone savings-plan thresholds,
  force-NPC-call / clock trick, cartridge-vs-VC dex totals.
- Facts sourced from Mewlax's guide + the RA guides wiki.

## Section 6 — Build workflow & regeneration

Documented in a short `builder/README.md`:

```bash
python make_guide.py                                          # authors guide.json
python builder/fetch_images.py guide.json --img-dir output/assets/img
python builder/build.py guide.json -o output/pkmn-crystal-poc.html
```

Then regenerate the full guide and verify:

- Achievement / item / trainer counts add up and the three counters are correct.
- Encounter table, Items, and Trainers blocks render with the approved styling.
- All checkboxes (achievement / item / trainer) persist across a page reload.
- No invalid-HTML structure (no `<article>`/`<figure>`/blocks as direct `<ol>`
  children); route step counter is correct.
- Multi-line route steps render one line per sentence.

## Out of scope

- Changes to the installed `achievement-guide-builder` skill.
- Guides for other games.
- New sources beyond the already-listed set (additions require approval).

## Open risks

- Trainer/item completeness depends on Bulbapedia/Poképedia coverage; gaps are
  marked, not filled.
- The fixed category rule (no override) means a noteworthy catch/evolve cannot be
  promoted to a full card; accepted per the card-rule decision.
