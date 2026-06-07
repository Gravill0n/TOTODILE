#!/usr/bin/env python3
"""
make_guide.py — authors guide.json for the spoiler-free minimal route of
Professor Layton and the Miracle Mask.

SPECIAL RULES (per the user):
  * No achievements (the game has none) — progress is tracked PER PUZZLE only.
  * NO spoilers and NO puzzle solutions. Each required puzzle is named only by
    its in-game number (+ its on-screen title when the source shows one) so you
    know WHICH puzzle to solve, never HOW. Solution lines and deduction answers
    from the source are dropped, not paraphrased.
  * Optional puzzles are skipped, so the game's own puzzle numbers have gaps —
    that's expected. Puzzle numbers are fixed IDs, so they are NOT strictly
    increasing along the route.
  * Text-only: no images (the source's screenshots all bake in the answers).

Every navigation fact (place / NPC / object / direction) is reproduced verbatim
from the source route; only the colour-coded action words become chips.

Source: "Professor Layton and the Miracle Mask US Any% Guide"
        (route: tutelarfiber7 · formatting: StarrlightSims).
"""

import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- step helpers
_counter = [0]


def _sid():
    _counter[0] += 1
    return "p%03d" % _counter[0]


def step(tag, text="", where=None, npc=None, track=False):
    # Only `track`ed steps (puzzles) get an id -> a checkbox. Everything else is
    # a plain route direction, too trivial to tick off.
    d = {"type": "step", "tag": tag, "text": text}
    if track:
        d["id"] = _sid()
    if where:
        d["where"] = where
    if npc:
        d["npc"] = npc
    return d


# action shortcuts (chip is rendered from the tag; text holds the source detail)
def chat():            return step("chat", "Mash through the dialogue")
def cut():             return step("cutscene", "Watch the cutscene")
def mystery():         return step("mystery", "View the Mystery screen")
def save():            return step("save", "Select the right option")
def mv(text):          return step("move", text)        # "to X (Up)", "Back ...", "Up"
def tap(text):         return step("tap", "on " + text)
def zoom(text):        return step("zoom", text)
def choose(text):      return step("choose", text)
def follow(text="the path"): return step("follow", text)
def mini(text="Play the minigame"): return step("minigame", text)
def note(text):        return step("note", text)


def pz(num, title=None):
    # chip already says "Puzzle"; text holds just the number (+ on-screen title)
    t = "%s" % num
    if title:
        t += " — " + title
    return step("puzzle", t, track=True)


def pzx(text):
    # a trackable puzzle the source gives no number for (e.g. the Magic Square)
    return step("puzzle", text, track=True)


def chapter(cid, title, intro, items):
    return {"id": cid, "title": title, "kind": "route",
            "intro": intro, "sections": [{"items": items}]}


CHAPTERS = []

# ===== Prologue =============================================================
CHAPTERS.append(chapter(
    "prologue", "Prologue — The Dark Parade",
    "The game opens straight into a scene. Advance everything and solve the one "
    "required puzzle.",
    [
        cut(), mystery(), chat(),
        tap("Floating Clown Stumble (Top Right)"),
        pz("001", "Untangle the strings!"),
        cut(), chat(), cut(),
        mini("Follow the Masked Gentleman"),
        cut(), chat(), mystery(), save(),
    ],
))

