# Product Requirements Document: TOTODILE

*Tracker Of Things, Order, Data, Items, Lists & Everything — the React app regrouping video game guides/trackers.*

## Executive Summary

**Product:** TOTODILE — a personal video-game completion companion; every guide, tracker, and checklist for Pierre's games in one offline-first PWA. (Named for the Pokémon Crystal starter; Crystal is the pilot guide.)

**Vision:** The official Pokémon HeartGold strategy guide reborn as an interactive app: a chronological companion that gathers everything needed to fully complete a game — above all *what to do in what order* — and checks itself off via RetroAchievements.

**Problem:** Completing games today means juggling wikis, walkthroughs, spreadsheets, and hand-built HTML guides, with no unified progress tracking and constant fear of missables.

**Target Users:** One person, two hats — Player Pierre (phone, mid-game bursts) and Editor Pierre (desktop, compiling and reviewing guides). No third-party users, ever.

**Key Capabilities:**
- Renders any guide from static JSON: a chronological spine plus widgets built from exactly 7 primitives; new game or genre = data files only, zero app code (FR-A)
- Persistent local progress with done/skip states, an explicit current-step pointer, cleanup mode, and file export/import (FR-B)
- One manual, read-only, atomic RetroAchievements Sync with first-press backfill and a receipt (FR-C)
- Schema-first multi-pass compiler (skills) with source manifests and confidence flags (FR-D)
- In-app review lens: human approval gates every layer before a guide becomes playable (FR-E)

**Success Metrics:** The old HTML guides stop being opened; one full playthrough (Pokémon Crystal pilot) completed app-only; all 5 existing guides migrated and approved.

**Scope:** v1 = the full pipeline (schema → app → compiler → review → sync) for all 5 existing guides. Deferred: in-guide search, multi-playthrough slots. Never: backend, accounts, gamification, third-party use.

**Technical Approach:** TypeScript (strict) + React 19 + Vite PWA, Tailwind 4, TanStack Router, Zod schemas, IndexedDB; Biome, Vitest, Yarn 4. Static hosting only; the git repo is the content store.

---

## 0. Vision & Principles

### 0.1 Product Vision
**In one sentence, what is this product and why does it matter?**
A single app that gathers everything needed to fully complete my video games — above all, *what to do in what order* — replacing the juggling of wikis, checklists, and walkthroughs.

**North-star metaphor:** the official Pokémon HeartGold strategy guide — a chronological, beautifully organized companion book with encounter tables, maps, and checklists exactly where you need them — reborn as an interactive app that tracks progress and checks itself off via RetroAchievements.

### 0.2 Design Principles (Non-Negotiables)
What principles must NEVER be violated, even if technically convenient?

| Principle | Why It Matters | Example Violation to Avoid |
|-----------|----------------|---------------------------|
| Guides are data, not code | Adding a game must never require writing app code | Building a custom React component for one game's encounter table |
| No backend | Guides and progress live in the repo and the browser; the user owns their data | Adding a server, account system, or cloud database |
| Nothing ships unapproved | Every compiled guide layer passes the owner's review gate before becoming playable content | Auto-publishing a compiled guide without layer approval |
| Source-faithful | Every fact in a guide traces back to a recorded source in the source manifest | Compiler inventing an encounter rate not present in any source |

### 0.3 What Would Feel Wrong
If the final product had these characteristics, it would be a failure regardless of technical correctness:
- It nags (notifications, streaks, engagement mechanics)
- Checking a step takes more than a glance and a tap while playing
- A guide contains invented or unverifiable information
- Reading your own guides requires an account or an internet connection

### 0.4 Aesthetic & UX North Star
- **What should it FEEL like to use this?** Calm, dense-but-tidy — "a well-organized paper guide that fills itself in."
- **What products do you admire that have similar feel?** Official Pokémon paper guides, especially the HeartGold guide (owned and used by the author) — trusted order, information density without clutter, one book that has everything.
- **What's the personality/tone?** Utilitarian first; playful warmth reserved for achievement moments.

### 0.5 Explicit Taste Decisions
Judgment calls that are subjective but critical:

| Decision | Choice Made | Rationale |
|----------|-------------|-----------|
| Companion behavior | Responsive web app checked in bursts — no dedicated always-on "session mode" | Matches actual play habit: glance sometimes while playing |
| RA sync | One manual Sync button, no background polling | Simplicity over machinery; sync is a deliberate act |
| Gamification | None beyond the games' own achievements | The app is a tool, not a game |

---

## 1. Problem Statement

### 1.1 Background
The author completes retro games to 100% (RetroAchievements sets) and has hand-built five interactive HTML guides (Ocarina of Time, Layton Miracle Mask, Mario & Luigi Partners in Time, Pokémon Crystal, Pokémon Ranger Shadows of Almia in progress). Each guide is a standalone single-file HTML produced by an AI-assisted pipeline. The collection is growing, and each new guide re-solves the same problems.

Scope note: the problem is purely about **in-game completion** — not backlog discovery or deciding what to play next.

### 1.2 Pain Points
1. **Information scatter while playing** — completing a game means juggling wikis, walkthroughs, achievement lists, and encounter data across browser tabs; the *order* of actions is the hardest thing to reconstruct
2. **Each guide is an island** — five guides, three different build pipelines, no shared progress system, no library view; improvements to one guide don't benefit the others
3. **Manual double-tracking** — achievements get earned in-game (RA) and then must be *manually* re-checked in the guide
4. **Production is fragile and slow** — guide quality depends on eyeballing whole HTML outputs; errors (e.g., wrong encounter rates) are hard to catch and fix
5. **One genre = one bespoke format** — every new game genre requires reinventing the guide's structure

### 1.3 Impact
- Play sessions interrupted by tab-hunting instead of glance-and-continue
- Guide-building takes long enough that the backlog of "games I'd like guides for" grows faster than guides get made
- Trust erodes when a guide has unverified facts — defeating the guide's purpose

---

## 2. Target Users

Single real user (the author), wearing two distinct hats with different needs. **No other users — the app is strictly for personal use** (no multi-user features, no public-visitor accommodations, no onboarding for strangers).

### 2.1 Primary Personas

**Persona A — "Player Pierre" (on the couch)**
- Context: playing a retro game on console/handheld/emulator, phone within reach
- Goal: know what to do next and what is about to be missable, in a two-second glance
- Behavior: burst usage — unlock phone, look, tap a checkbox or two, lock phone
- Tolerance: zero patience for navigation, loading, or anything requiring two hands

**Persona B — "Editor Pierre" (at the desk)**
- Context: desktop browser, compiling a new guide layer by layer
- Goal: catch extraction errors *before* they reach a playthrough; approve layers with confidence
- Behavior: deliberate sessions — reviewing flagged rows, spot-checking against sources, approving
- Tolerance: high patience for detail, zero tolerance for silently wrong data

### 2.2 Secondary Personas
None. Third-party use is **out of scope** (see Section 14).

---

## 3. User Stories

All stories are v1. AC = acceptance criteria.

### Player stories

**P1 — Resume at a glance.** As Player, I open the app on my phone and land on my current step in my active game.

**P2 — Check off progress in bursts.** As Player, I mark several completed steps in one interaction burst.

**P3 — Never miss a missable.** As Player, I am warned about missables *before* I pass the point of no return.

**P4 — Consult genre data in place.** As Player, I check the encounter table / puzzle list / boss board for *where I currently am* without losing my place in the walkthrough.

**P5 — Sync RA achievements.** As Player, I press Sync and the achievements I earned in-game get checked in the guide.

**P6 — Track a grind.** As Player, I count repetitive attempts (soft resets, deaths) without leaving my current view.

