# Pokémon Crystal Guide Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regenerate the Pokémon Crystal guide in the improved format — compact catch/evolve rows vs. full cards by category, narrow encounter tables, prominent checkable Items & Trainers blocks, multi-line route steps, and persistence for all three trackable kinds — by bringing the renderer into the repo and editing local copies only.

**Architecture:** Copy the installed skill's renderer kit (`build.py`, `assets/styles.css`, `assets/app.js`, `references/schema.md`) into a local `builder/` folder. All format/CSS/JS changes happen on those copies; the installed skill is untouched. `make_guide.py` keeps authoring `guide.json` (now emitting new block types and a per-achievement display category); `builder/build.py` renders it to `output/pkmn-crystal-poc.html`. The renderer is a pure `data → HTML` function, unit-tested with pytest. Browser interactivity (`app.js`) is verified manually since there is no JS test runner.

**Tech Stack:** Python 3 (stdlib only for the renderer), pytest for renderer tests, vanilla HTML/CSS/JS single-file output, localStorage for persistence.

**Spec:** `docs/superpowers/specs/2026-06-07-pkmn-crystal-guide-improvements-design.md`

---

## File structure

| Path | Responsibility | Action |
|---|---|---|
| `builder/build.py` | Renderer: `guide.json` → HTML. Pure, deterministic, invents nothing. | Create (copy + modify) |
| `builder/fetch_images.py` | Localize remote images. | Create (copy, unchanged) |
| `builder/assets/styles.css` | The CSS kit + new block/row styles. | Create (copy + extend) |
| `builder/assets/app.js` | Checkbox persistence + counters. | Create (copy + modify) |
| `builder/references/schema.md` | Data contract (now incl. new blocks). | Create (copy + extend) |
| `builder/README.md` | Local build workflow. | Create |
| `make_guide.py` | Authors `guide.json`. New helpers + category tagging + content. | Modify |
| `tests/test_build.py` | pytest unit tests for the renderer. | Create |
| `tests/fixtures/mini_guide.json` | Tiny guide for fast renderer tests. | Create |
| `guide.json` | Rendered data (generated). | Regenerated |
| `output/pkmn-crystal-poc.html` | Final guide (generated). | Regenerated |

**Convention for new ids:** items `item-<routeslug>-<name>`, trainers `trainer-<routeslug>-<name>` (kebab-case, ASCII). Achievement ids stay `ach-<RA id>` so saved progress survives.

---

## Phase 0 — Repo setup

### Task 0: Bring the renderer into `builder/` and set up tests

**Files:**
- Create: `builder/build.py`, `builder/fetch_images.py`, `builder/assets/styles.css`, `builder/assets/app.js`, `builder/references/schema.md`
- Create: `tests/test_build.py`, `tests/fixtures/mini_guide.json`

- [ ] **Step 1: Copy the installed skill's kit into the project.**

```bash
SKILL=/home/gravill0n/Games/Guides/.claude/skills/achievement-guide-builder
mkdir -p builder/assets builder/references tests/fixtures
cp "$SKILL/build.py"               builder/build.py
cp "$SKILL/fetch_images.py"        builder/fetch_images.py
cp "$SKILL/assets/styles.css"      builder/assets/styles.css
cp "$SKILL/assets/app.js"          builder/assets/app.js
cp "$SKILL/references/schema.md"   builder/references/schema.md
ls -R builder
```
Expected: all five files present under `builder/`.

- [ ] **Step 2: Install pytest (used only for renderer tests).**

```bash
python3 -m pip install --user pytest
python3 -c "import pytest; print('pytest', pytest.__version__)"
```
Expected: prints a pytest version. If `pip` is missing, run `python3 -m ensurepip --user` first.

- [ ] **Step 3: Create a tiny fixture guide for fast tests.**

Create `tests/fixtures/mini_guide.json`:
```json
{
  "game": { "title": "Test Guide", "platform": "Test", "slug": "test-guide", "accent": "#4fa8d8" },
  "sources": [ { "label": "Src", "url": "https://example.com", "role": "Source", "note": "n" } ],
  "achievements": [
    { "id": "ach-1", "name": "Catch a Pidgey", "points": 1, "rarity": "87.5%", "description": "Catch a Pidgey.", "display": "compact", "note": "catch" },
    { "id": "ach-2", "name": "Pidgeotto", "points": 2, "rarity": "71.7%", "display": "compact", "note": "evolve at Lv. 18" },
    { "id": "ach-3", "name": "The Silver Case", "points": 1, "rarity": "91.5%", "type_label": "Progression", "description": "Give your rival's name.", "howto": ["Happens automatically."] }
  ],
  "chapters": [
    { "id": "ch1", "title": "Chapter 1", "kind": "route", "intro": "Intro.", "sections": [
      { "heading": "1.1 · Route 29", "items": [
        { "type": "step", "text": ["First line.", "Second line."], "where": "Route 29" },
        { "type": "encounters", "rows": [
          { "mon": "Pidgey", "slots": { "morning": "50%", "day": "50%", "night": null } }
        ] },
        { "type": "items", "rows": [
          { "id": "item-rt29-potion", "name": "Potion", "where": "east of the grass" }
        ] },
        { "type": "trainers", "rows": [
          { "id": "trainer-rt29-joey", "name": "Youngster Joey", "team": "Rattata Lv. 4", "reward": "money", "note": "rematch by phone" }
        ] },
        { "type": "achievement", "ach": "ach-1" },
        { "type": "achievement", "ach": "ach-2" },
        { "type": "achievement", "ach": "ach-3" }
      ] }
    ] }
  ]
}
```

- [ ] **Step 4: Create the test harness file (one shared helper).**

Create `tests/test_build.py`:
```python
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "builder"))
import build  # noqa: E402

ASSETS = os.path.join(ROOT, "builder", "assets")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "mini_guide.json")


def render():
    with open(FIXTURE, encoding="utf-8") as fh:
        data = json.load(fh)
    return build.build(data, ASSETS)


def test_renders_without_error():
    html = render()
    assert "<!DOCTYPE html>" in html
    assert "Chapter 1" in html
```

