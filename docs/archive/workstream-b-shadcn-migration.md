# Spec: Workstream B — shadcn/ui Migration

_Status: DRAFT (Phase 1 of spec-driven-development). Awaiting Pierre's review before Plan._
_Source idea: `docs/ideas/spine-widget-reframe.md`. Decisions: 2026-06-15._
_**Sequencing: runs AFTER Workstream A completes** — reskins the final v1 app once._

## Objective

Replace TOTODILE's hand-rolled UI with **shadcn/ui** (copied-in, owned component source)
for a cleaner interface and a better self-edit developer experience, while preserving the
paper-guide identity exactly. shadcn components are owned source — Pierre can edit them
directly, which is the whole point (§9.1 "components you control").

Absorbs from the idea list: **#9** (lucide icons replace emoji), **#4** (widgets/chapters as
proper modal/sheet via Radix Dialog/Sheet), **#1** (better mobile widget chrome). Lays the
foundation that **#2 (zoom)** and **#3 (sticky)** build on as follow-ons.

**User stories**
- As Pierre, the app looks intentional and consistent (real buttons, dialogs, sheets, badges),
  not hand-rolled — in both light and dark, identical paper palette.
- As Pierre editing the code, I reach for a known component (`<Button>`, `<Sheet>`) instead of
  re-deriving Tailwind class soup each time.
- As Pierre on a phone, modals/sheets are accessible (focus trap, escape, scroll lock) for free.

**Success looks like:** the whole post-A app is reskinned with shadcn, the paper palette is
byte-for-byte preserved in light + system-dark, emoji are gone, and `yarn check` is green.

## Tech Stack (additions)

Adds to PRD §19 (amendment required): `class-variance-authority`, `clsx`, `tailwind-merge`,
`tw-animate-css`, `lucide-react`, and per-component `@radix-ui/*` packages. **No** `next-themes`,
**no** state library, **no** `cmdk`/`recharts` initially. Everything else unchanged
(React 19, Vite, **Tailwind 4 CSS-first**, TanStack Router, Zod 4, Biome, Vitest, Yarn 4).

## Commands (run from `app/`)

```
shadcn init:   npx shadcn@latest init        # creates components.json, cn(), @ alias wiring
add component: npx shadcn@latest add button dialog sheet card checkbox ...
Lint/format:   yarn lint        (biome check .)   ·   yarn format
Typecheck:     yarn typecheck   ·   Test: yarn test   ·   Dev: yarn dev
Full gate:     yarn check       # lint + typecheck + test + validate-guides
```

## Project Structure

```
app/
  components.json            → shadcn config (new-york style, cssVariables, lucide, @ alias)
  vite.config.ts             → add "@" → ./src alias
  tsconfig.json              → add "@/*" paths
  src/lib/utils.ts           → cn() = twMerge(clsx(...))
  src/components/ui/*        → copied-in shadcn primitives (OWNED source)
  src/index.css              → paper @theme + shadcn semantic alias layer + tw-animate-css
  src/{shell,spine,primitives,review,sync}/  → feature folders reskinned in place (unchanged layout)
```

## Token Model (the heart — decided: alias shadcn → paper)

The paper palette stays the **single taste-source** (§9.1). shadcn's semantic tokens are an
**alias layer** over it; components use shadcn classes unmodified. Dark mode stays
**system-only via media query** — no `.dark` class, no toggle, no `next-themes` (§5.4).

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {                                  /* paper palette — unchanged, the taste-source */
  --color-paper: #f6f1e7;  --color-paper-dim: #ece4d4;
  --color-ink: #2b2620;    --color-ink-soft: #6b6354;
  --color-card: #fffdf7;   --color-line: #d8cdb8;
  --color-accent: #a8431d; --color-missable: #b3261e;
}

:root {                                   /* shadcn semantic tokens ALIAS paper */
  --background: var(--color-paper);   --foreground: var(--color-ink);
  --card: var(--color-card);          --card-foreground: var(--color-ink);
  --popover: var(--color-card);       --popover-foreground: var(--color-ink);
  --primary: var(--color-accent);     --primary-foreground: var(--color-paper);
  --secondary: var(--color-paper-dim);--secondary-foreground: var(--color-ink);
  --muted: var(--color-paper-dim);    --muted-foreground: var(--color-ink-soft);
  --accent: var(--color-paper-dim);   --accent-foreground: var(--color-ink);
  --destructive: var(--color-missable);
  --border: var(--color-line);        --input: var(--color-line);
  --ring: var(--color-accent);        --radius: 0.5rem;
}