**P7 — Clean up post-game.** As Player, after credits I switch to cleanup and see remaining tasks grouped by location.

### Editor stories

**E1 — Define a game from config.** As Editor, I add a new game by adding data files (guide JSON + manifest entry) — never by writing app code.

**E2 — Compile in passes.** As Editor, I run compiler passes (spine → widgets → RA mapping → QA) that each produce a reviewable artifact.

**E3 — Review flagged rows.** As Editor, I see exactly which extracted rows the compiler was unsure about, next to their source excerpts.

**E4 — Spot-check randomly.** As Editor, I request N random rows from a layer with their source excerpts for verification.

**E5 — Approve or reject a layer.** As Editor, I approve a layer (locking it) or reject it with a note that feeds the recompile.

**E6 — Migrate existing guides.** As Editor, I convert **all five** existing HTML guides (and their localStorage progress) into the new format.

---

## 4. Functional Requirements

### FR-A: Guide rendering & library
- **FR-A1**: The app renders any guide composed of a chronological spine (chapters → steps, with missable and achievement annotations) plus widgets drawn from exactly 7 primitives: checklist, matrix, data table, counter, flowchart/chain, map pins, prep-card
- **FR-A2**: A genre deck is a configuration (arrangement + labels of primitives); adding a deck or guide requires only data files (E1)
- **FR-A3**: A library screen lists all guides from a manifest, ordered by last activity, each showing completion % and current chapter
- **FR-A4**: Opening a guide lands on the current step (P1); a persistent "where am I" action returns there from anywhere
- **FR-A5**: Widgets auto-filter to the current chapter context, with an explicit toggle to whole-game scope (P4)
- **FR-A6**: Guides embed images (maps, sprites, screenshots) referenced from guide data; images are available offline once the guide is loaded

### FR-B: Progress tracking
- **FR-B1**: Every checkable unit (step, checklist row, matrix cell, table row) has persistent done/not-done state stored locally; writes are immediate (P2)
- **FR-B2**: Steps support an explicit "skipped/later" state distinct from done (P7)
- **FR-B3**: Counters support increment/decrement/reset and persist like checkboxes (P6)
- **FR-B4**: Cleanup view shows all non-done items grouped by location/chapter (P7)
- **FR-B5**: Missables in the upcoming section surface on the current-step view; acknowledgment is explicit (P3)
- **FR-B6**: Progress is exportable and importable as a file (backup/device move)
- **FR-B7**: Exactly one progress slot per guide (no multi-playthrough in v1)

### FR-C: RA sync
- **FR-C1**: Guides carry a step↔RA-achievement-ID mapping in a standalone data file
- **FR-C2**: A manual Sync action fetches the user's RA unlocks and marks mapped items done; never un-marks anything
- **FR-C3**: Sync produces a receipt: newly marked / already done / unlocked-but-unmapped counts (P5)
- **FR-C4**: First sync per guide imports full unlock history (backfill)

### FR-D: Compiler (guide production)
- **FR-D1**: Compilation runs as ordered passes — spine → widget fills → RA mapping → QA — each emitting a layer artifact + report (E2)
- **FR-D2**: Extractors attach a confidence flag and a source reference to every emitted row; flagged rows are listed in the report (E3)
- **FR-D3**: Every guide has a source manifest (URL/document, retrieval date) and every datum references an entry in it
- **FR-D4**: A QA/validator pass rejects schema violations and broken cross-references (e.g., achievement with no step) before human review
- **FR-D5**: A one-time migration tool converts the five existing HTML guides + their localStorage progress (E6)

### FR-E: Review & approval
- **FR-E1**: The app renders unapproved layers visually distinct from approved content
- **FR-E2**: Flagged rows are reviewable in-app with their source excerpt alongside (E3)
- **FR-E3**: Random spot-check of N rows with recorded verdicts (E4)
- **FR-E4**: Layer approval locks the layer (hash or equivalent); rejection records a note consumable by a recompile (E5)
- **FR-E5**: A guide becomes "playable" in the library only when all its layers are approved

### Explicitly deferred (see Section 14)
- In-guide text search
- Multi-playthrough slots

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Cold open → current step visible: < 2 s on a mid-range phone (cached/offline)
- Checkbox tap → visual confirmation: < 100 ms; persistence write completes before the frame settles
- A guide with up to 2,000 checkable items and 300 images renders and scrolls without jank (60 fps target on phone)
- RA Sync round-trip feedback (spinner → receipt): completes or fails visibly within 10 s

### 5.2 Security & Privacy
- The RA API key lives only in browser local storage, entered once in settings — never in the repo, guide data, or build artifacts
- No accounts, no analytics, no third-party calls except the RA API during an explicit Sync
- Static hosting only; no server-side execution

### 5.3 Reliability & Data Durability
- Full functionality offline except Sync (PWA, installable, assets + guide data cached)
- Progress writes are atomic per interaction; an interrupted session never corrupts state
- Progress export/import (FR-B6) is the recovery path; a failed import never destroys existing progress

### 5.4 Accessibility & Ergonomics
- Touch targets ≥ 44×44 px in play posture
- Current step readable at arm's length: ≥ 18 pt body equivalent on phone
- Dark mode supported (couch use); honors system preference
- Desktop review posture fully keyboard-navigable for verdicts (approve/reject/next)

### 5.5 Scalability (bounded by design)
- Library scales to ~50 guides with no architecture change
- No multi-user, no server scaling — out of scope permanently for this design

### 5.6 Localization
- App UI chrome: English only
- Each guide declares exactly one content language (`en` or `fr`) in the manifest; all spine text, widget labels, and captions in that guide use it
- No mixed-language guides, no per-guide language switching
- Schema and primitives carry no English assumptions — all user-visible strings come from guide data

---

## 6. Data Model

### Repo-side entities (versioned, compiled)

**1. Library Manifest** (one file = the library)
Per guide: stable guide ID · title · game · platform · RA game ID · genre deck reference · content language (`en`/`fr`) · status (`in-compilation` / `playable`) · cover image reference.

**2. Guide Spine** (one per guide)
Chapters (ID, title, order) containing **Steps**: stable step ID · order · instruction text · location tag · missable flag (+ deadline description) · achievement references · optional image references.

**3. Widget Instances**
ID · primitive type (one of exactly 7: checklist, matrix, data table, counter, flowchart/chain, map pins, prep-card) · title · scope (chapter-bound or global) · layout position in the deck · primitive-specific data payload. Every checkable payload row/cell has a stable item ID; **every row carries a source reference and a confidence level** (normal / flagged).

**4. Genre Deck** (config, reusable across guides)
Deck ID · ordered list of widget slots (primitive type + default labels + default scope).

**5. RA Mapping** (standalone file per guide)
RA game ID · entries mapping RA achievement ID → target item ID (step or widget cell). Unmapped achievements are allowed and surface in the Sync receipt's "unmapped" bucket.

**6. Source Manifest** (per guide)
Entries: source ID · URL/title · type (wiki, RA set, manual…) · retrieval date. **Invariant: every widget row and step references ≥ 1 source ID.**

**7. Compilation Layers & Approvals** (per guide)
Layer records: layer ID (spine / per-widget-pass / RA-mapping) · artifact reference · report (row counts, anomaly list, flag list) · content hash · status (`draft` / `approved` / `rejected`) · approval record (date, verdict, note) · spot-check verdicts (item ID, pass/fail, note).

### Browser-side entities (never in repo)

**8. Progress Store** (per guide, single slot)
Item states (done / skipped, with timestamp) · counter values · current-step pointer · acknowledged missables · last-activity timestamp · last-sync timestamp.

**9. Settings**
RA username · RA API key · display preferences.

