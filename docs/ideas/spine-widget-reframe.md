# Spine & Widget Reframe — refined direction

_Source: idea-refine session on `Idea_list.md` (2026-06-15). Decisions made by Pierre._

_Status (2026-07-07): landed. Workstream A (location/visit reframe), Workstream B
(shadcn migration), and all four small builds are merged; their specs and task
files are retired to `docs/archive/`. Only the backlog item (#12 per-line
approval) remains open. Kept as the decision record behind that work._

## Problem Statement
How might we make TOTODILE **place-first** — you navigate by *where you are*, get the
reference data, steps, and achievements for that place — without throwing away the
spine, compiler passes, progress store, and RA mapping already built on the linear model?

## Recommended Direction
The 14 raw ideas are symptoms of **one** shift: make a **location graph the primary
index**, with the spine becoming the content reached *through* it rather than the
backbone itself. A "preferred next node" answers "what do I do next."

**Decided model (Option B — visits first-class):** because a location can be visited
many times during the story, a node cannot own content. So:

- **`location`** — a stable place entity (`id`, `name`, `mapImage?`). Reusable.
- **`visit`** — one occurrence of being at a location in the story (`id`, `locationId`,
  `order`, `steps[]`). Carries the steps/objectives for *that* time.
- **spine** = an ordered list of visits (the canonical route). `preferredNext` = the
  next visit in order. A revisit = multiple visits sharing a `locationId`.
- **widgetScope** gains `location` (persistent reference — town map, encounter table,
  shown every visit) and/or `visit` (this-occurrence objectives). `global`/`chapter` TBD.

This preserves the spine's "what next" value (its whole point on a blind run) while
fixing the place-first mismatch. It is a **PRD amendment**, not a workaround.

## After convergence: 14 ideas → 2 workstreams + 4 small builds + 1 backlog

### Workstream A — Location/Visit reframe (needs spec + PRD amendment) — the big one
Absorbs: **#14** (flowchart/graph), **#13** (widgets per location), **#11** (keyword
spine, multiline — steps get terse once the graph carries structure), **#8**
(achievements view decoupled — they attach to items in visits; the view groups
independently), and likely **#6** (extract/classify pass — location/visit extraction
becomes core to the reworked `guide-pass-spine`, may merge in rather than stand alone).

### Workstream B — shadcn/ui migration (needs §19 stack amendment) — big rework, accepted
Absorbs: **#10** (shadcn — owned component source, good for self-editing DX), **#9**
(lucide — comes free; it's shadcn's default icon set), **#4** (widgets-as-modal →
shadcn Dialog/Sheet), **#1** (better mobile widgets = the reskin). Also unblocks #2/#3.
Caveats: adds real deps (`@radix-ui/*`, `class-variance-authority`, `clsx`,
`tailwind-merge`); verify Tailwind 4 init path; keep React-state-only (no state lib).
Sequence alongside Workstream A so renderers are reskinned once.

### Small standalone builds (in-stack, low risk)
- **#7** Library manifest entries — `library.json` gains `status` (`planned`/`building`/
  `ready`); `LibraryScreen` shows `planned` as greyed, non-navigable cards.
- **#5** Derived counter — counter variant whose value = count of checked referenced
  `itemId`s. **Read-only** derivation (never mutates other widgets → §6.8 safe).
  §14.2 gate met (cleanup mode exists). Stays within the 7 primitives.
- **#2** Zoom on images/maps — pinch-zoom on `mapPins` + images. Renderer-only.
- **#3** Sticky widgets — layout-only.

### Backlog
- **#12** Per-line approval — high value (fights §15 risk #2 editor fatigue); own track
  after the reframe.

## Crystal sketch findings (2026-06-15) — Option B confirmed
Ran the model against the real Crystal spine (`layers/spine.json`, 18 chapters, 159 steps):

- [x] **`step.location` is 100% populated** (0 of 159 missing) → visits auto-anchor to the
      existing location tags; promoting the free-text string to a stable `location` id is
      the migration path.
- [x] **Revisits are mild, not the hard part.** Only 20 of 88 locations recur, mostly 2×
      (New Bark Town 4× is the worst). The multi-visit warning holds but is easily handled.
- [x] **Visit granularity is fine — the *current guide* is the problem, not the model.**
      Naive segmentation gives 112 visits, 71% single-step — but that's because today's
      Crystal guide crams a whole location's activity into one dense step (the exact thing
      #11 fixes) and omits item/Pokémon-catch content entirely. Once steps expand into
      keyword beats and missing content lands, a visit (e.g. an OoT-style dungeon) holds
      *many* beats. The visit is the right container; today's spine just under-fills it.
- [x] **Routes are locations, not edges.** They carry encounter tables (`widget-enc-cN`),
      so "routes-as-edges" is rejected — a route is a first-class location with widgets.

**Net:** Option B (visits first-class) is the right call. The sketch's value was reframing
the #1 risk (below) from "noisy graph" to "id stability when dense steps split into beats."

## ~~Key risk~~ — retired: no installed base (2026-06-15)
The migration/ID-stability risk does **not** apply to this reframe. No guide has been
started or played; there is zero progress data and no in-flight RA mappings to preserve.
The existing compiled guides (Crystal, ML PiT) will be **recompiled from scratch** under
the new model, not migrated. So §6.8 does not bind this transition.

**Forward requirement (not a blocker):** stable-ID discipline still applies *after* a real
playthrough begins — once progress exists, a later recompile must preserve `itemId`s. The
spec should bake this in as a property of the new schema/compiler (deterministic IDs from
stable content keys), but it is no longer a migration puzzle to solve up front.

## Not Doing (and why)
- **Not killing the spine** — it becomes the ordered visit path; "no spine" (#14 strong
  form) would discard compiler/progress/RA investment for no gain.
- **Not full free-roam graph connectivity in v1** — canonical ordered path +
  `preferredNext` only; cross-location connectivity edges are backlog.
- **Not adopting shadcn as a state framework** — React-state-only stays (§19).
- **Not cross-widget mutation for the counter** — read-only derivation only.
- **Not an 8th primitive** — derived counter is a `counter` variant (§14.3 holds).

## PRD amendments this implies (§24 — flag before building)
- **§6 / spine schema:** add `location` + `visit` entities; spine = ordered visits.
- **§9 widgetScope:** add `location` (and maybe `visit`) scope; derived `counter` variant.
- **§14.2:** move "derived widget" from deferred → active (gate met).
- **§19 stack:** add Radix + `class-variance-authority` + `clsx` + `tailwind-merge` +
  `lucide-react` (shadcn).
- **library schema:** add `status` field.

## Open Questions (resolve in the spec)
- Does **`chapter`** survive as a story-arc grouping above visits, or get replaced?
- **widgetScope:** `location`-only, or `location` + `visit`?
- Does **#6** (extract/classify) become a sub-step of the reworked spine pass or stay a
  separate compiler pass?
- shadcn + **Tailwind 4** init/theming specifics (verify against current docs).
- v1 visits strictly linear, or allow optional/branching detours?