- [ ] **Step 5: Run the harness test.**

Run: `python3 -m pytest tests/test_build.py -v`
Expected: `test_renders_without_error` PASSES (the copied renderer already produces HTML; the new fields are ignored for now).

- [ ] **Step 6: Commit.**

```bash
git add builder tests
git commit -m "chore: vendor guide renderer into builder/ with pytest harness"
```

---

## Phase 1 — Renderer & schema (TDD on `builder/build.py`)

> All Phase 1 tasks edit `builder/build.py` and `builder/assets/styles.css`, and are driven by `tests/test_build.py`. Run tests with `python3 -m pytest tests/test_build.py -v`.

### Task 1: Multi-line route steps

A step's `text` may be a list of short lines; render each on its own line.

**Files:** Modify `builder/build.py` (`render_step`, around lines 94-115). Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing test.**

```python
def test_step_text_list_renders_multiline():
    html = render()
    assert "First line.<br>Second line." in html

def test_step_text_string_still_works():
    # A plain string must keep rendering as a single line (regression guard).
    data = {"game": {"title": "T", "platform": "p", "slug": "s"},
            "sources": [], "achievements": [],
            "chapters": [{"id": "c", "title": "C", "kind": "route",
                          "sections": [{"items": [{"type": "step", "text": "Solo line."}]}]}]}
    html = build.build(data, ASSETS)
    assert "Solo line.</li>" in html
```

- [ ] **Step 2: Run to verify failure.**

Run: `python3 -m pytest tests/test_build.py::test_step_text_list_renders_multiline -v`
Expected: FAIL (list is currently passed to `esc()` and stringified as `['First line.', ...]`).

- [ ] **Step 3: Implement.** In `builder/build.py`, replace the `text` handling at the top of `render_step`:

```python
def render_step(item):
    """A single route <li>. text may be a string or a list of lines."""
    raw = item.get("text", "")
    if isinstance(raw, list):
        text_html = "<br>".join(esc(line) for line in raw)
    else:
        text_html = esc(raw)
    where = item.get("where")
    npc = item.get("npc")
    prefix = ""
    if where:
        prefix += '<span class="route-where">' + esc(where) + "</span> "
    if npc:
        prefix += '<span class="route-npc">' + esc(npc) + "</span>: "

    body = prefix + text_html
    if item.get("spoiler"):
        body = '<div class="spoiler"><div>' + body + "</div></div>"

    inner = body
    if item.get("figure"):
        inner += render_figure(item["figure"])
    if item.get("missing_info"):
        inner += render_missing_info(item["missing_info"])
    return "<li>" + inner + "</li>"
```
(Note: the old line `body = prefix + esc(text)` is replaced; everything else in the function is unchanged.)

- [ ] **Step 4: Run to verify pass.**

Run: `python3 -m pytest tests/test_build.py -v`
Expected: both new tests PASS, harness test still PASS.

- [ ] **Step 5: Commit.**

```bash
git add builder/build.py tests/test_build.py
git commit -m "feat(render): support multi-line route steps (text as list)"
```

### Task 2: Valid HTML nesting + drop the inline callout

Route sections currently dump callouts, cards, and steps as direct children of `<ol class="route">` (invalid). Restructure so the `<ol>` contains only `<li>`s: steps are numbered `<li>`, every non-step item is wrapped in `<li class="route-block">` (no step number). Remove `render_callout` from the flow.

**Files:** Modify `builder/build.py` (`render_route_chapter`, lines 209-227; remove the `render_callout` call). Modify `builder/assets/styles.css` (add `.route-block`). Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing tests.**

