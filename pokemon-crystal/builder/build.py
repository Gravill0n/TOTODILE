#!/usr/bin/env python3
"""
build.py — Achievement Guide renderer.

Turns a structured guide JSON (see references/schema.md) into a single
self-contained HTML file, embedding the verbatim CSS/JS kit from assets/.

The renderer is deterministic and INVENTS NOTHING. It only arranges the data
it is given. All wording lives in the JSON; this script never edits prose.
All cross-references (tracker groups, TOC counts, missable flags, progress
totals) are DERIVED from the chapter -> achievement mapping so they can never
drift out of sync.

Usage:
    python build.py guide.json -o output/guide.html
"""

import argparse
import html
import json
import os
import sys


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------

def esc(text):
    """HTML-escape a string. None becomes empty string."""
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


def read_asset(assets_dir, name):
    path = os.path.join(assets_dir, name)
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def achievement_ids_in_chapter(chapter):
    """Return achievement ids referenced by a chapter, in document order."""
    ids = []
    if chapter.get("kind") == "roundup":
        for aid in chapter.get("achievements", []):
            if aid not in ids:
                ids.append(aid)
    else:  # route
        for section in chapter.get("sections", []):
            for item in section.get("items", []):
                if item.get("type") == "achievement":
                    aid = item.get("ach")
                    if aid and aid not in ids:
                        ids.append(aid)
    return ids


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


# --------------------------------------------------------------------------
# Component renderers — each mirrors the reference implementation's markup
# --------------------------------------------------------------------------

def render_missing_info(note):
    return (
        '<div class="missing-info">⚠ Source gap: '
        + esc(note)
        + " — confirm with the user / add a source before relying on this.</div>"
    )


def render_figure(fig):
    """Route figure (map/screenshot) with lightbox + caption + credit."""
    src = esc(fig.get("src"))
    alt = esc(fig.get("alt") or fig.get("caption") or "Map")
    caption = fig.get("caption", "")
    credit = fig.get("credit", "")
    cap_html = ""
    if caption or credit:
        bits = []
        if caption:
            bits.append(esc(caption))
        if credit:
            bits.append('<span style="color:var(--text-muted);">Source: '
                        + esc(credit) + "</span>")
        cap_html = "<figcaption>" + " · ".join(bits) + "</figcaption>"
    return (
        '<figure class="route-figure">'
        '<a class="route-figure-link" href="' + src + '">'
        '<img src="' + src + '" alt="' + alt + '" loading="lazy" />'
        "</a>" + cap_html + "</figure>"
    )


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


def render_badges(ach):
    out = []
    if ach.get("points") is not None:
        out.append('<span class="badge points">' + esc(ach["points"]) + " pts</span>")
    if ach.get("missable"):
        out.append('<span class="badge" style="background:var(--warning-bg);'
                   'color:var(--warning);border-color:var(--warning);">Missable</span>')
    elif ach.get("type_label"):
        out.append('<span class="badge">' + esc(ach["type_label"]) + "</span>")
    if ach.get("rarity"):
        out.append('<span class="badge rarity">' + esc(ach["rarity"]) + "</span>")
    return "\n      ".join(out)


def render_sources_line(ach, default_sources):
    sources = ach.get("sources") or default_sources
    if not sources:
        return ""
    parts = []
    for s in sources:
        role = s.get("role", "Source")
        parts.append(
            esc(role) + ': <a href="' + esc(s["url"])
            + '" target="_blank" rel="noopener">' + esc(s["label"]) + "</a>"
        )
    return '<div class="achievement-source">' + " · ".join(parts) + "</div>"


