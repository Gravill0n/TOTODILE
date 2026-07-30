# Implementation Plan: Track guide images with Git LFS

Task list: [`tasks/todo.md`](./todo.md). Branch: `feat/add-git-lfs` · one PR to `main` ·
`yarn check` green from `app/` at every checkpoint.

## Context

Guide images are the only binaries TOTODILE commits, and they only ever grow. Today
there are 266 of them (~18 MB) across two guides, all plain git blobs:

| Path | Files | Size |
|---|---|---|
| `guides/zelda-oot/images/` | 120 png | 15.21 MB (36 `map-*` = 10.88 MB) |
| `guides/pokemon-crystal/images/` | 146 png | 2.73 MB |

The pack is 30.28 MiB and image blobs are roughly half the uncompressed history.
Right now each image has exactly **one** blob version — there is no churn yet, so LFS
buys nothing today. Its value is entirely prospective, which is precisely the ask:
the Celeste and future map sets are large (the untracked Celeste PopTracker pack alone
holds 15 maps in 6.12 MB, and `sources/` on disk is 143 MB of candidate imagery). Once
map re-exports start landing, every revision of a 1 MB PNG is permanently in the pack.
LFS moves those bytes out of git history and makes re-exports cheap.

**Intended outcome:** guide images live in LFS; a clone with git-lfs installed is
indistinguishable from today; and the build fails loudly rather than shipping pointer
text as a map.

### What LFS does not solve (flagged, out of scope)

LFS is a *git history* fix, not a *delivery* fix. Huge maps still hit:
- **GitHub Pages**: 1 GB site limit, 100 MB per file.
- **The PWA precache**: `app/vite.config.ts` feeds `collectContentManifestEntries()`
  into Workbox `additionalManifestEntries`, so **every guide image is precached to every
  visitor on first load**. 500 MB of maps means a 500 MB first visit.
- **PRD §17 #8** budgets 300 images per guide but nothing enforces weight.

Worth a separate decision (image optimization / lazy map loading). The `map-*.png` files
are unoptimized 8-bit-colormap PNGs at ~1920px; a webp pass would likely cut zelda-oot's
10.88 MB substantially and is the cheaper lever for *delivery*.

## Decisions

1. **Convert at HEAD, keep history.** `git add --renormalize` rewrites all 266 images as
   pointers in one commit. No history rewrite, no force-push, no re-clone. The ~28 MB of
   old blobs (including 10.5 MB from guides deleted in `3168343`) stays in the pack —
   accepted, since only a rewrite reclaims it and this is a PR-based repo.
2. **Cache LFS objects in CI.** GitHub's free tier is ~1 GB/month of LFS bandwidth and
   the deploy runs on every push to `main`. Plain `lfs: true` re-downloads the full image
   set each deploy; a keyed `.git/lfs` cache means only changed objects cost bandwidth.
3. **Pattern is directory-wide**, `guides/*/images/**`, not extension-scoped. An
   extension list would silently drift from the app's two other format lists
   (`CONTENT_TYPES` in `vite.config.ts`, `IMAGE_EXTENSIONS` in `contentPrecache.ts`).
   Directory-wide cannot drift: everything in a guide's `images/` is LFS, full stop.
4. **Pattern is root-anchored**, so `app/src/testing/fixtures/repo/guides/*/images/` is
   *not* matched. Test fixtures stay ordinary blobs — the suite never depends on an LFS
   smudge having run. This is deliberate.

## Files touched

- `.gitattributes` (new, repo root) — the LFS pattern
- `.gitignore` — add `.lfs-assets-id` (CI scratch file)
- `.github/workflows/deploy-pages.yml` — LFS cache + pull, before `yarn check`
- `app/scripts/validateGuidesCore.ts` + `validateGuides.test.ts` — existence + pointer guard
- `app/scripts/contentPrecache.ts` + `contentPrecache.test.ts` — scope walker to `images/`
- `app/src/testing/fixtures/repo/guides/fictional-quest/images/*.png` (4 new tiny PNGs)
  + `.../repo/images/cover.png`
- `README.md`, PRD §16.2/§17/§21, `CLAUDE.md`

