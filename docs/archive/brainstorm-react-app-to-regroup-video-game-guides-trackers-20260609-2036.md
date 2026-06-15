# Brainstorm: React app to regroup video game guides/trackers
Date: 2026-06-09 20:36
Technique(s) used: Free Association

## [MAIN] React app to regroup video game guides/trackers

### Batch 1 — what "regrouping guides" could mean
- Idea: The Shelf — virtual game shelf, each guide a cartridge/box; dusty boxes for untouched games
- Idea: One tracker to rule them all — global progress bar across the whole backlog
- Idea: Guide-as-data — guides become JSON; one shared React engine renders all, shared checklist system
- Idea: The Companion — phone-first, sits next to the couch while the game runs on TV/handheld
- Idea: Session resume — "Last time you were at Chapter 7, 3 missables coming up"
- Idea: Cross-game meta-achievements awarded by the app itself
- Idea: RetroAchievements sync — checkboxes tick themselves when the cheevo actually unlocks
- Idea: The Graveyard — wall of abandoned playthroughs, morbid motivation
- Idea: Multi-playthrough — same guide, N save slots
- Idea: Import anything — paste a walkthrough URL, it becomes a trackable guide

### Direction chosen by user (2026-06-09)
**Core = Guide-as-data + The Companion + RetroAchievements sync.**
Key constraint: different game genres have different needs → the app must be flexible (genre-adaptive guide schema/UI).

### Batch 2 — genre flexibility
- Idea: Lego blocks — guide = stack of widgets (step list, encounter table, puzzle grid, boss checklist, counter, map-with-pins) ✅ user loves
- Idea: Genre packs — monster-collector pack, puzzle-game pack, etc.
- Idea: Lenses — one dataset, multiple views (walkthrough / checklist / map)
- Idea: 100% matrix — collectible types × chapters/regions
- Idea: Counters & tallies — seeds, soft-resets, deaths
- Idea: RA-informed shape — achievement types (progression/missable/grind) suggest widgets
- Idea: Spine + organs — shared chronological spine, genre widgets hang off it
- Idea: Notion-for-guides — new guide = arranging blocks, no code
- Idea: Cleanup mode post-credits — walkthrough flips to location-sorted checklist

### Decision (user, 2026-06-09)
**Widgets/Lego blocks confirmed. A "genre" = a default widget arrangement.**

### Batch 3 — widget ecosystem
- Idea: Widget reactions — checking one widget updates others + advances spine
- Idea: Spine broadcasts — current chapter auto-filters every widget
- Idea: Missables radar — derived widget that watches all others
- Idea: Starter decks — guide creation = pick a genre deck, swap bricks
- Idea: Player-side widgets — players add notes/death counter to any guide
- Idea: Widget state = save file — union of widget states, export/import/share
- Idea: RA events as nervous system — unlock event, claiming widget reacts
- Idea: "Now" card stack — each widget contributes its most-relevant card to home screen
- Idea: Two scopes per widget — chapter-scoped vs global
- What if: players rearrange the author's deck (your data, their layout)?
- What if: finished runs replay as ghosts?

---
## [FORK 1] RA sync mechanics
Parent: MAIN

### Batch 4
- Idea: Play Session mode — explicit "playing now" toggle starts ~30s polling; doubles as play-time tracker
- Idea: Rich presence autopilot — parse RP string ("In Goldenrod City") to auto-scroll guide to current location
- Idea: First-connect backfill — import full unlock history, retro-tick all mapped checkboxes
- Idea: Unlock moment — badge art + confetti + auto-check on poll detection
- Idea: Two-truth model — RA authoritative for cheevos; manual checkboxes for everything else; steps are RA-backed / manual / RA-suggested
- Idea: Reconciliation pass — offline play diffed on next sync, "accept all?" proposal
- Idea: Cheevo radar widget — achievements within reach of current guide position, by proximity
- Idea: Session recap — time, unlocks, points, boxes, missables dodged; shareable card
- Idea: Hardcore awareness — badge on run, hide savestate-dependent tips
- Idea: Mastery countdown — RA mastery bar per guide, cleanup mode sorts by missing
- What if: step↔achievement-ID mapping is part of guide data, community-fixable?
- What if: rich presence parsers are pluggable per game (input bricks)?
- What if: two linked accounts on one guide = couch co-op columns?

### API facts (from web)
- Official JS lib @retroachievements/api; polling only (no webhooks); rate-limited, caching expected
- Endpoints: recent unlocks, unlocks by date range (backfill), user summary w/ rich presence

