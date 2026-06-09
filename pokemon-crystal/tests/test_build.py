import json
import os
import re
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


def test_no_inline_callout():
    html = render()
    assert 'class="ach-callout"' not in html


def test_blocks_are_wrapped_in_li():
    html = render()
    # The encounters table must live inside a route-block <li>, not bare in the <ol>.
    # The label div may precede the table inside the <li>.
    assert re.search(r'<li class="route-block">.*?<table class="encounters"', html, re.S)


def test_route_ol_direct_children_are_li_only():
    html = render()
    # Grab the first <ol class="route"> ... </ol> and assert every immediate tag is <li> or </li>.
    m = re.search(r'<ol class="route">(.*?)</ol>', html, re.S)
    assert m, "no route ol found"
    body = m.group(1)
    # Remove top-level <li>...</li> blocks (accounting for nested <li> tags inside blocks).
    # Walk depth to find each outermost li span and remove it.
    depth = 0
    start = None
    result = []
    i = 0
    while i < len(body):
        if body[i:i+3] == "<li":
            if depth == 0:
                start = i
            depth += 1
            i += 3
        elif body[i:i+5] == "</li>":
            depth -= 1
            if depth == 0:
                i += 5
                start = None
                continue
            i += 5
        else:
            if depth == 0:
                result.append(body[i])
            i += 1
    stripped = "".join(result).strip()
    assert stripped == "", f"unexpected direct children: {stripped[:120]}"


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


def test_encounters_table():
    html = render()
    assert '<table class="encounters">' in html
    assert "Pidgey" in html
    assert ">50%<" in html
    # A null slot renders as the "doesn't appear" marker, not "None".
    assert "None" not in html.split('<table class="encounters">')[1].split("</table>")[0]


def test_items_block():
    html = render()
    assert 'class="items-block"' in html
    assert 'data-track-id="item-rt29-potion"' in html
    assert 'data-track-kind="item"' in html
    assert "Potion" in html
    assert "east of the grass" in html


def test_trainers_block():
    html = render()
    assert 'class="trainers-block"' in html
    assert 'data-track-id="trainer-rt29-joey"' in html
    assert 'data-track-kind="trainer"' in html
    assert "Youngster Joey" in html
    assert "Rattata Lv. 4" in html
    assert "rematch by phone" in html


def test_header_has_item_and_trainer_counters():
    html = render()
    assert "data-items-total" in html
    assert "data-items-done" in html
    assert "data-trainers-total" in html
    assert "data-trainers-done" in html
    # Totals from the fixture: 1 item, 1 trainer.
    assert 'data-items-total>1<' in html.replace(" ", "")
    assert 'data-trainers-total>1<' in html.replace(" ", "")