Reuse, do not reinvent: `guideAssetUrl()` (`app/src/lib/guide.ts:8`) is the single
guide→URL helper; `imageRef` (`app/src/schema/common.ts:117`) is the only image shape;
`Finding`/`validateGuideFolder` (`app/scripts/validateGuidesCore.ts:33,129`) is the
existing findings pattern; `fixtureRepoRoot` (`app/src/testing/fixtureRepo.ts`) is how
tests locate the fixture repo.

---

## Phase 0: Housekeeping

### Task 0: Archive the stale plan files, then write the new ones
`tasks/plan.md` (44 KB) and `tasks/todo.md` (19 KB) are the **design-v2** plan, already
shipped in PR #28. CLAUDE.md says completed plans live in `docs/archive/`. Move them
there before writing this plan's `tasks/plan.md` + `tasks/todo.md`, so nothing is lost.

- [ ] `git mv tasks/plan.md docs/archive/design-v2-plan.md` (same for `todo.md`)
- [ ] This plan written to `tasks/plan.md`, task list to `tasks/todo.md`

**Scope:** XS. **Depends on:** none.

---

## Phase 1: LFS on, images converted

### Task 1: Install and enable git-lfs
Not installed on this machine (`git: 'lfs' is not a git command`); apt candidate is
`3.4.1-1ubuntu0.4`. **Pierre runs this** — needs sudo, and `git lfs install` writes
`filter.lfs.*` to `~/.gitconfig`.

```
! sudo apt install git-lfs
! git lfs install
```

- [ ] `git lfs version` prints 3.4.x
- [ ] `git config --get filter.lfs.clean` returns a value

Reversible with `git lfs uninstall`. **Scope:** XS. **Depends on:** none.

### Task 2: Add `.gitattributes` and convert the 266 images
```
# Guide images are content, not code: binaries that only grow, and a re-exported
# map set would otherwise pin every revision in the pack forever. Directory-wide
# on purpose — an extension list would drift from CONTENT_TYPES (vite.config.ts)
# and IMAGE_EXTENSIONS (scripts/contentPrecache.ts). Root-anchored, so the test
# fixture repo under app/src/testing/ stays ordinary blobs.
guides/*/images/** filter=lfs diff=lfs merge=lfs -text
```
Commit that first, then `git add --renormalize guides` in a second commit.

**Acceptance criteria**
- [ ] `git lfs ls-files | wc -l` → **266**
- [ ] `git cat-file -p HEAD:guides/zelda-oot/images/map-overworld.png | head -c 45`
      → `version https://git-lfs.github.com/spec/v1`
- [ ] `file guides/zelda-oot/images/map-overworld.png` → `PNG image data, 1911 x 1080`
      (working tree keeps real bytes; only the stored blob is a pointer)
- [ ] `git lfs status` clean; `git status` clean

**Verification**
- [ ] `yarn check` from `app/` green (no image checks yet, but proves nothing regressed)
- [ ] `yarn dev`, open a zelda-oot location with a map — image renders (the
      `serveRepoContent()` middleware reads the working tree, so this must still work)

**Scope:** S (2 files + 266 renormalized). **Depends on:** 1.

### Checkpoint: Foundation
- [ ] Images are LFS-managed at HEAD, working tree byte-identical to before
- [ ] `yarn check` green, dev server renders maps
- [ ] **Do not push yet** — the CI guard (Task 5) is not in place, so a push to `main`
      would deploy pointer text. Everything lands as one PR.

---

## Phase 2: Make a broken LFS state loud

### Task 3: Guard image existence and LFS pointers in `validate-guides`
`validateGuidesCore.ts` never touches images today — grep for `image`/`png`/`asset`
returns zero hits. So `yarn check` (the CI gate) would happily pass with pointer text
sitting where a map should be, and `contentPrecache` would md5 that pointer into the
service-worker manifest. This is the guard that makes the whole change safe.

