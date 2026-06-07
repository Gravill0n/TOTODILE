#!/usr/bin/env python3
"""
build.py — Miracle Mask route renderer (local fork of the achievement-guide kit).

This game has NO achievements, so the stock achievement-centric renderer is
adapted into a STEP-CENTRIC one:

  * every route step renders as a checkable <li> (progress saved in
    localStorage, keyed by slug),
  * the sticky tracker + TOC count *steps* per chapter (compact group bars),
  * a small colour-coded type chip (Move / Tap / Chat / Puzzle / …) mirrors the
    source's own colour code.

It still INVENTS NOTHING — every word comes from guide.json. No puzzle
solutions or spoilers live in the data by construction.

Usage:
    python build.py guide.json -o output/layton-miracle-mask-route.html
"""

import argparse
import html
import json
import os
import sys


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def esc(text):
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


def read_asset(assets_dir, name):
    with open(os.path.join(assets_dir, name), "r", encoding="utf-8") as fh:
        return fh.read()


def step_ids_in_chapter(chapter):
    """Stable ids of every checkable step in a route chapter, document order."""
    ids = []
    for section in chapter.get("sections", []):
        for item in section.get("items", []):
            if item.get("type") == "step" and item.get("id"):
                ids.append(item["id"])
    return ids


# --------------------------------------------------------------------------
# Components
# --------------------------------------------------------------------------

def render_missing_info(note):
    return (
        '<div class="missing-info">⚠ Source gap: ' + esc(note)
        + " — confirm with the user / add a source before relying on this.</div>"
    )


# Friendly label shown on each colour-coded chip.
TAG_LABEL = {
    "move": "Move",
    "tap": "Tap",
    "chat": "Chat",
    "cutscene": "Cutscene",
    "mystery": "Mystery",
    "minigame": "Minigame",
    "save": "Save",
    "zoom": "Zoom",
    "puzzle": "Puzzle",
    "note": "Note",
    "choose": "Choose",
    "follow": "Follow",
}


def render_step(item):
    sid = item.get("id")
    tag = item.get("tag")
    text = item.get("text", "")
    where = item.get("where")
    npc = item.get("npc")

    check = ""
    if sid:
        check = ('<input type="checkbox" class="route-check" data-ach-id="'
                 + esc(sid) + '" aria-label="Mark step done" />')

    chip = ""
    if tag:
        chip = ('<span class="route-tag ' + esc(tag) + '">'
                + esc(TAG_LABEL.get(tag, tag)) + "</span>")

    prefix = ""
    if where:
        prefix += '<span class="route-where">' + esc(where) + "</span> "
    if npc:
        prefix += '<span class="route-npc">' + esc(npc) + "</span>: "

    body = ('<span class="route-step-text">' + chip + prefix + esc(text)
            + "</span>")

    inner = check + body
    if item.get("missing_info"):
        inner += render_missing_info(item["missing_info"])
    return "<li>" + inner + "</li>"


def render_route_chapter(chapter):
    parts = ['<div class="chapter-body">']
    if chapter.get("intro"):
        parts.append("<p>" + esc(chapter["intro"]) + "</p>")
    for section in chapter.get("sections", []):
        if section.get("heading"):
            parts.append('<h3 class="route-section">'
                         + esc(section["heading"]) + "</h3>")
        parts.append('<ol class="route">')
        for item in section.get("items", []):
            parts.append(render_step(item))
        parts.append("</ol>")
    parts.append("</div>")
    return "\n".join(parts)


def render_chapter(chapter, is_first):
    open_attr = " open" if is_first else ""
    body = render_route_chapter(chapter)
    n = len(step_ids_in_chapter(chapter))
    summary = esc(chapter["title"])
    if n:
        summary += ('<span class="chapter-summary-count" data-summary-count="'
                    + esc(chapter["id"]) + '">0 / ' + str(n) + "</span>")
    return (
        '<details class="chapter" id="' + esc(chapter["id"]) + '"' + open_attr + ">"
        "<summary>" + summary + "</summary>" + body + "</details>"
    )


# --------------------------------------------------------------------------
# Tracker + TOC (compact, per-chapter step counts)
# --------------------------------------------------------------------------