### Current-step pointer semantics (decided)
The pointer is **explicit**: a stored value that auto-advances when the step it rests on is checked, and that the user can manually move to any step. It is never derived from "first unchecked" (skips and out-of-order checking would teleport it).

### Global invariants
- All IDs are stable across recompiles — progress must survive a guide being recompiled
- Approved layers are referenced by hash; recompiles produce new drafts, never mutate approved content
- No entity contains app-language strings; all display text comes from guide data (5.6)

---

## 7. UI/UX Specification

### Screens (5 total)

**S1 — Library** (app home when no guide is active)
Grid/list of guide cards: cover, title, completion %, current chapter, language badge. Sorted by last activity. Guides still in compilation appear with an "in progress" treatment and open into review, not play. One tap on a card → S2 at the current step.

**S2 — Guide: play view** (the core screen)
- *Phone (play posture)*: single column. Current step prominent at top (large type, image if any, achievement badge if mapped); next steps listed below; sticky missable banner above when one is upcoming (FR-B5). Bottom bar: ☰ chapters · 🧩 widgets · 📍 where-am-I · 🔄 Sync.
- *Desktop (browse posture)*: walkthrough column center; widget panels in side columns per deck layout; same data, spread out.
- Checking behavior: tap checkbox = done (auto-advance pointer if on current step); swipe/secondary action = skip-for-later; multi-select for bursts (P2).

**S3 — Widget view** (phone) / side panels (desktop)
Widgets for the current chapter by default, whole-game toggle visible (FR-A5). Each primitive renders responsively: tables → cards, matrices → scrollable grids, counters → chips with big +. Pinned counter floats over S2 when active (P6).

**S4 — Cleanup view**
Entered from guide menu post-credits (manual switch, no auto-trigger — no nagging). Non-done items grouped by location; skipped items flagged distinctly; mastery bar at top (remaining RA achievements).

**S5 — Review lens** (desktop-first)
Per-layer tabs with report card header (counts, anomalies, flags). Flagged rows inline with ⚠ pins → click opens source excerpt side-by-side. "🎲 spot-check N" action. Approve/reject per layer with note. Keyboard: ✓ approve row, ✗ reject row, → next flag.

### Navigation map
Library → Guide(play) ⇄ Widgets ⇄ Cleanup; Guide → Review lens (only for in-compilation guides); Settings reachable from Library only.

### Visual language
- Paper-guide aesthetic (HeartGold official guide): warm neutrals, generous information density, clear chapter numbering, "printed book" typography; dark mode = dimmed paper, not pure black UI chrome
- One accent color reserved for achievements/RA moments (the "playful warmth" from 0.4)
- Missables always use one consistent, unmistakable treatment (color + icon) everywhere they appear
- No modals where an inline expansion works; no onboarding screens, no first-use tooltips (single user)

### Interaction guarantees (testable)
- Library → current step: 1 tap. Any screen → current step: 1 tap (📍)
- Check a step: 1 tap. Mark N consecutive: ≤ N+1 taps. Increment pinned counter: 1 tap
- Sync: 1 tap + receipt toast; receipt dismisses itself, errors don't

---

## 8. API Contract

The app exposes no API. It consumes one external API (RetroAchievements) and publishes one inward contract (the data files both app and compiler honor).

### 8.1 External: RetroAchievements Web API (consumed)
- **Auth**: username + web API key (from Settings, browser-stored), sent per RA's documented auth scheme; the key never appears in repo files or logs
- **Calls used** (exact endpoints pinned at implementation against current RA docs):
  1. *User unlocks for a game* — drives Sync (FR-C2) and backfill (FR-C4)
  2. *Game achievement list* — supports the compiler RA-mapping pass and mastery counts
  3. *Recent unlocks / unlocks by date range* — incremental sync optimization (optional)
- **Behavioral contract**:
  - All calls happen only during explicit user actions (Sync) or compiler runs — never on app load, never on a timer (per 0.5)
  - Rate-limit respect: one Sync = bounded burst (≤ a handful of requests); responses cached locally per guide
  - RA is read-only: the app never writes anything to RA
- **Failure handling**: offline/timeout/4xx → Sync fails atomically with a visible error; no partial marking without a receipt; invalid key → actionable message pointing to Settings

### 8.2 Internal: data-file contract ("the files are the API")
- The guide-JSON schema (Section 6) is a **versioned contract**: every guide file declares a schema version; the app declares which versions it reads
- Breaking schema changes require a version bump + a documented migration path (Section 18); the app never silently misrenders an older guide
- The compiler's only obligation is to emit schema-valid files; the app's only obligation is to render any schema-valid file — neither knows the other's internals
- The progress export file (FR-B6) is part of the contract: versioned, forward-importable

### 8.3 No other surfaces
No REST/GraphQL endpoints, no webhooks, no third-party integrations beyond RA. Adding any new external call is a PRD-level change (see Section 24).

---

## 9. Change Analysis

### 9.1 Configuration vs Hardcoded Decisions
| Element | Decision | Rationale |
|---------|----------|-----------|
| Guides (content, order, text, images) | **Data** | Core principle: guides are data, not code (§0.2) |
| Genre decks (widget arrangement/labels) | **Data** | New genre = a config file, zero code changes |
| RA mappings | **Data** (standalone file per guide) | Independently fixable; consumed by Sync (§6.5) |
| Source manifests | **Data** | Re-compilation requires them (§6.6) |
| Library contents | **Data** (library manifest) | Adding a game touches zero code |
| The 7 widget primitives | **Hardcoded** (closed set) | The deliberate bet of the whole design; adding an 8th primitive is a PRD change, not a config change |
| Progress semantics (done / skip / explicit pointer) | **Hardcoded** | One behavior, identical everywhere (§6.7) |
| Sync logic | **Hardcoded** | One button, one behavior (§8.1) |
| RA endpoint details | **Hardcoded, isolated module** | The most likely external change; confined to one client module |
| Visual theme | **Hardcoded, centralized tokens** | One user's taste; central tokens make taste changes cheap |

### 9.2 Flexibility Requirements
Most-likely changes, ranked, with required blast radius:

1. **New guide / new genre deck** → data files only, zero code. This is the standing test of FR-A2: if adding a guide ever requires an app change, the design has failed.
2. **Schema evolution** (e.g., a new optional field on a primitive) → schema version bump + migration note in the schema changelog. Renderers MUST ignore unknown optional fields without erroring.
3. **RA API changes** (endpoints, response shapes, rate limits) → changes confined to the isolated RA client module; no other module imports RA types directly.
4. **A primitive's renderer improves** (e.g., map pins upgrades from list-style to a real map view) → one renderer changes; guide data already carries the full structure and is untouched.
5. **Hosting moves** (local file serve → GitHub Pages → elsewhere) → zero app changes required. Enforced by the static-only discipline: no server-side assumptions, relative asset paths.

### 9.3 Feature Flags / Toggle Points
Deliberately few — feature-flag systems are for products with audiences; this app has one user.

| Toggle | Effect | Default |
|--------|--------|---------|
| **Editor mode** | Shows the review lens and unapproved/in-progress guides | OFF (player mode stays clean) |
| **Degraded renderers** | Map pins and flowchart primitives may ship as list-style renderings first; upgrading them later is invisible to guide data | Per-renderer, not user-facing |

No other flag mechanism exists. Anything else that needs turning on/off is a schema or PRD change.

---

## 10. Architecture Decisions

