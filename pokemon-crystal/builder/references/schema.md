# Guide JSON schema

The renderer (`build.py`) consumes one JSON file describing the whole guide.
It **invents nothing** — every word it prints comes from this file. Your job
when building a guide is to fill this structure from the user's approved
sources, then run the scripts.

## Top level

```json
{
  "game":   { ... },          // metadata for header + theming
  "sources": [ { ... } ],     // global source list (footer + default per-card)
  "achievements": [ { ... } ],// flat list; referenced by id from chapters
  "chapters": [ { ... } ]      // ordered; drives route, tracker, TOC
}
```

## `game`

| field             | required | notes |
|-------------------|----------|-------|
| `title`           | yes      | Full H1, e.g. `"Pokémon Crystal — Achievement Guide"` |
| `platform`        | yes      | Meta line, e.g. `"Game Boy Color · RetroAchievements"` |
| `slug`            | yes      | localStorage key, e.g. `"pkmn-crystal-ra"`. Keep stable — changing it resets saved progress. |
| `accent`          | no       | Hex color for theming, e.g. `"#f7c948"`. Omit for the cyan default. |
| `spoiler_warning` | no       | `true` (default) shows the spoiler banner; `false` hides it. |

## `sources[]`

Listed in priority order. **The user's sources come first.** Proposed
supplementary sources may only be added after the user approves them.

| field   | required | notes |
|---------|----------|-------|
| `label` | yes      | Display text for the link. |
| `url`   | yes      | Link target. |
| `role`  | no       | Prefix shown on cards: `"Walkthrough"`, `"Source"`, `"Route"`, `"Map"`… Defaults to `"Source"`. |
| `note`  | no       | One-line description shown only in the footer. |

These act as the default per-card source line. An achievement can override with
its own `sources` array (same shape).

## `achievements[]`

| field         | required | notes |
|---------------|----------|-------|
| `id`          | yes      | Unique, used everywhere. Convention: `"ach-<RA id>"`. |
| `name`        | yes      | Achievement title, **verbatim from the set**. |
| `points`      | no       | Integer point value. |
| `rarity`      | no       | String incl. `%`, e.g. `"38.86%"`. |
| `badge_img`   | no       | URL or local path. `fetch_images.py` localizes URLs. |
| `missable`    | no       | `true` flips all the warning styling + ⚠ flags. |
| `type_label`  | no       | Extra badge when NOT missable, e.g. `"Progression"`. |
| `description` | no       | The official in-game description, **verbatim**, shown in quotes. |
| `callout_do`  | no       | One-line "what to do here" for the inline flag. Falls back to `description`. |
| `howto`       | no       | Array of steps. Facts verbatim; connective prose lightly reworded. |
| `sources`     | no       | Per-card override of the global `sources`. |
| `missing_info`| no       | If the source lacks a detail, put the gap here — renders a visible marker instead of a guess. |

## `chapters[]`

Two kinds. `kind: "route"` is the turn-by-turn spine; `kind: "roundup"` is a
flat checklist for game-spanning collectibles/challenges.

The **first chapter renders open**; the rest are collapsed.

### Route chapter

```json
{
  "id": "chapter-1",
  "title": "Chapter 1 — Pallet… err, New Bark Town",
  "kind": "route",
  "intro": "One-paragraph chapter summary.",
  "sections": [
    {
      "heading": "1.1 · Waking Up",
      "items": [ <item>, <item>, ... ]
    }
  ]
}
```

Each `item` in a section is one of:

**A route step** (renders as a numbered `<li>`):
```json
{
  "type": "step",
  "text": "Walk out the north door.",        // required
  "where": "Bedroom",                          // optional, bold location lead-in
  "npc": "Mom",                                // optional, bold NPC lead-in
  "spoiler": false,                            // optional, wraps in blur box
  "figure": { ... },                           // optional, see below
  "missing_info": "Source doesn't give the exit."  // optional gap marker
}
```

**An inline achievement** (renders the callout flag + full card at this exact
point in the route):
```json
{ "type": "achievement", "ach": "ach-48074" }
```

### Roundup chapter

```json
{
  "id": "chapter-relics",
  "title": "Collectable Roundup",
  "kind": "roundup",
  "intro": "These span the whole game; master checklist.",
  "achievements": ["ach-3", "ach-9", "ach-12"]
}
```

## `figure` object (maps / screenshots)

```json
{
  "src": "https://… or assets/img/foo.png",  // required
  "alt": "Route 30 map",                       // optional (defaults to caption)
  "caption": "Where to find the Mystery Egg",  // optional
  "credit": "Bulbapedia"                        // optional, shown as "Source: …"
}
```

Run `fetch_images.py` to download remote `src` / `badge_img` values into a
local folder and rewrite them to local paths. Anything it can't fetch is
reported so you can ask the user to supply the file.

## Derived automatically — do NOT hand-author

The renderer computes these from the chapter→achievement mapping, so they can
never drift out of sync:

- the sticky progress tracker (groups, counts, progress bar),
- the table of contents (per-chapter counts + missable counts),
- the header totals,
- which achievement counts toward which chapter.

So: to move an achievement between chapters, just move its reference. Never
edit tracker/TOC numbers by hand.

## New route block items (this project)

Inside a route section's `items[]`, besides `step` and `achievement`:

- `{ "type": "encounters", "rows": [ { "mon", "slots": {"morning","day","night"}, "method"? } ] }`
  — narrow wild-encounter table. A `null` slot means "doesn't appear" (renders `·`).
- `{ "type": "items", "rows": [ { "id", "name", "where"? } ] }` — gold checkable items
  block. `id` must be stable & unique (`item-<route>-<name>`).
- `{ "type": "trainers", "rows": [ { "id", "name", "team"?, "reward"?, "note"? } ] }`
  — red checkable trainers block. `id` stable & unique (`trainer-<route>-<name>`).

A `step`'s `text` may be a **list of strings** (one line each).

Achievements gain `display: "compact"` (set automatically for POC-subset catch/evolve
entries) and a short `note` (e.g. "evolve at Lv. 18"). Compact achievements render as a
one-line row instead of a full card. All checkboxes use `data-track-id` +
`data-track-kind` (`achievement` | `item` | `trainer`) and persist in localStorage.