# ===== Chapter 1 ============================================================
CHAPTERS.append(chapter(
    "chapter-1", "Chapter 1 — The Mask of Chaos",
    "Free roam around Monte d'Or begins. Follow the taps and moves in order; "
    "solve each numbered puzzle as you reach it.",
    [
        chat(), mystery(), chat(),
        tap("Statues"), tap("Aldus"),
        zoom("(Left of Fountain)"), chat(),
        tap("Wooden Box"), tap("Zoom Out (Bottom Mid)"),
        tap("Tent (Top Mid)"), tap("Back to Map (Bottom Mid)"),
        mv("to Carnival Arcade (Up)"), chat(),
        tap("Clown Float"), zoom("on Clown Float"), tap("Crying Kid"),
        pz("002"),
        tap("Zoom Out (Bottom Mid)"), tap("Back to Map (Bottom Mid)"),
        mv("to Gallery Plaza (Up)"), chat(), tap("Policeman"),
        mv("to Knickknack Alley (Up)"), chat(), tap("Toy Car"),
        pz("004", "Circle the correct bumper car!"),
        tap("Guy (Behind the Booth)"),
        pz("005", "Assemble the robot!"),
        mv("to Oasis Street (Up)"), chat(),
        mini("Play the cup-and-ball game"),
        mv("to Ledore Mansion Gate (Up)"), chat(),
        mv("to Ledore Mansion Garden (Top Right)"), cut(), chat(),
        mv("to Ledore Parlor (Top Right)"), chat(), mystery(), chat(),
        mv("Back (out of the Ledore Parlor)"), chat(),
        mv("Back (out of the Ledore Mansion Garden)"), chat(),
        mv("Back (Bottom Mid) ×2"), chat(),
        zoom("on Right Edge"), chat(),
        tap("Aldus"), tap("Metal Box"), tap("Zoom Out"), tap("Back to Map"),
        mv("Back (Bottom Mid) ×3"), chat(), tap("Policeman"),
        mv("to Gallery Plaza (Up) ×2"), chat(),
        mv("to Merchant District (Top Left)"), tap("Nils"),
        mv("to Madame Lapushka's (Right)"), tap("Madame Lapushka"),
        pz("010", "How many people?"),
        mv("Back (Left)"), chat(),
        mv("to City Monument (Up)"), tap("Juggles"),
        pz("011", "Circle the lone item!"),
        mv("to Dromedary Plaza (Left)"), chat(), tap("Tyrone"),
        choose("Pick the rabbit, then give it a name"),
        mv("to Dromedary Lobby (Up)"), chat(), tap("Yuming"), tap("Pascal"),
        pz("012", "Divide up the luggage!"),
        mv("to Layton's Room (Left)"), chat(), save(),
    ],
))

# ===== Chapter 2 ============================================================
CHAPTERS.append(chapter(
    "chapter-2", "Chapter 2 — The Secret of Norwell",
    "A flashback chapter. Straightforward back-and-forth around town and the "
    "academy.",
    [
        cut(), chat(), tap("Mr. Collins"),
        pz("013", "Fill in the details!"),
        pz("014", "Which fish was it?"),
        pz("015", "Reconstruct the fossil!"),
        mv("to Kingsbrook Academy (Right)"), tap("Alphonse"),
        mv("to Academy Gate (Down)"), cut(),
        mv("to Layton Home (Down)"), chat(),
        mv("to Living Room (Left)"), chat(),
        zoom("on Bookcase"), tap("Wine Bottle"),
        pz("018", "How many liters per bottle?"),
        tap("Lucille"), tap("Zoom Out"),
        mv("Back (Down)"), mv("to Academy Gate (Up)"), chat(),
        mv("to Pebble Lane (Right)"), tap("Esther"),
        pz("019"),
        mv("to Market Street (Right)"), chat(),
        mv("to Old Towne (Up)"), tap("Doug"),
        pz("021", "Repaint one house!"),
        mv("to Edge of Town (Right)"), tap("Roland"),
        mv("Back (Left)"), mv("Back (Down)"), mv("Back (Left)"),
        mv("Back (Down) ×2"), mv("Back (Left)"), chat(),
        mv("to Hershel's Room (Left)"), tap("Chair"),
        mv("to Layton Home (Down)"), mv("to Academy Gate (Up)"),
        mv("to Pebble Lane (Right)"), chat(), tap("Alphonse"),
        pz("026", "Solve the “simple” problem!"),
        mv("to Memory Knoll (Left)"), cut(),
        mv("to Ascot House (Left)"), chat(), tap("Window (Top Left)"),
        pz("027", "Ring the bell!"),
        cut(), chat(), cut(), save(),
    ],
))