Add to `validateGuideFolder()` (`validateGuidesCore.ts:129`): collect every `imageRef`
`src` from `guide.json` (`locations[].mapImage`, `steps[].images[]`, `widgets[].image`)
and from the layers (`layers/spine.json`, `layers/widget-items-*.json`), resolve each
against the guide dir, and push a `Finding` when:
- the file does not exist → *"referenced image is missing"*
- its first bytes are `version https://git-lfs.github.com/spec/v1` → *"is an unsmudged
  Git LFS pointer — run `git lfs pull`"*

Also check `library.json`'s optional `cover` (`app/src/schema/library.ts:31`), which is
**repo-root-relative**, unlike guide-relative `imageRef.src`. Don't conflate the two.

**Fixture dependency — this task is blocked on it:** the fixture repo references
`images/castle-gate.png`, `images/vault-entrance.png`, `images/vault-map.png` and
`cover: guides/fictional-quest/images/cover.png`, and **none of those files exist**. Add
4 minimal valid PNGs (a 1×1 is fine) or the existence check red-lights the fixture.

**Acceptance criteria**
- [ ] All 266 real refs pass (baseline is 0 missing / 0 orphans in both guides)
- [ ] A test writes a pointer-text file where an `imageRef` points and asserts the
      finding fires
- [ ] A test with a missing file asserts the missing-image finding fires
- [ ] Fixture repo passes clean

**Verification**
- [ ] `yarn test scripts/validateGuides` green
- [ ] `yarn validate-guides` green against the real repo
- [ ] Negative proof: `GIT_LFS_SKIP_SMUDGE=1 git checkout -- guides/zelda-oot/images/` in
      a throwaway worktree makes `yarn validate-guides` **fail**; restore with `git lfs pull`

**Scope:** M (2 files + 4 fixture PNGs). **Depends on:** 2.

### Task 4: Scope the precache walker to `images/`
`imageFiles()` (`contentPrecache.ts:67`) walks the entire guide folder recursively, so a
local `yarn build` md5s and precaches all 143 MB of gitignored `sources/` scrapes into
the service worker. Pre-existing bug; it compounds directly with huge maps. Scope the
walk to `guides/<slug>/images/`.

**Acceptance criteria**
- [ ] Only files under a guide's `images/` produce entries
- [ ] New test: a `guides/<slug>/sources/foo/big.png` yields no manifest entry
- [ ] The four existing `contentPrecache.test.ts` cases still pass unchanged (they only
      use paths under `images/`, so scoping is behavior-preserving for them)

**Verification**
- [ ] `yarn test scripts/contentPrecache` green
- [ ] `yarn build`, then grep the generated `dist/sw.js` for `sources/` → no matches

**Scope:** S (2 files). **Depends on:** none (parallel with 3).

### Checkpoint: Guards
- [ ] `yarn check` green from `app/`
- [ ] Pointer files and missing images both fail the gate — verified by the negative proof
- [ ] Review with Pierre before touching CI

---

## Phase 3: CI deploy

