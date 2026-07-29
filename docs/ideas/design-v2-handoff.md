# Design v2 — Library (S1) & Guide (S2) redesign

_Source: the Claude Design project **Totodile Page Design** (`c7426467-52ff-4a2f-8ec1-ed7e4e915447`),
approved by Pierre 2026-07-28. Its four `*.dc.html` prototypes are the visual spec; the
project's `README.md` was the change list, reproduced in §1 below._

_Status (2026-07-29): landed as phases 0–5.5 on `feat/totodile-design-v2`. Kept as the
decision record behind that work, and as the place where the handoff's own wording is
preserved next to what actually shipped._

_The prototypes stay readable through the `claude_design` MCP; three corrections in phase
3–5 came from reading `Guide.dc.html` and `Library.dc.html` directly rather than from the
change list, and are recorded in §3._

## Problem statement

Two player-facing screens had outgrown their first implementations.

**Library** was a 3-column grid of cover cards whose covers do not exist — no entry in
`library.json` has one — with no search, filter or sort, no progress bar, no achievement
count, and the 8 `planned` backlog entries interleaved with the 3 playable guides.

**Guide** rendered the *entire* spine in one scroll: 587 steps and 133 visits for
`zelda-oot`, with no per-chapter progress, no map, no URL for where you were, and widgets
behind two 160px launcher rails that opened a dialog over the page. The design note was
blunt about the last one: *"widgets are not easily accessible"*.

## Recommended direction (as approved)

Make the Library an **index** — one wide row per guide, backlog separate — and make the
Guide **visit-scoped and URL-addressable**: the place is the page, with a chapter-progress
rail on the left and an always-visible map + widget stack on the right.

### The change list, verbatim from the handoff

- **S1 header**: `TOTODILE` eyebrow + `Library` on a 2px rule, a `3 playable · 8 planned`
  tally, Settings. No Sync (Sync stays inside a guide).
- **S1 toolbar** (`useState` only, nothing persisted): search over `title + game +
  platform`; status All/Playable/Planned; sort Activity/Title/Completion. *"Active segment =
  `--color-paper-dim` fill + `--color-ink` border (not the accent)."*
- **S1 guide row**: `184px | 1fr | 232px`; cover or placeholder; title, `game · platform`,
  progress bar + big mono %, `Next up — <chapter>`; hairline stat list `STEPS` /
  `ACHIEVEMENTS` / `LAST PLAYED`, mono + `tabular-nums`. Achievements *"derived from
  `ra-mapping.json` + the done set … so it stays a read of local state — no extra network
  call. `no RA set` when `raGameId` is absent."*
- **S1 backlog**: `planned` rows into their own `BACKLOG` section, two-column dense, 44px
  rows, 75% opacity title, dashed `RA set` chip, not navigable.
- **S2 header**: `← Library` · title · progress bar + % + `123 / 587` · trophy `11 / 97` ·
  `Sync`, receipt behaviour unchanged.
- **S2 left rail**: chapter accordion — number, title, percent, bar, `done / total`,
  expanding to the chapter's visits; current chapter/visit marked with the accent. *"Phone:
  the same accordion inside the existing bottom `ChapterSheet`."*
- **S2 middle**: sticky breadcrumb with prev/next visit and a `Back to NOW — <first beat>`
  that appears *"only when the current step row is out of view (IntersectionObserver on the
  row … one boolean)"*; visit heading + meta line; step rows; prev/next repeated at the foot.
- **S2 step row**: checkbox · item icon (32–36px, hairline, pixelated) · keyword beats ·
  badge row · skip and mark-through icon buttons. Current row = accent border, card fill,
  `NOW` eyebrow, larger type.
- **S2 missables**: the sticky banner is replaced by an **inline card above the step**;
  `upcomingMissables` keeps its lookahead.
- **S2 right column**: map panel always visible at the top with persisted zoom, then a
  widget stack of cards that open **in place**, re-orderable and pinnable, each with a scope
  label; `Whole game` keeps its meaning. Phone: the stack under the steps.
