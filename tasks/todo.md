# Guide images on Git LFS — task list

Full detail, acceptance criteria and verification steps: [`tasks/plan.md`](./plan.md).
Branch: `feat/add-git-lfs` · one PR to `main` · `yarn check` green from `app/` at every
checkpoint.

**Why:** guide images are the only binaries in the repo and they only ever grow. 266 files
(~18 MB) today, one blob version each — LFS buys nothing *now*, but the moment a map set is
re-exported every revision is pinned in the pack forever. Celeste and later guides bring
large maps.

**Decisions taken:** convert at HEAD (no history rewrite) · cache LFS objects in CI (the
~1 GB/month bandwidth tier) · directory-wide root-anchored pattern · add the guards that
make a broken LFS state loud.

## Phase 0 — Housekeeping

- [x] **0.1** Archive the stale design-v2 task files → `docs/archive/design-v2-plan.md`
      and `docs/archive/design-v2-tasks.md` (moved verbatim via `git mv`). ⚠️ Design-v2
      left task **5.3** (pin + reorder, dnd-kit) unbuilt and 11 of Pierre's manual
      verification checks unticked — see the archived list (XS)
- [x] **0.2** This task list + `tasks/plan.md` (XS)

## Phase 1 — LFS on, images converted

- [x] **1.1** git-lfs installed by Pierre — `git-lfs/3.4.1 (GitHub; linux amd64; go 1.22.2)`,
      `filter.lfs.clean` = `git-lfs clean -- %f`, smudge likewise (XS)
- [x] **1.2** `.gitattributes` at the repo root (commit `38965f8`) then
      `git add --renormalize guides` (commit `15214aa`). Pattern is
      `guides/*/images/** filter=lfs diff=lfs merge=lfs -text` — directory-wide and
      root-anchored, as decided (S)
  - [x] `git lfs ls-files | wc -l` → **266**
  - [x] `git cat-file -p HEAD:guides/zelda-oot/images/map-overworld.png` →
        `version https://git-lfs.github.com/spec/v1`, `size 1020395`
  - [x] `file guides/zelda-oot/images/map-overworld.png` →
        `PNG image data, 1911 x 1080, 8-bit colormap`
  - [x] `git lfs status` and `git status --porcelain` clean
  - [x] Scope proved with `git check-attr` **before** converting: real and nested guide
        images → `filter: lfs`; PWA icons, fixture images, guide JSON and the gitignored
        `sources/` scrapes → `filter: unspecified`
  - [x] **Bytes provably intact**: all 266 files verified against sha256sums taken before
        conversion (`sha256sum -c` exit 0), 0 pointer-text files and 0 non-image files in
        the working tree. For `map-overworld.png` the LFS oid
        `0de1fbe5…9df33` *equals* the pre-conversion sha256 — the bytes are in the object
        store, not merely assumed to be

### ☑ Checkpoint A — foundation
- [x] `yarn check` green from `app/` — enforced by the pre-commit hook on both commits
      (247 files linted, 104 test files / 682 tests, `validate-guides` 3 guides all green)
- [x] `yarn dev` serves real bytes through `serveRepoContent()`: the map-overworld.png
      response is `200 image/png`, `PNG image data, 1911 x 1080`, sha256 identical to the
      original. Spot-checked a crystal mapPins image (27854 B), a zelda-oot step icon
      (30858 B) and `guide.json` (736288 B) — all 200
- [x] **Not pushed** — 3 commits sit local until the 2.1 guard and 3.1 CI pull are in

## Phase 2 — Make a broken LFS state loud

- [x] **2.1** Image existence + LFS-pointer guard in `app/scripts/validateGuidesCore.ts`
      (commit `e58a3e9`). `validateImageRefs()` resolves every `imageRef.src` and reports
      the *owner*, not just the path — which location, step or widget. Wired at three call
      sites: `guide.json`, each layer artifact (via `layerImageRefs`), and `library.json`'s
      `cover` (repo-root-relative, unlike guide-relative `src`) (M)
  - [x] 4 real 1×1 PNGs added under
        `app/src/testing/fixtures/repo/guides/fictional-quest/images/` — the fixture had
        referenced `castle-gate`, `vault-entrance`, `vault-map` and `cover` all along
        without shipping them. Outside the root-anchored LFS pattern (`check-attr`:
        `unspecified`), so the suite never needs a smudge
  - [x] 9 new tests: missing step image, pointer text, owner naming, missing widget image,
        missing library cover, spine-layer image, widget-layer image, the all-present happy
        case, and one pinning that the extract-data image catalogue stays **out** of scope
  - [x] `widgetImages()` added to `widgets.ts` beside `widgetCheckables`/`widgetItemIds` —
        exhaustive switch over the closed primitive set. No schema shape changed, no bump
  - [x] All 266 real refs resolve — `yarn validate-guides` exit 0
  - [x] **Negative proof**: a tree built with `GIT_LFS_SKIP_SMUDGE=1 git archive` holds
        132-byte pointers; the gate emits **708 findings and exits 1**, each naming
        `git lfs pull`