def render_achievement_card(ach, default_sources):
    """Full achievement card."""
    missable = ach.get("missable", False)
    cls = "achievement missable" if missable else "achievement"
    badge_img = ach.get("badge_img")
    img_html = ""
    if badge_img:
        img_html = (
            '<img src="' + esc(badge_img) + '" alt="' + esc(ach["name"])
            + ' badge" style="width:48px;height:48px;border-radius:4px;'
            'flex-shrink:0;" loading="lazy" />'
        )

    howto_items = ach.get("howto", [])
    howto_html = ""
    if howto_items:
        lis = "\n        ".join("<li>" + esc(h) + "</li>" for h in howto_items)
        howto_html = (
            '<div class="achievement-howto"><h4>How to obtain</h4>'
            "<ol>\n        " + lis + "\n    </ol></div>"
        )

    missing = ""
    if ach.get("missing_info"):
        missing = render_missing_info(ach["missing_info"])

    desc = ""
    if ach.get("description"):
        desc = ('<p class="achievement-description">"'
                + esc(ach["description"]) + '"</p>')

    return (
        '<article class="' + cls + '" id="' + esc(ach["id"]) + '">'
        '<div class="achievement-header">'
        '<input type="checkbox" class="achievement-checkbox track-checkbox" data-track-id="'
        + esc(ach["id"]) + '" data-track-kind="achievement" />'
        + img_html
        + '<h3 class="achievement-name">' + esc(ach["name"]) + "</h3>"
        '<div class="achievement-badges">\n      ' + render_badges(ach)
        + "\n    </div></div>"
        + desc
        + howto_html
        + missing
        + render_sources_line(ach, default_sources)
        + "</article>"
    )


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


def render_roundup_chapter(chapter, achievements, default_sources):
    parts = ['<div class="chapter-body">']
    if chapter.get("intro"):
        parts.append("<p>" + esc(chapter["intro"]) + "</p>")
    for aid in chapter.get("achievements", []):
        parts.append(render_achievement_card(achievements[aid], default_sources))
    parts.append("</div>")
    return "\n".join(parts)


def render_chapter(chapter, achievements, default_sources, is_first):
    open_attr = " open" if is_first else ""
    if chapter.get("kind") == "roundup":
        body = render_roundup_chapter(chapter, achievements, default_sources)
    else:
        body = render_route_chapter(chapter, achievements, default_sources)
    return (
        '<details class="chapter" id="' + esc(chapter["id"]) + '"' + open_attr + ">"
        "<summary>" + esc(chapter["title"]) + "</summary>"
        + body + "</details>"
    )


# --------------------------------------------------------------------------
# Tracker + TOC (fully derived)
# --------------------------------------------------------------------------