# ===== Chapter 3 ============================================================
CHAPTERS.append(chapter(
    "chapter-3", "Chapter 3 — The Battle for Monte d'Or",
    "Tap Nanna Grams to run through a batch of puzzles, then explore Monte d'Or "
    "and answer the briefing deductions (answers omitted — make your own calls).",
    [
        cut(), chat(),
        mv("to Dromedary Lobby (Right)"), chat(),
        tap("Nanna Grams ×2"),
        pz("003", "Which poster is identical?"),
        pz("007", "Who's in the tent?"),
        pz("008", "Find the repeating pattern!"),
        pz("016", "What's the correct time?"),
        pz("017", "Match the original!"),
        pz("020", "How many bricks?"),
        pz("023", "Who's Mr. Blue?"),
        pz("024", "Match the apron's pattern!"),
        pz("025", "Which way to go?"),
        tap("Back to Map"),
        mv("to Dromedary Plaza (Down)"), chat(),
        tap("Cookie"), mv("Right"), tap("Esther"), mv("Down"),
        tap("Sterling (Left)"), mv("Down"),
        chat(), mv("Down"), chat(), mv("Down"),
        tap("Tanya (Right)"),
        mv("Up ×2"), mv("Right"), mv("Up"), mv("Left"), mv("Up ×2"),
        tap("Angela"), mv("Right"), chat(),
        tap("Plate (Right Edge)"),
        pz("034", "Which plate?"),
        tap("Chair (Middle, Under Painting)"), tap("Desk (Right)"), tap("Angela"),
        mv("Left"), mv("Down"), mv("Left"), mv("Right"), mv("Down ×2"),
        mv("Left"), mv("Up"), mv("Left"), chat(), mv("Left"), chat(),
        mystery(), mv("Left"), cut(), chat(),
        mv("Right ×3"), mv("Down ×2"), mv("Right"), mv("Up"),
        mv("Left"), chat(), mv("Up"), chat(), mv("Right"), chat(),
        tap("Policeman"), tap("Mayor Billson"), mv("Right"), tap("Sheffield"),
        choose("Press OK (left choice)"), cut(),
        note("Briefing 1 — work through the deductions"),
        tap("Sheffield"),
        note("Briefing 2 — work through the deductions"),
        tap("Sheffield"),
        note("Briefing 3 — work through the deductions"),
        chat(), mv("Left"), chat(), mv("Down"), tap("Hanna"),
        pz("042", "Where should the photo go?"),
        mv("Down"), mv("Right"), mv("Down ×2"), chat(), mv("Up"), chat(),
        tap("Artie"),
        pz("046", "Flip the pizza face up!"),
        mv("Down"), mv("Left"), mv("Right"), tap("M. Lapushka"),
        pz("047", "Who lost to E?"),
        mv("Left"), mv("Up"), mv("Left ×2"), chat(), mv("Up"), tap("Tyrone"),
        pz("049", "Enter the row and seat."),
        tap("Tiger (Right Edge)"),
        pz("050", "Land back in the center!"),
        mv("Down"), chat(), mv("Right ×2"), mv("Down ×2"), chat(),
        tap("Angela"), cut(), chat(), mystery(), cut(), chat(),
        tap("Bloom"), save(),
    ],
))

# ===== Chapter 4 ============================================================
CHAPTERS.append(chapter(
    "chapter-4", "Chapter 4 — Angela's Tears",
    "A short chapter.",
    [
        chat(), mv("Right"), chat(), mv("Right ×2"), chat(),
        mv("Up ×2"), mv("Right"), chat(), tap("Fence"),
        pz("061", "Move and flip the panels!"),
        mv("Up"), chat(), tap("Sign (Right Edge)"),
        pz("062", "Fix the sign!"),
        mv("Up"), chat(), tap("Randall"),
        pz("063", "How many people crossed?"),
        mv("Up"), cut(), tap("Door"),
        pz("064", "Rearrange the inscription!"),
        mv("Down"), mv("Left"), mv("Down"), chat(),
        mv("Left"), mv("Down ×2"), mv("Left"), cut(), chat(),
        mv("Left ×2"), chat(), save(),
    ],
))

