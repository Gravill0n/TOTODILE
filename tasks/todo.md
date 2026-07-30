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

- [ ] **2.1** Image existence + LFS-pointer guard in `app/scripts/validateGuidesCore.ts`
      (inside `validateGuideFolder`, `:129`, using the existing `Finding` shape at `:33`).
      Walk every `imageRef.src` in `guide.json` (`locations[].mapImage`, `steps[].images[]`,
      `widgets[].image`) plus `layers/spine.json` and `layers/widget-items-*.json`; flag
      missing files, and flag files whose first bytes are
      `version https://git-lfs.github.com/spec/v1` with *"run `git lfs pull`"*. Also check
      `library.json`'s optional `cover` — **repo-root-relative**, unlike guide-relative
      `src`. Without this, `yarn check` passes on pointer text and `contentPrecache` md5s a
      pointer into the service worker (M)
  - [ ] **Blocked on:** add 4 minimal PNGs the fixture already references but does not
        have — `castle-gate.png`, `vault-entrance.png`, `vault-map.png` under
        `app/src/testing/fixtures/repo/guides/fictional-quest/images/`, plus
        `.../repo/guides/fictional-quest/images/cover.png` for the library `cover`
  - [ ] Test: pointer text where an `imageRef` points → finding fires
  - [ ] Test: missing file → finding fires
  - [ ] All 266 real refs pass (baseline: 0 missing / 0 orphans in both guides)
  - [ ] Negative proof in a throwaway worktree: `GIT_LFS_SKIP_SMUDGE=1 git checkout --
        guides/zelda-oot/images/` makes `yarn validate-guides` **fail**; `git lfs pull` restores
- [ ] **2.2** Scope the precache walker to `images/` — `imageFiles()`
      (`app/scripts/contentPrecache.ts:67`) recurses the whole guide folder, so a local
      `yarn build` md5s and precaches all 143 MB of gitignored `sources/` scrapes.
      Pre-existing bug; compounds directly with huge maps. Parallel with 2.1 (S)
  - [ ] Test: `guides/<slug>/sources/foo/big.png` yields no manifest entry
  - [ ] The four existing `contentPrecache.test.ts` cases pass unchanged (they only use
        paths under `images/`, so scoping is behavior-preserving)
  - [ ] `yarn build`, then grep `dist/sw.js` for `sources/` → no matches

### ☐ Checkpoint B — guards
- [ ] `yarn check` green from `app/`
- [ ] Pointer files **and** missing images both fail the gate (negative proof above)
- [ ] **Pierre**: review before CI is touched

## Phase 3 — CI deploy

- [ ] **3.1** LFS cache + pull in `.github/workflows/deploy-pages.yml`, inserted after
      `actions/checkout` and **before** `corepack enable` — both `yarn check` (guard 2.1)
      and `yarn build` (precache md5) need real bytes. `git lfs ls-files --long` → cache key
      → `actions/cache@v4` on `.git/lfs` with `restore-keys: lfs-` → `git lfs pull`. The job
      defaults to `working-directory: app`, so these steps need
      `working-directory: ${{ github.workspace }}`. Also `.lfs-assets-id` → `.gitignore` (S)
  - [ ] ⚠️ **Likely to bite:** checkout sets `persist-credentials: false`, stripping the
        auth header `git lfs pull` uses. The repo is public so anonymous LFS reads should
        work — **if it 401s, set `persist-credentials: true`** rather than redesigning
        the caching
  - [ ] LFS steps precede the gate and the build
  - [ ] `.lfs-assets-id` gitignored and absent from the artifact (the assemble step copies
        only `app/dist/.`, `guides`, `library.json`)
  - [ ] A second consecutive run reports a cache hit and downloads ~nothing

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

- [ ] **4.1** git-lfs is now a **hard prerequisite for a working clone** — without it every
      map smudges to pointer text. PRD §18.1 contemplates "a friend clones the repo and
      self-hosts", and the PRD says nothing about LFS today (S)
  - [ ] `README.md` — prerequisites gain `git-lfs`; a "maps broken after cloning?
        `git lfs pull`" line
  - [ ] PRD **§16.2** (compile-time dependencies) — Git LFS + its failure stance
  - [ ] PRD **§17** — LFS does not breach "static files only / any dumb file server":
        pointers exist only in git, the built artifact is plain bytes
  - [ ] PRD **§21.1** — `git lfs install` in the setup commands
  - [ ] `CLAUDE.md` — one line under repo layout: guide images are LFS-tracked

### ☐ Checkpoint D — complete
- [ ] `yarn check` green from `app/`
- [ ] One PR `feat/add-git-lfs` → `main` (never a direct commit, PRD §23)
- [ ] Post-merge deploy green and the deployed map URL serves real PNG bytes

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