def render_tracker_and_toc(chapters, total):
    groups, toc_rows = [], []
    for ch in chapters:
        n = len(step_ids_in_chapter(ch))
        if not n:
            continue
        cid = esc(ch["id"])
        groups.append(
            '<div class="tracker-group" data-group="' + cid + '">'
            '<div class="tracker-group-head">'
            '<a href="#' + cid + '" class="tracker-group-title">'
            + esc(ch["title"]) + "</a>"
            '<span class="tracker-group-count" data-group-count="' + cid
            + '">0 / ' + str(n) + "</span></div>"
            '<div class="tracker-bar mini"><div class="tracker-bar-fill" '
            'data-group-fill="' + cid + '"></div></div></div>'
        )
        toc_rows.append(
            '<li><a href="#' + cid + '">' + esc(ch["title"]) + "</a>"
            '<span class="toc-meta"><span class="toc-count" data-toc-count="'
            + cid + '">0 / ' + str(n) + "</span></span></li>"
        )

    tracker = (
        '<aside class="tracker open"><div class="tracker-header">'
        '<span class="tracker-title">📋 Puzzle Progress</span>'
        '<span class="tracker-progress">0 / ' + str(total) + "</span></div>"
        '<div class="tracker-bar"><div class="tracker-bar-fill"></div></div>'
        '<div class="tracker-list">' + "".join(groups)
        + '<button data-reset-progress style="margin-top:14px;padding:6px 12px;'
        'background:transparent;border:1px solid var(--border);color:var(--text-dim);'
        'border-radius:6px;cursor:pointer;">Reset progress</button>'
        "</div></aside>"
    )
    toc = ('<nav class="toc"><div class="toc-head">🗺 Contents</div><ol>'
           + "".join(toc_rows) + "</ol></nav>")
    return tracker, toc


# --------------------------------------------------------------------------
# Page assembly
# --------------------------------------------------------------------------

def build(data, assets_dir):
    game = data["game"]
    chapters = data["chapters"]
    sources = data.get("sources", [])

    total = sum(len(step_ids_in_chapter(ch)) for ch in chapters)

    css = read_asset(assets_dir, "styles.css")
    js = read_asset(assets_dir, "app.js")
    accent = game.get("accent")
    accent_css = (":root{--accent:" + accent + ";--accent-soft:" + accent
                  + "22;}") if accent else ""

    tracker, toc = render_tracker_and_toc(chapters, total)
    chapters_html = "\n".join(
        render_chapter(ch, i == 0) for i, ch in enumerate(chapters)
    )

    src_items = "".join(
        "<li><a href=\"" + esc(s["url"]) + "\" target=\"_blank\" rel=\"noopener\">"
        + esc(s["label"]) + "</a>" + (" — " + esc(s["note"]) if s.get("note") else "")
        + "</li>"
        for s in sources
    )
    footer = (
        '<footer class="sources-footer"><h2>Sources used</h2><ul>' + src_items
        + "</ul><p style=\"margin-top:20px;color:var(--text-muted);font-size:0.82rem;\">"
        "Spoiler-free minimal route. Generated from the listed source; navigation "
        "facts are preserved verbatim. Puzzle solutions and story beats are "
        "deliberately omitted — each puzzle is named only so you know which to "
        "solve.</p></footer>"
    )

    intro_note = ""
    if game.get("intro_note"):
        intro_note = ('<div class="intro-note">' + esc(game["intro_note"])
                      + "</div>")

    header = (
        '<header class="guide-header"><h1>' + esc(game["title"])
        + "</h1><div class=\"guide-meta\">"
        '<span>🎮 <strong>' + esc(game.get("platform", "")) + "</strong></span>"
        '<span>🧩 <strong data-total-count>' + str(total)
        + "</strong> puzzles</span>"
        '<span>✓ <strong data-completed-count>0</strong> solved</span>'
        '<span>📚 <strong>' + str(len(sources))
        + "</strong> source(s)</span></div></header>"
    )

    slug = esc(game.get("slug", "guide"))

    return (
        "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"UTF-8\" />"
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
        "<title>" + esc(game["title"]) + "</title><style>\n" + css + "\n"
        + accent_css + "</style></head><body>\n"
        + header + "\n" + intro_note + "\n" + tracker + "\n" + toc
        + "\n<main>\n" + chapters_html + "\n</main>\n" + footer
        + '\n<script>window.GAME_SLUG = "' + slug + '";</script>\n<script>'
        + js + "</script></body></html>"
    )


def main():
    ap = argparse.ArgumentParser(description="Render the Miracle Mask route from JSON.")
    ap.add_argument("json_path")
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--assets", default=None)
    args = ap.parse_args()

    assets_dir = args.assets or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "assets")
    with open(args.json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    html_out = build(data, assets_dir)
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as fh:
        fh.write(html_out)

    total = sum(len(step_ids_in_chapter(ch)) for ch in data["chapters"])
    print("Rendered: " + args.output)
    print("Chapters: " + str(len(data["chapters"])) + " | Route steps: " + str(total))


if __name__ == "__main__":
    sys.exit(main())