# ===== Chapter 5 ============================================================
CHAPTERS.append(chapter(
    "chapter-5", "Chapter 5 — Miracles Unmasked",
    "Tap Nanna Grams for another big batch of puzzles, then work around the "
    "fairground.",
    [
        chat(), mv("Right"), tap("Nanna Grams"),
        pz("029", "Who was the winner?"),
        pz("030", "Who ate which slice?"),
        pz("032", "Where did each shot hit?"),
        pz("033", "Which link needs removing?"),
        pz("035", "Which way up is it?"),
        pz("036", "Which doughnuts are hers?"),
        pz("037", "What comes next?"),
        pz("038"),
        pz("041", "Where was the boy?"),
        pz("051", "Which bear fits?"),
        pz("052", "Arrange the jewels!"),
        pz("054", "Locate the artifacts!"),
        pz("056", "Touch the right square!"),
        pz("058", "How many blocks?"),
        pz("060", "Cordon off the holes!"),
        tap("Back Button (Bottom Right)"), tap("Back to Map"),
        mv("Down"), mv("Right"), mv("Down ×2"), mv("Right"), mv("Up"),
        mv("Left"), mv("Up"), mv("Right ×2"), chat(), mystery(),
        mv("Left"), mv("Down"), chat(), mv("Up"),
        tap("Arch (Top Mid)"), mv("Up"), cut(), tap("Gustav"),
        pz("075", "Can you work out the order?"),
        tap("Door"), tap("Cart (Right Side)"), tap("Gustav"), mv("Down"),
        chat(), mv("Down ×2"), mv("Up-Right"), mv("Up"), tap("Angela"),
        cut(), chat(), mystery(), mv("Down"), chat(), mystery(),
        mv("Down"), chat(), mv("Down ×2"), tap("Firth"),
        pz("077", "Piece the map together!"),
        mv("Down ×3"), chat(), zoom("on Left Side"), chat(),
        tap("Zoom Out"), tap("Back to Map"), mv("Up ×2"), chat(),
        mv("Left"), mv("Up"), chat(), tap("Murphy"),
        pz("079", "What do A, B, C, D & E do?"),
        mv("Up"), tap("Humbert (Right Side)"), mv("Up"), chat(),
        mv("Up"), chat(),
        pzx("Magic Square puzzle"),
        mv("Down"), chat(), mv("Left"), tap("Yukkles"), mv("Up"),
        cut(), chat(), tap("the Merry-go-round"),
        pz("087", "Match up the horses!"),
        tap("Building (Right Edge)"),
        pz("088", "Which arrow is missing?"),
        mv("Right"), tap("Spinning Cups"),
        pz("089", "Find the odd one out."),
        tap("Ferris Wheel"),
        pz("090", "Connect the cable!"),
        mv("Up"), tap("Door"), mv("Down"), chat(), mv("Down"), chat(),
        mystery(), save(),
    ],
))