### 10.1 Shared vs Local Concepts
| Concept | Scope | Rationale |
|---------|-------|-----------|
| Spine model (chapters → steps) | **Shared** — one definition, all guides | The skeleton every guide hangs off (§6.2) |
| 7 primitive renderers | **Shared** — exactly one renderer per primitive | A checklist looks and behaves the same in every guide |
| Progress semantics & pointer logic | **Shared** — single module | One behavior everywhere (§9.1) |
| Genre decks | **Local to each guide** (may start from a template) | A guide can override its deck freely (§6.4) |
| Widget instance data | **Local to each guide** | Content is per-guide by definition |
| RA mapping | **Local to each guide**, standalone file | Fixable without touching guide content (§6.5) |
| Theme tokens | **Shared** — centralized | One paper-guide aesthetic across the app |

### 10.2 Source of Truth
| Data Type | Owner | Consumers |
|-----------|-------|-----------|
| Guide content | JSON files in the repo (approved layers) | App renderers, print lens |
| Approval status | Approval records, hash-referenced (§6.7) | Library listing, review lens |
| Player progress | Browser progress store — **only** there | Renderers, cleanup mode, sync receipt |
| Achievement truth | **RetroAchievements** | Sync maps RA unlocks → local "done"; never the reverse (§8.1) |
| Current step | Explicit pointer in progress store (§6.7) | Now screen, play view |
| RA API key | Browser settings store — only there | RA client module |

Governing rule: **repo = content truth, browser = progress truth, RA = achievement truth.** No datum lives in two places.

### 10.3 Dependency Map
What breaks if X changes:

- **Schema changes** → widest blast radius: compiler skills, validators, renderers, existing guide files. Mitigated by schema versioning + the "renderers ignore unknown optional fields" rule (§9.2).
- **Step IDs change during a recompile** → breaks player progress AND RA mappings. Hence the invariant: stable IDs across recompiles (§6.8). This is the single most fragile joint in the system.
- **A primitive renderer changes** → affects that primitive in every guide; zero data impact.
- **RA API changes** → confined to the RA client module (§9.1).
- **Progress store format changes** → requires a versioned migration on app load (same discipline as the schema).
- **Theme token changes** → cosmetic only, by construction.

---

## 11. Edge Cases & Error Scenarios

### 11.1 Malformed Input Handling
| Input Type | Malformed Example | Expected Behavior |
|------------|-------------------|-------------------|
| Guide JSON | Fails schema validation | Guide refuses to load; library lists it as "broken (schema vX expected)" — never a blank screen or crash |
| Guide JSON | Unknown *optional* field | Ignored silently (§9.2 rule) |
| Imported progress file | Wrong guide ID / corrupted | Import rejected with a stated reason; existing progress untouched |
| RA mapping | References a step ID that does not exist | Validator flags it at compile time; at runtime the entry is reported as "unmapped" in the sync receipt — sync never crashes |
| RA API key | Invalid / revoked | Sync fails atomically with a "check your API key" message; no partial marking |

### 11.2 Missing Data Scenarios
- **Image missing or uncached** → placeholder showing the image's caption text; the step remains fully usable.
- **Guide has no RA mapping** → the Sync button is hidden for that guide (not greyed out — sync is not a feature of that guide).
- **No progress yet** (freshly opened guide) → pointer starts at step 1; Now screen shows the first step.
- **A widget references no steps** (standalone widget, e.g. an encounter table) → renders normally; standalone widgets are legal.
- **Pointer's step removed by a guide update** → pointer moves to the nearest surviving earlier step, and the app states this once.

### 11.3 System Failure Modes
- **RA API down / timeout** → Sync fails atomically with a clear message; local progress is never partially modified (§8.1).
- **RA rate limit hit** → same as down: whole sync fails; message says "try again in a minute".
- **Browser storage full / denied** → visible warning banner; the app continues read-only for progress rather than silently dropping checks.
- **Browser data wiped** → accepted loss mode; manual export/import (FR-B6/B7) is the safety net. No cloud backup, ever. **No periodic export reminders** — reminders violate the no-nagging principle (§0.3); export stays purely manual.
- **Offline** → everything works except Sync, which states it needs a connection (§5.2 offline-first).

### 11.4 Concurrent/Race Conditions
- **Two tabs/devices open** → last-write-wins per item; no merge, no cross-device sync. Single-user app; this is documented accepted behavior, not a bug.
- **Sync pressed twice rapidly** → second press is ignored while one is in flight (button disabled during sync).
- **Checking a step while sync runs** → the manual check wins; sync only ever adds "done", never removes it.

---

## 12. Testing Strategy

### 12.1 Testability Assessment
| Requirement | Easy to Test? | If No, Why? | Redesign Needed? |
|-------------|---------------|-------------|------------------|
| Schema validation (FR-D) | **Yes** — pure data in/out | — | No |
| Primitive renderers (FR-A) | **Yes** — JSON in, DOM out | — | No |
| Progress semantics (FR-B) | **Yes** — pure state transitions | — | No |
| RA sync (FR-C) | **Yes, with a fake** — real RA API is rate-limited and account-specific | Needs recorded/fake RA responses | No — the isolated client module (§9.1) makes faking trivial |
| Compiler skills (FR-D) | **Partly** — output is checkable against schema; correctness vs. source is human-judged | Source faithfulness is inherently a human judgment | No — that is what the review lens exists for (§0.2, FR-E) |
| Offline behavior (§5.2) | **Yes** — devtools offline mode + manual check | — | No |
| Paper-guide feel (§0) | **No** — taste is not testable | Subjective by nature | No — Pierre is the test |

### 12.2 Test Approach per Feature
- **Schema & validators**: highest-value automated tests. Valid and invalid fixture files for every entity type in §6; every row of §11.1 becomes a test case.
- **Renderers**: each primitive gets fixture-driven render tests (golden JSON in → expected content out), including the "ignore unknown optional fields" rule (§9.2) and degraded render modes (§9.3).
- **Progress store**: unit tests for done/skip/pointer transitions, auto-advance, export/import round-trip, last-write-wins (§11.4).
- **Sync**: tests against a fake RA client — backfill, the three receipt categories (newly marked / already done / unmapped), atomic failure on mid-sync error (§8.1).
- **Compiler**: each pass tested on a small fixture guide; each pass's output MUST validate against that layer's schema. The Pokémon Crystal pilot is the real-world test.
- **End-to-end**: a small set of smoke flows (open library → open guide → check step → pointer advances → reload → state survives) — not a large E2E suite.

### 12.3 Test Data Requirements
- A **tiny fictional fixture guide** (~2 chapters, ~10 steps, one instance of each of the 7 primitives, a fake RA mapping) lives in the repo. It exercises every code path without depending on real guide content.
- Recorded/fake RA API responses for sync tests; a live RA key NEVER appears in tests or fixtures (§5.3).
- Real guides double as a validation corpus: CI validates every shipped guide against the schema on every commit.

### 12.4 Integration Test Scenarios
1. **Full sync flow** with the fake RA client: fresh guide → first Sync press (backfill) → receipt shows the correct three buckets → local state matches.
2. **Guide update with stable IDs**: load progress → swap in recompiled guide v2 → progress and pointer survive (tests the §10.3 "most fragile joint").
3. **Cross-device by export**: export on desktop → import on phone → identical progress state.
4. **Schema version bump**: old guide + new app → versioned migration or a clear "broken (schema vX expected)" state — never silent corruption (§11.1).

---

## 13. Success Metrics

Single-user app: no DAU charts. Success = the app gets used and beats the HTML guides (§1 pain points).

### 13.1 Adoption Signals (the real test)
1. **The HTML guides stop being opened.** After a guide is migrated, zero reopens of its HTML file except via the print lens. If the old file wins, the app lost.
2. **A full playthrough completed app-only**: the Pokémon Crystal pilot taken from step 1 to 100% using only the app, on phone + desktop.
3. **All 5 guides migrated and approved** through the new compiler pipeline (§3 all-guides ruling).

