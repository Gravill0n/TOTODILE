---
name: achievement-guide-builder
description: >-
  Build interactive, single-file HTML achievement/completion guides for video
  games — a chronological turn-by-turn walkthrough fused with an achievement
  checklist, where each achievement is flagged inline at the exact step you can
  earn it, plus a sticky progress tracker, table of contents, missable
  warnings, embedded maps, and a localStorage checklist. Use this whenever the
  user wants a guide, walkthrough, achievement guide, trophy guide, completion
  guide, 100% guide, or RetroAchievements guide for ANY game, or asks to turn a
  walkthrough source into a trackable guide, even if they don't say the word
  "skill". Drives a strict source-faithful, user-gated generation process.
---

# Achievement Guide Builder

Generates the guide format from the reference implementation: a single HTML
page combining a **chronological route** with an **achievement checklist**,
where achievements are surfaced inline at the precise step where they become
earnable, with a sticky progress tracker, contents, missable warnings, and
embedded maps. Progress is saved in the browser via `localStorage`.

You supply structured data (`guide.json`); the scripts do the mechanical
assembly so cross-references never drift.

## The five operating constraints (do not violate)

These define the product. They override any instinct to be fast or autonomous.

1. **The user's sources are the primary truth.** Build only from sources the
   user gives (links or uploaded files). You may _propose_ extra sources, but
   only use them after explicit approval. The user's sources always rank above
   proposed ones in the source list.

2. **Invent nothing; preserve facts, lightly reword prose.** Every place, NPC,
   item name, count, input, and threshold must come from a source and be
   reproduced **exactly**. Only connective prose (sentence structure) may be
   lightly reworded — facts are not paraphrased and not guessed. Facts are not
   copyrightable; prose expression is, so for third-party sources you reword the
   sentences while keeping every concrete detail intact. For sources the user
   wrote or owns, verbatim is fine. If a fact isn't in a source, you do not have
   it — use a `missing_info` marker and ask the user (see constraint 5).

3. **No step is too small.** The route must be exhaustive: which door, which
   direction, which NPC to talk to, what to buy, where to turn. Granularity is
   capped by the source — never fabricate detail to fill a gap. When the user
   wants more detail than the source provides, mark the gap and ask for a more
   detailed source.

4. **Include images, especially maps.** Place maps/screenshots at the route
   step they illustrate. Download them into a local folder (`fetch_images.py`);
   if a download fails, ask the user to supply the file rather than shipping a
   broken link.

5. **Make no decisions during generation — ask the user.** Source choice,
   chapter/route ordering when sources disagree, ambiguous missable
   classification, how to resolve a gap, accent color, image selection — all of
   these are the user's call. Surface decisions at the gates below; never decide
   silently.

## Files in this skill

- `build.py` — renders `guide.json` → one self-contained HTML file. Embeds the
  CSS/JS kit; derives the tracker, TOC, and all counts. **Never edits wording.**
- `fetch_images.py` — downloads remote badge/map images into a local folder and
  rewrites the JSON to local paths; reports anything unreachable.
- `assets/styles.css`, `assets/app.js` — the proven kit, extracted verbatim
  from the reference guide. Treat as canonical; extend, don't rewrite.
- `references/schema.md` — the full `guide.json` data contract. **Read this
  before authoring any JSON.**

## The gated workflow

Run these four gates in order. Stop at each and wait for the user.

### Gate 1 — Sources

- Collect the user's sources (links or files). Try to fetch each link.
- For any link you cannot access, ask the user to upload it as a file. (For
  reading uploaded files, consult the `file-reading` skill.)
- Separate what each source covers: an **achievement set** source (names,
  points, rarity, descriptions, badges — typically the RetroAchievements game
  page) and a **route/walkthrough** source (the navigation spine), and any
  **map** sources.
- If a needed dimension is missing (e.g. they gave a route but no achievement
  set, or no maps), say so and _propose_ candidates — then wait for approval.
- Confirm the final source list before proceeding.

### Gate 2 — Outline

- Propose the chapter breakdown (following the route source's structure) and the
  mapping of each achievement to the route step where it's earnable.
- Classify achievements (progression / missable / collectible / challenge),
  flagging any you're unsure about as questions, not decisions.
- Show this outline for sign-off. Do not write step content yet.

### Gate 3 — Sample (1–2 chapters)

- Build **only the first one or two chapters** fully: author that slice of
  `guide.json`, fetch its images, render, and present the HTML for review.
- This is the calibration step — the user checks granularity, tone, fidelity,
  and image placement before you commit to the whole game. Adjust to feedback.

### Gate 4 — Full build

- Once the sample is approved, author the rest of `guide.json` the same way,
  fetch all images, render the final guide, and present it.

## Running the scripts

Author `guide.json` per `references/schema.md`, then:

```bash
# 1) Localize images into the output's asset folder (best-effort).
python fetch_images.py guide.json --img-dir output/assets/img

# 2) Render the guide.
python build.py guide.json -o output/<slug>.html
```

The output folder then contains the HTML plus `assets/img/`. Present the HTML
with `present_files`.

### Sandbox note on images

The execution sandbox restricts outbound network access, so many image hosts
(including RetroAchievements badge CDN and most fan-wiki maps) may be
unreachable from `fetch_images.py`. When a download fails, that is expected —
fall back to constraint 4: ask the user to upload the image files, drop them in
the img folder, and point the JSON at them.

## Fidelity checklist (constraint 2, in practice)

Before rendering, re-read each `howto` and step against its source:

- Every place name, NPC, item, number, and input matches the source exactly.
- Sentences may be restructured; **facts are not changed and none are added.**
- Anything not in a source is a `missing_info` marker, not a sentence.
- Each achievement's `description` is the official text, in quotes, unchanged.

## Authoring tips

- Keep `slug` stable across regenerations or users lose saved progress.
- Use route `where`/`npc` lead-ins to make navigation scannable (constraint 3).
- Put game-spanning collectibles in a `kind: "roundup"` chapter, and still flag
  them inline in the route where their region first comes up.
- Set `accent` to a game-appropriate hex if the user wants it themed (ask).

## Example: a single inline achievement

A route step where the user can earn something, in `guide.json`:

```json
{ "type": "step", "text": "Cross the drawbridge into the market.", "where": "Castle Town" },
{ "type": "achievement", "ach": "ach-48106" }
```

with the achievement defined once in the flat list:

```json
{
  "id": "ach-48106",
  "name": "Sniper Fury",
  "points": 5,
  "rarity": "49.25%",
  "description": "Obtain a reward from the Shooting Gallery as Young Link",
  "callout_do": "Try the Town Shooting Gallery — hit all targets to win the reward.",
  "howto": [
    "The gallery is left of Malon as you enter Castle Town.",
    "Costs 20 rupees; you get 15 shots for 10 targets.",
    "Hit 8 of 10 for a free retry."
  ]
}
```