# ===== Chapter 6 ============================================================
# The Akbadain ruins: a long block-pushing / dig-hole dungeon. In the source it
# is navigated almost entirely with annotated screenshots; per request those
# maps are omitted, so the bare "Push (direction)" steps below mirror the
# source's caption order. Push the highlighted block in the stated direction.
CHAPTERS.append(chapter(
    "chapter-6", "Chapter 6 — The Ghosts of Akbadain",
    "A long block-pushing and dig-hole dungeon. The source guided this with "
    "maps (omitted here); the Push/Move directions below follow the source's "
    "order — push the block the game highlights in the direction shown. Only the "
    "named side-puzzles are checkboxes.",
    [
        chat(), cut(), chat(),
        cut(), chat(),
        mv("Up until Randall talks to you"),
        tap("Dig Hole (Bottom Mid) on the Top-Right dirt patch"),
        mv("Up to change room"),
        mv("Right until you find a Glowing Spot"),
        tap("Dig Hole on the Glowing Spot"), chat(), tap("Fill Hole"),
        mv("Right to change room"), mv("Up"), chat(),
        mv("Right to press the other button"), mv("Up"), chat(),
        mv("Left all the way"), mv("Up all the way"), mv("Right one step"),
        tap("Dig Hole"), mv("to the Button"), mv("to the next Floor (B2)"),
        mv("Up"), mv("Left"), mv("Up until you find a rock"),
        tap("Push (Bottom Mid)"), mv("Left"),
        mv("Up until you find two rocks"),
        tap("Push, looking at the left rock"),
        mv("Left"), mv("Down"), mv("Left"),
        mv("Up until you find a rock"), chat(),
        mv("Up all the way"), tap("Push"),
        mv("Up all the way"), mv("Right one step"), mv("Up one step"),
        mv("Left one step"), tap("Push"),
        mv("Left all the way"), mv("Up one step"), mv("Left one step"),
        mv("Down one step"), tap("Push"),
        mv("Down all the way"), mv("Left one step"), mv("Down one step"),
        mv("Right one step"), tap("Push"),
        mv("Right all the way"), mv("Down one step"), mv("Right one step"),
        mv("Up one step"), tap("Push"),
        mv("Up to the exit"), chat(),
        mv("Up all the way"), tap("Push"),
        mv("Up one step"), mv("Left all the way"), mv("Down all the way"),
        mv("Left all the way"), mv("Up one step"), mv("Down all the way"),
        mv("Right all the way"), mv("Up all the way"), mv("Down two steps"),
        mv("Right two steps"), mv("Up all the way"), mv("Left all the way"),
        mv("to the button"), chat(),
        mv("to the exit"), mv("Right"), mv("Up to the third level"), chat(),
        mv("Down"), mv("Right"), mv("Up"), tap("Push"),
        mv("Up"), mv("Down"), tap("Push (Right)"), tap("Push (Up)"),
        mv("Up"), follow(), chat(), mv("Up to the glowing spots"), mv("Left"),
        tap("Push (Up)"), tap("Push (Down)"), tap("Push (Right)"),
        mv("Right"), chat(),
        mv("Up two steps"), mv("Right three steps"), mv("Up two steps"),
        mv("Left three steps"), mv("Up two steps"), mv("Left three steps"),
        mv("Up two steps"), mv("Left two steps"), mv("to the button"), chat(),
        follow(), chat(), tap("Push (Right)"),
        mv("to the stairs and press the button"), chat(),
        mv("down the stairs"), tap("Push (Down)"),
        mv("to the stairs"), tap("Pull"), chat(),
        follow(), mv("Up"), chat(), follow(), chat(), cut(),
        pz("093"),
        cut(), follow(), chat(),
        tap("Push (Down)"), tap("Push (Left)"), tap("Push (Up)"),
        tap("Push (Right)"), chat(), follow("the path to the right"),
        tap("Push (Right)"), tap("Push (Down)"), tap("Push (Right)"),
        tap("Push (Left)"), tap("Push (Up)"), tap("Push (Left)"),
        tap("Push (Right)"),
        follow(), mv("Up"), chat(), mv("Up"),
        tap("Push (Up)"), tap("Push (Up)"), tap("Push (Up)"),
        tap("Push (Right)"), tap("Push (Down)"),
        tap("Push (Left)"), tap("Push (Up)"), follow(),
        tap("Push (Up)"), tap("Push (Left)"),
        tap("Push (Left)"), tap("Push (Down)"), tap("Push (Left)"),
        tap("Push (Down)"), tap("Push (Left)"), tap("Push (Down)"),
        tap("Push (Right)"),
        tap("Push (Up)"),
        follow(), mv("to the door"), chat(),
        pz("095", "Select the right key!"),
        mv("Up"), tap("Push (Down)"), tap("Push (Down)"),
        tap("Push (Left)"), tap("Push (Up)"), tap("Push (Left)"),
        tap("Push (Down)"),
        follow(), tap("Push (Up)"),
        mv("Up one step"), mv("Left two steps"), mv("Up two steps"), chat(),
        mv("Up two steps"), mv("Right two steps"), mv("Up one step"), chat(),
        mv("to the top button"), chat(), tap("Push (Up)"),
        mv("to the top button"), chat(), follow(), mv("Right"), chat(),
        pz("096", "Avoid the spiders!"),
        follow("the path to the right"), mv("Down"), chat(),
        pz("097"),
        mv("Up"), chat(), follow("the path up"), tap("Push (Down)"),
        tap("Push (Right)"), tap("Push (Up)"), tap("Push (Up)"),
        tap("Push (Right)"), tap("Push (Right)"), tap("Push (Up)"),
        tap("Push (Right)"), tap("Push (Up)"), follow(), tap("Push (Left)"),
        tap("Push (Down)"), tap("Push (Down)"), tap("Push (Left)"),
        tap("Push (Left)"), tap("Push (Up)"), follow(), chat(),
        mv("Left one step"), mv("Right two steps"), mv("Up one step"),
        mv("Right two steps"), mv("Up one step"),
        mv("Right two steps"),
        tap("the Top-Left Button twice to face left"), tap("Dig Hole"),
        mv("Down two steps"), mv("Left two steps"), mv("Up one step"),
        mv("Left two steps"), mv("Up one step"), mv("Left one step"),
        mv("Up two steps"), mv("Right one step"), mv("Left one step"),
        mv("Down two steps"), mv("Right one step"), mv("Down two steps"),
        mv("Left two steps"), mv("Up two steps"), mv("Right one step"),
        mv("Up one step"),
        tap("the Top-Left Button twice to face down"), tap("Dig Hole"),
        mv("Up one step"), mv("Left one step"), mv("Up two steps"),
        mv("Right one step"), mv("Up two steps"), mv("Down two steps"),
        mv("Right one step"), mv("Down two steps"), mv("Left two steps"),
        mv("Up two steps"), mv("Right one step"), mv("Up two steps"),
        mv("Left to the button"), chat(), follow(), chat(), follow(), chat(),
        cut(), chat(),
        pz("100", "Solve the code!"),
        chat(), cut(), chat(), cut(), save(),
    ],
))