def render_tracker_and_toc(chapters, achievements, total):
    tracker_groups = []
    toc_rows = []
    for ch in chapters:
        ids = achievement_ids_in_chapter(ch)
        if not ids:
            continue
        missable_ct = sum(1 for i in ids if achievements[i].get("missable"))

        rows = []
        for i in ids:
            a = achievements[i]
            warn = " ⚠" if a.get("missable") else ""
            pts = a.get("points")
            pts_html = ('<small style="color:var(--text-muted);">(' + esc(pts)
                        + ")</small>") if pts is not None else ""
            rows.append(
                '<li data-track-for="' + esc(i) + '"><a href="#' + esc(i)
                + '" class="track-row"><span class="track-check" aria-hidden="true">'
                '</span><span class="track-name">' + esc(a["name"]) + " "
                + pts_html + warn + "</span></a></li>"
            )
        tracker_groups.append(
            '<div class="tracker-group" data-group="' + esc(ch["id"]) + '">'
            '<div class="tracker-group-head">'
            '<a href="#' + esc(ch["id"]) + '" class="tracker-group-title">'
            + esc(ch["title"]) + "</a>"
            '<span class="tracker-group-count" data-group-count="' + esc(ch["id"])
            + '">0 / ' + str(len(ids)) + "</span></div><ul>"
            + "".join(rows) + "</ul></div>"
        )

        miss_html = ('<span class="toc-missable">' + str(missable_ct)
                     + " ⚠</span>") if missable_ct else ""
        toc_rows.append(
            '<li><a href="#' + esc(ch["id"]) + '">' + esc(ch["title"]) + "</a>"
            '<span class="toc-meta"><span class="toc-count" data-toc-count="'
            + esc(ch["id"]) + '">0 / ' + str(len(ids)) + "</span>"
            + miss_html + "</span></li>"
        )

    tracker = (
        '<aside class="tracker"><div class="tracker-header">'
        '<span class="tracker-title">📋 Progress Tracker</span>'
        '<span class="tracker-progress">0 / ' + str(total) + "</span></div>"
        '<div class="tracker-bar"><div class="tracker-bar-fill"></div></div>'
        '<div class="tracker-list">' + "".join(tracker_groups)
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
    achievements = {a["id"]: a for a in data["achievements"]}
    chapters = data["chapters"]
    default_sources = data.get("sources", [])

    total = 0
    seen = set()
    for ch in chapters:
        for i in achievement_ids_in_chapter(ch):
            if i not in seen:
                seen.add(i)
                total += 1

    items_total = count_trackables(chapters, "item")
    trainers_total = count_trackables(chapters, "trainer")

    css = read_asset(assets_dir, "styles.css")
    js = read_asset(assets_dir, "app.js")
    accent = game.get("accent")
    accent_css = (":root{--accent:" + accent + ";--accent-soft:" + accent
                  + "22;}") if accent else ""

    tracker, toc = render_tracker_and_toc(chapters, achievements, total)

    chapters_html = "\n".join(
        render_chapter(ch, achievements, default_sources, i == 0)
        for i, ch in enumerate(chapters)
    )

    # Sources footer
    src_items = "".join(
        "<li><a href=\"" + esc(s["url"]) + "\" target=\"_blank\" rel=\"noopener\">"
        + esc(s["label"]) + "</a>" + (" — " + esc(s["note"]) if s.get("note") else "")
        + "</li>"
        for s in default_sources
    )
    footer = (
        '<footer class="sources-footer"><h2>Sources used</h2><ul>' + src_items
        + "</ul><p style=\"margin-top:20px;color:var(--text-muted);font-size:0.82rem;\">"
        "This guide was generated from the listed sources. Facts are preserved from "
        "the sources; no content was invented. Report errors or gaps to add sources "
        "and regenerate.</p></footer>"
    )

    spoiler_banner = ""
    if game.get("spoiler_warning", True):
        spoiler_banner = (
            '<div class="spoiler-warning">⚠ This guide contains spoilers. '
            "Story-revealing content is hidden behind blur — click to reveal.</div>"
        )

    header = (
        '<header class="guide-header"><h1>' + esc(game["title"])
        + "</h1><div class=\"guide-meta\">"
        '<span>🎮 <strong>' + esc(game.get("platform", "")) + "</strong></span>"
        '<span>🏆 <strong data-total-count>' + str(total)
        + "</strong> achievements</span>"
        '<span>✓ <strong data-completed-count>0</strong> completed</span>'
        '<span>🎁 <strong data-items-done>0</strong>/<strong data-items-total>'
        + str(items_total) + "</strong> items</span>"
        '<span>⚔️ <strong data-trainers-done>0</strong>/<strong data-trainers-total>'
        + str(trainers_total) + "</strong> trainers</span>"
        '<span>📚 <strong>' + str(len(default_sources))
        + "</strong> source(s)</span></div></header>"
    )

    slug = esc(game.get("slug", "guide"))

    return (
        "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"UTF-8\" />"
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
        "<title>" + esc(game["title"]) + "</title><style>\n" + css + "\n"
        + accent_css + "</style></head><body>\n"
        + header + "\n" + spoiler_banner + "\n" + tracker + "\n" + toc
        + "\n<main>\n" + chapters_html + "\n</main>\n" + footer
        + '\n<script>window.GAME_SLUG = "' + slug + '";</script>\n<script>'
        + js + "</script></body></html>"
    )


def main():
    ap = argparse.ArgumentParser(description="Render an achievement guide from JSON.")
    ap.add_argument("json_path", help="Path to the guide JSON.")
    ap.add_argument("-o", "--output", required=True, help="Output HTML path.")
    ap.add_argument("--assets", default=None,
                    help="Assets dir (default: ./assets next to this script).")
    args = ap.parse_args()

    assets_dir = args.assets or os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
    with open(args.json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    html_out = build(data, assets_dir)
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as fh:
        fh.write(html_out)

    # Quick sanity report
    total_ach = len(data["achievements"])
    print("Rendered: " + args.output)
    print("Achievements: " + str(total_ach) + " | Chapters: "
          + str(len(data["chapters"])))


if __name__ == "__main__":
    sys.exit(main())