### Decision (user, 2026-06-09)
**Keep RA sync simple: a manual "Sync" button that marks mapped achievements as done in the guide. No polling/rich-presence/session machinery.**
(Backfill = same button on first run. Two-truth model implicitly survives: RA marks cheevo steps, everything else manual.)

---
## [MAIN] React app to regroup video game guides/trackers (continued)
Returned from: FORK 1

### Batch 5 — guide-as-data & migration (MAIN)
- Idea: The schema is the product — one JSON shape for steps/achievements/missables/widgets
- Idea: HTML guides as caterpillars — one-time converter for the five existing guides
- Idea: localStorage amnesty — import old guide progress too
- Idea: Guides as repo files — publish = commit; versioning/diffs/PRs free
- Idea: Skill becomes the authoring tool — emits guide-JSON instead of HTML; app is the renderer
- Idea: Static-first — no backend; static JSON + localStorage + client-side RA sync
- Idea: Guide manifest — tiny index file = the whole library feature
- Idea: Print lens — render any guide back to single-file HTML (current format preserved)

### Decisions (user, 2026-06-09)
- **Static-first confirmed: JSON files in the repo, no backend for now.**
- **The achievement-guide-builder skill needs a big rework — the whole guide-production process should be rethought.**

### Batch 6 — production process rework (MAIN)
- Idea: Pipeline inversion — sources → guide.json; app owns rendering
- Idea: Multi-pass compiler — spine → widgets → RA mapping → validation; reviewable artifact per pass ✅
- Idea: Schema-first — guide-JSON schema written before skill rework; validator enforces ✅
- Idea: Widget extractors as plugins (Crystal wikitext parser = prototype)
- Idea: Skill splits into smaller skills (source-gathering / spine / widgets / RA-mapping / QA) ✅
- Idea: RA mapping as its own file beside the guide (consumed by Sync button)
- Idea: Source manifest — record source pages + extraction date; guides re-compilable ✅
- Idea: Golden-file tests on JSON output (Crystal pytest as template)
- Idea: Incremental rebuilds per pass

### Decisions (user, 2026-06-09)
- **Multi-pass compiler, each pass = a smaller skill.**
- **Schema-first: clean JSON schema designed up front for the React app.**
- **Source manifest included.**
- **User role = approver of layers (catches errors at each gate).**

### Batch 7 — approval experience (MAIN)
- Idea: Layer report card — digest per pass, review the card not the JSON
- Idea: Confidence flags — extractor marks uncertain rows; review 12 not 1200 ✅
- Idea: Provenance per datum — click through to source line
- Idea: Random spot-check ritual — N random rows + source excerpts side by side ✅
- Idea: Diff-based re-approval — approve the delta only
- Idea: Approval = hash lock — attested layers, later passes can't mutate
- Idea: Red-team QA pass — contradiction hunter before human review
- Idea: Approval ledger — approvals.json audit trail
- Idea: Review lens — approval happens inside the React app, flags rendered inline ✅
- What if: rejection notes feed back to the skill as correction hints?
- What if: caught error patterns become permanent validator rules?

### Decisions (user, 2026-06-09)
- **Confidence flags + random spot-check = the review mechanism.**
- **Approval happens inside the React app (review lens) — visual checking is easier.**

### Batch 8 — review lens visuals (MAIN)
- Idea: Amber until approved — unapproved layers render visibly unfinished
- Idea: Flag pins on widget rows — tap → source excerpt slides in
- Idea: Spot-check roulette — "check 5" button, swipe ✓/✗
- Idea: Reject-with-a-note — notes become correction hints for recompile
- Idea: Approval progress bar — 100% the guide before 100% the game
- Idea: Ghost preview — toggle play view while reviewing
- Idea: Batch verdicts — approve row/widget/chapter granularity
- Idea: Error heatmap — chapters colored by flag density
- What if: adaptive sampling — trusted extractors sampled less

---
## [FORK 2] Companion UX
Parent: MAIN

### Batch 9 — phone on the couch arm
- Idea: Now screen — current step huge, next two peeking ✅ (as default view, not special mode)
- Idea: Wake lock during sessions (dropped — no session machinery)
- Idea: Couch dark mode
- Idea: Glove-sized tap targets
- Idea: Check → auto-advance → haptic
- Idea: Sticky missable banner needing explicit dismissal
- Idea: Skip ≠ done — "later" swipes self-assemble the cleanup list
- Idea: "Where am I" anchor button
- Idea: Pinned counter bubble for grinds
- Idea: Offline-first PWA — static JSON makes it nearly free