# ===== Chapter 7 ============================================================
CHAPTERS.append(chapter(
    "chapter-7", "Chapter 7 — The Reunion Inn",
    "Tap Nanna Grams for the last big puzzle batch, then work through the hotel "
    "and town.",
    [
        chat(), mv("Right"), tap("Nanna Grams"),
        pz("066", "How far did he walk?"),
        pz("067"),
        pz("068", "Arrange the days off!"),
        pz("070", "Circle one colored pencil!"),
        pz("073", "What's missing?"),
        pz("076", "How many boxes will fit?"),
        pz("078", "Where is the ball?"),
        pz("081", "How many colored sheets?"),
        pz("083", "Find each section's value!"),
        pz("092", "How many bulls are there?"),
        pz("098", "Enter the door code!"),
        pz("099", "How many deer are there?"),
        tap("Back Button (Bottom Right)"), tap("Back to Map"),
        mv("Down"), chat(), mv("Left ×2"), tap("Gonzales"), mv("Up"),
        tap("Alphonse"), mv("Down"), mv("Right ×3"), chat(),
        mv("Up ×2"), mv("Left"), mv("Up"), chat(), mv("Right"), mv("Up"),
        tap("Door"), chat(), mystery(), mv("Down"), chat(), tap("Murphy"),
        pz("117", "Which way will she face?"),
        mv("Left"), mv("Down"), tap("Train (Left Option)"),
        mv("Down ×2"), mv("Up-Right"), mv("Up"), chat(), mv("Right"),
        tap("Henry"), tap("Mrs. Ascot"), mv("Left"), chat(), mv("Down"),
        chat(), mv("Left"), mv("Up"), mv("Right"), tap("Mayor Billson"),
        pz("118", "Divide the board!"),
        mv("Right"), tap("Sheffield"), mv("Left"), mv("Down"), chat(),
        mv("Up ×2"), tap("Bloom"), mv("Down"), chat(),
        tap("Train (Right Option)"), cut(), tap("Aldus"), mv("Up"), chat(),
        tap("Mordy"),
        pz("126", "Which is the 4?"),
        tap("Office"), chat(), tap("Books (Table on the Right)"),
        pz("128", "Which direction?"),
        chat(), tap("Left Bookcase"), tap("Map (Left)"), tap("Robot (Left)"),
        tap("Front Desk"), chat(), tap("Emerald Suite"), chat(), tap("Frankie"),
        pz("130", "Who's the sore loser?"),
        tap("Painting (Left Edge)"), tap("Conservatory"), chat(),
        tap("Bird (Top Left)"), tap("Red Flower ×2"), tap("Fruit"),
        tap("Book (Top Left)"), tap("Grand Hall"), cut(), chat(),
        tap("Plant (Right)"),
        pz("131"),
        tap("Auditorium"), chat(), tap("Screen"), cut(),
        pz("133"),
        cut(), cut(), chat(), mystery(), save(),
    ],
))