### Task 5: Pull LFS objects through a cache in `deploy-pages.yml`
`actions/checkout@v4` currently runs without `lfs`, so the working tree would hold pointer
files and the existing `cp -r guides site/guides` (line ~60) would faithfully publish
pointer text as every map. Insert after checkout and **before** `corepack enable` — both
`yarn check` (Task 3's guard) and `yarn build` (precache md5) need real bytes. Note the job
sets `working-directory: app` by default, so these steps need
`working-directory: ${{ github.workspace }}`.

```yaml
      # Guide images are LFS objects (.gitattributes). Checkout leaves pointers;
      # materialize them through a cache so unchanged maps cost no LFS bandwidth
      # (GitHub's free tier is ~1 GB/month and this job runs on every push).
      - name: LFS — object ids for the cache key
        working-directory: ${{ github.workspace }}
        run: git lfs ls-files --long | cut -d' ' -f1 | sort > .lfs-assets-id
      - uses: actions/cache@v4
        with:
          path: .git/lfs
          key: lfs-${{ hashFiles('.lfs-assets-id') }}
          restore-keys: lfs-
      - name: LFS — materialize guide images
        working-directory: ${{ github.workspace }}
        run: git lfs pull
```
`restore-keys: lfs-` gives a partial hit so `git lfs pull` fetches only the misses.
git-lfs is preinstalled on `ubuntu-latest`. Also add `.lfs-assets-id` to `.gitignore`.

**⚠️ The one thing likely to bite:** checkout sets `persist-credentials: false`, which
strips the auth header `git lfs pull` would use. The repo is public (a free-account Pages
project site requires it), so anonymous LFS reads should work. **If the pull 401s, the
fix is to set `persist-credentials: true` on the checkout step** — do that rather than
redesigning the caching.

**Acceptance criteria**
- [ ] Workflow parses; LFS steps precede the gate and the build
- [ ] `.lfs-assets-id` gitignored and absent from the Pages artifact (the assemble step
      copies only `app/dist/.`, `guides`, `library.json`)
- [ ] Second consecutive run reports a cache hit and downloads ~nothing

**Verification (post-merge — the workflow triggers on push to `main`)**
- [ ] The run's LFS step logs objects fetched; `yarn check` passes in CI
- [ ] `curl -sI https://gravill0n.github.io/TOTODILE/guides/zelda-oot/images/map-overworld.png`
      → `content-length: 1020395` (**not** ~130 bytes of pointer text)
- [ ] `curl -s <same URL> | file -` → `PNG image data`
- [ ] Load the deployed zelda-oot guide, confirm maps render

Optional pre-merge check: `workflow_dispatch` can run this from the branch — but its
`deploy` job publishes to the **live** Pages site. Content is identical to `main`, so the
risk is low; Pierre's call.

**Rollback:** revert the branch merge; images return to plain blobs at HEAD and nothing
about the deploy changes. LFS objects already pushed are harmless.

**Scope:** S (2 files). **Depends on:** 3, 4.

---

## Phase 4: Document the new clone requirement

### Task 6: README, PRD, CLAUDE.md
git-lfs becomes a **hard prerequisite for a working clone** — without it, `guides/*/images/`
smudge to pointer text and every map is broken. PRD §18.1 explicitly contemplates "a friend
clones the repo and self-hosts", so this must be written down. The PRD says nothing about
LFS today and per CLAUDE.md the PRD wins until Pierre amends it, so amend it:

- [ ] `README.md` — prerequisites gain `git-lfs`; a "cloned and the maps are broken?
      `git lfs pull`" line
- [ ] PRD **§16.2** (compile-time dependencies) — add Git LFS with its failure stance
- [ ] PRD **§17** — note that LFS does not breach "static files only / any dumb file
      server": pointers exist only in git, the built artifact is plain bytes
- [ ] PRD **§21.1** — `git lfs install` in the setup commands
- [ ] `CLAUDE.md` — one line under repo layout: guide images are LFS-tracked

**Verification:** `yarn check` green (docs-only, but the gate is the habit). Re-read §17
to confirm no constraint is contradicted.

**Scope:** S (4 files). **Depends on:** 5.

### Checkpoint: Complete
- [ ] `yarn check` green from `app/`
- [ ] One PR from `feat/add-git-lfs` → `main` (never a direct commit, PRD §23)
- [ ] Post-merge: deploy green and the deployed map URL serves real PNG bytes

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `git lfs pull` 401s in CI because `persist-credentials: false` | **High** — deploy publishes pointer text | Task 3's guard fails the gate before publish; fix by setting `persist-credentials: true` |
| LFS bandwidth quota (~1 GB/mo) exhausted by big maps | Medium | The keyed `.git/lfs` cache — only changed objects transfer |
| A future clone without git-lfs silently gets pointers | Medium | `yarn validate-guides` names the pointer and says `git lfs pull`; documented in README |
| Huge maps hit the Pages 1 GB limit / bloat the PWA precache | Medium | **Not addressed here** — flagged above as a separate decision |
| ~28 MB of dead image blobs stay in the pack | Low | Accepted per decision 1; only a history rewrite reclaims it |

## Open items for later (not this branch)

- Image optimization pass (webp/avif) on `guides/zelda-oot/images/map-*.png` — likely the
  bigger win for delivery than LFS is for history.
- Lazy map loading / precache budget so a large map set does not land on every first visit.
- Per-guide image weight budget in `validate-guides` (PRD §17 #8 has the count, not the weight).