- [x] **2.2** Scope the precache walker to `images/` (commit `feb1b56`) (S)
  - [x] Test: images under `sources/` yield no manifest entry
  - [x] The four existing `contentPrecache.test.ts` cases pass unchanged
  - [x] `dist/sw.js` after `yarn build`: **0** `sources/` entries, 266 `images/` entries
        (146 crystal + 120 zelda-oot). Measured what the bug had been shipping:
        **3361 source images / 115.6 MB** md5'd into every local build's service worker
  - [x] `imageFiles()` gained an `existsSync` guard — layton-mm legitimately has no `images/`

### ☑ Checkpoint B — guards
- [x] `yarn check` green from `app/` — 104 test files, **692 tests** (was 682), 3 guides green
- [x] Pointer files **and** missing images both fail the gate (negative proof above)
- [x] **Pierre**: reviewed and approved 2026-07-30 — cleared to touch CI

## Phase 3 — CI deploy

- [x] **3.1** LFS cache + pull in `.github/workflows/deploy-pages.yml` (commit `4b0506b`),
      inserted after `actions/checkout` and before `corepack enable`. `git lfs ls-files
      --long | cut -d' ' -f1 | sort` → `.lfs-assets-id` → `actions/cache@v4` on `.git/lfs`
      keyed on `hashFiles`, `restore-keys: lfs-` → `git lfs pull`. Steps carry
      `working-directory: ${{ github.workspace }}` (the job defaults to `app`).
      `.lfs-assets-id` added to `.gitignore` (S)
  - [x] ⚠️ **The auth risk was designed out, not gambled on.** Rather than hope anonymous
        LFS reads work on a public repo, the pull step supplies `secrets.GITHUB_TOKEN` as
        an `extraheader` for that single step and removes it via a `trap ... EXIT`.
        `persist-credentials: false` is preserved. Verified locally on both paths: the
        header is set, decodes to `x-access-token:<token>`, and is gone afterwards whether
        the command succeeded or failed — with a failure still propagating a non-zero exit
  - [x] LFS steps precede the gate, the build **and** the assemble step — verified by
        parsing the workflow YAML (key list → cache → pull → gate/build/assemble)
  - [x] `.lfs-assets-id` gitignored and outside the artifact (assemble copies only
        `app/dist/.`, `guides`, `library.json`)
  - [ ] A second consecutive run reports a cache hit and downloads ~nothing — **only
        observable post-merge** (Checkpoint C)

### ☐ Checkpoint C — deploy (post-merge; the workflow triggers on push to `main`)
- [ ] The run's LFS step logs objects fetched; `yarn check` passes in CI
- [ ] `curl -sI https://gravill0n.github.io/TOTODILE/guides/zelda-oot/images/map-overworld.png`
      → `content-length: 1020395`, **not** ~130 bytes of pointer text
- [ ] `curl -s <same URL> | file -` → `PNG image data`
- [ ] The deployed zelda-oot guide renders its maps
- [ ] Optional pre-merge: `workflow_dispatch` runs this from the branch, but its `deploy`
      job publishes to the **live** Pages site. Content is identical to `main` — Pierre's call
- [ ] Rollback if needed: revert the merge. Images return to plain blobs at HEAD; LFS
      objects already pushed are harmless

## Phase 4 — Document the new clone requirement

- [x] **4.1** Documented the new clone requirement (S)
  - [x] `README.md` — new **Getting started** section (the README had no setup
        instructions at all): install git-lfs *before* cloning, `git lfs pull` to repair an
        existing clone, `yarn validate-guides` to diagnose, and the note that a *visitor*
        needs nothing
  - [x] PRD **§16.2** — Git LFS row: required to clone or compile, never to serve; failure
        stance points at `git lfs pull` and the CI gate
  - [x] PRD **§17** — new constraint **#11**, arguing explicitly that #1 ("static files
        only… any dumb file server") and #6 ("the repo is the only content store") both
        still hold: pointers live only inside git, the artifact carries plain bytes
  - [x] PRD **§21.1** — `git lfs install` / `git lfs pull` in the setup commands
  - [x] `CLAUDE.md` — repo-layout bullet: images are LFS-tracked, `sources/` is not

### ☐ Checkpoint D — complete
- [x] `yarn check` green from `app/` — 104 test files, 692 tests, 3 guides green
- [ ] One PR `feat/add-git-lfs` → `main` (never a direct commit, PRD §23) — 8 commits
      ready, **nothing pushed yet**
- [ ] Post-merge deploy green and the deployed map URL serves real PNG bytes
      (= Checkpoint C, Pierre's to verify)

## Not in this branch

LFS fixes *git history*, not *delivery*. Still open, flagged during planning:

- The PWA precaches **every** guide image to **every** visitor
  (`additionalManifestEntries` in `app/vite.config.ts`) — 500 MB of maps is a 500 MB first visit
- GitHub Pages caps a site at 1 GB / a file at 100 MB
- Image optimization: the `map-*.png` files are unoptimized 8-bit-colormap PNGs at ~1920px;
  a webp pass is likely the bigger win than LFS for delivery
- A per-guide image **weight** budget in `validate-guides` (PRD §17 #8 budgets the count only)
- ~28 MB of dead image blobs remain in the pack (10.5 MB from guides deleted in `3168343`);
  only a history rewrite reclaims them — accepted