# ===== Chapter 8 ============================================================
CHAPTERS.append(chapter(
    "chapter-8", "Chapter 8 — The Final Miracle",
    "The home stretch.",
    [
        chat(), tap("Door (Top Right Corner)"), cut(), chat(),
        tap("Train"), mv("Down ×3"), chat(), mystery(), chat(),
        zoom("on Monument"), tap("Manhole"),
        pz("134", "Place the slabs!"),
        chat(), cut(),
        pz("135"),
        cut(), mystery(), save(),
    ],
))

# ===== Epilogue =============================================================
CHAPTERS.append(chapter(
    "epilogue", "Epilogue — The City of Miracles",
    "Final scenes. The game ends on the last Mystery screen.",
    [
        chat(), tap("Randall"), choose("Pick the left option"), chat(),
        cut(), chat(), mystery(), cut(), chat(), mystery(),
    ],
))


# ---------------------------------------------------------------- assemble
GUIDE = {
    "game": {
        "title": "Professor Layton and the Miracle Mask — Spoiler-Free Route",
        "platform": "Nintendo 3DS",
        "slug": "layton-miracle-mask-route",
        "accent": "#7a4fce",
        "spoiler_warning": False,
        "intro_note": (
            "Spoiler-free minimal route to finish the story. Follow the steps in "
            "order and tick off each puzzle as you solve it — progress saves in "
            "your browser. Puzzles are listed by their in-game number only (with "
            "the on-screen title when known), so you know which to solve without "
            "any solution. Optional puzzles are skipped, so puzzle numbers have "
            "gaps and aren't in strict order — that's normal."
        ),
    },
    "sources": [
        {
            "label": "Professor Layton and the Miracle Mask — US Any% Guide",
            "url": "sources/Professor Layton and the Miracle Mask US Any% Guide.pdf",
            "role": "Route",
            "note": "Route by tutelarfiber7; formatting by StarrlightSims. "
                    "Puzzle solutions and story content omitted on request.",
        }
    ],
    "chapters": CHAPTERS,
}


if __name__ == "__main__":
    out = os.path.join(ROOT, "guide.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(GUIDE, fh, ensure_ascii=False, indent=2)
    steps = sum(len(s["items"]) for c in CHAPTERS for s in c["sections"])
    puzzles = sum(1 for c in CHAPTERS for s in c["sections"]
                  for it in s["items"] if it.get("tag") == "puzzle")
    print("Wrote %s — %d chapters, %d steps, %d puzzles"
          % (out, len(CHAPTERS), steps, puzzles))