### Decision (user, 2026-06-09)
**Companion = responsive version of the same app, checked occasionally while playing (burst-driven, not a dedicated always-on session mode). Now screen kept as the landing view.**

---
## [MAIN] React app to regroup video game guides/trackers (continued)
Returned from: FORK 2

### Batch 10 — one app, two postures (MAIN)
- Idea: Desktop = widgets in columns; phone = same bricks stacked, Now on top
- Idea: Open → land on current step (two-second glance gesture) ✅
- Idea: Widgets declare their own responsive folding (table→cards, counters→chips)
- Idea: Burst-friendly multi-check — tap-drag a range of steps
- Idea: Library as launcher — active games by last-played, card = chapter + mastery bar + missables ahead
- Idea: Review lens lives in desktop posture; play posture on phone
- What if: posture = play/browse toggle, not screen width?

### Batch 11 — genre decks (MAIN)
- Monster Collector (Crystal): encounter tables · dex/box · trainers · items-by-location · TM/badges · soft-reset counter
- Puzzle Adventure (Layton): puzzle index · hint-coin spots · picarat total · minigame trackers
- Action-Adventure (OoT): equipment checklist · heart-piece matrix · skulltula counter-by-region · quest chains · map pins
- Turn-based RPG (ML PiT): bean matrix · shop checklist · boss list · bestiary
- Metroidvania: ability-gates · map % · item % · auto backtrack list
- Souls-like: boss board + death counter · NPC questline flowcharts · ending tracker
- Arcade/Racing: medal grid · PB table · unlockables
- Rhythm: song × difficulty grade grid
- Tactics: chapter-prep card · roster · support log
- Visual Novel: route flowchart · choice tracker · ending/CG gallery
- Insight: ~7 primitive bricks under all of these — checklist, matrix, data table, counter, flowchart/chain, map pins, prep-card. Genre widget = primitive + costume.
- What if: decks compose (Pokémon = monster-collector + JRPG)?
- What if: encounter table = data-table primitive + checkbox column → zero custom code for Crystal?

### Decision (user, 2026-06-09)
**Go with the 7 primitives model: checklist, matrix, data table, counter, flowchart/chain, map pins, prep-card. Genre deck = primitives + labels + arrangement.**

## Provocative Questions Explored
- What if the app never shows the full walkthrough — only the next step + upcoming missables?
- What if localStorage progress from the five existing guides migrated in on day one?
- Reader, tracker, or builder? (wants to be all three)

## Session Notes
- User has 5 existing single-file HTML guides in this repo (OoT, Layton MM, ML PiT, Pokémon Crystal, Ranger SoA sources) — natural seed content + migration story.

## Final Summary
**Ideas generated:** ~85 across 11 batches. **Forks:** 2 (RA sync mechanics, Companion UX), both merged back with decisions.

### Key themes
1. **Guide-as-data**: guides are JSON files in the repo (static-first, no backend); the React app is the renderer. Old HTML format survives as a "print lens".
2. **7 widget primitives**: checklist, matrix, data table, counter, flowchart/chain, map pins, prep-card. A genre = a default arrangement of primitives ("deck"). New genre = config, not code.
3. **Multi-pass compiler**: the achievement-guide-builder skill is reworked into smaller skills (spine → widgets → RA mapping → QA), schema-first, with a source manifest per guide.
4. **Human-in-the-loop QA**: user approves each layer *inside the app* (review lens) using confidence flags + random spot-checks against source excerpts.
5. **Simple RA sync**: one manual "Sync" button marks mapped achievements done (first press = backfill).
6. **One responsive app, two postures**: desktop = browse/review; phone = burst-driven companion landing on the current step (Now screen). Offline-first PWA.

### Decisions locked
- Core = Guide-as-data + Companion + RA sync, genre-flexible
- Widgets/Lego blocks; genre = default widget arrangement; 7 primitives
- JSON in repo, no backend for now
- Skill/process rework: multi-pass compiler, smaller skills, schema-first, source manifest
- User = approver of layers; approval in-app, confidence flags + spot-checks
- RA sync = single manual Sync button
- Companion = responsive version of the app, no dedicated session mode
- Pilot guide: Pokémon Crystal (richest data); schema v0 seeded from ML PiT's build/guide.json