### 13.2 Experience Targets (verifiable per §5)
4. Phone check-in stays within the **glance + tap** budget: current step visible in <2s from opening; marking done = 1 tap (§0.3, §5.1).
5. **Sync trust**: after a play session, one Sync press reconciles RA unlocks with a correct receipt — zero wrongly marked steps across the pilot playthrough.
6. **Zero data-loss events** during normal use (deliberate browser wipes excluded — export/import covers those, §11.3).

### 13.3 Production Process Signals
7. **Compiler beats hand-building**: producing the Crystal guide via the multi-pass pipeline takes less editor effort than the hand-built HTML rework would have, and every datum traces to a source ID (§6.6).
8. **Review lens catches errors before play**: at least one compile error caught at layer review rather than discovered mid-game — proof the QA loop works (FR-E).

### 13.4 Anti-Metrics (explicitly NOT success measures)
- Time spent in app — more is not better; this is a tool, not an engagement product (§0.3 no-gamification).
- Number of guides produced per month.
- Any third-party usage — out of scope forever (§2).

---

## 14. Scope Boundaries

### 14.1 In Scope (v1)
- One responsive PWA, two postures (desktop browse/review, phone play), offline-first, static hosting (§5, §7)
- The 7 widget primitives + genre decks; spine + organs model (§6)
- Single progress slot per game; done/skip/explicit pointer; export/import (FR-B)
- One manual RA Sync button with backfill + receipt (FR-C)
- Multi-pass compiler skill suite, schema-first, with source manifests (FR-D)
- In-app review lens with confidence flags, spot-checks, hash-locked approvals (FR-E)
- Migration of **all 5 existing guides** through the pipeline, Pokémon Crystal as pilot (§3)
- Print lens back to single-file HTML (brainstorm #21)
- UI in English; one content language per guide, `en`/`fr` (§5.6)

### 14.2 Deferred (future — explicitly ledgered)
| Item | Deferred from | Revisit when |
|------|---------------|--------------|
| In-guide text search | §4 ruling | All 5 guides migrated AND spine/TOC navigation proves insufficient |
| Multi-playthrough slots per game | §4 ruling | A real replay actually happens |
| Map-pins & flowchart full renderers (list-style ships first) | §9.3 | After v1 ships |
| Per-primitive "Now cards" (brainstorm #25) | P5 tier | After the Now screen proves itself |
| Missables radar as derived widget (brainstorm #17) | P4/P5 tier | After cleanup mode exists |
| App UI in French | §5.6 | Probably never — recorded for honesty |

### 14.3 Never (not deferred — rejected)
Recorded so a future AI does not helpfully reintroduce them:
- Third-party users, sharing, or publishing for others (§2)
- Backend, accounts, cloud storage, analytics (§0.2)
- Writing to RA, automatic/polling sync, rich presence (§8)
- Gamification, streaks, reminders, notifications (§0.3, §11.3)
- An 8th primitive added casually — that is a PRD revision, not a feature (§9.1)

---

## 15. Risks & Mitigations

Ranked by likelihood of actually killing the project:

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | **Compiler rework stalls** — the multi-pass pipeline is the biggest build; if it drags, no new content and the app stays empty | Medium | High | ML PiT's existing `build/guide.json` seeds schema v0, so the app (P1) is testable *before* the compiler exists; passes are small separate skills, each useful alone |
| 2 | **Editor fatigue** — layer-by-layer approval becomes a chore; guides pile up unreviewed | Medium | High | Review lens designed for speed (visual, in-app, spot-checks instead of full reads); confidence flags concentrate attention on doubtful data only (FR-E) |
| 3 | **Stable-ID discipline slips** — a recompile silently regenerates IDs, wiping progress and RA mappings | Medium | High | Validator hard-fails any recompile that drops IDs present in the approved layer (§6.8); integration test #2 (§12.4) guards it |
| 4 | **Schema v0 wrong in a way data can't fix** — a primitive proves mis-designed after several guides are built on it | Low–Med | High | Pokémon Crystal pilot is the deliberate stress test before mass migration; schema versioning + migration notes absorb the rest (§9.2) |
| 5 | **RA API changes or blocks access** — endpoint or rate-limit changes break Sync | Low | Medium | Isolated client module (§9.1); sync is additive-only, so the app degrades gracefully to manual checking |
| 6 | **Scope creep via "just one more widget"** — the 7-primitive bet erodes | Medium | Medium | §14.3: an 8th primitive is a PRD revision; a new need must first prove it cannot be a costume on an existing primitive |
| 7 | **Single-maintainer bus factor** — interest is lost mid-migration | Low | Medium | Each migrated guide is independently complete and useful; HTML guides remain until their replacement is approved — nothing breaks half-done |
| 8 | **Browser storage eviction** — PWA storage cleared by OS/browser under pressure | Low | Medium | Persistent-storage request where supported; export/import as the accepted recovery path (§11.3) |

Structural theme: every mitigation is "the system stays useful even if this part fails or stops" — no mitigation requires building more.

---

## 16. Dependencies

### 16.1 External (runtime)
| Dependency | Used for | Failure stance |
|------------|----------|----------------|
| **RetroAchievements API** | Sync only — read-only, explicit action (§8.1) | App fully functional without it (§15 risk 5); official `@retroachievements/api` JS lib; rate-limited, polling-only |
| **Static host** (local serve → GitHub Pages or similar) | Serving the PWA | Interchangeable by design (§9.2 #5); no host-specific features allowed |
| **Browser PWA capabilities** (service worker, local storage, install prompt) | Offline-first + progress store | Baseline: current Firefox/Chrome on Android + desktop Linux; no exotic APIs |

### 16.2 External (production / compile-time only)
| Dependency | Used for |
|------------|----------|
| Walkthrough/wiki sources (GameFAQs, fan wikis, etc.) | Compiler input; every retrieval recorded in the source manifest with URL + date (§6.6) |
| RA achievement lists per game | RA mapping pass input |
| Claude Code + the reworked skill suite | The compiler *is* skills; guides cannot be produced without it — but already-shipped guides never depend on it at runtime |

### 16.3 Internal (build-order dependencies)
The P0→P5 chain: **schema v0** unblocks everything → **app renderers** need the schema → **compiler** needs the schema → **review lens** needs the app + compiler output → **sync** needs the app + RA mappings. The schema is the single upstream dependency of every workstream.

### 16.4 Existing Assets Relied On
- `ml-partners-in-time/build/guide.json` — schema v0 seed
- `guide-improvements` branch — Pokémon Crystal source work + pytest suite; feeds the pilot
- The 5 HTML guides — content reference for migration fidelity

---

## 17. Technical Constraints

Hard constraints consolidated in one place for any implementing AI:

**Hosting & runtime**
1. **Static files only.** No server-side code, no build-time secrets, no host-specific features. The app MUST run from any dumb file server (§9.2 #5).
2. **No backend, no accounts, no analytics, no third-party calls** except the RA API during an explicit Sync (§0.2, §8.3).
3. **Offline-first**: every feature except Sync works with no connection (§5.2).

**Data & security**
4. **RA API key lives only in browser storage**, entered once in settings. It MUST never appear in the repo, guide data, build artifacts, logs, exports, or test fixtures (§5.3). Progress exports MUST NOT contain the key.
5. **App is read-only toward RA** — no write endpoint is ever called (§8.1).
6. **All guide data is versioned-schema JSON in the git repo**; the repo is the only content store (§10.2).

**Platform baseline**
7. Current Firefox + Chrome on Android and desktop Linux. No Safari/iOS testing obligation. No exotic browser APIs beyond the standard PWA set (§16.1).
8. Performance budgets are binding: <2s cold open, <100ms tap response, 2000 items / 300 images per guide, ~50 guides total (§5.1, §5.5).

**Production**
9. The compiler runs as Claude Code skills against the repo — production tooling never becomes a runtime dependency of shipped guides (§16.2).
10. Print lens output is a **single self-contained HTML file** per guide (§14.1).

**Framework**: at constraint level the requirement is "a static-buildable SPA framework"; the React commitment and specifics are pinned in §19 Tech Stack.

---

## 18. Evolution Strategy

### 18.1 Anticipated Future Features
| Feature | Likelihood | Impact on Current Design |
|---------|------------|-------------------------|
| The §14.2 deferred ledger (search, multi-slot, full map/flowchart renderers, Now cards, missables radar) | High | **None** — all designed-for; the data already carries what they need |
| New genres beyond the current five games (RPG, metroidvania, racing…) | High | None if the 7-primitive bet holds — a new deck config only |
| Guides for non-RA games (modern consoles, PC) | Medium | None — RA mapping is optional per guide (§11.2); everything else works |
| Richer media (video clips, audio cues) | Low | Schema change: new optional media types on steps; renderers ignore them until built (§9.2) |
| A second user (e.g. lending a guide to a friend) | Low | The never-list (§14.3) says no accounts/sharing; "a friend clones the repo and self-hosts" already works with zero changes |

### 18.2 Assumptions That May Become Invalid
- **"7 primitives cover everything"** — the most load-bearing assumption. Detection: a genre deck that cannot be expressed. Response: PRD revision, not a quiet workaround (§14.3).
- **"One playthrough at a time per game"** — dies the day a replay happens; §14.2 covers it; the progress store is keyed so a slot dimension can be added without migration pain.
- **"RA API stays free and open for personal use"** — if it dies, Sync dies cleanly and manual checking remains (§15 risk 5).
- **"Browser storage is durable enough"** — if eviction proves common in practice, revisit; the never-list still forbids cloud backup, so the answer is friction-reduced export, not a server.
- **"Single content language per guide suffices"** — could break for a game with mixed FR/EN sources; the per-guide language field would become per-widget; absorbed via a schema version bump.

### 18.3 Migration Paths
- **Schema vN → vN+1**: every bump ships a migration note; the validator reads N and N+1 during the transition; guides migrate at recompile — never in the browser at runtime.
- **Progress store format changes**: versioned, migrated in-place on app load (§10.3); the export format documents its version.
- **Old HTML guides → JSON**: per guide via the compiler pipeline; the HTML original stays in the repo until its JSON replacement is approved, then retires to print-lens output only.

### 18.4 Extensibility Points
Designed-in:
1. **Deck configs** — the primary extension surface; new genre = new file
2. **Optional fields on schema entities** — renderers tolerate unknowns, so data can run ahead of renderers
3. **Compiler passes** — the pipeline can gain a pass (e.g., a new QA check) without touching other passes
4. **Renderer upgrades behind a stable data contract** (list-style → full map, §9.3)

Explicitly NOT extensibility points: the primitive set, the progress semantics, the sync behavior.

---

# AI Implementation Specification

---

## 19. Tech Stack

### 19.1 Core Technologies
Versions pinned at major level; exact minors lock in the Yarn lockfile at implementation time.

| Category | Technology | Version | Rationale |
|----------|------------|---------|-----------|
| Language | **TypeScript** | 5.x, strict mode | Schema-first project — types derived from the schema catch data drift |
| Framework | **React** | 19.x | Named in the project goal; largest ecosystem and AI familiarity |
| Build | **Vite** | latest major | Static output by default, first-class PWA plugin, fast |
| PWA/offline | **vite-plugin-pwa** (Workbox) | latest | Standard service-worker generation; precaches guides + images |
| Progress store | **IndexedDB** via the `idb` wrapper | latest | Survives better than localStorage at 2000-items/300-images scale; async; persistent-storage request (§15 risk 8) |
| Schema validation | **Zod** | 4.x | One schema source → runtime validation + inferred TS types; the same validator runs in compiler CI and in-app |
| Styling | **Tailwind CSS** | 4.x | v4's `@theme` is CSS custom properties natively — §9.1 "centralized theme tokens" maps directly onto it; paper-guide palette defined once as tokens. The §9.1 "theme = hardcoded, centralized" row concretely means the Tailwind theme config |
| State | **React state + context only** | — | No Redux/Zustand: progress lives in IndexedDB, UI state is shallow; fewer deps, less rot |
| Routing | **TanStack Router** | latest 1.x | Type-safe routes pair with the strict-TS, schema-first approach; static-host-safe |

### 19.2 Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** + Testing Library | latest major | Unit + renderer fixture tests (§12) |
| **Biome** | latest 2.x | Lint + format in one tool, single config |
| **Yarn** | 4.x (berry) | Package manager; lockfile pins exact versions |
| **Node** | LTS (22+) | Build environment |

### 19.3 External Services
| Service | Purpose | API Version |
|---------|---------|-------------|
| RetroAchievements API via **`@retroachievements/api`** | Sync (read-only, explicit action only, §8.1) | latest 1.x; exact endpoints pinned in the RA client module at implementation |
| Static host (GitHub Pages or local serve) | Hosting | n/a — interchangeable (§17.1) |

**Deliberate exclusions**: no Next.js (no server; SSG is overkill), no state-management library, no UI component kit (the paper aesthetic is bespoke).

---

## 20. Project Structure

The app lives in this existing repo (the repo is the content store, §10.2), beside the legacy game folders.

### 20.1 Directory Tree

*Amended 2026-07-07: `app/src/` reorganized to the bulletproof-react layout; tests are
colocated in `src/` next to their subjects (test infra in `src/testing/`, script tests
in `scripts/`); module boundaries are enforced by a Vitest guard test
(`src/testing/guards/importBoundaries.test.ts`): **shared (`components`, `lib`, `types`,
`schema`) → `features` → `app`** — features never import other features, shared never
imports features or app, `src/app/` is imported only by `main.tsx`, and `schema/`
imports nothing outside itself.*

```
Guides/                          # this repo
├── app/                         # the React PWA (all §19 tooling scoped here)
│   ├── src/                     # *.test.ts(x) colocated beside their subjects
│   │   ├── main.tsx             # entry — stays at src root (index.html references it)
│   │   ├── app/                 # app layer: router + route screens (routes/)
│   │   ├── features/
│   │   │   ├── spine/           # spine rendering, current-step pointer, Now screen, widget chrome
│   │   │   ├── progress/        # IndexedDB store, done/skip semantics, export/import
│   │   │   ├── review/          # review lens (editor mode only)
│   │   │   └── sync/            # the isolated RA client module (§9.1) + receipt UI
│   │   ├── components/          # shared UI: ui/ (shadcn) + primitives/ (exactly 7 renderers)
│   │   ├── lib/                 # shared helpers: content loaders, pure guide helpers, idb
│   │   ├── types/               # shared view types (e.g. ProgressSlice)
│   │   ├── schema/              # Zod schemas — THE schema source of truth (path frozen)
│   │   └── testing/             # test infra: fixtures incl. the tiny fictional guide (§12.3), guard tests
│   ├── scripts/                 # validate-guides CLI (used by CI), print-lens generator (+ colocated tests)
│   └── public/
├── guides/                      # compiled guide data — content truth (§10.2)
│   └── <game-slug>/
│       ├── guide.json           # spine + widget instances
│       ├── deck.json            # genre deck config
│       ├── ra-mapping.json      # standalone, optional (§6.5)
│       ├── sources.json         # source manifest (§6.6)
│       ├── approvals.json       # hash-locked layer approvals (§6.7)
│       ├── layers/              # intermediate compiler pass outputs
│       └── images/
├── library.json                 # library manifest (§6.1)
├── .claude/skills/              # the compiler skill suite (production tooling)
├── ocarina-of-time/ …           # legacy HTML guides — stay until replaced (§18.3)
└── .planning/                   # planning artifacts
```

### 20.2 Key Files and Their Purposes
| File | Purpose |
|------|---------|
| `app/src/schema/` | Single schema definition; app validation, CI validation, and compiler contracts all import from here |
| `library.json` | What guides exist, language, approval state — the library screen renders this |
| `guides/<slug>/guide.json` | The only file the player-facing app strictly needs per guide |
| `app/scripts/validate-guides` | CI gate: every guide validates against the schema on every commit (§12.3) |

Structural decision: **no Yarn workspaces / monorepo packages** — the schema lives inside `app/` and the compiler skills consume it via the validate CLI. Splitting packages for one app adds ceremony with no second consumer.

### 20.3 Naming Conventions
- **Non-component files:** camelCase (`raClient.ts`, `progressStore.ts`)
- **Component files:** PascalCase, matching the exported component (`PrepCard.tsx`, `NowScreen.tsx`)
- **Folders:** camelCase (`primitives/prepCard/`, `sync/`)
- **Guide slugs & data folders:** kebab-case (`pokemon-crystal`) — URLs and data keys, not code; already established in the repo; stable forever (they key progress data)
- **Schema/JSON fields:** camelCase
- **IDs (steps, widgets, chapters):** stable strings; exact format fixed in schema v0, never regenerated (§6.8)

---

## 21. Commands

All commands run from `app/`. The script names below are the contract; implementation wires them in `package.json` to match.

### 21.1 Development
```bash
# Install dependencies (Yarn 4)
yarn install

# Start development server (default http://localhost:5173)
yarn dev

# Same, reachable from the phone on the LAN — needed to test the play posture
yarn dev --host
```

### 21.2 Testing
```bash
# Run all tests (Vitest, single run)
yarn test

# Watch mode
yarn test --watch

# With coverage
yarn test --coverage

# One folder/file
yarn test src/primitives

# Validate every guide in ../guides against the schema (the CI gate)
yarn validate-guides
```

### 21.3 Build & Deploy
```bash
# Production build to app/dist (static files only)
yarn build

# Serve the production build locally — offline/PWA behavior is ONLY testable here, never under `yarn dev`
yarn preview

# Generate the single-file HTML print lens for one guide
yarn print-lens <slug>
```
Deploy = copy `app/dist/` + `guides/` + `library.json` to any static host. No staging/production distinction — one user (§17.1). Exact GitHub Pages wiring is decided at implementation.

### 21.4 Utilities
```bash
# Lint (biome check .)
yarn lint

# Format (biome format --write .)
yarn format

# Type check (tsc --noEmit)
yarn typecheck

# Lint + typecheck + test + validate-guides — the "is everything green" command; also what CI runs
yarn check
```

---

## 22. Code Style & Examples

### 22.1 General Style Rules
- Functional components + hooks only; no classes
- **Types come from Zod schemas via `z.infer`** — never hand-write a type that duplicates a schema
- TypeScript strict; `any` is forbidden (Biome enforces)
- **Primitive renderers are pure**: data + callbacks in, UI out. No fetching, no storage access, no RA imports inside `primitives/`
- RA response types never leave `sync/` — the rest of the app sees only domain types (§22.3)
- Styling only via Tailwind theme tokens; no literal colors/px values in components (§9.1)

### 22.2 Example: Component Pattern
```typescript
// GOOD — a primitive renderer: pure, schema-typed, progress via callbacks
type ChecklistProps = {
  widget: ChecklistWidget;            // z.infer from schema
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};
export function Checklist({ widget, progress, onToggle }: ChecklistProps) { /* render only */ }
```

```typescript
// BAD — renderer reaching outside its props
export function Checklist({ widgetId }: { widgetId: string }) {
  const data = useGuideFile(widgetId);     // ❌ fetching inside a primitive
  const ra = useRaClient();                // ❌ RA leaking outside sync/
}
```

### 22.3 Example: API/Service Pattern
```typescript
// GOOD — isolated RA client: domain types out, expected failures as values
export async function fetchUnlocks(gameId: GameId): Promise<SyncResult> { /* … */ }

type SyncResult =
  | { status: "ok"; unlocked: AchievementId[] }
  | { status: "error"; reason: "auth" | "rateLimit" | "network" };
```

```typescript
// BAD — leaking the RA wire format and throwing for expected cases
export async function fetchUnlocks(id: number): Promise<RAUserGameResponse> // ❌ wire type escapes sync/
```

### 22.4 Example: Error Handling Pattern
- **Expected failures** (sync errors, invalid import, schema mismatch) = returned values, discriminated unions — surfaced in UI with the §11 messages.
- **Bugs** (impossible states) = throw; the error boundary shows "broken", never a blank screen (§11.1).
- **Storage writes are transactional**: a sync that fails mid-way writes nothing (§8.1).

### 22.5 Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Variables / functions | camelCase | `markStepDone()` |
| Components | PascalCase | `NowScreen` |
| Types | PascalCase | `GuideSpine` |
| Constants | SCREAMING_SNAKE | `SCHEMA_VERSION` |
| Hooks | `use` prefix | `useCurrentStep` |

---

## 23. Git Workflow

Tuned for a solo repo where both human and AI commit, and where *content* and *app code* have different rules. Repo note: the local branch is `master` — rename to `main` at implementation time; this PRD assumes `main`.

### 23.1 Branch Naming
| Branch Type | Pattern | Example |
|-------------|---------|---------|
| App feature | `feat/<topic>` | `feat/sync-receipt` |
| Bugfix | `fix/<topic>` | `fix/pointer-auto-advance` |
| Guide compilation | `guide/<slug>` | `guide/pokemon-crystal` |
| Chore/tooling | `chore/<topic>` | `chore/biome-config` |

Each guide compiles on its own `guide/<slug>` branch, merged only when its layers are approved — an unapproved guide never lands on `main` (§0.2 "nothing ships unapproved" as a git rule).

### 23.2 Commit Message Format
Conventional commits, with one addition for content:
```
type(scope): short description
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore` for app code; **`guide(<slug>): <pass>`** for compiler output.

**Example:**
```
guide(pokemon-crystal): spine layer v2 after review fixes
```
One compiler pass = one commit, so layer history stays readable in `git log`.

### 23.3 Pull Request Process
1. Solo human commits go straight to `main` if `yarn check` is green — no self-review theater.
2. **AI agents always work on a branch and open a PR** — never commit directly to `main`.
3. Merge requirement for any PR: `yarn check` green (lint + typecheck + tests + guide validation, §21.4).
4. Guide branches additionally require the in-app approval recorded in `approvals.json` before merge (§6.7).

### 23.4 Protected Files (Never Auto-Modify)
- [ ] `guides/*/approvals.json` — written ONLY by the review-lens approval flow; compiler skills and AI agents never touch it (the human gate, §6.7)
- [ ] `guides/*/sources.json` retrieval records — append-only
- [ ] Legacy HTML guides — read-only until their §18.3 retirement
- [ ] `.env`, `.env.*` — standard; nothing secret should ever exist in this repo anyway (§17.4)
- [ ] `yarn.lock` — modified only by Yarn itself, never hand-edited

---

## 24. AI Agent Boundaries

### 24.1 ALWAYS DO (Safe to Proceed)
AI agents should always:
- [ ] Follow §22 code style, §20 project structure, §19 versions, §23 commit format
- [ ] Run `yarn check` after changes; run `yarn validate-guides` after touching anything in `guides/`
- [ ] Derive types from Zod schemas (`z.infer`) — never duplicate them
- [ ] When compiling guide content: record every source in `sources.json` with URL + retrieval date, and attach confidence flags to uncertain data (FR-D/E)
- [ ] Preserve all existing step/widget/chapter IDs on every recompile (§6.8)
- [ ] Treat this PRD as the spec; when code and PRD conflict, the PRD wins until the human amends it

### 24.2 ASK FIRST (Require Human Approval)
AI agents must ask before:
- [ ] Adding any dependency — the §19 list is closed by default
- [ ] Any schema change, however small (the keystone, §16.3)
- [ ] Changing data-file or export formats (§8 internal contract)
- [ ] Marking anything as approved, or anything affecting `approvals.json`
- [ ] Deleting or rewriting a legacy HTML guide
- [ ] Implementing anything on the §14.2 deferred list — deferral was a decision, not an oversight

### 24.3 NEVER DO (Hard Stops)
AI agents must NEVER:
- [ ] Commit secrets, API keys, or credentials — nothing secret belongs in this repo at all (§17.4)
- [ ] **Write the user's RA key anywhere** — code, logs, fixtures, exports (§17.4)
- [ ] Call any RA write endpoint, or add sync behavior that is not user-initiated (§8.1)
- [ ] **Invent game content.** Every datum traces to a source in the manifest; a gap is flagged, never filled by guesswork (§0.2 — the core trust rule of the project)
- [ ] Add an 8th primitive, gamification, accounts, backend, analytics, or anything on the §14.3 never-list
- [ ] Modify `approvals.json`, push directly to `main`, or bypass `yarn check` (§23)
- [ ] Auto-advance or recalculate the user's current-step pointer by any logic other than "its step was checked" (§6.7)
- [ ] Modify vendor/node_modules directories or hand-edit `yarn.lock`

### 24.4 Security Boundaries
- [ ] RA API key: browser settings store only; never serialized into exports or error reports (§5.3)
- [ ] Network: the only permitted runtime call is the RA read API during an explicit Sync; adding any other network call is a PRD violation, not a judgment call (§17.2)
- [ ] No telemetry of any kind, including "anonymous" (§0.2)
- [ ] Compiled guide data contains no executable content — JSON data only; renderers never `eval` or `dangerouslySetInnerHTML` source-derived strings

---

## Appendix A: Traceability Matrix

Source ideas are the 25 distilled ideas from the brainstorm session (2026-06-09). Every idea either traces to requirements or is explicitly ledgered in §14.

| Source Idea | User Story | Requirement | Acceptance Criteria |
|-------------|------------|-------------|---------------------|
| 1. Guide-as-data (JSON + one render engine) | E1 | FR-A1, FR-A2, §17.6 | §3 E1 AC |
| 2. Companion phone use | P1, P2 | FR-A4, §5.1 budgets | §3 P1/P2 ACs |
| 3. One-button RA sync + backfill | P5 | FR-C2, FR-C4 | §3 P5 AC |
| 4. Widgets / Lego blocks | P4 | FR-A1, FR-A5 | §3 P4 AC |
| 5. Genre = default deck | E1 | FR-A2, §6.4 | §3 E1 AC |
| 6. The 7 primitives | P4, E1 | FR-A1 (closed set, §9.1) | §3 P4 AC; §14.3 |
| 7. Spine + organs | P1, P3 | FR-A1, §6.2 | §3 P1/P3 ACs |
| 8. Multi-pass compiler as smaller skills | E2 | FR-D1 | §3 E2 AC |
| 9. Schema-first | E2 | FR-D4, §16.3, §19 (Zod) | §12.1 schema row |
| 10. Source manifest | E3 | FR-D3, §6.6 | §13.3 metric 7 |
| 11. Confidence flags | E3 | FR-D2, FR-E2 | §3 E3 AC |
| 12. Random spot-check | E4 | FR-E3 | §3 E4 AC |
| 13. In-app review lens | E3, E5 | FR-E1–E5 | §3 E5 AC |
| 14. Now screen landing | P1 | FR-A4 | §3 P1 AC |
| 15. Responsive postures | P1, P4 | §5.4, §7 (S1–S5) | §13.2 metric 4 |
| 16. Offline-first PWA | P1 | §5.2, §17.3 | §3 P1 AC ("works offline") |
| 17. Missables radar (derived widget) | P3 | FR-B5; full radar deferred §14.2 | §3 P3 AC |
| 18. Cleanup mode | P7 | FR-B4 | §3 P7 AC |
| 19. Skip ≠ done → cleanup list | P7 | FR-B2 | §3 P7 AC |
| 20. HTML→JSON migration of 5 guides | E6 | FR-D5 | §3 E6 AC |
| 21. Print lens (single-file HTML) | — | §14.1, §17.10, §21.3 | Print output is one self-contained HTML file |
| 22. Pokémon Crystal as pilot | E2–E5 | §15 risk 4, §16.4 | §13.1 metric 2 |
| 23. Sync receipt | P5 | FR-C3 | §3 P5 AC |
| 24. RA mapping as standalone file | P5 | FR-C1, §6.5 | §11.1 RA-mapping row |
| 25. Per-primitive "Now cards" | — | **Deferred** §14.2 | Revisit after the Now screen proves itself |

## Appendix B: Five Pre-Coding Questions Checklist

Before implementation begins, verify these are answered:

- [x] **What will likely change?** → See Section 9 (Change Analysis)
- [x] **Should this exist once or everywhere?** → See Section 10.1 (Shared vs Local)
- [x] **What's the source of truth?** → See Section 10.2 (Source of Truth)
- [x] **What breaks if I change this?** → See Section 10.3 (Dependency Map)
- [x] **How would I test this?** → See Section 12 (Testing Strategy)

All five questions are answered. Appendices completed 2026-06-10; all 25 numbered sections approved between 2026-06-09 and 2026-06-10.

---

## Final Summary

**PRD Completion Date:** 2026-06-10

**Sections Completed:** 25/25 (+ 2 appendices)

**Taste Layer:** Vision & Principles COMPLETE — HeartGold-paper-guide north star, non-negotiables and "would-feel-wrong" list captured (§0)

**Anti-Accidental-Architecture:** 4/4 (Change Analysis §9, Architecture Decisions §10, Edge Cases §11, Testing Strategy §12)

**AI Implementation:** 6/6 (Tech Stack §19, Project Structure §20, Commands §21, Code Style §22, Git Workflow §23, AI Boundaries §24)

**Key Requirements:**
- Guides are data, not code: static JSON in the repo, rendered by 7 fixed widget primitives; new guide/genre = data files only (FR-A1/A2)
- Human-gated production: schema-first multi-pass compiler with source manifests and confidence flags; nothing playable until every layer is approved in-app (FR-D, FR-E)
- One manual, read-only, atomic RA Sync with backfill and receipt; offline-first PWA with no backend, accounts, or telemetry (FR-C, §17)

**Primary User Stories:**
- P1: Resume at a glance (cold open → current step, 0 navigation, offline)
- P5: Sync RA achievements (one press, receipt, backfill)
- E1: Define a game from config (zero app-code changes)

**Known Gaps:** none — deferred items are deliberately ledgered in §14.2 with revisit conditions

**Next Steps:**
1. Schema v0 (P0) — seeded from `ml-partners-in-time/build/guide.json`
2. Minimal app (P1): library + checklist/table/counter renderers + progress store
3. Compiler skill suite rework (P2), Pokémon Crystal pilot
4. Review lens (P3), then Sync + comfort features (P4), completers (P5)