```python
import re

def test_no_inline_callout():
    html = render()
    assert 'class="ach-callout"' not in html

def test_blocks_are_wrapped_in_li():
    html = render()
    # The encounters table must live inside a route-block <li>, not bare in the <ol>.
    assert re.search(r'<li class="route-block">\s*<table class="encounters"', html)

def test_route_ol_direct_children_are_li_only():
    html = render()
    # Grab the first <ol class="route"> ... </ol> and assert every immediate tag is <li> or </li>.
    m = re.search(r'<ol class="route">(.*?)</ol>', html, re.S)
    assert m, "no route ol found"
    body = m.group(1)
    # No <article>, <table>, <figure>, or <div class="...block"> as a DIRECT child:
    # after removing all <li>...</li> blocks, nothing structural should remain.
    stripped = re.sub(r'<li.*?</li>', '', body, flags=re.S).strip()
    assert stripped == "", f"unexpected direct children: {stripped[:120]}"
```
(`test_blocks_are_wrapped_in_li` and `test_route_ol_direct_children_are_li_only` will pass fully only after Tasks 4-6 add the block renderers; until then they exercise the wrapper. Keep them — they pass once the wrapper wraps whatever `render_*` returns. If the encounters renderer doesn't exist yet, temporarily assert only `test_no_inline_callout` and `test_route_ol_direct_children_are_li_only`, and unskip the table assertion in Task 4.)

- [ ] **Step 2: Run to verify failure.**

Run: `python3 -m pytest tests/test_build.py::test_no_inline_callout tests/test_build.py::test_route_ol_direct_children_are_li_only -v`
Expected: FAIL (`ach-callout` present; cards are bare children of `<ol>`).

- [ ] **Step 3: Implement the section loop.** Replace `render_route_chapter` in `builder/build.py`:

```python
def render_block_item(item, achievements, default_sources):
    """Render a non-step section item, wrapped as a non-numbered route <li>."""
    t = item.get("type")
    if t == "achievement":
        ach = achievements[item["ach"]]
        if ach.get("display") == "compact":
            inner = render_compact_achievement(ach)
        else:
            inner = render_achievement_card(ach, default_sources)
    elif t == "encounters":
        inner = render_encounters(item)
    elif t == "items":
        inner = render_items(item)
    elif t == "trainers":
        inner = render_trainers(item)
    else:
        inner = ""
    return '<li class="route-block">' + inner + "</li>"


def render_route_chapter(chapter, achievements, default_sources):
    parts = ['<div class="chapter-body">']
    if chapter.get("intro"):
        parts.append("<p>" + esc(chapter["intro"]) + "</p>")
    for section in chapter.get("sections", []):
        if section.get("heading"):
            parts.append('<h3 class="route-section">'
                         + esc(section["heading"]) + "</h3>")
        parts.append('<ol class="route">')
        for item in section.get("items", []):
            if item.get("type") == "step":
                parts.append(render_step(item))
            else:
                parts.append(render_block_item(item, achievements, default_sources))
        parts.append("</ol>")
    parts.append("</div>")
    return "\n".join(parts)
```
Leave `render_callout` defined (dead) or delete it; it is no longer called. Delete it to avoid confusion.

`render_compact_achievement`, `render_encounters`, `render_items`, `render_trainers` are added in Tasks 3-6. To keep tests green between tasks, add minimal stubs now directly above `render_block_item`:

```python
def render_compact_achievement(ach):
    return render_achievement_card_stub(ach)  # replaced in Task 3

def render_achievement_card_stub(ach):
    return '<div class="ach-row" data-stub="1">' + esc(ach["name"]) + "</div>"

def render_encounters(block):
    return '<table class="encounters"></table>'  # filled in Task 4

def render_items(block):
    return '<div class="items-block"></div>'      # filled in Task 5

def render_trainers(block):
    return '<div class="trainers-block"></div>'   # filled in Task 6
```

- [ ] **Step 4: Add `.route-block` CSS.** Append to `builder/assets/styles.css`:

```css
/* Non-numbered route entries (blocks, cards, compact rows) */
.route > li.route-block {
  counter-increment: none;
  padding-left: 0;
  border-bottom: none;
}
.route > li.route-block::before { content: none; }
```

- [ ] **Step 5: Run to verify pass.**

Run: `python3 -m pytest tests/test_build.py -v`
Expected: `test_no_inline_callout` PASS; `test_route_ol_direct_children_are_li_only` PASS; harness + Task 1 tests still PASS.

- [ ] **Step 6: Commit.**

```bash
git add builder/build.py builder/assets/styles.css tests/test_build.py
git commit -m "feat(render): valid route nesting via li.route-block; drop inline callout"
```

### Task 3: Compact achievement rows + full-card category split

Catch/evolve (POC subset) achievements render as a compact row; base-set achievements keep the full card. The renderer reads `ach["display"]` (set by `make_guide.py` in Task 9). Compact rows carry `note` (e.g. "evolve at Lv. 18") and use `data-track-id` + `data-track-kind="achievement"`.

**Files:** Modify `builder/build.py` (replace the `render_compact_achievement` stub; update `render_achievement_card` checkbox attrs). Modify `builder/assets/styles.css`. Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing tests.**

```python
def test_compact_row_markup():
    html = render()
    assert 'class="ach-row"' in html
    assert 'data-track-id="ach-2"' in html
    assert 'data-track-kind="achievement"' in html
    assert "evolve at Lv. 18" in html          # note preserved
    assert "Pidgeotto" in html

def test_full_card_uses_track_attrs():
    html = render()
    # The base-set card ach-3 keeps the full card but new attribute names.
    assert 'data-track-id="ach-3"' in html
    assert 'class="achievement"' in html
    assert "The Silver Case" in html

def test_compact_row_not_full_card():
    html = render()
    # ach-1 (compact) must NOT render an <article class="achievement"> card.
    assert 'id="ach-1"' not in html or 'class="ach-row"' in html
```

- [ ] **Step 2: Run to verify failure.**

Run: `python3 -m pytest tests/test_build.py::test_compact_row_markup -v`
Expected: FAIL (stub markup lacks `data-track-*` and note).

- [ ] **Step 3: Implement.** In `builder/build.py`, replace the `render_compact_achievement` stub (and remove `render_achievement_card_stub`):

```python
def render_compact_achievement(ach):
    """One-line trackable row for catch/evolve (dex) achievements."""
    badge_img = ach.get("badge_img")
    badge = ('<img class="ach-row-badge" src="' + esc(badge_img) + '" alt="" loading="lazy" />'
             if badge_img else '<span class="ach-row-badge"></span>')
    note = ach.get("note")
    note_html = ('<span class="ach-row-note">— ' + esc(note) + "</span>") if note else ""
    pts = ('<span class="ach-row-pts">' + esc(ach["points"]) + "pt</span>"
           if ach.get("points") is not None else "")
    rar = ('<span class="ach-row-rar">' + esc(ach["rarity"]) + "</span>"
           if ach.get("rarity") else "")
    return (
        '<div class="ach-row" id="' + esc(ach["id"]) + '">'
        '<input type="checkbox" class="track-checkbox" data-track-id="' + esc(ach["id"])
        + '" data-track-kind="achievement" />'
        + badge
        + '<span class="ach-row-name">' + esc(ach["name"]) + "</span>"
        + note_html
        + '<span class="ach-row-meta">' + pts + rar + "</span>"
        + "</div>"
    )
```

Then update the checkbox line inside `render_achievement_card` (was `data-ach-id`):
```python
        '<input type="checkbox" class="achievement-checkbox track-checkbox" data-track-id="'
        + esc(ach["id"]) + '" data-track-kind="achievement" />'
```

- [ ] **Step 4: Add compact-row CSS.** Append to `builder/assets/styles.css`:

```css
/* Compact catch/evolve achievement row */
.ach-row { display:flex; align-items:center; gap:9px; padding:6px 4px; border-bottom:1px solid var(--border); }
.ach-row .track-checkbox { width:15px; height:15px; accent-color:var(--accent); flex-shrink:0; }
.ach-row-badge { width:24px; height:24px; border-radius:4px; flex-shrink:0; object-fit:cover; background:var(--bg-card); }
.ach-row-name { font-weight:600; color:var(--text); font-size:0.9rem; }
.ach-row-note { color:var(--text-dim); font-size:0.82rem; }
.ach-row-meta { margin-left:auto; display:flex; gap:8px; }
.ach-row-pts { font-family:var(--font-mono); color:var(--accent); font-size:0.76rem; }
.ach-row-rar { font-family:var(--font-mono); color:var(--text-muted); font-size:0.76rem; }
```

- [ ] **Step 5: Run to verify pass.**

Run: `python3 -m pytest tests/test_build.py -v`
Expected: all Task 3 tests PASS; earlier tests still PASS.

- [ ] **Step 6: Commit.**

```bash
git add builder/build.py builder/assets/styles.css tests/test_build.py
git commit -m "feat(render): compact dex rows vs full cards; unify on data-track-id"
```

### Task 4: Encounters block (narrow table)

**Files:** Modify `builder/build.py` (replace `render_encounters` stub). Modify `builder/assets/styles.css`. Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing test.**

```python
def test_encounters_table():
    html = render()
    assert '<table class="encounters">' in html
    assert "Pidgey" in html
    assert ">50%<" in html
    # A null slot renders as the "doesn't appear" marker, not "None".
    assert "None" not in html.split('<table class="encounters">')[1].split("</table>")[0]
```

- [ ] **Step 2: Run to verify failure.**

Run: `python3 -m pytest tests/test_build.py::test_encounters_table -v`
Expected: FAIL (stub table is empty).

- [ ] **Step 3: Implement.** Replace the `render_encounters` stub in `builder/build.py`:

```python
def _slot(value):
    if value is None or value == "":
        return '<td class="enc-slot enc-none">·</td>'
    return '<td class="enc-slot">' + esc(value) + "</td>"


def render_encounters(block):
    """Narrow wild-encounter table: Pokémon x time-of-day."""
    head = ('<tr><th>Pokémon</th><th class="enc-h">Morn</th>'
            '<th class="enc-h">Day</th><th class="enc-h">Night</th></tr>')
    rows = []
    for r in block.get("rows", []):
        slots = r.get("slots", {})
        method = (' <span class="enc-method">(' + esc(r["method"]) + ")</span>"
                  if r.get("method") else "")
        rows.append(
            '<tr><td class="enc-mon">' + esc(r.get("mon", "")) + method + "</td>"
            + _slot(slots.get("morning")) + _slot(slots.get("day"))
            + _slot(slots.get("night")) + "</tr>"
        )
    label = '<div class="block-title enc-title">🌿 Wild encounters</div>'
    return label + '<table class="encounters">' + head + "".join(rows) + "</table>"
```

- [ ] **Step 4: Add encounters CSS.** Append to `builder/assets/styles.css`:

```css
.block-title { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-muted); margin:14px 0 7px; }
table.encounters { border-collapse:collapse; font-size:0.84rem; width:auto; min-width:300px; }
table.encounters th { text-align:left; color:var(--text-muted); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border); padding:4px 14px 4px 0; }
table.encounters th.enc-h, table.encounters td.enc-slot { text-align:center; padding:4px 10px; }
table.encounters td { padding:4px 14px 4px 0; color:var(--text); border-bottom:1px solid var(--bg-card); }
table.encounters td.enc-mon { font-weight:600; }
table.encounters td.enc-slot { font-family:var(--font-mono); color:var(--text-dim); }
table.encounters td.enc-none { color:#39415a; }
.enc-method { color:var(--text-muted); font-weight:400; font-size:0.78rem; }
```

- [ ] **Step 5: Run to verify pass.** Run: `python3 -m pytest tests/test_build.py -v` — Expected: all PASS.

- [ ] **Step 6: Commit.**

```bash
git add builder/build.py builder/assets/styles.css tests/test_build.py
git commit -m "feat(render): narrow wild-encounters table block"
```

### Task 5: Items block (prominent, checkable)

**Files:** Modify `builder/build.py` (replace `render_items` stub). Modify `builder/assets/styles.css`. Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing test.**

```python
def test_items_block():
    html = render()
    assert 'class="items-block"' in html
    assert 'data-track-id="item-rt29-potion"' in html
    assert 'data-track-kind="item"' in html
    assert "Potion" in html
    assert "east of the grass" in html
```

- [ ] **Step 2: Run to verify failure.** Run: `python3 -m pytest tests/test_build.py::test_items_block -v` — Expected: FAIL.

- [ ] **Step 3: Implement.** Replace the `render_items` stub:

```python
def render_items(block):
    """Prominent, individually checkable item list (counts toward 100% items)."""
    lis = []
    for r in block.get("rows", []):
        where = (' <span class="item-where">— ' + esc(r["where"]) + "</span>"
                 if r.get("where") else "")
        lis.append(
            '<li><input type="checkbox" class="track-checkbox" data-track-id="'
            + esc(r["id"]) + '" data-track-kind="item" />'
            '<span class="item-name">' + esc(r.get("name", "")) + "</span>"
            + where + "</li>"
        )
    return (
        '<div class="items-block">'
        '<div class="block-title items-title">🎁 Items — grab every one (counts toward 100% items)</div>'
        "<ul>" + "".join(lis) + "</ul></div>"
    )
```

- [ ] **Step 4: Add items CSS.** Append to `builder/assets/styles.css`:

```css
.items-block { background:#f7c9480f; border:1px solid #f7c94840; border-left:3px solid var(--gold); border-radius:8px; padding:10px 14px; margin-top:6px; }
.items-block .items-title { color:var(--gold); margin-top:0; }
.items-block ul { list-style:none; margin:0; padding:0; }
.items-block li { display:flex; align-items:center; gap:9px; padding:5px 0; font-size:0.92rem; color:var(--text); }
.items-block .track-checkbox { width:16px; height:16px; accent-color:var(--gold); flex-shrink:0; }
.items-block .item-name { font-weight:600; }
.items-block .item-where { color:var(--text-dim); font-size:0.84rem; font-weight:400; }
```

- [ ] **Step 5: Run to verify pass.** Run: `python3 -m pytest tests/test_build.py -v` — Expected: all PASS.

- [ ] **Step 6: Commit.**

```bash
git add builder/build.py builder/assets/styles.css tests/test_build.py
git commit -m "feat(render): prominent checkable Items block"
```

### Task 6: Trainers block (prominent, checkable)

**Files:** Modify `builder/build.py` (replace `render_trainers` stub). Modify `builder/assets/styles.css`. Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing test.**

```python
def test_trainers_block():
    html = render()
    assert 'class="trainers-block"' in html
    assert 'data-track-id="trainer-rt29-joey"' in html
    assert 'data-track-kind="trainer"' in html
    assert "Youngster Joey" in html
    assert "Rattata Lv. 4" in html
    assert "rematch by phone" in html
```

- [ ] **Step 2: Run to verify failure.** Run: `python3 -m pytest tests/test_build.py::test_trainers_block -v` — Expected: FAIL.

- [ ] **Step 3: Implement.** Replace the `render_trainers` stub:

```python
def render_trainers(block):
    """Prominent, checkable trainer-battle list."""
    rows = []
    for r in block.get("rows", []):
        team = ' <span class="tr-team">— ' + esc(r["team"]) + "</span>" if r.get("team") else ""
        bits = []
        if r.get("reward"):
            bits.append(esc(r["reward"]))
        if r.get("note"):
            bits.append(esc(r["note"]))
        sub = '<br><span class="tr-sub">' + " · ".join(bits) + "</span>" if bits else ""
        rows.append(
            '<div class="tr"><input type="checkbox" class="track-checkbox" data-track-id="'
            + esc(r["id"]) + '" data-track-kind="trainer" /><div>'
            '<span class="tr-name">' + esc(r.get("name", "")) + "</span>" + team + sub
            + "</div></div>"
        )
    return (
        '<div class="trainers-block">'
        '<div class="block-title tr-title">⚔️ Trainer battles</div>'
        + "".join(rows) + "</div>"
    )
```

- [ ] **Step 4: Add trainers CSS.** Append to `builder/assets/styles.css`:

```css
.trainers-block { background:#ef4a5c0d; border:1px solid #ef4a5c33; border-left:3px solid var(--danger); border-radius:8px; padding:10px 14px; margin-top:12px; }
.trainers-block .tr-title { color:#ef6a78; margin-top:0; }
.trainers-block .tr { display:flex; align-items:flex-start; gap:9px; padding:6px 0; border-bottom:1px solid var(--bg-card); font-size:0.88rem; }
.trainers-block .tr:last-child { border-bottom:none; }
.trainers-block .track-checkbox { width:16px; height:16px; accent-color:#ef6a78; flex-shrink:0; margin-top:2px; }
.trainers-block .tr-name { font-weight:600; color:var(--text); }
.trainers-block .tr-team { color:var(--text-dim); }
.trainers-block .tr-sub { color:var(--success); font-size:0.8rem; }
```

- [ ] **Step 5: Run to verify pass.** Run: `python3 -m pytest tests/test_build.py -v` — Expected: all PASS.

- [ ] **Step 6: Commit.**

```bash
git add builder/build.py builder/assets/styles.css tests/test_build.py
git commit -m "feat(render): prominent checkable Trainers block"
```

### Task 7: Header counters for items & trainers

The header still shows `🏆 N achievements · ✓ done` as primary. Add `🎁 items` and `⚔️ trainers` counters with `data-*` hooks `app.js` will fill. Totals are derived by counting trackables in the data.

**Files:** Modify `builder/build.py` (`build`, the `header` block lines 367-376; add an item/trainer counting helper). Test: `tests/test_build.py`.

- [ ] **Step 1: Write the failing test.**

```python
def test_header_has_item_and_trainer_counters():
    html = render()
    assert "data-items-total" in html
    assert "data-items-done" in html
    assert "data-trainers-total" in html
    assert "data-trainers-done" in html
    # Totals from the fixture: 1 item, 1 trainer.
    assert 'data-items-total>1<' in html.replace(" ", "")
    assert 'data-trainers-total>1<' in html.replace(" ", "")
```

- [ ] **Step 2: Run to verify failure.** Run: `python3 -m pytest tests/test_build.py::test_header_has_item_and_trainer_counters -v` — Expected: FAIL.

- [ ] **Step 3: Implement.** Add a helper near `achievement_ids_in_chapter` in `builder/build.py`:

```python
def count_trackables(chapters, kind):
    """Count unique item/trainer ids across all route sections."""
    seen = set()
    for ch in chapters:
        for section in ch.get("sections", []):
            for item in section.get("items", []):
                if item.get("type") == kind + "s":   # "item"->"items", "trainer"->"trainers"
                    for r in item.get("rows", []):
                        if r.get("id"):
                            seen.add(r["id"])
    return len(seen)
```

In `build`, after `total` is computed, add:
```python
    items_total = count_trackables(chapters, "item")
    trainers_total = count_trackables(chapters, "trainer")
```

Replace the `header` string's `guide-meta` div to add two spans after the existing `completed` span:
```python
        '<span>✓ <strong data-completed-count>0</strong> completed</span>'
        '<span>🎁 <strong data-items-done>0</strong>/<strong data-items-total>'
        + str(items_total) + "</strong> items</span>"
        '<span>⚔️ <strong data-trainers-done>0</strong>/<strong data-trainers-total>'
        + str(trainers_total) + "</strong> trainers</span>"
        '<span>📚 <strong>' + str(len(default_sources))
        + "</strong> source(s)</span></div></header>"
```
(Insert the two new spans between the existing `completed` span and the `source(s)` span; keep everything else.)

- [ ] **Step 4: Run to verify pass.** Run: `python3 -m pytest tests/test_build.py -v` — Expected: all PASS.

- [ ] **Step 5: Commit.**

```bash
git add builder/build.py tests/test_build.py
git commit -m "feat(render): header counters for items and trainers"
```

---

## Phase 2 — Interactivity (`builder/assets/app.js`)

### Task 8: Generalize persistence to all trackables + live counters

`app.js` currently keys off `data-ach-id` and counts achievements only. Generalize to `data-track-id` + `data-track-kind`, and update the three header counters. No JS test runner exists; verification is manual in the browser (and the structural attributes are already covered by pytest in Phase 1).

**Files:** Modify `builder/assets/app.js`.

- [ ] **Step 1: Generalize the selectors and state.** In `builder/assets/app.js`, replace every `data-ach-id` selector/attribute with `data-track-id`. Specifically:
  - `getAllCheckboxesById`: `'input[type="checkbox"][data-track-id="' + CSS.escape(id) + '"]'`
  - `applyState`: query `'input[type="checkbox"][data-track-id]'`; read id via `cb.getAttribute("data-track-id")`.
  - `onCheckboxChange`: guard `cb.matches('input[type="checkbox"][data-track-id]')`; read `data-track-id`.
  - `updateProgress`: query `'input[type="checkbox"][data-track-id]'`.

Saved progress is keyed by id value (`ach-<n>` unchanged), so existing saves survive the attribute rename.

- [ ] **Step 2: Make `updateProgress` count per kind.** Replace the body of `updateProgress` in `builder/assets/app.js`:

```javascript
function updateProgress() {
  const byKind = { achievement: { total: 0, done: 0 },
                   item: { total: 0, done: 0 },
                   trainer: { total: 0, done: 0 } };
  const seen = new Set();
  document.querySelectorAll('input[type="checkbox"][data-track-id]').forEach((cb) => {
    const id = cb.getAttribute("data-track-id");
    if (seen.has(id)) return;          // each id counts once even if mirrored in the tracker
    seen.add(id);
    const kind = cb.getAttribute("data-track-kind") || "achievement";
    if (!byKind[kind]) byKind[kind] = { total: 0, done: 0 };
    byKind[kind].total += 1;
    if (state[id]) byKind[kind].done += 1;
  });

  const ach = byKind.achievement;
  const progressEl = document.querySelector(".tracker-progress");
  if (progressEl) progressEl.textContent = ach.done + " / " + ach.total;
  const barFill = document.querySelector(".tracker-bar-fill");
  if (barFill) barFill.style.width = (ach.total === 0 ? 0 : (ach.done / ach.total) * 100) + "%";

  const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
  set("[data-completed-count]", ach.done);
  set("[data-total-count]", ach.total);
  set("[data-items-done]", byKind.item.done);
  set("[data-items-total]", byKind.item.total);
  set("[data-trainers-done]", byKind.trainer.done);
  set("[data-trainers-total]", byKind.trainer.total);
}
```

- [ ] **Step 3: Regenerate and verify in the browser.**

```bash
export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"   # only if you also run the visual companion
python3 make_guide.py
python3 builder/build.py guide.json -o output/pkmn-crystal-poc.html
```
Then open `output/pkmn-crystal-poc.html` and confirm:
  - Checking a **compact achievement row**, an **item**, and a **trainer** each updates the matching header counter (`🏆`, `🎁`, `⚔️`).
  - Reload the page → all three stay checked (localStorage persists).
  - If the same achievement id appears in more than one in-route checkbox, checking one mirrors the other (the existing same-id sync still works under `data-track-id`).
  - The tracker panel and TOC still render and their links jump to the right chapter/achievement.
  - "Reset progress" clears everything.

Record the result in the commit message (what you observed).

- [ ] **Step 4: Commit.**

```bash
git add builder/assets/app.js
git commit -m "feat(app): persist items/trainers, three live counters (verified in browser: <note>)"
```

---

## Phase 3 — Authoring (`make_guide.py`) + schema docs

### Task 9: Authoring helpers + display tagging + schema docs

Add `make_guide.py` helpers for the new blocks, a `note` param + automatic `display` category on `ach()`, and document the new schema.

**Files:** Modify `make_guide.py` (helpers near lines 17-59). Modify `builder/references/schema.md`.

- [ ] **Step 1: Tag catch/evolve achievements as compact + add `note`.** In `make_guide.py`, change the `ach()` signature and body:

```python
def ach(aid, callout_do=None, howto=None, type_label=None, missing_info=None, note=None):
    """Return an inline-achievement reference, registering the full card once.

    Catch/evolve achievements (present in the POC subset, not the base set) are
    tagged display="compact" so the renderer shows a one-line row. `note` is the
    short fact shown on that row, e.g. "evolve at Lv. 18" (facts from sources).
    """
    src = BASE.get(aid) or SUB.get(aid)
    if not src:
        raise KeyError(f"unknown achievement {aid}")
    if aid not in USED:
        a = {
            "id": f"ach-{aid}",
            "name": src["name"],
            "badge_img": f"https://media.retroachievements.org/Badge/{src['badge_id']}.png",
        }
        if src.get("points") is not None:
            a["points"] = src["points"]
        if src.get("rarity"):
            a["rarity"] = src["rarity"]
        if src.get("description"):
            a["description"] = src["description"]
        t = src.get("type")
        if t == "Missable":
            a["missable"] = True
        elif type_label:
            a["type_label"] = type_label
        elif t == "Progression":
            a["type_label"] = "Progression"
        elif t == "Win Condition":
            a["type_label"] = "Win Condition"
        # Category: POC-subset-only achievements render as compact rows.
        if aid in SUB and aid not in BASE:
            a["display"] = "compact"
            if note:
                a["note"] = note
        else:
            if callout_do:
                a["callout_do"] = callout_do
            if howto:
                a["howto"] = howto
        if missing_info:
            a["missing_info"] = missing_info
        USED[aid] = a
    return {"type": "achievement", "ach": f"ach-{aid}"}
```
(Note: compact achievements no longer store `callout_do`/`howto`, since the row shows only `note`. Strategy text that used to live in `howto` moves to a route `step()` note line — see Task 10.)

- [ ] **Step 2: Add block helpers.** Add below `step()` in `make_guide.py`:

```python
def encounters(*rows):
    """rows: dicts {mon, slots:{morning,day,night}, method?} — rates VERBATIM from source."""
    return {"type": "encounters", "rows": list(rows)}

def enc(mon, morning=None, day=None, night=None, method=None):
    r = {"mon": mon, "slots": {"morning": morning, "day": day, "night": night}}
    if method:
        r["method"] = method
    return r

def items(*rows):
    """rows: dicts {id, name, where} — locations VERBATIM from source."""
    return {"type": "items", "rows": list(rows)}

def item(iid, name, where=None):
    r = {"id": iid, "name": name}
    if where:
        r["where"] = where
    return r

def trainers(*rows):
    """rows: dicts {id, name, team?, reward?, note?} — VERBATIM from source."""
    return {"type": "trainers", "rows": list(rows)}

def trainer(tid, name, team=None, reward=None, note=None):
    r = {"id": tid, "name": name}
    if team:
        r["team"] = team
    if reward:
        r["reward"] = reward
    if note:
        r["note"] = note
    return r
```

- [ ] **Step 3: Document the new schema.** Append a section to `builder/references/schema.md`:

```markdown
## New route block items (this project)

Inside a route section's `items[]`, besides `step` and `achievement`:

- `{ "type": "encounters", "rows": [ { "mon", "slots": {"morning","day","night"}, "method"? } ] }`
  — narrow wild-encounter table. A `null` slot means "doesn't appear" (renders `·`).
- `{ "type": "items", "rows": [ { "id", "name", "where"? } ] }` — gold checkable items
  block. `id` must be stable & unique (`item-<route>-<name>`).
- `{ "type": "trainers", "rows": [ { "id", "name", "team"?, "reward"?, "note"? } ] }`
  — red checkable trainers block. `id` stable & unique (`trainer-<route>-<name>`).

A `step`'s `text` may be a **list of strings** (one line each).

Achievements gain `display: "compact"` (set automatically for POC-subset catch/evolve
entries) and a short `note` (e.g. "evolve at Lv. 18"). Compact achievements render as a
one-line row instead of a full card. All checkboxes use `data-track-id` +
`data-track-kind` (`achievement` | `item` | `trainer`) and persist in localStorage.
```

- [ ] **Step 4: Verify `make_guide.py` still runs.**

Run: `python3 make_guide.py`
Expected: prints `wrote .../guide.json: <N> achievements, <M> chapters` with no error. Catch/evolve achievements now carry `"display": "compact"`.

Verify: `python3 -c "import json; d=json.load(open('guide.json')); print(sum(1 for a in d['achievements'] if a.get('display')=='compact'), 'compact /', len(d['achievements']), 'total')"`
Expected: a large compact count (the subset catch/evolve entries).

- [ ] **Step 5: Commit.**

```bash
git add make_guide.py builder/references/schema.md
git commit -m "feat(author): block helpers, compact display tagging, schema docs"
```

### Task 10: Author Chapter 1 in the new format (worked reference)

Convert Chapter 1 to use the new blocks, sourcing encounter rates, items, and trainers from **Bulbapedia / Poképedia**. This is the calibration chapter; the rest follow its pattern. **Invent nothing** — any fact you cannot find in a source becomes a `missing_info` step, not a guess.

**Files:** Modify `make_guide.py` (the `ch1` definition, around lines 137-300).

- [ ] **Step 1: Replace the Route 29 prose encounter step with structured blocks.** In `ch1`, section `"1.2 · Route 29"`, replace the leading prose `step(...)` and add blocks before the achievement refs. Use the figure already in the example. Example (rates/locations are from the example + must be confirmed against Bulbapedia/Poképedia):

```python
{"heading": "1.2 · Route 29", "items": [
    step(["Straight out of New Bark Town — your first wild grass."], where="Route 29",
         figure={"src": "assets/img/Route_29_OAC.png", "alt": "Route 29 map", "credit": "Poképedia"}),
    encounters(
        enc("Pidgey",   morning="50%", day="50%"),
        enc("Sentret",  morning="40%", day="40%"),
        enc("Rattata",  morning="5%",  day="5%",  night="45%"),
        enc("Hoppip",   morning="5%",  day="5%"),
        enc("Hoothoot", night="55%"),
    ),
    items(
        item("item-rt29-potion", "Potion", "east of the northeastern grass patch"),
    ),
    # trainers(...)  # add if Route 29 has any per source; else omit (Route 29 has none)
    ach("315089", note="catch"),
    ach("315090", note="evolve at Lv. 18"),
    ach("315091", note="evolve at Lv. 36"),
    ach("315093", note="catch"),
    ach("315094", note="evolve at Lv. 18"),
    ach("315095", note="evolve at Lv. 27"),
    ach("315096", note="catch"),
    ach("315097", note="evolve at Lv. 15"),
    ach("315098", note="catch"),
    ach("315099", note="evolve at Lv. 20"),
    ach("315088", note="catch"),
    ach("315092", note="evolve at Lv. 20"),
]},
```

- [ ] **Step 2: Re-home strategy text that compact rows drop.** The old `ach()` calls carried strategy in `howto`/`callout_do` (e.g. the Hoppip/Tackle note, the "Pidgey is a big grind" note). Since compact rows show only `note`, move any strategy worth keeping into a `step(..., where="Tip")` line in the same section, e.g.:

```python
    step(["Hoppip only knows Tackle (from Lv. 10) as an attacking move, even unevolved "
          "up to Skiploom/Jumpluff — train it patiently."], where="Tip"),
    step(["Fully evolving Pidgey is one of the bigger grinds before Falkner."], where="Tip"),
```
Place these after the achievement rows for the section. Drop strategy that isn't worth a line.

- [ ] **Step 3: Apply the same conversion to the other Chapter 1 sections** (1.1 New Bark Town, 1.3 Route 46, etc.): add `encounters(...)`, `items(...)`, `trainers(...)` where the source has them; convert each catch/evolve `ach()` to `ach(id, note=...)`; mark gaps with `missing_info`. For the **starter** achievements (315085-315087) — which are in the subset and therefore now compact — give notes like `note="evolve at Lv. 16"` etc.

- [ ] **Step 4: Regenerate and eyeball Chapter 1.**

```bash
python3 make_guide.py
python3 builder/build.py guide.json -o output/pkmn-crystal-poc.html
```
Open `output/pkmn-crystal-poc.html`, expand Chapter 1, and confirm: narrow encounter table, gold Items block with checkboxes, red Trainers block (where present), compact achievement rows with the right notes, multi-line steps, no full cards for catches.

- [ ] **Step 5: Run the renderer tests (guard against regressions).**

Run: `python3 -m pytest tests/test_build.py -v`
Expected: all PASS.

- [ ] **Step 6: Commit.**

```bash
git add make_guide.py guide.json output/pkmn-crystal-poc.html
git commit -m "content: convert Chapter 1 to encounters/items/trainers + compact rows"
```

### Task 11: Roll out the format to the remaining chapters

Apply the Task 10 pattern to Chapters 2-11 + the roundup, one chapter per commit, sourcing each chapter's encounters/items/trainers from Bulbapedia/Poképedia and marking gaps.

**Files:** Modify `make_guide.py` (one chapter definition per step).

- [ ] **Step 1: Chapter 2** — add blocks, convert `ach()` to `ach(id, note=...)`, re-home strategy, mark gaps. Then `python3 make_guide.py && python3 builder/build.py guide.json -o output/pkmn-crystal-poc.html`, eyeball, `python3 -m pytest tests/test_build.py -v`. Commit: `content: convert Chapter 2 …`.
- [ ] **Step 2: Chapter 3** — same loop + commit.
- [ ] **Step 3: Chapter 4** — same loop + commit.
- [ ] **Step 4: Chapter 5** — same loop + commit.
- [ ] **Step 5: Chapter 6** — same loop + commit.
- [ ] **Step 6: Chapter 7** — same loop + commit.
- [ ] **Step 7: Chapter 8** — same loop + commit.
- [ ] **Step 8: Chapter 9** — same loop + commit.
- [ ] **Step 9: Chapter 10 (Kanto gyms)** — same loop + commit.
- [ ] **Step 10: Chapter 11 (Mt. Silver & Red)** — same loop + commit.
- [ ] **Step 11: Roundup chapter** — convert any catch/evolve refs to compact `note=`; roundup cards stay full for non-dex. Commit.

> Each step is self-contained: it changes one chapter, regenerates, eyeballs the rendered chapter, runs the renderer tests, and commits. If a source lacks a chapter's encounter/item/trainer data, add a `missing_info` step naming the gap rather than inventing data, and note it in the commit message.

---

## Phase 4 — Final regeneration & verification

### Task 12: Full regenerate, image fetch, and verification sweep

**Files:** Regenerates `guide.json`, `output/pkmn-crystal-poc.html`, `output/assets/img/`. Create: `builder/README.md`.

- [ ] **Step 1: Write the build workflow doc.** Create `builder/README.md`:

```markdown
# Local guide builder

Project-local copy of the achievement-guide renderer. Edit these files (not the
installed skill) for Pokémon Crystal guide changes.

## Build

```bash
python3 make_guide.py                                          # authors guide.json
python3 builder/fetch_images.py guide.json --img-dir output/assets/img   # localize images (best effort)
python3 builder/build.py guide.json -o output/pkmn-crystal-poc.html
```

## Test the renderer

```bash
python3 -m pytest tests/test_build.py -v
```

Renderer is pure (`data -> HTML`); interactivity in `assets/app.js` is verified
manually in the browser (checkbox persistence + the three header counters).
```

- [ ] **Step 2: Full regenerate.**

```bash
python3 make_guide.py
python3 builder/fetch_images.py guide.json --img-dir output/assets/img || echo "(image fetch best-effort; supply missing files manually)"
python3 builder/build.py guide.json -o output/pkmn-crystal-poc.html
```

- [ ] **Step 3: Run the full renderer test suite.**

Run: `python3 -m pytest tests/ -v`
Expected: all PASS.

- [ ] **Step 4: Structural verification (no invalid nesting, no leftover callout).**

```bash
python3 - <<'PY'
import re
html = open("output/pkmn-crystal-poc.html", encoding="utf-8").read()
assert 'class="ach-callout"' not in html, "stale callout present"
for m in re.finditer(r'<ol class="route">(.*?)</ol>', html, re.S):
    stripped = re.sub(r'<li.*?</li>', '', m.group(1), flags=re.S).strip()
    assert stripped == "", "non-<li> direct child in route <ol>: " + stripped[:120]
print("structure OK")
PY
```
Expected: prints `structure OK`.

- [ ] **Step 5: Manual browser verification.** Open `output/pkmn-crystal-poc.html`:
  - Headline `🏆 N achievements` count matches the previous guide's achievement total (format change must not change the achievement count).
  - `🎁 items` / `⚔️ trainers` totals are non-zero and match what was authored.
  - Check one achievement row, one item, one trainer → counters increment; reload → still checked.
  - Encounter tables are narrow; Items gold; Trainers red; compact rows show notes; multi-line steps wrap per line.
  - TOC links jump to chapters; tracker panel expands and mirrors achievement checks.

- [ ] **Step 6: Commit.**

```bash
git add builder/README.md guide.json output/
git commit -m "build: regenerate full Crystal guide in improved format; add builder README"
```

- [ ] **Step 7: Finish the branch.** Use the superpowers:finishing-a-development-branch skill to decide how to integrate (merge / PR / cleanup).

---

## Self-review notes (spec coverage)

- Spec §1 (encounters/items/trainers blocks, stable ids, sourcing/gaps) → Tasks 4, 5, 6, 9, 10, 11.
- Spec §2 (multi-line steps) → Task 1.
- Spec §3 (drop dual callout; compact-vs-full by category; render blocks; fix invalid HTML; re-home strategy; accent in :root) → Tasks 2, 3, 9, 10. *(Accent already injected via `:root` by `build.py`'s `accent_css`; no change needed — the appended override in the hand-edit is not reproduced by the renderer.)*
- Spec §4 (data-track-id/kind; three counters; tracker/TOC retained) → Tasks 3, 7, 8. *(Tracker/TOC are emitted unchanged by the copied renderer; achievement rows still appear there. Item/trainer aggregate counts live in the header per Task 7.)*
- Spec §5 (Chapter 0 Basics) → **already present** in `make_guide.py` (lines 64+); no task needed beyond regeneration. Verified during Task 9 Step 4 / Task 12.
- Spec §6 (build workflow + regenerate + verify) → Tasks 8, 12, plus per-chapter regen in 10-11.
```