- **New persisted state**: *"extend `ProgressSlot` or a sibling per-guide UI record:
  `widgetOrder`, `pinnedWidgetIds`, `mapZoom`. All local, no schema change to guide
  content."*
- **Out of scope**: editor mode, review lens, Cleanup, Settings, the compiler pipeline, the
  seven widget primitives, RA sync semantics, dark mode.

## What shipped, where it differs, and why

The plan and its per-task notes live in `tasks/plan.md` and `tasks/todo.md`; every
divergence is recorded against its task there. The ones that change what the handoff
describes:

| Handoff said | Shipped | Why |
| --- | --- | --- |
| *"extend `ProgressSlot` or a sibling per-guide UI record"* | Sibling `guideUi` store, IDB v2 | `progressExport` is save data (§8.2/FR-B6); where a map is zoomed is not something to carry between devices |
| `mapZoom: number` | `mapZoom` **and** `mapPanX`/`mapPanY` | Zoom alone returns you to the top-left of a 400% map; the corner you were reading is the useful half. Pan is a *fraction* of the extent, never pixels — the panel is a column on desktop and full width on a phone |
| Map zoom via *"zoom out / zoom in / reset (100%–400%, 20% steps)"* | Wheel to zoom, drag to pan, double-click to reset; no buttons | Pierre, 2026-07-29. Three 28px controls were spending the panel's scarcest resource on saying what a wheel already says |
| Widget reorder *"drag by the grip on desktop (HTML5 drag events), move up/down buttons on phone"* | dnd-kit with pointer **and keyboard** sensors, buttons on **every** posture | Buttons are the accessible path, not the phone's consolation prize |
| Fixed three columns | Columns and the map/widget split are **resizable**, per guide | Pierre, 2026-07-29. 248px of chapter rail is generous for `zelda-oot`'s 26-character titles and cramped for `pokemon-crystal`'s 48 |
| Keyword beats as one line | One beat per line | Pierre, 2026-07-29. A step's keywords are a sequence of actions; `·` made two things read as one sentence |
| Place screen kept (not in the handoff, but in the app) | **Removed** | Pierre, 2026-07-29. The visit page names the location, says which visit of how many, and carries its map. What is lost is the cross-visit view — see the risk note in `tasks/plan.md` |
| *"5 Gold Skulltulas here"* in the visit meta line | Omitted | Guide-specific with no generic source behind it; the line stops at achievements |

## Corrections that came from reading the prototypes, not the change list

Recorded because they are the cases where the change list and the prototype disagreed, and
the prototype won:

1. **Chrome is `--color-card`, not `paper-dim`.** The prototypes reserve `paper-dim` for
   hover surfaces and progress-bar *tracks*; using it for the rails put the tools on the
   same tone as their own hover state.
2. **The desktop window does not scroll.** `Guide.dc.html` is `height:100vh; overflow:hidden`
   with each of the three columns its own `overflow-y:auto`. Sticky rails were an
   approximation; this is the mechanism, and it is why a rail cannot slide away from the
   visit it describes.
3. **shadcn's `Progress` tracks on `bg-primary/20`** — a 20% tint of its own fill, which in
   this palette renders as washed-out achievement orange. Every bar in both prototypes runs
   on `paper-dim`. Fixed in the primitive, so the rail and the header inherit it.

A fourth, smaller one: the prototypes use two uppercase tracking steps (0.12em for section
eyebrows, 0.06em for chip caps), where task 0.2 had ported only the narrow one.

## Still open

- **In-guide text search** stays deferred (§14.2). Visit-scoping plus the removal of the
  place screen makes "find that step I remember" rest entirely on the chapter rail and
  shareable URLs; if that proves thin during the manual walk, search over step beats is the
  follow-up, not a restored screen.
- **A missable marker in the chapter rail.** Missables in *later* visits are no longer
  surfaced ahead of time — accepted in the plan. The follow-up is a marker on the rail, not
  a restored sticky banner.