@theme inline {                           /* expose semantic tokens as utilities */
  --color-background: var(--background); --color-foreground: var(--foreground);
  --color-card: var(--card);             --color-border: var(--border);
  --color-primary: var(--primary);       --color-destructive: var(--destructive);
  /* …rest of the standard shadcn @theme inline mapping… */
}

@media (prefers-color-scheme: dark) {     /* dark = swapped paper values; NO .dark class */
  @theme { --color-paper:#201c16; --color-ink:#e6ddcc; /* …existing dark paper set… */ }
}
```

Note: shadcn's generator emits a `.dark` block — we replace it with the `@media` block above
(manual edit, recorded in the migration).

## Component Set (initial — confirm during implementation)

Map current hand-rolled UI → shadcn primitives:
- **Button** — nav bar, actions, sync.
- **Sheet** — `WidgetsSheet`, `ChapterSheet` (Radix Dialog under the hood: focus trap, scroll lock) (#4).
- **Dialog** — confirmations / where-am-I.
- **Card** — `GuideCard`, widget cards.
- **Checkbox** — checklist rows, step done (replaces native `accent-accent` input).
- **Collapsible** — step `detail` expand (#11, set in A; B styles it).
- **Badge** — completion %, language, flag (`FlagMark`), achievement moments.
- **ScrollArea** — scrollable sheets / matrix grid.
- **Switch + Label** — whole-game toggle.
- **Separator, Tabs, Tooltip, Skeleton** — as needed (review lens, loading).
- **lucide-react** — replace ☰🧩📍🔄 and all emoji (#9).

## Code Style

shadcn v4 idiom: prop-based components with `data-slot`, `cva` variants, `cn()` for class
merging. Components consume the **semantic** classes (`bg-background`, `text-foreground`,
`border-border`) — never literal colors, never `dark:` variants (the alias layer + media
query handle theming). Example:

```tsx
import { cn } from "@/lib/utils";
// usage in a feature component:
<Button variant="ghost" size="icon" aria-label="Widgets" onClick={onWidgets}>
  <Puzzle className="size-5" />
</Button>
```

Biome formats copied-in components on `yarn lint`; keep them Biome-clean (a `components/ui/`
override is **ask-first**, not assumed).

## Testing Strategy

Vitest + Testing Library, tests beside source. Cover:
- **Behavior preserved:** each reskinned screen keeps its interactions (checklist toggle,
  whole-game switch, sheet open/close, pointer/sync actions) — existing tests stay green.
- **Theming:** paper tokens resolve through the alias layer in light; dark values apply under
  the media query; no literal colors leak into components (grep guard).
- **Accessibility:** Radix-backed Sheet/Dialog trap focus, close on escape (Testing Library).
- **No regressions:** `yarn check` green; manual smoke in dev + a PWA preview build.

## Boundaries

- **Always:** paper palette is the single taste-source; components style only through tokens
  (paper or its shadcn aliases), never literal colors; dark mode system-only via media query;
  keep `index.html` theme-color + PWA manifest mirroring `--color-paper`; `yarn check` green;
  work on `feat/` branch, land by PR.
- **Ask first:** adding any dependency beyond the listed shadcn set; a Biome override for
  `components/ui/`; adopting `cmdk`/`recharts`/charts; changing the paper palette values.
- **Never:** add `next-themes`, a theme toggle, or a `.dark` class strategy (§5.4); add a
  state library (React-state-only, §19); put literal colors or `dark:` variants in components;
  introduce an 8th widget primitive or backend (§14.3).

## Success Criteria

1. shadcn initialized: `components.json`, `@` alias (vite + tsconfig), `src/lib/utils.ts` `cn()`;
   `yarn typecheck` green.
2. Token alias layer in `index.css`; paper palette **visually unchanged** in light + system-dark
   (no `.dark` class anywhere).
3. The full post-A app reskinned with shadcn; all emoji replaced by lucide icons.
4. `WidgetsSheet`/`ChapterSheet` use Radix Sheet/Dialog (focus trap + scroll lock); existing
   interaction tests pass.
5. No `next-themes`, no theme toggle, no new state lib; deps limited to the listed set.
6. `yarn check` green; PRD §19 + §22.1 amendments recorded.

## PRD amendments this requires (§24 — confirm before Plan)

- **§19 stack:** add `cva`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`,
  `@radix-ui/*` (per component).
- **§9.1 / §22.1 token contract:** the palette contract gains a shadcn **semantic alias layer**
  over the paper tokens; paper remains the single taste-source. Components may use semantic
  token classes (which resolve to paper values).
- **§7 (icons):** emoji affordances become lucide icons.

## Open Questions

1. **Sheet vs keep custom?** Adopt Radix `Sheet` for the bottom sheets (recommended — free a11y),
   or keep the hand-rolled overlay and only reskin its chrome? Assume adopt `Sheet`.
2. **Component set** above is the starting list — confirm/trim during implementation (e.g. is
   `Tabs` actually used by the review lens?).
3. **Bundle budget:** any size ceiling for the added Radix/icon weight? (lucide is tree-shaken;
   Radix is per-component.) Assume no hard budget, monitor.
4. **Dependency on A:** B's reskin targets the *final* v1 screens — confirm B does not start
   until Workstream A's Phase E is merged.

---

# Implementation Plan (Phase 2)

_Status: DRAFT — awaiting review before Phase 3 (Tasks)._

## Components & dependencies

```
F. Foundation (init, @ alias, cn, token alias layer, core component set)
        │  everything depends on F
        ▼
R. Reskin slices (independent verticals, mostly parallel)
   R1 chrome/nav · R2 sheets · R3 play view · R4 widget primitives ·
   R5 library+settings · R6 review lens · R7 sync · R8 icon sweep
        │
        ▼
V. Verify & clean (guards, dark-mode pass, PWA smoke)
```

Reskin slices are presentational and independent — each is a vertical slice that keeps its
screen's behavior and existing tests green. They can land in any order after F.

## Phased order with checkpoints

### Phase F — Foundation (one PR: `feat/shadcn-foundation`)
- F1 `@` alias + deps + `cn()` (vite + tsconfig + vitest resolve; `src/lib/utils.ts`).
- F2 `shadcn init` → `components.json` (new-york, cssVariables, lucide, css=`src/index.css`).
- F3 token alias layer in `index.css` (paper aliases + `@theme inline` + `tw-animate-css`;
  replace generated `.dark` with the `@media (prefers-color-scheme: dark)` paper swap).
- F4 add the core component set.
- **Checkpoint F:** a proof screen (one Button + one Sheet) renders in paper palette, light +
  system-dark; `yarn check` green.

### Phase R — Reskin slices (after F; parallelizable)
- R1 app chrome/nav · R2 sheets (Radix Sheet) · R3 play view (NowScreen/StepRow/MissableBanner)
  · R4 widget primitives (split a/b/c) · R5 library+settings · R6 review lens · R7 sync receipt
  · R8 emoji→lucide sweep.
- **Checkpoint R:** every screen reskinned; all existing interaction tests green; `yarn check` green.

### Phase V — Verify & clean (PR: `feat/shadcn-cleanup`)
- V1 guards (grep test: no literal hex / no `dark:` in components) + remove dead hand-rolled styles.
- V2 PWA preview smoke + dark-mode visual parity pass.
- **Checkpoint V (Complete):** visual parity light + dark; offline still works; `yarn check` green.

## Risks & mitigations
| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Aliased token set incomplete → shadcn components render wrong | F3 aliases the full standard shadcn token set; verify with the F-checkpoint proof screen early |
| 2 | Dark mode: generator emits `.dark`, we use `@media` → missing dark tokens | Dark reuses the existing paper `@media` swap; aliases inherit; explicit dark test in V2 |
| 3 | Biome churn on copied-in components | Run `yarn format`; a `components/ui/` override is ask-first, only if needed |
| 4 | Reskin introduces behavior regressions (focus, toggles, sync) | Slices are presentational; existing tests must stay green per slice |
| 5 | Bundle weight (Radix per-component, lucide) | Per-component adds only; lucide tree-shaken; monitor (no hard budget) |
| 6 | Started before A merges → reskins soon-to-change screens | Gate: do not start B until Workstream A Phase E is merged |
| 7 | `@` alias must resolve in vite + tsc + vitest | F1 configures all three; a smoke import via `@` proves it |

## Suggested PR slicing (PRD §23)
1. `feat/shadcn-foundation` (Phase F + proof screen) — lands first.
2. `feat/shadcn-reskin-shell` (R1, R2, R5, R7).
3. `feat/shadcn-reskin-play` (R3).
4. `feat/shadcn-reskin-widgets` (R4a–c).
5. `feat/shadcn-reskin-review` (R6).
6. `feat/shadcn-icons-cleanup` (R8, V1, V2).
