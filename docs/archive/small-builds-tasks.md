# Implementation Tasks: Small Standalone Builds

_From the idea-refine triage (`docs/ideas/spine-widget-reframe.md`). The four small builds that
sit outside Workstreams A & B._
_Status: DONE 2026-07-02 — all four builds implemented on `feat/small-builds`
(tasks 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1 — one commit each, `yarn check` green).
Schema bump v1 → v2 (see `app/src/schema/CHANGELOG.md`)._
_**Prerequisite: Workstreams A and B merged.** These build on the v1 schema (A) and the
shadcn component base (B) — renderers below assume shadcn primitives + lucide exist._

## Overview
Four independent builds, each shippable on its own after A+B. No ordering between them.
Commands run from `app/`. Each leaves `yarn check` green.

---

## Build 1 — Library backlog entries (#7)
Make planned-but-unbuilt guides visible in the app as a backlog.

### Task 1.1: Add `planned` status (schema)
**Description:** Extend `guideStatus` with `"planned"` (a manifest entry with no compiled
content yet); allow a `planned` entry to exist without a `guides/<slug>/` build.
**Acceptance:**
- `guideStatus = ["planned", "in-compilation", "playable"]`.
- `validate-guides` does **not** require compiled content for `planned` entries (only id/title/etc.).
- Existing `in-compilation`/`playable` validation unchanged.
**Verification:** schema unit test for the new value; `yarn validate-guides` passes with a planned entry that has no build dir.
**Dependencies:** A (schema v1). **Files:** `schema/library.ts`, `scripts/validateGuides.ts`, `schema/library.test.ts`. **Scope:** S.

### Task 1.2: Render planned guides as backlog (UI)
**Description:** `LibraryScreen`/`GuideCard` show `planned` entries as greyed, non-navigable
backlog cards (distinct from `in-compilation`, which opens the review lens).
**Acceptance:**
- `planned` cards are visibly de-emphasized and not clickable (no nav, no review).
- `in-compilation`/`playable` behavior unchanged.
**Verification:** component test (planned card has no link/handler); manual.
**Dependencies:** 1.1, B (shadcn Card/Badge). **Files:** `shell/LibraryScreen.tsx`, `shell/GuideCard.tsx` + test. **Scope:** S.

---

## Build 2 — Derived counter (#5)
A counter whose value is computed from checked items, read-only. §14.2 gate met (cleanup
mode exists). Stays a `counter` variant — the 7-primitive set holds.

### Task 2.1: `derivedFrom` on counter (schema)
**Description:** Add optional `derivedFrom: itemId[].min(1)` to a counter entry. When present,
the entry is read-only and its value is derived (count of checked `derivedFrom` ids); `target`
defaults to `derivedFrom.length` if omitted.
**Acceptance:**
- Schema accepts a derived counter; `derivedFrom` ids validate as existing checkable ids (FK, cross-file in `guide.ts`).
- A derived counter never writes its own `counterValues` (documented; read-only).
**Verification:** schema unit tests (parse + FK fail path); `yarn typecheck`.
**Dependencies:** A (schema v1, `itemId`). **Files:** `schema/widgets.ts`, `schema/guide.ts`, `schema/widgets.test.ts`. **Scope:** S.

### Task 2.2: Derived counter rendering (UI)
**Description:** `Counter` renders a derived entry read-only: value = `|doneIds ∩ derivedFrom|`
over `target`, completion treatment, **no** +/−/reset controls.
**Acceptance:**
- Derived entry shows computed value/target and the complete state at target.
- No adjust/reset controls for derived entries; manual counters unchanged.
**Verification:** component test (derived value tracks `doneIds`; no buttons); manual.
**Dependencies:** 2.1, B (shadcn). **Files:** `primitives/counter/Counter.tsx` + test. **Scope:** S.

---

## Build 3 — Zoom on images & maps (#2)
Pinch / tap-to-zoom for step images and map-pin images. Map-pin coords are fractional, so pins
scale with the image for free.

### Task 3.1: Zoomable image component  ⚠ dep decision
**Description:** A reusable zoomable/pannable image (lightbox via shadcn `Dialog`, with
pinch + wheel + double-tap zoom).
**Acceptance:**
- Tap opens a zoom view; pinch (touch) and wheel (desktop) zoom; drag pans; close returns.
- Works inside the PWA offline (no remote assets).
**Open decision:** in-house (pointer events + CSS transform, no dep) **vs** `react-zoom-pan-pinch`
(adds a dependency — **ask-first** per §24). Default: in-house unless it gets gnarly.
**Verification:** component test (zoom state transitions); manual on touch + desktop.
**Dependencies:** B (shadcn Dialog). **Files:** new `components/ZoomableImage.tsx` + test. **Scope:** M.

### Task 3.2: Wire zoom into map-pins & step images
**Description:** Use the zoomable image in `MapPins` and step image rendering.
**Acceptance:**
- Map images and step images are zoomable; **pins stay aligned** at all zoom levels.
- Image `alt`/`caption`/`credit` preserved.
**Verification:** manual on a fixture with a map; existing renderer tests green.
**Dependencies:** 3.1, A (visit/step images). **Files:** `primitives/mapPins/MapPins.tsx`, `spine/StepRow.tsx`. **Scope:** S.

---

## Build 4 — Sticky widgets (#3)
Keep widgets in view while scrolling.

### Task 4.1: Sticky widget panels & sheet header
**Description:** Desktop side widget panels stick on scroll; the phone widgets-sheet header
(title + whole-game toggle) sticks while the list scrolls.
**Acceptance:**
- Desktop: `PostureLayout` side panels remain visible on long-page scroll (sticky, within viewport).
- Phone: sheet header stays pinned; only the widget list scrolls under it.
- No layout shift; respects safe-area insets.
**Verification:** manual on desktop + phone widths; existing tests green.
**Dependencies:** B (shadcn Sheet/ScrollArea from R2). **Files:** `shell/PostureLayout.tsx`, `shell/WidgetsSheet.tsx`. **Scope:** S.

---

## Open Questions — resolved 2026-07-02
1. **Build 3 dependency:** `react-zoom-pan-pinch` approved (Pierre, ask-first per §24).
2. **Build 1:** `planned` entries appear inline, de-emphasized (confirmed).

All four builds land on a single branch `feat/small-builds`, one commit per task, one PR.
