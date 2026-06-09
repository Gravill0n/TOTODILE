#!/usr/bin/env python3
"""Builds guide.json for the Pokémon Crystal POC + RA achievement guide.

Achievement names / points / rarity / official descriptions / badge images are
pulled VERBATIM from the parsed RetroAchievements set data (sources/base.json,
sources/subset.json). Only route prose + callout_do + howto are authored here,
with all concrete facts taken from Mewlax's POC guide and the RA pages.
"""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = {a["id"]: a for a in json.load(open(os.path.join(ROOT, "sources/base.json")))}
SUB  = {a["id"]: a for a in json.load(open(os.path.join(ROOT, "sources/subset.json")))}

USED = {}  # id -> achievement dict (deduped)

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

def step(text, where=None, npc=None, spoiler=None, figure=None, missing_info=None):
    s = {"type": "step", "text": text}
    if where: s["where"] = where
    if npc: s["npc"] = npc
    if spoiler: s["spoiler"] = True
    if figure: s["figure"] = figure
    if missing_info: s["missing_info"] = missing_info
    return s

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

# ---------------------------------------------------------------------------
# Chapter 0 — The Basics
# ---------------------------------------------------------------------------
ch0 = {
    "id": "ch0-basics",
    "title": "Chapter 0 — The Basics (read first)",
    "kind": "route",
    "intro": ("A Professor Oak Challenge means catching and evolving as many Pokémon "
              "as possible before each gym badge becomes required to proceed (or before "
              "you need an HM that needs a badge). The dex comes first — your gym "
              "challenge goes on hold. This guide fuses Mewlax's POC route with both "
              "RetroAchievements sets: the base game set and the Professor Oak Challenge "
              "subset. Facts come straight from those sources; nothing is invented."),
    "sections": [
        {"heading": "The rules of the challenge", "items": [
            step("Catch and evolve as many Pokémon as is possible until a gym badge is "
                 "required to proceed or you need a HM move that requires a badge. Where "
                 "gyms can be done in any order, always get the badge that unlocks the "
                 "most Pokémon (this guide picks the order for you).", where="Rule"),
            step("You cannot trade with other versions. Trade evolutions are off the "
                 "table, you get no version exclusives, and you are stuck with the "
                 "decisions you make such as your starter. In-game trades ARE allowed.",
                 where="Rule"),
            step("Optional: call yourself 'Oak' or 'Prof. Oak' for fun.", where="Rule"),
        ]},
        {"heading": "Tips for the Crystal version", "items": [
            step("Move sets are slow. Consider keeping three-stage Pokémon unevolved a "
                 "little longer so they learn better moves, and keep multiple attacking "
                 "moves over status moves like Growl or Sand Attack — you will KO huge "
                 "numbers of wild Pokémon.", where="Tip"),
            step("Time of day matters. Crystal pushes this further than Gold/Silver — "
                 "almost every route has Pokémon that appear only in one or two slots. "
                 "Morning is 4am–9:59am, Day is 10am–5:59pm, Night is 6pm–3:59am.",
                 where="Tip"),
            step("This is a very grindy challenge; the part before Falkner alone can take "
                 "tens of hours. It gets less grindy as the game proceeds.", where="Tip"),
            step("This guide lists the Pokémon you can catch at the earliest opportunity "
                 "plus required items — it is not a full walkthrough of optimal EXP "
                 "routes. Consult Bulbapedia for deeper detail.", where="Note"),
        ]},
        {"heading": "The Moon Stone savings plan (start this immediately)", "items": [
            step("When you leave New Bark Town after delivering the egg to Professor Elm, "
                 "speak to your Mother before leaving so she starts saving your money. A "
                 "quarter of every trainer's winnings goes to her automatically; you can "
                 "also deposit manually at home to speed it up.", npc="Mom"),
            step("Thresholds and the item she buys: P900 → Super Potion; P4,000 → Repel; "
                 "P7,000 → Super Potion; P10,000 → Charmander Doll; P15,000 → Moon Stone. "
                 "Because her savings drop each time she buys, you need P18,270 deposited "
                 "in total to reach the Moon Stone.", where="Thresholds"),
            step("The phone call that delivers an item only triggers when you defeat a "
                 "trainer while she is already at the threshold, or the winnings from "
                 "that battle push her over it.", where="How it triggers"),
        ]},
        {"heading": "Forcing NPC calls & changing date/time", "items": [
            step("Many evolution stones and swarm catches come from Pokégear contacts "
                 "calling you. You can force a call: go to New Bark Town, talk to your "
                 "mother, and toggle daylight savings (alternate winter/summer time) to "
                 "instantly prompt a contact to call.", npc="Mom"),
            step("To change the in-game date/time directly, on the title screen press "
                 "Down + Select + B together to reach the password prompt. The password "
                 "is based on your name, ID and money, so it stays the same as long as "
                 "your money doesn't change — handy for save-reset tricks.", where="Clock"),
        ]},
        {"heading": "Cartridge vs Virtual Console", "items": [
            step("Celebi is obtainable only on the Virtual Console release (via the GS "
                 "Ball). Cartridge players cannot get it. Final dex totals: 206 on "
                 "cartridge, 207 on Virtual Console. VC-only steps are flagged inline.",
                 where="Versions"),
        ]},
    ],
}

# ---------------------------------------------------------------------------
# Chapter 1 — Pre-Badge 1: Falkner
# ---------------------------------------------------------------------------
ch1 = {
    "id": "ch1-falkner",
    "title": "Chapter 1 — Pre-Badge #1: Falkner",
    "kind": "route",
    "intro": ("Everything you can do BEFORE the first badge from Falkner — the most "
              "daunting stretch of the challenge. Thankfully there is no Jigglypuff on "
              "Route 46, so no Moon Stone is needed yet (but get your Mother saving from "
              "the very start). By the end you should have caught 46 Pokémon, including a "
              "fully evolved starter and Pidgeot."),
    "sections": [
        {"heading": "1.1 · New Bark Town — the starter", "items": [
            step(["Set the clock and start the game. Your Mother gives you a PokéGear.",
                  "Head to Professor Elm's lab. He asks you to visit Mr. Pokémon and lets "
                  "you take one Pokémon partner."],
                 where="New Bark Town", npc="Prof. Elm"),
            step(["Pick one starter — you can only pick one, and a POC forbids trading for "
                  "the others:",
                  "Chikorita → Bayleef Lv. 16 → Meganium Lv. 32",
                  "Cyndaquil → Quilava Lv. 14 → Typhlosion Lv. 36",
                  "Totodile → Croconaw Lv. 18 → Feraligatr Lv. 30",
                  "Chikorita is the weakest start given all the bug/flying/poison early "
                  "on; Totodile fully evolves earliest at Lv. 30."],
                 where="Elm's Lab"),
            ach("315085", note="choose your starter"),
            step(["Visit Mr. Pokémon's house (north past Cherrygrove), then return to New "
                  "Bark Town to receive your Pokédex and Poké Balls — now the challenge "
                  "truly begins.",
                  "Talk to Mom before leaving town to start the savings."],
                 where="Route 30 → New Bark Town", npc="Mr. Pokémon"),
            ach("315086", note="evolve 2nd stage (Lv. 14/16/18)"),
            ach("315087", note="fully evolve (Lv. 30/32/36) — required before Falkner"),
            step("Consider leaving your starter unevolved a while so it learns moves "
                 "faster for the long grind ahead.", where="Tip"),
        ]},
        {"heading": "1.2 · Route 29", "items": [
            step(["Straight out of New Bark Town.",
                  "Pidgey, Sentret and Hoppip appear Morning/Day, Hoothoot at Night, and "
                  "Rattata at all times."],
                 where="Route 29"),
            encounters(
                enc("Pidgey",   morning="50%", day="50%"),
                enc("Sentret",  morning="40%", day="40%"),
                enc("Rattata",  morning="5%",  day="5%",  night="45%"),
                enc("Hoppip",   morning="5%",  day="5%"),
                enc("Hoothoot", night="55%"),
            ),
            items(
                item("item-rt29-potion", "Potion",
                     where="East of the northeastern grass patch"),
            ),
            ach("315089", note="catch (Morning/Day)"),
            ach("315090", note="evolve at Lv. 18"),
            ach("315091", note="evolve at Lv. 36"),
            ach("315093", note="catch (Morning/Day)"),
            ach("315094", note="evolve at Lv. 18"),
            ach("315095", note="evolve at Lv. 27"),
            ach("315096", note="catch (Morning/Day)"),
            ach("315097", note="evolve at Lv. 15"),
            ach("315098", note="catch (Night)"),
            ach("315099", note="evolve at Lv. 20"),
            ach("315088", note="catch (any time)"),
            ach("315092", note="evolve at Lv. 20"),
            step(["Fully evolving Pidgey is one of the bigger grinds before Falkner.",
                  "Hoppip only knows Tackle (from Lv. 10) as an attacking move, even "
                  "unevolved up to Skiploom/Jumpluff — train it patiently."],
                 where="Tip"),
        ]},
        {"heading": "1.3 · Route 46", "items": [
            step(["Through the northern gate of Route 29 you reach the lower section of "
                  "Route 46.",
                  "Phanpy appears in the morning, Spearow Morning/Day, Geodude and Rattata "
                  "at any time. (Jigglypuff is Gold/Silver-only here — not in Crystal, so "
                  "no Moon Stone is needed yet.)"],
                 where="Route 46"),
            encounters(
                enc("Geodude", morning="50%", day="50%", night="45%"),
                enc("Spearow", morning="30%", day="30%"),
                enc("Phanpy",  morning="5%"),
            ),
            trainers(
                trainer("trainer-rt46-camper-ted", "Camper Ted",
                        team="Mankey Lv. 17", reward="P340"),
                trainer("trainer-rt46-picnicker-erin", "Picnicker Erin",
                        team="Ponyta Lv. 16, Ponyta Lv. 16", reward="P320",
                        note="has Pokégear phone"),
                trainer("trainer-rt46-hiker-bailey", "Hiker Bailey",
                        team="Geodude Lv. 13 ×5", reward="P416"),
            ),
            ach("315102", note="catch (Morning)"),
            ach("315103", note="evolve at Lv. 25"),
            ach("315100", note="catch (any time)"),
            ach("315101", note="evolve at Lv. 25"),
            ach("315104", note="catch (Morning/Day)"),
            ach("315105", note="evolve at Lv. 20"),
            step(["Phanpy has a high chance to flee each turn. If it wastes too many "
                  "balls, come back later with a Gastly that knows Mean Look to trap it.",
                  "Graveler's evolution into Golem is a trade evolution, so Golem is NOT "
                  "obtainable in a POC."],
                 where="Note"),
        ]},
        {"heading": "1.4 · Route 30", "items": [
            step(["Pass through Cherrygrove City and head north to Route 30.",
                  "Ledyba appears in the morning; Caterpie and Weedle Morning/Day; "
                  "Spinarak, Poliwag and Zubat at night."],
                 where="Route 30"),
            encounters(
                enc("Caterpie", morning="50%", day="50%"),
                enc("Ledyba",   morning="30%"),
                enc("Weedle",   morning="5%",  day="5%"),
                enc("Spinarak", night="30%"),
                enc("Poliwag",  night="20%"),
                enc("Zubat",    night="5%"),
            ),
            ach("315106", note="catch (Morning/Day)"),
            ach("315107", note="evolve at Lv. 7"),
            ach("315108", note="evolve at Lv. 10"),
            ach("315109", note="catch (Morning/Day)"),
            ach("315110", note="evolve at Lv. 7"),
            ach("315111", note="evolve at Lv. 10"),
            ach("315112", note="catch (Night)"),
            ach("315113", note="evolve at Lv. 22"),
            ach("315114", note="catch (Morning)"),
            ach("315115", note="evolve at Lv. 18"),
            ach("315116", note="catch (Night)"),
            ach("315117", note="evolve at Lv. 22"),
            ach("315118", note="evolve via high happiness"),
            ach("315119", note="catch (Night)"),
            ach("315120", note="evolve at Lv. 25"),
            step(["Keep Zubat in your party at all times: Golbat evolves into Crobat via "
                  "high happiness, and leveling on the route you caught it gives more "
                  "friendship per level in Crystal.",
                  "Butterfree gives ridiculous EXP when flushed out of Headbutt trees "
                  "later.",
                  "Poliwhirl needs a Water Stone for Poliwrath, which you cannot obtain "
                  "yet — that comes later."],
                 where="Tip"),
        ]},
        {"heading": "1.5 · Route 31", "items": [
            step(["Head further north onto Route 31.",
                  "Bellsprout appears Morning and Night, Gastly at night (or get one at "
                  "night in Sprout Tower). Catch a SECOND Bellsprout for an upcoming "
                  "trade."],
                 where="Route 31"),
            encounters(
                enc("Bellsprout", morning="20%", night="20%"),
                enc("Gastly",     night="5%"),
            ),
            items(
                item("item-rt31-pokeball", "Poké Ball", where="Near Bug Catcher Wade"),
                item("item-rt31-bitterberry", "Bitter Berry",
                     where="Berry tree near the sleeping man (daily respawn)"),
            ),
            trainers(
                trainer("trainer-rt31-bug-catcher-wade", "Bug Catcher Wade",
                        team="Caterpie Lv. 2 ×2, Weedle Lv. 3", reward="P32",
                        note="has Pokégear phone for rematches"),
            ),
            ach("315121", note="catch (any time) — get a second for the Onix trade"),
            ach("315122", note="evolve at Lv. 21"),
            ach("315123", note="catch (Night) — Route 31 or Sprout Tower"),
            ach("315124", note="evolve at Lv. 25"),
            step(["Weepinbell needs a Leaf Stone for Victreebel, handled later.",
                  "Haunter's evolution into Gengar is a trade evolution, so Gengar is NOT "
                  "obtainable in a POC. A Haunter with Mean Look/Night Shade helps catch "
                  "roaming legendaries later."],
                 where="Note"),
        ]},
        {"heading": "1.6 · Dark Cave", "items": [
            step(["Instead of heading west to Violet City, enter Dark Cave (Route 31 "
                  "entrance).",
                  "You won't get far, but you can stumble far enough to catch a Teddiursa "
                  "in the morning and a super-rare 1% Dunsparce."],
                 where="Dark Cave"),
            encounters(
                enc("Teddiursa", morning="5%"),
                enc("Dunsparce", morning="1%",  day="1%",  night="1%"),
            ),
            ach("315125", note="catch (1% — be patient)"),
            ach("315126", note="catch (Morning)"),
            ach("315127", note="evolve at Lv. 30"),
            step(["A Dunsparce with Rage is highly recommended for the Falkner Set "
                  "challenge: it is Normal type and takes little damage.",
                  "Teddiursa is another fleeing Pokémon — bring something to trap it if "
                  "needed."],
                 where="Tip"),
        ]},
        {"heading": "1.7 · Violet City", "items": [
            step(["It is not time for the gym yet.",
                  "In one of the town houses, someone wants to trade an Onix for your "
                  "Bellsprout — definitely do this, as Onix can't be caught until much "
                  "later.",
                  "Sprout Tower has a Gastly at night and the Flash HM at the top."],
                 where="Violet City"),
            ach("315128", note="in-game trade — spare Bellsprout → Onix"),
        ]},
        {"heading": "1.8 · Route 36 (western grass)", "items": [
            step(["Head west out of Violet City.",
                  "Exclusive to Crystal, the grass here holds a Growlithe during "
                  "Morning/Day."],
                 where="Route 36"),
            encounters(
                enc("Growlithe",  morning="10%", day="10%"),
            ),
            trainers(
                trainer("trainer-rt36-psychic-mark", "Psychic Mark", reward="P544",
                        note="team not sourced"),
                trainer("trainer-rt36-schoolboy-alan", "Schoolboy Alan", reward="P512",
                        note="Pokégear contact — later gives Fire Stones; team not sourced"),
            ),
            ach("315129", note="catch (Morning/Day)"),
            step("Growlithe needs a Fire Stone for Arcanine, obtained later from a "
                 "Pokégear contact (Schoolboy Alan).", where="Note"),
        ]},
        {"heading": "1.9 · Ruins of Alph", "items": [
            step(["Go through the gate house south of the Route 36 grass to reach the "
                  "Ruins of Alph.",
                  "Solve the first tile puzzle to encounter Unown."],
                 where="Ruins of Alph"),
            ach("315130", note="catch (it may flee)"),
            step(["Catch one Unown now; you can collect all 26 forms later once every "
                  "puzzle chamber is unlocked.",
                  "That's the end of catching for the first section. Grind your team up — "
                  "Sprout Tower at night is great against Gastly, and Dark Cave / Route 31 "
                  "/ Ruins of Alph are good for the rest. The killers are the fully "
                  "evolved starter, Pidgeot and Ursaring."],
                 where="Leveling tip"),
        ]},
        {"heading": "1.10 · The Zephyr Badge — Falkner", "items": [
            step("Back in New Bark Town, after the Mr. Pokémon errand, an officer at "
                 "Professor Elm's lab asks for your rival's name (he raided the lab and "
                 "stole a starter). Give it to register the achievement.",
                 where="New Bark Town", npc="Officer"),
            ach("5636", "Give your rival's name to the officer at Elm's lab.",
                ["Story-related — happens automatically when you return from Mr. Pokémon."]),
            step("With all 46 Pokémon caught and your starter and Pidgey fully evolved, "
                 "enter the Violet City Gym and challenge Falkner, who uses Flying types "
                 "(Pidgey, Pidgeotto).", where="Violet City Gym", npc="Falkner"),
            ach("315131", note="all 46 caught before Falkner"),
            ach("5637", "Defeat Falkner for the Zephyr Badge."),
            ach("199603",
                "Optional challenge: beat Falkner in Set style, Johto-only, all "
                "Pokémon ≤ Lv. 9, no Pack items.",
                ["If you chose Cyndaquil or Totodile this is easy. Otherwise a Dunsparce "
                 "from Dark Cave with Rage (more damage each time it is hit) shreds the "
                 "gym; it is Normal type so takes little damage.",
                 "Set the battle style to Set and remove items from your bag's usable "
                 "pool for the fight."],
                type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 2 — Pre-Badge 2: Bugsy
# ===========================================================================
ch2 = {
    "id": "ch2-bugsy", "title": "Chapter 2 — Pre-Badge #2: Bugsy", "kind": "route",
    "intro": ("With Falkner down, an aide hands you the Egg at the Violet City Pokémon "
              "Center — it hatches into Togepi. Work south through Route 32, the Old Rod "
              "fishing tour, Union Cave, Slowpoke Well and Ilex Forest, then start "
              "Headbutting trees. Target: 77 caught before Bugsy."),
    "sections": [
        {"heading": "2.1 · The Egg → Togepi", "items": [
            step(["After beating Falkner, Professor Elm calls: an aide is at the Pokémon "
                  "Center with a present — the Egg.",
                  "Keep it in your party so its happiness rises while you grind; it "
                  "hatches into Togepi."],
                 where="Violet City", npc="Elm's Aide"),
            ach("315132", note="hatch the Egg (walk with it in your party)"),
            ach("315133", note="evolve via high happiness"),
            step("Show the hatched Togepi to Professor Elm to receive an Everstone.",
                 where="New Bark Town", npc="Prof. Elm"),
            ach("199582", "Show Elm your hatched Togepi for the Everstone."),
        ]},
        {"heading": "2.2 · Route 32", "items": [
            step(["Head south from Violet City (skip Ruins of Alph for now).",
                  "Ekans appears Morning/Day, Wooper only at Night.",
                  "The Pokémon Center on this route has a man who gives you the Old Rod."],
                 where="Route 32"),
            encounters(
                enc("Ekans",      morning="30%", day="30%"),
                enc("Wooper",     night="30%"),
            ),
            items(
                item("item-rt32-old-rod", "Old Rod",
                     where="Fishing Guru in the Route 32 Pokémon Center"),
                item("item-rt32-great-ball", "Great Ball",
                     where="Grass patch southwest of the pier"),
                item("item-rt32-tm05-roar", "TM05 Roar",
                     where="From a man on the ledge (needs Cut, return later)"),
            ),
            trainers(
                trainer("trainer-rt32-fisher-ralph", "Fisher Ralph",
                        team="Goldeen Lv. 10", reward="P400",
                        note="Pokégear contact — calls about Qwilfish swarms"),
                trainer("trainer-rt32-youngster-albert", "Youngster Albert",
                        team="Rattata Lv. 6, Zubat Lv. 8", reward="P128"),
                trainer("trainer-rt32-picnicker-liz", "Picnicker Liz",
                        team="Nidoran♀ Lv. 9", reward="P180"),
                trainer("trainer-rt32-youngster-gordon", "Youngster Gordon",
                        team="Wooper Lv. 10", reward="P160"),
            ),
            ach("315134", note="catch (Night)"),
            ach("315135", note="evolve at Lv. 20"),
            ach("315136", note="catch (Morning/Day)"),
            ach("315137", note="evolve at Lv. 22"),
        ]},
        {"heading": "2.3 · Old Rod fishing tour", "items": [
            step(["With the Old Rod, backtrack to fish up new Pokémon.",
                  "Get Fisherman Ralph's number on Route 32 — if he calls about a Qwilfish "
                  "outbreak, come back and catch one.",
                  "Catch a SECOND Krabby for a later trade."],
                 where="Old Rod", npc="Fisherman Ralph"),
            encounters(
                enc("Tentacool", morning="15%", day="15%", night="15%",
                    method="Old Rod (New Bark Town)"),
                enc("Krabby",    morning="15%", day="15%", night="15%",
                    method="Old Rod (Cherrygrove City)"),
                enc("Goldeen",   morning="15%", day="15%", night="15%",
                    method="Old Rod (Dark Cave / Union Cave)"),
                enc("Qwilfish",  morning="10%", day="10%", night="10%",
                    method="Super Rod (Route 32, during a swarm)"),
                enc("Magikarp",  morning="85%", day="85%", night="85%",
                    method="Old Rod (anywhere)"),
            ),
            ach("315138", note="fish up (anywhere)"),
            ach("315139", note="evolve at Lv. 20"),
            ach("315140", note="fish up (New Bark Town)"),
            ach("315141", note="evolve at Lv. 30"),
            ach("315142", note="fish up (Cherrygrove) — get a second for the trade"),
            ach("315143", note="evolve at Lv. 28"),
            ach("315144", note="fish up (Dark Cave)"),
            ach("315145", note="evolve at Lv. 33"),
            ach("315146", note="fish up (Route 32 swarm)"),
            step(["Magikarp can't battle until it learns Tackle — train it once it can.",
                  "Qwilfish needs the Super Rod and a Ralph swarm call. Toggle daylight "
                  "savings with Mom to force the call."],
                 where="Tip"),
        ]},
        {"heading": "2.4 · Union Cave & Slowpoke Well", "items": [
            step(["Enter Union Cave at the south end of Route 32.",
                  "Sandshrew appears Morning/Day.",
                  "The cave is bigger than it looks but you can't fully explore it yet; "
                  "the far side leads to Azalea Town."],
                 where="Union Cave"),
            encounters(
                enc("Sandshrew", morning="30%", day="30%"),
            ),
            items(
                item("item-union-cave-potion", "Potion", where="1F, northwest corner"),
                item("item-union-cave-great-ball", "Great Ball",
                     where="1F, southeast near a trainer"),
                item("item-union-cave-awakening", "Awakening",
                     where="1F, near the Route 33 exit"),
                item("item-union-cave-tm39", "TM39 Swift", where="B1F, west of the ladder"),
            ),
            trainers(
                trainer("trainer-union-cave-hiker-daniel", "Hiker Daniel",
                        team="Onix Lv. 11", reward="P352"),
            ),
            ach("315147", note="catch (Morning/Day)"),
            ach("315148", note="evolve at Lv. 22"),
            step(["Go to Kurt's house in Azalea; he leaves for the Slowpoke Well.",
                  "Follow and defeat the Rocket grunt leading the raid, then catch a "
                  "Slowpoke.",
                  "Afterward Kurt makes special balls from Apricorns."],
                 where="Slowpoke Well", npc="Kurt"),
            encounters(
                enc("Slowpoke", morning="15%", day="15%", night="15%"),
                enc("Slowpoke", morning="100%", day="100%", night="100%", method="Surf"),
            ),
            trainers(
                trainer("trainer-slowpoke-well-rocket-grunt-m", "Team Rocket Grunt",
                        team="Rattata Lv. 9 ×2", reward="P360"),
                trainer("trainer-slowpoke-well-rocket-grunt-f", "Team Rocket Grunt",
                        team="Zubat Lv. 9, Ekans Lv. 11", reward="P440"),
            ),
            ach("5934", "Defeat the Rocket Grunt leading the Slowpoke Well raid."),
            ach("315149", note="catch"),
            ach("315150", note="evolve at Lv. 37"),
            ach("199601", "Receive at least 10 special Poké Balls at once from Kurt.",
                ["Hand Kurt a batch of Apricorns so he returns 10+ balls in one go."]),
            step("Slowpoke's other evolution, Slowking, is a trade evolution — not "
                 "obtainable in a POC.", where="Note"),
        ]},
        {"heading": "2.5 · Ilex Forest", "items": [
            step(["Leave Azalea west (defeat your rival first) into Ilex Forest.",
                  "Grab the Cut HM here.",
                  "Paras appears any time (5%); Psyduck, Oddish and Venonat at Night."],
                 where="Ilex Forest"),
            encounters(
                enc("Paras",    morning="5%",  day="5%",  night="5%"),
                enc("Oddish",   night="50%"),
                enc("Venonat",  night="30%"),
                enc("Psyduck",  night="10%"),
            ),
            items(
                item("item-ilex-hm01-cut", "HM01 Cut",
                     where="From the Farfetch'd-herding boy event"),
                item("item-ilex-tm02-headbutt", "TM02 Headbutt", where="Ilex Forest"),
                item("item-ilex-revive", "Revive", where="Ilex Forest"),
                item("item-ilex-ether", "Ether", where="Ilex Forest"),
            ),
            trainers(
                trainer("trainer-ilex-bug-catcher-wayne", "Bug Catcher Wayne",
                        team="Ledyba Lv. 8, Paras Lv. 10", reward="P160"),
            ),
            ach("315151", note="catch (Night)"),
            ach("315152", note="evolve at Lv. 21"),
            ach("315153", note="catch (any time, 5%)"),
            ach("315154", note="evolve at Lv. 24"),
            ach("315155", note="catch (Night)"),
            ach("315156", note="evolve at Lv. 33"),
            ach("315157", note="catch (Night)"),
            ach("315158", note="evolve at Lv. 31"),
            step("Gloom needs a Leaf Stone or Sun Stone later for Vileplume/Bellossom.",
                 where="Note"),
        ]},
        {"heading": "2.6 · Headbutt trees", "items": [
            step(["Even blocked off without Cut, you can Headbutt trees once Slowpoke "
                  "learns Headbutt.",
                  "Try a tree and see what falls out: Pineco in Ilex Forest, Aipom and "
                  "Heracross in Azalea Town, Exeggcute back on Route 32.",
                  "Headbutt odds depend on the tree, not the time of day — rarer mon like "
                  "Heracross only appear from the 'low chance' trees, so keep trying "
                  "different trees."],
                 where="Headbutt trees"),
            ach("199596", "Headbutt a tree and run into a sleeping Pokémon."),
            ach("315161", note="Headbutt (Route 32)"),
            ach("315159", note="Headbutt (Ilex Forest)"),
            ach("315160", note="evolve at Lv. 31"),
            ach("315163", note="Headbutt (Azalea Town)"),
            ach("315162", note="Headbutt (Azalea Town)"),
            step(["Exeggcute needs a Leaf Stone later for Exeggutor.",
                  "Heracross gives huge EXP and is a great team member; not required for "
                  "the Hive milestone but part of the dex."],
                 where="Tip"),
        ]},
        {"heading": "2.7 · The Hive Badge — Bugsy", "items": [
            step("With 77 Pokémon registered, enter the Azalea Town Gym and challenge "
                 "Bugsy, who uses Bug types.", where="Azalea Gym", npc="Bugsy"),
            trainers(
                trainer("trainer-azalea-gym-bugsy", "Leader Bugsy",
                        team="Metapod Lv. 14, Kakuna Lv. 14, Scyther Lv. 16",
                        reward="P1600"),
            ),
            ach("315164", note="77 caught before Bugsy (Heracross not required)"),
            ach("5638", "Defeat Bugsy in Azalea Town for the Hive Badge."),
            ach("199604", "Optional challenge: beat Bugsy in Set style, Johto-only, ≤ Lv. "
                "16, no Pack items.",
                ["A Dunsparce with Rage still shreds this gym; Cyndaquil starters win "
                 "outright. Hoothoot/Wooper also help."], type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 3 — Pre-Badge 3: Whitney
# ===========================================================================
ch3 = {
    "id": "ch3-whitney", "title": "Chapter 3 — Pre-Badge #3: Whitney", "kind": "route",
    "intro": ("Make sure you secure the Moon Stone from Mom this section (deposit up to "
              "P18,270). With Cut you push through Ilex Forest to Goldenrod City. Route "
              "34, the Odd Egg, the Game Corner, the Bug-Catching Contest and a stash of "
              "evolution stones await. Target: 109 caught before Whitney."),
    "sections": [
        {"heading": "3.1 · Route 34", "items": [
            step(["Several new Pokémon plus the Day-Care.",
                  "Snubbull appears Morning/Day, Drowzee at Night; everything else any "
                  "time.",
                  "Catch a SECOND Abra for an upcoming trade and get Picnicker Gina's "
                  "number (she gives Leaf Stones)."],
                 where="Route 34", npc="Picnicker Gina"),
            encounters(
                enc("Snubbull",   morning="30%", day="30%"),
                enc("Abra",       morning="10%", day="10%", night="10%"),
                enc("Jigglypuff", morning="5%",  day="5%",  night="5%"),
                enc("Ditto",      morning="5%",  day="5%",  night="5%"),
                enc("Drowzee",    night="30%"),
            ),
            items(
                item("item-rt34-tm12-sweet-scent", "TM12 Sweet Scent",
                     where="From the woman at the gate to Ilex Forest"),
                item("item-rt34-nugget", "Nugget",
                     where="Fenced area west of Picnicker Gina (needs Surf, Crystal only)"),
                item("item-rt34-rare-candy", "Rare Candy",
                     where="Hidden in the fenced area (needs Surf)"),
            ),
            trainers(
                trainer("trainer-rt34-picnicker-gina", "Picnicker Gina",
                        team="Hoppip Lv. 9 ×2, Bulbasaur Lv. 12", reward="P240",
                        note="Pokégear contact — calls about Leaf Stones"),
                trainer("trainer-rt34-youngster-samuel", "Youngster Samuel",
                        team="Rattata Lv. 7, Spearow Lv. 8 ×2, Sandshrew Lv. 10",
                        reward="P128"),
                trainer("trainer-rt34-pokefan-brandon", "Pokéfan Brandon",
                        team="Snubbull Lv. 13", reward="P1040"),
                trainer("trainer-rt34-youngster-ian", "Youngster Ian",
                        team="Mankey Lv. 10, Diglett Lv. 12", reward="P192"),
                trainer("trainer-rt34-camper-todd", "Camper Todd",
                        team="Psyduck Lv. 14", reward="P280"),
            ),
            ach("315195", note="catch (Night)"),
            ach("315196", note="evolve at Lv. 26"),
            ach("315165", note="catch (any time) — get a second for the Machop trade"),
            ach("315166", note="evolve at Lv. 16"),
            ach("315167", note="catch (any time)"),
            ach("315168", note="catch (Morning/Day)"),
            ach("315169", note="evolve at Lv. 23"),
            ach("315170", note="catch (any time)"),
            step("Kadabra's evolution into Alakazam is a trade evolution — not obtainable "
                 "in a POC.", where="Note"),
        ]},
        {"heading": "3.2 · The Odd Egg", "items": [
            step(["Talk to the old man outside the Day-Care for the Odd Egg.",
                  "SAVE BEFORE TALKING TO HIM — the species is fixed when received. It can "
                  "be Pichu, Cleffa, Igglybuff, Tyrogue, Smoochum, Elekid or Magby.",
                  "Soft-reset until you get Tyrogue (it nets four Pokémon now via the "
                  "Hitmon line)."],
                 where="Route 34 Day-Care", npc="Old Man"),
            ach("199561", "Receive the Odd Egg from the Day-Care Man on Route 34."),
            ach("315172", note="hatch into Tyrogue (save before receiving the egg)"),
            ach("315174", note="evolve at Lv. 20, Defense > Attack"),
            ach("315173", note="evolve at Lv. 20, Attack > Defense"),
            ach("315175", note="evolve at Lv. 20, Attack = Defense"),
            step(["With the exception of Igglybuff, the other Odd Egg species aren't "
                  "available yet — Tyrogue gives the most dex progress, and there's a high "
                  "shiny chance.",
                  "Tyrogue's evolution depends on its stats at Lv. 20: Defense > Attack → "
                  "Hitmonchan, Attack > Defense → Hitmonlee, Attack = Defense → "
                  "Hitmontop."],
                 where="Tip"),
            step("Breed your Jigglypuff with Ditto at the Day-Care to produce Igglybuff.",
                 where="Day-Care"),
            ach("315171", note="breed Jigglypuff × Ditto, then hatch"),
        ]},
        {"heading": "3.3 · Goldenrod City — bike, Underground & Game Corner", "items": [
            step(["The biggest city in Johto. Grab the bike.",
                  "The Underground has a Coin Case for the Game Corner, and you can trade "
                  "your spare Abra for a Machop.",
                  "Crystal's Game Corner offers Cubone and Wobbuffet."],
                 where="Goldenrod City"),
            ach("315176", note="trade your spare Abra in the Underground"),
            ach("315177", note="evolve at Lv. 28"),
            ach("315178", note="buy with Game Corner coins"),
            ach("315179", note="evolve at Lv. 28"),
            ach("315180", note="buy with Game Corner coins"),
            step("Machoke's evolution into Machamp is a trade evolution — not obtainable "
                 "in a POC.", where="Note"),
            ach("199638", "Promote the Miracle Cycle bike shop so you keep the bike."),
            ach("199631", "Make a purchase at the Goldenrod Dept. Store Rooftop Sale."),
            ach("199620", "Learn a move from Bill's father outside the Game Corner."),
            ach("199597", "Earn 30 Blue Card points to add Buena's number to your PokéGear.",
                ["Listen to Buena's Password on the radio, then answer at the Goldenrod "
                 "radio desk for points each day."]),
            ach("199634", "Line up two 7s on a Game Corner slot machine to see Golem."),
            ach("199635", "Hit a 7-7-7 on a Game Corner slot machine."),
            ach("199627", "Win a x24 bet in the Game Corner Card Flip minigame."),
        ]},
        {"heading": "3.4 · Route 35 & National Park", "items": [
            step(["North of Goldenrod, Route 35 holds an ultra-rare 1% Yanma; Growlithe "
                  "appears Morning/Day (you need it for the later Fire Stone evolution).",
                  "Through the north gate is National Park: Nidoran♂/♀ Morning/Day, Sunkern "
                  "in the daytime.",
                  "On Tue/Thu/Sat the Bug-Catching Contest runs in National Park."],
                 where="Route 35 / National Park"),
            step("National Park's tall-grass slots are unusual in that nearly every mon is "
                 "split by time of day — re-check the table for Morning vs Day vs Night. "
                 "Sunkern only appears in the Day slot.",
                 where="Note"),
            encounters(
                enc("Yanma",     morning="1%",  day="1%",  night="1%"),
            ),
            encounters(
                enc("Nidoran♀",  morning="30%", day="30%", method="National Park"),
                enc("Nidoran♂",  morning="30%", day="30%", method="National Park"),
                enc("Sunkern",                  day="20%", method="National Park"),
            ),
            items(
                item("item-rt35-tm04-rollout", "TM04 Rollout",
                     where="Route 35, southern grass patch"),
                item("item-natpark-paralyze-heal", "Paralyze Heal",
                     where="National Park, behind the fence near the east gate"),
                item("item-natpark-tm28-dig", "TM28 Dig",
                     where="National Park, behind the fence in the southwest"),
                item("item-natpark-full-heal", "Full Heal",
                     where="National Park, hidden between two flowers near the south gate"),
            ),
            trainers(
                trainer("trainer-rt35-bug-catcher-arnie", "Bug Catcher Arnie",
                        team="Venonat Lv. 15", reward="P240"),
                trainer("trainer-rt35-bird-keeper-bryan", "Bird Keeper Bryan",
                        team="Pidgey Lv. 12, Pidgeotto Lv. 14", reward="P336"),
                trainer("trainer-rt35-firebreather-walt", "Firebreather Walt",
                        team="Magmar Lv. 11, Magmar Lv. 13", reward="P624"),
                trainer("trainer-rt35-juggler-irwin", "Juggler Irwin",
                        team="Voltorb Lv. 2/6/10/14", reward="P560",
                        note="rematchable"),
            ),
            ach("315181", note="catch (Morning/Day, 1% — be patient)"),
            ach("315182", note="catch (Morning/Day)"),
            ach("315183", note="evolve at Lv. 16"),
            ach("315184", note="catch (Morning/Day)"),
            ach("315185", note="evolve at Lv. 16"),
            ach("315186", note="catch (Day, National Park)"),
            ach("315188", note="catch in the Bug-Catching Contest"),
            ach("315189", note="catch in the Bug-Catching Contest"),
            ach("199622", "Win the Bug-Catching Contest.",
                ["Save before entering so you can retry. Put a Pokémon to sleep and catch "
                 "it at full HP for the best score; a Scyther or Pinsir is ideal."]),
            ach("199623", "Win the contest WITHOUT catching Butterfree, Beedrill, Scyther "
                "or Pinsir."),
            ach("199624", "Win the contest with Cooltrainer Nick as a participant."),
        ]},
        {"heading": "3.5 · A stash of stones", "items": [
            step(["Now evolve your stone Pokémon.",
                  "Mom's Moon Stone evolves one of Jigglypuff / Nidorina / Nidorino; two "
                  "Sun Stones come from winning the Bug Contest.",
                  "Leaf and Fire Stones arrive via Gina and Schoolboy Alan's PokéGear "
                  "calls (force them with the daylight-savings trick)."],
                 where="Evolution stones"),
            step(["You get three Moon Stones across Parts 3 and 5 — spread them across "
                  "Wigglytuff, Nidoking and Nidoqueen.",
                  "Catch/raise a second Gloom so you can get BOTH Bellossom (Sun Stone) "
                  "and Vileplume (Leaf Stone)."],
                 where="Tip"),
            ach("199567", "Receive an evolution stone from a registered PokéGear Trainer.",
                ["Gina gives Leaf Stones, Alan gives Fire Stones, plus later contacts for "
                 "Water/Thunder Stones."]),
            ach("315226", note="Moon Stone → Wigglytuff"),
            ach("315227", note="Moon Stone → Nidoking"),
            ach("315290", note="Moon Stone → Nidoqueen"),
            ach("315187", note="Sun Stone (Bug Contest prize) → Sunflora"),
            ach("315190", note="Sun Stone → Bellossom"),
            ach("315191", note="Leaf Stone → Vileplume"),
            ach("315192", note="Leaf Stone → Exeggutor"),
            ach("315193", note="Leaf Stone → Victreebel"),
            ach("315194", note="Fire Stone (from Alan) → Arcanine"),
        ]},
        {"heading": "3.6 · The Plain Badge — Whitney", "items": [
            step("With 109 Pokémon registered, challenge Whitney in the Goldenrod City "
                 "Gym for the Plain Badge.", where="Goldenrod Gym", npc="Whitney"),
            trainers(
                trainer("trainer-goldenrod-gym-whitney", "Leader Whitney",
                        team="Clefairy Lv. 18, Miltank Lv. 20", reward="P2000"),
            ),
            ach("315197", note="109 caught before Whitney"),
            ach("5639", "Defeat Whitney in Goldenrod City for the Plain Badge.",
                ["Her Miltank is infamous — Dunsparce with Rage or a Heracross handle it."]),
            ach("199605", "Optional challenge: beat Whitney in Set style, Johto-only, ≤ "
                "Lv. 20, no Pack items.",
                ["Lead with Dunsparce and spam Rage; even Miltank falls."],
                type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 4 — Pre-Badge 4: Morty
# ===========================================================================
ch4 = {
    "id": "ch4-morty", "title": "Chapter 4 — Pre-Badge #4: Morty", "kind": "route",
    "intro": ("Catch Sudowoodo, sweep Routes 37–43 and Olivine, pick up the Good Rod, "
              "then — yes, this early — chase down and catch the roaming beasts Raikou "
              "and Entei. Target: 142 caught before Morty."),
    "sections": [
        {"heading": "4.1 · Sudowoodo (Route 36)", "items": [
            step(["After Whitney, return to Route 36 and talk to the lady by the 'tree'. "
                  "She sends you to the Goldenrod flower shop for the SquirtBottle.",
                  "Bring it back and SAVE before using it on the tree — this is your only "
                  "Sudowoodo (a one-off static battle, not a wild slot). The man on its "
                  "right then gives you the Rock Smash TM."],
                 where="Route 36", npc="Flower-shop lady"),
            items(
                item("item-rt36-tm08-rock-smash", "TM08 Rock Smash",
                     where="From the man right of the Sudowoodo tree (after the battle)"),
            ),
            ach("199564", "Catch the Sudowoodo on Route 36 and register it."),
            ach("315198", note="static battle — save before using the SquirtBottle"),
        ]},
        {"heading": "4.2 · Route 37 & Ecruteak — Eevee", "items": [
            step("Route 37 has a single new catch worth stopping for, Stantler, at Night "
                 "only. Vulpix is also available here in the daytime.", where="Route 37"),
            encounters(
                enc("Stantler",  night="40%"),
            ),
            items(
                item("item-rt37-apricorns", "Red / Blu / Blk Apricorns",
                     where="From the three Apricorn trees on the route"),
            ),
            trainers(
                trainer("trainer-rt37-twins-ann-anne", "Twins Ann & Anne",
                        team="Clefairy Lv. 16, Jigglypuff Lv. 16"),
                trainer("trainer-rt37-psychic-greg", "Psychic Greg",
                        team="Drowzee Lv. 17"),
            ),
            ach("315199", note="catch (Night)"),
            step("Reach Ecruteak and enter the Pokémon Center; Bill heads back to "
                 "Goldenrod. Follow him and he gives you an Eevee. Breed it five times — "
                 "use the babies for Espeon/Umbreon (higher base happiness).",
                 where="Goldenrod City", npc="Bill"),
            ach("315200", note="gift from Bill in Goldenrod"),
            ach("315203", note="Fire Stone → Flareon"),
            ach("315202", note="Thunder Stone → Jolteon (stones from Lass Dana, Route 38)"),
            ach("315201", note="Water Stone → Vaporeon (stones from Tully, Route 42)"),
            ach("315204", note="raise happiness during the DAY → Espeon"),
            ach("315205", note="raise happiness during the NIGHT → Umbreon"),
        ]},
        {"heading": "4.3 · Burned Tower", "items": [
            step("Take on the Kimono Girls for the Surf HM, then visit the Burned Tower. "
                 "Koffing lurks on both floors. In the basement you disturb the three "
                 "legendary beasts — Raikou and Entei begin roaming; Suicune appears in "
                 "set locations later.", where="Burned Tower", npc="Eusine"),
            encounters(
                enc("Koffing",  morning="30%", day="30%", night="30%", method="1F"),
                enc("Koffing",  morning="59%", day="59%", night="59%", method="B1F"),
            ),
            items(
                item("item-burned-tower-hp-up", "HP Up",
                     where="1F, behind a breakable rock (needs Rock Smash)"),
                item("item-burned-tower-tm20", "TM20 Endure", where="B1F"),
                item("item-burned-tower-ultra-ball", "Ultra Ball", where="1F (hidden)"),
            ),
            ach("199566", "Complete the Eusine sidequest in the Burned Tower."),
            ach("315206", note="catch (Burned Tower, any time)"),
            ach("315207", note="level to Lv. 35 → Weezing (or catch the rare 1% Weezing)"),
        ]},
        {"heading": "4.4 · Route 38 & Moomoo Farm", "items": [
            step("West to Route 38. Magnemite any time, Tauros & Miltank Morning/Day, "
                 "Meowth at Night. Beat Lass Dana and get her number for Thunder Stones.",
                 where="Route 38", npc="Lass Dana"),
            encounters(
                enc("Magnemite", morning="20%", day="20%", night="20%"),
                enc("Miltank",   morning="5%",  day="5%"),
                enc("Tauros",    morning="5%",  day="5%"),
                enc("Meowth",    night="40%"),
            ),
            trainers(
                trainer("trainer-rt38-lass-dana", "Lass Dana",
                        team="Flaaffy Lv. 18, Psyduck Lv. 18",
                        note="Pokégear contact — calls about Thunder Stones"),
                trainer("trainer-rt38-sailor-harry", "Sailor Harry",
                        team="Wooper Lv. 19"),
                trainer("trainer-rt38-beauty-valerie", "Beauty Valerie",
                        team="Hoppip Lv. 17, Skiploom Lv. 17"),
                trainer("trainer-rt38-bird-keeper-toby", "Bird Keeper Toby",
                        team="Doduo Lv. 15/16/17"),
                trainer("trainer-rt38-school-kid-chad", "School Kid Chad",
                        team="Mr. Mime Lv. 19"),
                trainer("trainer-rt38-beauty-olivia", "Beauty Olivia",
                        team="Corsola Lv. 19"),
            ),
            ach("315208", note="catch (any time)"),
            ach("315209", note="level to Lv. 30 → Magneton (no Magnezone in Gen 2)"),
            ach("315210", note="catch (Morning/Day)"),
            ach("315211", note="catch (Morning/Day)"),
            ach("315212", note="catch (Night)"),
            ach("315213", note="level to Lv. 28 → Persian"),
            step("On Route 39 between Ecruteak and Olivine, stop at Moomoo Farm and help "
                 "nurse the sick Miltank, Moomoo, back to health (it then sells Moomoo "
                 "Milk and gives you TM13 Snore).",
                 where="Route 39 · Moomoo Farm"),
            ach("199580", "Nurse Moomoo back to health at Moomoo Farm."),
        ]},
        {"heading": "4.5 · Olivine City & the beaches", "items": [
            step("Reach the lighthouse top and talk to Jasmine to start Amphy's errand "
                 "(not done yet). Trade your spare Krabby for a Voltorb, grab the "
                 "Strength HM, then smash rocks on Route 40 for a chance at Shuckle.",
                 where="Olivine City"),
            encounters(
                enc("Shuckle", morning="10%", day="10%", night="10%", method="Route 40 Rock Smash"),
            ),
            items(
                item("item-olivine-hm04-strength", "HM04 Strength",
                     where="From the Sailor in the Olivine Café"),
            ),
            trainers(
                trainer("trainer-olivine-trade-krabby", "In-game trade (Krabby → Voltorb)",
                        note="Voltorb arrives holding a PRZCureBerry"),
            ),
            ach("315214", note="in-game trade in Olivine"),
            ach("315215", note="level to Lv. 30 → Electrode"),
            ach("315216", note="Route 40 Rock Smash, ~10%"),
        ]},
        {"heading": "4.6 · Good Rod fishing & the Water Stone", "items": [
            step(["Pick up the Good Rod from the Fishing Guru in Olivine for more catches, "
                  "then journey to Route 42 / Mt. Mortar. Defeat Fisherman Tully past the "
                  "mountain for the final stone contact — Water Stones now evolve several "
                  "Pokémon.",
                  "Shellder and Chinchou bite on the Good Rod at the Olivine harbor and "
                  "in New Bark Town; Corsola and Staryu bite in Olivine City itself."],
                 where="Good Rod", npc="Fisherman Tully"),
            encounters(
                enc("Corsola",  morning="10%", day="10%",               method="Olivine Good Rod"),
                enc("Staryu",                              night="10%", method="Olivine Good Rod"),
            ),
            items(
                item("item-olivine-good-rod", "Good Rod",
                     where="From the Fishing Guru north of the Pokémon Center"),
            ),
            ach("315217", note="Good Rod at Olivine harbor / New Bark Town"),
            ach("315218", note="Water Stone → Cloyster"),
            ach("315285", note="Good Rod at Olivine harbor / New Bark Town"),
            ach("315219", note="level to Lv. 27 → Lanturn"),
            ach("315286", note="Good Rod in Olivine City (Day)"),
            ach("315220", note="Good Rod in Olivine City (Night)"),
            ach("315221", note="Water Stone → Starmie"),
            ach("315287", note="catch (Mt. Mortar / Route 42 grass, Night)"),
            ach("315222", note="level to Lv. 18 → Azumarill"),
            ach("315223", note="Water Stone → Poliwrath"),
            step("Marill also appears during a Mt. Mortar swarm at higher rates; check the "
                 "Pokégear for an active outbreak.", where="Tip"),
        ]},
        {"heading": "4.7 · Route 43 — Farfetch'd", "items": [
            step("Rest in Mahogany Town, then head north to Route 43 for a Farfetch'd "
                 "(Morning/Day). Keep going to the Lake of Rage (nothing to do there yet).",
                 where="Route 43"),
            encounters(
                enc("Farfetch'd", morning="20%", day="20%"),
            ),
            trainers(
                trainer("trainer-rt43-camper-spencer", "Camper Spencer",
                        team="Sandshrew Lv. 17, Sandslash Lv. 17, Zubat Lv. 19",
                        reward="P380"),
                trainer("trainer-rt43-picnicker-tiffany", "Picnicker Tiffany",
                        team="Clefairy Lv. 20", reward="P400", note="rematchable"),
                trainer("trainer-rt43-fisher-marvin", "Fisher Marvin",
                        team="Magikarp Lv. 10/15, Gyarados Lv. 10/15", reward="P600"),
            ),
            ach("315288", note="catch (Route 43, Morning/Day)"),
            ach("199598", "Obtain a Stick by catching or Thief-ing a wild Farfetch'd."),
        ]},
        {"heading": "4.8 · Rounding up the beasts", "items": [
            step("Time to catch TWO legendaries early. Raikou and Entei roam Johto, "
                 "moving each time you change area. Hunt from Ecruteak / Route 36 / Route "
                 "37 (no gates). Spray a Repel (lead ≤ Lv. 40), chip their HP across "
                 "encounters, trap with Mean Look, status them, and use Ultra/Great Balls "
                 "(the Fast Ball is bugged). Save between attempts.",
                 where="Roaming Johto"),
            ach("5951", "Catch BOTH Entei and Raikou."),
            ach("199574", "Catch Raikou without using a Master Ball."),
            ach("199575", "Catch Entei without using a Master Ball."),
            ach("315224", "Catch Raikou."),
            ach("315289", "Catch Entei."),
            step("As you cross Route 42 during all this, you'll witness Suicune in a set "
                 "location — part of the scripted sequence that lets you catch it later.",
                 where="Route 42"),
            ach("199594", "Encounter Suicune on Route 42."),
        ]},
        {"heading": "4.9 · The Fog Badge — Morty", "items": [
            ach("315225", "POC checkpoint: 142 Pokémon registered before Morty."),
            ach("5640", "Defeat Morty in Ecruteak City for the Fog Badge."),
            ach("199606", "Optional challenge: beat Morty in Set style, Johto-only, ≤ Lv. "
                "25, no Pack items.",
                ["A Totodile line (Bite/Crunch) or a Crobat handles his Ghosts; his team "
                 "often Curses itself to half HP."], type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 5 — Pre-Badge 5: Pryce
# ===========================================================================
ch5 = {
    "id": "ch5-pryce", "title": "Chapter 5 — Pre-Badge #5: Pryce", "kind": "route",
    "intro": ("Surf opens new ground: Tohjo Falls, the depths of Union Cave and the Ruins "
              "of Alph, Route 41 and Cianwood. Catch the red Gyarados, clear the Mahogany "
              "Rocket Hideout, then pick Pryce (he unlocks Whirlpool). Target: 150 caught."),
    "sections": [
        {"heading": "5.1 · Moon Stone runs & Union Cave", "items": [
            step(["Surf east from New Bark to Route 27 and enter Tohjo Falls to reach a "
                  "Moon Stone.",
                  "In Union Cave's basement, Surf across to the grassy outside of the "
                  "Ruins of Alph for Natu and Smeargle (Smeargle is rare — don't KO it). "
                  "On a Friday a Lapras appears on Union Cave B2F (Surf the southernmost "
                  "pond).",
                  "The Aerodactyl puzzle room hides a third Moon Stone (use Flash on the "
                  "wall writing)."],
                 where="Union Cave / Ruins of Alph"),
            encounters(
                enc("Natu",     morning="90%", day="90%", night="90%",
                    method="Ruins of Alph (grass)"),
                enc("Smeargle", morning="10%", day="10%",
                    method="Ruins of Alph (grass)"),
                enc("Lapras",   morning="100%", day="100%", night="100%",
                    method="Union Cave B2F Surf — Fridays only, Lv. 20"),
            ),
            items(
                item("item-tohjo-falls-moon-stone", "Moon Stone",
                     where="Tohjo Falls (reached by Surf from Route 27)"),
                item("item-alph-moon-stone", "Moon Stone",
                     where="Ruins of Alph Aerodactyl puzzle room (Flash the wall writing)"),
            ),
            ach("315291", note="catch (Ruins of Alph grass, any time)"),
            ach("315228", note="level to Lv. 25 → Xatu"),
            ach("315292", note="catch (Ruins of Alph grass, Morning/Day)"),
            ach("315229", note="Union Cave B2F Surf, Fridays only (Lv. 20)"),
            ach("199591", "Catch the Union Cave Lapras and register it."),
        ]},
        {"heading": "5.2 · Route 41 & Cianwood — Eusine, Shuckie", "items": [
            step("Surf south from Olivine over Route 40 onto Route 41 (borders Cianwood) "
                 "and Surf up a Mantine. At Cianwood, grab Amphy's medicine at the "
                 "pharmacy; head north to see Suicune, where Eusine challenges you — "
                 "required to meet Suicune later. Mania here lends you the Shuckle "
                 "'Shuckie'.",
                 where="Route 41 / Cianwood City", npc="Eusine"),
            encounters(
                enc("Mantine",    morning="10%", day="10%", night="10%", method="Surf"),
            ),
            trainers(
                trainer("trainer-cianwood-eusine", "Eusine",
                        team="Drowzee Lv. 23, Haunter Lv. 23, Electrode Lv. 25"),
            ),
            ach("315293", note="Surf encounter on Route 41 (10%)"),
            ach("199568", "Defeat Eusine in Cianwood City."),
            ach("199630", "Raise Shuckie's Friendship high enough that Mania lets you keep it."),
            ach("199633", "Have a Shuckle turn a Berry into Berry Juice after a battle."),
            step("As the Suicune sequence continues you'll also witness it on Route 36.",
                 where="Route 36"),
            ach("199595", "Encounter Suicune on Route 36."),
        ]},
        {"heading": "5.3 · Lake of Rage & the Mahogany Rocket Hideout", "items": [
            step("Surf to the red Gyarados (Lv. 30) at the Lake of Rage. After "
                 "catching/defeating it, Lance teams up with you to raid the Rocket "
                 "Hideout in Mahogany. Inside you get the Whirlpool HM — also grab the "
                 "Thief TM for a Moon Stone later. The Fishing Guru by the lake rewards "
                 "a record Magikarp.",
                 where="Lake of Rage / Mahogany Town", npc="Lance"),
            items(
                item("item-mahogany-hm06-whirlpool", "HM06 Whirlpool",
                     where="Mahogany Rocket Hideout (story event with Lance)"),
                item("item-mahogany-tm46-thief", "TM46 Thief",
                     where="Mahogany Rocket Hideout"),
            ),
            ach("199570", "Catch the red Gyarados in the Lake of Rage."),
            ach("199578",
                "Trade the Red Scale (from the red Gyarados) to Mr. Pokémon for the EXP Share."),
            ach("199581", "Break the Magikarp size record for the Lake of Rage Guru's Elixir."),
            ach("5946", "Thwart Team Rocket at their Mahogany Town hideout."),
            ach("199571", "Defeat EVERY Trainer at the Mahogany Rocket Hideout."),
        ]},
        {"heading": "5.4 · The Glacier Badge — Pryce", "items": [
            step("Three gyms are open now; Pryce is the pick because the Glacier Badge "
                 "lets you use Whirlpool (and unlocks more Pokémon).",
                 where="Mahogany Town", npc="Pryce"),
            trainers(
                trainer("trainer-mahogany-gym-pryce", "Leader Pryce",
                        team="Seel Lv. 27, Dewgong Lv. 29, Piloswine Lv. 31",
                        reward="P3100"),
            ),
            ach("315230", note="150 caught before Pryce"),
            ach("5643", "Defeat Pryce in Mahogany Town for the Glacier Badge."),
            ach("199609", "Optional challenge: beat Pryce in Set style, Johto-only, ≤ Lv. "
                "31, no Pack items.",
                ["Note the level cap is 31 here, LOWER than Jasmine's — don't over-level "
                 "your ice answer. A Cyndaquil line or Quagsire shreds him."],
                type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 6 — Pre-Badges 6 & 7: Jasmine & Chuck
# ===========================================================================
ch6 = {
    "id": "ch6-jasmine-chuck",
    "title": "Chapter 6 — Pre-Badges #6 & #7: Jasmine & Chuck", "kind": "route",
    "intro": ("A very short stretch: Whirlpool opens the Whirl Islands for Seel and "
              "Horsea, then cure Amphy and clear both Chuck and Jasmine back to back. "
              "Target: 154 caught."),
    "sections": [
        {"heading": "6.1 · Whirl Islands", "items": [
            step(["With Whirlpool, enter the Whirl Islands off the Olivine–Cianwood surf "
                  "route. Seel appears in the cave grass Morning/Day (not Night); Horsea "
                  "is found while Surfing on the inner pools.",
                  "Seadra also shows up Surfing in the inner cave and on the Super Rod, so "
                  "you can catch one outright if you'd rather not grind Horsea to Lv. 32."],
                 where="Whirl Islands"),
            step("Krabby is the bulk of the cave grass and rises to a 60% Night rate; Seel "
                 "and Zubat occupy the daytime slots. The Surf Horsea rate climbs from the "
                 "entrance pools (30%) toward the inner cave.",
                 where="Note"),
            encounters(
                enc("Seel",       morning="25%", day="25%",              method="Cave"),
                enc("Horsea",     morning="30%", day="30%", night="30%", method="Surf (entrance)"),
            ),
            ach("315231", note="catch in the cave grass (Morning/Day)"),
            ach("315232", note="level Seel to Lv. 34"),
            ach("315294", note="Surf the pools (Horsea 30%+, rising toward the inner cave)"),
            ach("315233", note="level Horsea to Lv. 32, or catch a Seadra (Super Rod)"),
            step("Seadra's evolution into Kingdra is a trade evolution — not obtainable in "
                 "a POC.", where="Note"),
            step("Zubat's Night cave rate could not be sourced reliably (Bulbapedia shows "
                 "no Night slot; Serebii lists 30%) — Morning/Day 30% is agreed, so the "
                 "Night value is left blank.",
                 where="Note", missing_info="Whirl Islands Zubat cave Night rate: "
                 "Bulbapedia (0%/absent) vs Serebii (30%) disagree — left blank."),
        ]},
        {"heading": "6.2 · Cure Amphy & the two gyms", "items": [
            step(["Deliver the SecretPotion to the top of the Olivine Lighthouse to cure "
                  "Amphy — this opens Jasmine's gym.",
                  "Defeat Chuck for the Storm Badge in Cianwood, then Jasmine for the "
                  "Mineral Badge in Olivine, back to back."],
                 where="Olivine Lighthouse / the two gyms", npc="Jasmine"),
            trainers(
                trainer("trainer-cianwood-gym-chuck", "Leader Chuck",
                        team="Primeape Lv. 27, Poliwrath Lv. 30", reward="P3000",
                        note="carries a Full Heal — Flying/Psychic hits both"),
                trainer("trainer-olivine-gym-jasmine", "Leader Jasmine",
                        team="Magnemite Lv. 30 ×2, Steelix Lv. 35", reward="P3500",
                        note="carries a Hyper Potion — Ground ignores the Magnemite"),
            ),
            ach("199569", "Cure Amphy at the top of the Olivine Lighthouse."),
            ach("5641", "Defeat Chuck in Cianwood City for the Storm Badge."),
            ach("199607", "Optional challenge: beat Chuck in Set style, Johto-only, ≤ Lv. "
                "30, no Pack items.",
                ["A Chinchou/Lanturn, Togetic, Mantine or Crobat carries this Flying-weak "
                 "gym."], type_label="Challenge"),
            ach("315295", note="POC checkpoint: 154 caught (Storm Badge)"),
            ach("5642", "Defeat Jasmine in Olivine City for the Mineral Badge."),
            ach("199608", "Optional challenge: beat Jasmine in Set style, Johto-only, ≤ "
                "Lv. 35, no Pack items.",
                ["Wooper/Quagsire (Ground) ignore her Magnetons; Sudowoodo and Heracross "
                 "bring Fighting moves."], type_label="Challenge"),
            ach("315234", note="POC checkpoint: 154 caught (Mineral Badge)"),
        ]},
    ],
}

# ===========================================================================
# Chapter 7 — Pre-Badge 8: Clair
# ===========================================================================
ch7 = {
    "id": "ch7-clair", "title": "Chapter 7 — Pre-Badge #8: Clair", "kind": "route",
    "intro": ("Stop Team Rocket's Radio Tower takeover in Goldenrod, then use the Clear "
              "Bell to catch Suicune at the Tin Tower. Cross Route 44 and the Ice Path to "
              "Blackthorn, fish two Dratini on Route 45, then beat Clair. Target: 170."),
    "sections": [
        {"heading": "7.1 · Radio Tower takeover", "items": [
            step("After the 7th badge Professor Elm calls you to the Goldenrod Radio "
                 "Tower. Clear it of Team Rocket; you can train against the grunts.",
                 where="Goldenrod Radio Tower"),
            ach("5947", "Defeat every Rocket Executive in the Goldenrod Radio Tower."),
            ach("199572", "Defeat EVERY Trainer in the Radio Tower and the Underground."),
        ]},
        {"heading": "7.2 · Catching Suicune", "items": [
            step("Clearing the Radio Tower earns the Clear Bell. Go to the Tin Tower in "
                 "Ecruteak, beat the sages, and follow the trail. SAVE BEFORE ENTERING — "
                 "if you fail, Suicune is gone forever. Unlike the others it will NOT "
                 "flee. It knows Rain Dance, Bubblebeam, Leer and Gust; bring a resist, "
                 "drop its HP to red and inflict sleep/paralysis, then use Ultra Balls.",
                 where="Tin Tower", npc="Suicune"),
            ach("5948", "Catch Suicune, the Aurora Pokémon."),
            ach("199573", "Catch Suicune and register it without using a Master Ball."),
            ach("315235", note="catch at the Tin Tower (will not flee)"),
        ]},
        {"heading": "7.3 · Route 44", "items": [
            step(["With 7 badges the man blocking eastern Mahogany is gone. Route 44's "
                  "grass sits on an island mid-lake — Surf across to reach it.",
                  "Lickitung appears Morning/Day only; Poliwag/Poliwhirl replace it at "
                  "Night. Tangela, Bellsprout and Weepinbell appear any time."],
                 where="Route 44"),
            encounters(
                enc("Lickitung",  morning="40%", day="40%"),
                enc("Tangela",    morning="30%", day="30%", night="30%"),
            ),
            items(
                item("item-rt44-max-revive", "Max Revive",
                     where="In the grass island in the middle of the lake (needs Surf)"),
                item("item-rt44-elixir", "Elixir",
                     where="Hidden in the grass island in the lake (needs Surf)"),
                item("item-rt44-ultra-ball", "Ultra Ball", where="Northeast of the ponds"),
                item("item-rt44-max-repel", "Max Repel",
                     where="Directly east of the Mahogany Town entrance"),
                item("item-rt44-burnt-berry", "Burnt Berry",
                     where="Northeast of the Mahogany Town entrance (daily)"),
            ),
            trainers(
                trainer("trainer-rt44-psychic-phil", "Psychic Phil",
                        team="Natu Lv. 24, Kadabra Lv. 26", reward="P972"),
                trainer("trainer-rt44-fisher-edgar", "Fisher Edgar",
                        team="Remoraid Lv. 25 ×2", reward="P1000"),
                trainer("trainer-rt44-cooltrainer-cybil", "Cooltrainer Cybil",
                        team="Butterfree Lv. 25, Bellossom Lv. 25", reward="P1200"),
                trainer("trainer-rt44-cooltrainer-allen", "Cooltrainer Allen",
                        team="Charmeleon Lv. 27", reward="P1296"),
                trainer("trainer-rt44-pokemaniac-zach", "Pokémaniac Zach",
                        team="Rhyhorn Lv. 27", reward="P1620"),
                trainer("trainer-rt44-fisher-wilton", "Fisher Wilton",
                        team="Goldeen Lv. 23 ×2, Seaking Lv. 25", reward="P1000"),
                trainer("trainer-rt44-bird-keeper-vance", "Bird Keeper Vance",
                        team="Pidgeotto Lv. 25 ×2", reward="P600",
                        note="Pokégear contact — Carbos on second rematch"),
            ),
            ach("315296", note="catch (Morning/Day)"),
            ach("315236", note="catch (any time)"),
        ]},
        {"heading": "7.4 · Ice Path", "items": [
            step(["The Ice Path holds HM07 Waterfall and a sliding-ice puzzle across "
                  "four floors (1F, B1F, B2F, B3F).",
                  "Swinub and Jynx appear Morning/Day; Delibird and Sneasel only at "
                  "Night. Jynx and Sneasel are absent from 1F and grow more common on "
                  "deeper floors (≈1% on B1F → 5% on B2F → 10% on B3F)."],
                 where="Ice Path"),
            encounters(
                enc("Swinub",   morning="40%", day="40%"),
                enc("Jynx",     morning="1%",  day="1%",  method="B1F; 5% B2F, 10% B3F"),
                enc("Delibird", night="40%"),
                enc("Sneasel",  night="1%",                method="B1F; 5% B2F, 10% B3F"),
            ),
            items(
                item("item-icepath-hm07-waterfall", "HM07 Waterfall",
                     where="1F, past the third ice patch"),
                item("item-icepath-protein", "Protein", where="1F, north of the last ladder"),
                item("item-icepath-pp-up", "PP Up", where="1F, bottom"),
                item("item-icepath-iron", "Iron", where="B1F, bottom"),
                item("item-icepath-max-potion-b1f", "Max Potion",
                     where="B1F, hidden on the middle rock of the ice puzzle"),
                item("item-icepath-max-potion-b2f", "Max Potion",
                     where="B2F, northwest corner of the left portion"),
                item("item-icepath-full-heal", "Full Heal", where="B2F, center of the left portion"),
                item("item-icepath-carbos", "Carbos",
                     where="B2F, hidden in the southeast corner of the left portion"),
                item("item-icepath-ice-heal", "Ice Heal",
                     where="B2F, hidden in a lone boulder on the right side"),
                item("item-icepath-tm44-rest", "TM44 Rest", where="B2F, bottom right"),
                item("item-icepath-nevermeltice", "NeverMeltIce",
                     where="B3F, bottom-left (past a breakable rock)"),
            ),
            ach("315237", note="catch (Morning/Day, deeper floors)"),
            ach("315297", note="catch (Morning/Day)"),
            ach("315238", note="level Swinub to Lv. 33 → Piloswine"),
            ach("315298", note="catch (Night)"),
            ach("315239", note="catch (Night, deeper floors)"),
        ]},
        {"heading": "7.5 · Blackthorn City & Route 45", "items": [
            step(["Blackthorn has a required in-game trade: a female Dragonair for a "
                  "Dodrio (it arrives holding a Smoke Ball; only after badge 8).",
                  "South on Route 45 (bring Fly for the ledges): Gligar any time, "
                  "Skarmory Morning/Day; fish the pond at the south end for Dratini "
                  "(Good/Super Rod) — get two, one female for the trade.",
                  "Then breed Dodrio→Doduo and Jynx→Smoochum at the Day-Care."],
                 where="Blackthorn City / Route 45", npc="Trade NPC (Dodrio)"),
            encounters(
                enc("Gligar",   morning="20%", day="20%", night="20%"),
                enc("Skarmory", morning="5%",  day="5%"),
                enc("Dratini",  morning="10%", day="10%", night="10%", method="Good Rod"),
                enc("Dratini",  morning="30%", day="30%", night="30%", method="Super Rod"),
            ),
            items(
                item("item-rt45-elixir", "Elixir", where="Left path"),
                item("item-rt45-max-potion", "Max Potion", where="Center path"),
                item("item-rt45-revive", "Revive", where="Left path"),
                item("item-rt45-nugget", "Nugget", where="Left path (Crystal only)"),
                item("item-rt45-pp-up", "PP Up",
                     where="Hidden in the middle of the southern pond (needs Surf)"),
                item("item-rt45-mysteryberry", "MysteryBerry",
                     where="Near the southern pond (daily)"),
            ),
            trainers(
                trainer("trainer-rt45-hiker-erik", "Hiker Erik",
                        team="Machop Lv. 24, Graveler Lv. 27, Machop Lv. 27", reward="P864"),
                trainer("trainer-rt45-cooltrainer-ryan", "Cooltrainer Ryan",
                        team="Pidgeot Lv. 25, Electabuzz Lv. 27", reward="P1296"),
                trainer("trainer-rt45-cooltrainer-kelly", "Cooltrainer Kelly",
                        team="Marill Lv. 27, Wartortle Lv. 24 ×2", reward="P1152"),
                trainer("trainer-rt45-hiker-parry", "Hiker Parry",
                        team="Onix Lv. 29", reward="P928"),
                trainer("trainer-rt45-blackbelt-kenji", "Blackbelt Kenji",
                        team="Machoke Lv. 28", reward="P672"),
                trainer("trainer-rt45-hiker-timothy", "Hiker Timothy",
                        team="Diglett Lv. 27, Dugtrio Lv. 27", reward="P864"),
                trainer("trainer-rt45-hiker-michael", "Hiker Michael",
                        team="Geodude Lv. 25, Graveler Lv. 25, Golem Lv. 25", reward="P800"),
                trainer("trainer-rt45-camper-quentin", "Camper Quentin",
                        team="Fearow Lv. 30, Primeape Lv. 30, Tauros Lv. 30", reward="P600"),
            ),
            ach("315299", note="catch (any time)"),
            ach("315240", note="catch (Morning/Day)"),
            ach("315300", note="fish the southern pond (Good/Super Rod); get one female"),
            ach("315241", note="level Dratini to Lv. 30 → Dragonair"),
            ach("315242", note="level Dragonair to Lv. 55 → Dragonite"),
            ach("315243", note="trade a female Dragonair for Dodrio in Blackthorn"),
            ach("315244", note="breed Dodrio × Ditto, then hatch Doduo"),
            ach("315245", note="breed Jynx × Ditto, then hatch Smoochum"),
        ]},
        {"heading": "7.6 · The Rising Badge — Clair", "items": [
            step("With 170 Pokémon registered, challenge Clair in the Blackthorn City "
                 "Gym. She awards TM24 DragonBreath with the Rising Badge (the Dragon's "
                 "Den test follows before the badge is official).",
                 where="Blackthorn Gym", npc="Clair"),
            trainers(
                trainer("trainer-blackthorn-gym-clair", "Leader Clair",
                        team="Dragonair Lv. 37 ×3, Kingdra Lv. 40", reward="P4000",
                        note="gives TM24 DragonBreath + Rising Badge"),
            ),
            ach("315246", note="170 caught before Clair"),
            ach("5644", "Defeat Clair in Blackthorn City for the Rising Badge."),
            ach("199610", "Optional challenge: beat Clair in Set style, Johto-only, ≤ Lv. "
                "40, no Pack items (Beasts allowed).",
                ["Swinub/Piloswine (Ice) is Clair's nightmare; Skarmory resists her "
                 "Dragons. Crobat and Lanturn also shine."], type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 8 — Pre-Elite Four
# ===========================================================================
ch8 = {
    "id": "ch8-elite-four", "title": "Chapter 8 — Pre-Elite Four", "kind": "route",
    "intro": ("Clear the Dragon's Den trial for badge 8 and Waterfall, grab the Master "
              "Ball from Elm, then cross into Route 27 and Victory Road catching the last "
              "Pokémon before challenging the Elite Four. Target: 174 caught."),
    "sections": [
        {"heading": "8.1 · Dragon's Den & the Master Ball", "items": [
            step(["After Clair, complete the trial in the Dragon's Den for your final "
                  "badge and Waterfall.",
                  "Answer every question of the Master's quiz correctly on the FIRST "
                  "attempt to receive a Dratini with ExtremeSpeed.",
                  "Then see Prof. Elm in New Bark Town for the Master Ball."],
                 where="Dragon's Den", npc="Elder"),
            ach("199576", "Answer the Dragon Shrine quiz perfectly for an ExtremeSpeed "
                "Dratini."),
        ]},
        {"heading": "8.2 · Tohjo Falls", "items": [
            step(["Surf east of New Bark and cross Tohjo Falls via Waterfall on the way "
                  "to Route 27.",
                  "The cave's wild list is all Pokémon you already have, but the small "
                  "western ledge holds a Moon Stone (needs Surf)."],
                 where="Tohjo Falls"),
            items(
                item("item-tohjo-moon-stone", "Moon Stone",
                     where="Small piece of land at the western end of the cave (needs Surf)"),
            ),
        ]},
        {"heading": "8.3 · Routes 26 & 27", "items": [
            step(["The twin routes east of Tohjo Falls into Kanto's edge.",
                  "Catch a Ponyta — it appears Morning/Day on both routes (20% on Route "
                  "26, 5% on Route 27).",
                  "Noctowl, Quagsire and Raticate fill the Night slots."],
                 where="Routes 26 / 27"),
            encounters(
                enc("Ponyta",    morning="20%", day="20%",            method="Rt 26 Grass"),
            ),
            encounters(
                enc("Ponyta",    morning="5%",  day="5%",             method="Rt 27 Grass"),
            ),
            items(
                item("item-rt27-tm22-solarbeam", "TM22 SolarBeam",
                     where="Isolated land south of the Route 27 bridge (needs Surf + Whirlpool)"),
                item("item-rt27-rare-candy", "Rare Candy",
                     where="Tiny area southeast of Tohjo Falls (needs Surf)"),
                item("item-rt27-tm37-sandstorm", "TM37 Sandstorm",
                     where="From the woman in the house east of Tohjo Falls, at high friendship"),
                item("item-rt26-ice-berry", "Ice Berry",
                     where="North of the Route 26 rest stop (daily)"),
            ),
            ach("315247", note="catch (Morning/Day; 20% Rt 26, 5% Rt 27)"),
            ach("315248", note="evolve at Lv. 40"),
        ]},
        {"heading": "8.4 · Victory Road", "items": [
            step(["The final cave before the Indigo Plateau, full of Rock/Ground mons.",
                  "Catch Rhyhorn Morning/Day (30%), or hunt the 5% wild Rhydon directly. "
                  "Onix, Graveler and Golbat round out the floors."],
                 where="Victory Road"),
            encounters(
                enc("Rhyhorn",  morning="30%", day="30%",            method="Cave"),
            ),
            ach("315249", note="catch (Morning/Day, 30%)"),
            ach("315250", note="evolve at Lv. 42 (or catch a wild Rhydon, 5%)"),
        ]},
        {"heading": "8.5 · The Elite Four & Champion Lance", "items": [
            step("At the Indigo Plateau your rival challenges you in an optional battle "
                 "before the League. Then take on the Elite Four and Champion Lance.",
                 where="Indigo Plateau", npc="Rival"),
            ach("199593", "Win the optional rival battle at the Indigo Plateau."),
            ach("315251", note="174 caught before the Elite Four"),
            ach("5949", "Defeat the Elite Four and Champion Lance to become Champion!"),
            ach("199611", "Optional challenge: beat the Elite Four in Set style, "
                "Johto-only, ≤ Lv. 44, no Pack items, one session (Beasts allowed).",
                ["Swinub/Piloswine and Skarmory are excellent vs Lance; Suicune, Crobat, "
                 "Lanturn and Quagsire round out a strong six."], type_label="Challenge"),
            ach("5950", "Optional challenge: defeat the Elite Four and Lance using only a "
                "single Pokémon.", type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Chapter 9 — Conquering Kanto (pre-badge)
# ===========================================================================
ch9 = {
    "id": "ch9-kanto", "title": "Chapter 9 — Conquering Kanto", "kind": "route",
    "intro": ("As Champion you sail to Kanto. Most remaining Pokémon can be caught before "
              "a single Kanto badge — restore the Power Plant, upgrade the radio card, "
              "sweep the region, and catch Lugia and Ho-Oh. (Virtual Console players can "
              "also pick up Celebi.) Target: 203 caught."),
    "sections": [
        {"heading": "9.1 · Virtual Console: Celebi (optional)", "items": [
            step("VC ONLY: collect the GS Ball from the Goldenrod Pokémon Center upstairs, "
                 "give it to Kurt in Azalea, return next day, then interact with the Ilex "
                 "Forest shrine to battle a Lv. 30 Celebi (it Recovers — chip its HP and "
                 "status it like Suicune). Cartridge players cannot get Celebi.",
                 where="Ilex Forest", npc="Celebi", missing_info=None),
        ]},
        {"heading": "9.2 · Restoring the Power Plant", "items": [
            step("Sail the S.S. Aqua from Olivine to Vermilion. Go north to the Route 10 "
                 "Power Plant area: catch an Electabuzz in the grass, then learn a part "
                 "was stolen. Chase the Rocket through the Cerulean Gym, recover the part "
                 "from Nugget Bridge, and return it to the Power Plant.",
                 where="Route 10 Power Plant"),
            encounters(
                enc("Electabuzz", morning="5%",  day="5%",  night="5%"),
            ),
            ach("199637", "Defeat every Trainer aboard the S.S. Aqua (after the first voyage)."),
            ach("315252", note="catch (Route 10 grass, ~5% any time)"),
            ach("199585", "Return the stolen Machine Part to the Power Plant staff."),
        ]},
        {"heading": "9.3 · Rock Tunnel, the radio card & Magnet Train", "items": [
            step("South to Rock Tunnel: catch Kangaskhan (lower floors) and find wild "
                 "Cubone/Marowak holding Thick Clubs. Exit south to Lavender Town's Radio "
                 "Tower for the radio expansion card (PokéFlute). In Saffron, the Copycat "
                 "wants her doll — fetch it from the Vermilion Pokémon Fan Club to get the "
                 "Magnet Train pass.", where="Rock Tunnel → Lavender → Saffron"),
            encounters(
                enc("Kangaskhan", morning="5%",  day="5%",               method="B1F"),
                enc("Cubone",     morning="30%", day="30%",              method="Thick Club holder; 1F & B1F"),
                enc("Marowak",    morning="5%",  day="5%",               method="Thick Club holder; 1F & B1F"),
            ),
            ach("315253", note="catch (Rock Tunnel B1F, ~5% Morning/Day)"),
            ach("199599", "Obtain a Thick Club from a wild Cubone or Marowak."),
            ach("199640", "Receive the Magnet Train Pass from the Saffron Copycat."),
        ]},
        {"heading": "9.4 · Running around Kanto", "items": [
            step("From Saffron head toward Celadon. Route 7 at Night has Houndour and "
                 "Murkrow. In Celadon, Surf the small pool for Grimer (10% Muk). The Game "
                 "Corner sells Porygon (5,555 coins) and Larvitar (8,888). Prove to "
                 "Eusine in the Celadon Mart that you've caught Raikou/Entei/Suicune for "
                 "the Rainbow Wing. Slugma appears on Route 16 in the daytime.",
                 where="Kanto routes / Celadon", npc="Eusine"),
            encounters(
                enc("Murkrow",                              night="30%",method="Rt 7 Grass"),
                enc("Houndour",                             night="20%",method="Rt 7 Grass"),
            ),
            encounters(
                enc("Grimer", morning="90%", day="90%", night="90%", method="Celadon Surf"),
            ),
            encounters(
                enc("Slugma",                 day="5%",               method="Rt 16 Grass"),
            ),
            ach("315255", note="catch (Route 7, Night, 20%)"),
            ach("315256", note="level Houndour to Lv. 24 → Houndoom"),
            ach("315254", note="catch (Route 7, Night, 30%)"),
            ach("315257", note="Surf the Celadon pool (90%)"),
            ach("315258", note="catch via Surf (10%) or evolve Grimer at Lv. 38"),
            ach("315259", note="buy at the Celadon Game Corner (5,555 coins)"),
            ach("315301", note="buy at the Celadon Game Corner (8,888 coins) — arrives Lv. 40"),
            ach("315260", note="level Larvitar to Lv. 30 → Pupitar"),
            ach("315261", note="level Pupitar to Lv. 55 → Tyranitar"),
            ach("315302", note="catch (Route 16 grass, Day, 5%)"),
            ach("315262", note="level Slugma to Lv. 38 → Magcargo"),
        ]},
        {"heading": "9.5 · Chansey, Aerodactyl & the eastern routes", "items": [
            step("On Route 15 catch the 1% Chansey (Lv. 25 — repel-trick with a Lv. 24 "
                 "lead helps). Breed it so you keep one, then trade a Chansey on Route 14 "
                 "for Aerodactyl. Bill's grandfather on Route 25 rewards showing him "
                 "specific Pokémon.", where="Routes 14/15/25", npc="Bill's grandfather"),
            encounters(
                enc("Chansey",   morning="1%",  day="1%",  night="1%"),
            ),
            ach("315263", note="catch (Route 15 grass, 1% any time)"),
            ach("315264", note="raise Chansey's happiness → Blissey"),
            ach("199600",
                "Obtain a Lucky Egg by catching or Thief-ing a wild Chansey."),
            ach("315303", note="trade a Chansey for Aerodactyl on Route 14"),
            ach("199588", "Show all 5 requested Pokémon to Bill's grandfather on Route 25."),
        ]},
        {"heading": "9.6 · Unlocking the rest of Kanto", "items": [
            step("Wake the Snorlax east of Vermilion with the PokéFlute (save first) to "
                 "open Diglett's Cave for Diglett. Emerge on Route 2 for Pikachu, then "
                 "Pewter (Silver Wing from the old man) and Mt. Moon for Clefairy and a "
                 "Moon Stone (Monday-night ritual needs Rock Smash). Surf at Pallet to "
                 "Route 21 for Mr. Mime.", where="Diglett's Cave → Mt. Moon → Route 21"),
            encounters(
                enc("Pikachu",   morning="5%",  day="5%",               method="Rt 2 Grass"),
            ),
            encounters(
                enc("Clefairy",  morning="5%",  day="5%",  night="25%", method="Mt. Moon"),
            ),
            encounters(
                enc("Mr. Mime",  morning="10%", day="10%",              method="Rt 21 Grass"),
            ),
            ach("199586", "Catch the Snorlax east of Vermilion and register it."),
            ach("315265", note="wake it with the PokéFlute and catch it (save first)"),
            ach("315266", note="catch (Diglett's Cave)"),
            ach("315267", note="catch (Diglett's Cave) or evolve Diglett at Lv. 26"),
            ach("315268", note="catch (Route 2, ~5%) or take the Game Corner one"),
            ach("315304", note="use a Thunder Stone on Pikachu → Raichu"),
            ach("315269", note="catch (Mt. Moon, 5% Morning/Day, 25% Night)"),
            ach("315305", note="use a Moon Stone on Clefairy → Clefable"),
            ach("199587", "Receive a Moon Stone after the Clefairy ritual at Mt. Moon Square."),
            ach("315270", note="catch (Route 21 grass, Morning/Day, 10%)"),
        ]},
        {"heading": "9.7 · Kanto baby Pokémon & errands", "items": [
            step("Back at the Johto Day-Care, breed your Kanto catches for their babies. "
                 "Daisy Oak in Pallet will comb a Pokémon for you.",
                 where="Day-Care / Pallet Town", npc="Daisy Oak"),
            ach("315307", note="breed Electabuzz × Ditto, then hatch Elekid"),
            ach("315306", note="breed Pikachu/Raichu × Ditto, then hatch Pichu"),
            ach("315271", note="breed Clefairy/Clefable × Ditto, then hatch Cleffa"),
            ach("199625", "Have Daisy Oak comb your Pokémon in Pallet Town."),
        ]},
        {"heading": "9.8 · The two box legendaries", "items": [
            step("With the Rainbow Wing and Silver Wing, catch BOTH Lugia (deep in the "
                 "Whirl Islands) and Ho-Oh (top of the Tin Tower), each at Lv. 60. Heavy "
                 "Balls help on Lugia; use your Master Ball on one and catch the other "
                 "normally.", where="Whirl Islands / Tin Tower"),
            ach("5952", "Catch Lugia at the Whirl Islands."),
            ach("199589", "Catch Lugia without using a Master Ball."),
            ach("315273", note="catch (Whirl Islands, Lv. 60)"),
            ach("5953", "Catch Ho-Oh at the Tin Tower."),
            ach("199590", "Catch Ho-Oh without using a Master Ball."),
            ach("315272", note="catch (Tin Tower, Lv. 60)"),
        ]},
    ],
}

# ===========================================================================
# Chapter 10 — The Kanto Gym Circuit
# ===========================================================================
def gym(win_id, win_do, set_id, set_do, set_tips, milestone_id, milestone_do):
    items = [
        ach(win_id, win_do),
        ach(set_id, set_do, set_tips, type_label="Challenge"),
        ach(milestone_id, milestone_do),
    ]
    return items

ch10 = {
    "id": "ch10-kanto-gyms", "title": "Chapter 10 — The Kanto Gym Circuit", "kind": "route",
    "intro": ("A POC catches everything before Kanto badges, so this chapter collects the "
              "eight Kanto gym wins and their Set-mode challenges in one place. Each badge "
              "is also a POC checkpoint at 203 Pokémon. Order follows the community route: "
              "Surge → Sabrina → Misty → Erika → Janine → Brock → Blaine → Blue."),
    "sections": [
        {"heading": "10.1 · Vermilion — Lt. Surge", "items": gym(
            "5647", "Defeat Lt. Surge in Vermilion City for the Thunder Badge.",
            "199612", "Set-style, Johto-only, ≤ Lv. 46, no Pack items (Beasts allowed).",
            ["Just reuse your League team — especially Piloswine. Low difficulty."],
            "315308", "POC checkpoint: 203 Pokémon registered (Thunder Badge).")},
        {"heading": "10.2 · Saffron — Sabrina", "items": gym(
            "5650", "Defeat Sabrina in Saffron City for the Marsh Badge.",
            "199613", "Set-style, Johto-only, ≤ Lv. 48, no Pack items (Beasts allowed).",
            ["Dark types like Umbreon, Houndoom or a Crunch user neutralize her Psychics."],
            "315278", "POC checkpoint: 203 Pokémon registered (Marsh Badge).")},
        {"heading": "10.3 · Cerulean — Misty", "items": gym(
            "5646", "Defeat Misty in Cerulean City for the Cascade Badge.",
            "199614", "Set-style, Johto-only, ≤ Lv. 47, no Pack items (Beasts allowed).",
            ["Lanturn and Raikou love this Water gym; grass types also do work."],
            "315275", "POC checkpoint: 203 Pokémon registered (Cascade Badge).")},
        {"heading": "10.4 · Celadon — Erika", "items": gym(
            "5648", "Defeat Erika in Celadon City for the Rainbow Badge.",
            "199615", "Set-style, Johto-only, ≤ Lv. 46, no Pack items (Beasts allowed).",
            ["Any Fire, Flying or Ice attacker tears through her Grass team."],
            "315276", "POC checkpoint: 203 Pokémon registered (Rainbow Badge).")},
        {"heading": "10.5 · Fuchsia — Janine", "items": gym(
            "5649", "Defeat Janine in Fuchsia City for the Soul Badge.",
            "199616", "Set-style, Johto-only, ≤ Lv. 39, no Pack items (no Legendaries).",
            ["Lowest Kanto cap (39) and no Legendaries allowed — bring a leveled "
             "Psychic or Ground type for her Poisons."],
            "315277", "POC checkpoint: 203 Pokémon registered (Soul Badge).")},
        {"heading": "10.6 · Pewter — Brock", "items": gym(
            "5645", "Defeat Brock in Pewter City for the Boulder Badge.",
            "199632", "Set-style, Johto-only, ≤ Lv. 44, no Pack items (Beasts allowed).",
            ["Water and Grass answers (Quagsire, Lanturn, Victreebel) handle his Rocks."],
            "315274", "POC checkpoint: 203 Pokémon registered (Boulder Badge).")},
        {"heading": "10.7 · Cinnabar — Blaine", "items": gym(
            "5651", "Defeat Blaine on Cinnabar Island for the Volcano Badge.",
            "199617", "Set-style, Johto-only, ≤ Lv. 50, no Pack items (Beasts allowed).",
            ["Any Water or Ground type douses his Fire team; Suicune is ideal."],
            "315279", "POC checkpoint: 203 Pokémon registered (Volcano Badge).")},
        {"heading": "10.8 · Viridian — Blue", "items": gym(
            "5652", "Defeat Blue in Viridian City for the Earth Badge.",
            "199618", "Set-style, Johto-only, ≤ Lv. 58, no Pack items (Beasts allowed).",
            ["Blue has a varied team — your full League six plus the Beasts cover every "
             "type."],
            "315280", "POC checkpoint: 203 Pokémon registered (Earth Badge).")},
    ],
}

# ===========================================================================
# Chapter 11 — Mt. Silver & Red
# ===========================================================================
ch11 = {
    "id": "ch11-mt-silver", "title": "Chapter 11 — Mt. Silver & Red", "kind": "route",
    "intro": ("With all 16 badges, Professor Oak opens Mt. Silver. Catch the last two "
              "wild Pokémon in Silver Cave, then face the former Champion, Red, at the "
              "summit. This completes the challenge: 206 caught (207 on VC with Celebi)."),
    "sections": [
        {"heading": "11.1 · Silver Cave", "items": [
            step(["From the Pokémon League gates, exit west to Route 28 and the Pokémon "
                  "Center at the foot of Mt. Silver, then enter Silver Cave (Flash lights "
                  "the first room).",
                  "On 1F, Magmar appears Morning/Day — catch one to breed for Magby.",
                  "Climb to 2F: Misdreavus shows up only at Night (5% on 2F; up to 30% "
                  "deeper in the Chambers). These are the last two wild Pokémon you need."],
                 where="Silver Cave"),
            encounters(
                enc("Magmar",   morning="10%", day="10%",              method="1F"),
                enc("Misdreavus",                           night="5%",  method="2F"),
            ),
            items(
                item("item-silvercave-escape-rope", "Escape Rope",
                     where="1F, west of the entrance"),
                item("item-silvercave-protein", "Protein", where="1F, east of the entrance"),
                item("item-silvercave-ultra-ball-1f-mid", "Ultra Ball",
                     where="1F, in the middle of the floor"),
                item("item-silvercave-dire-hit", "Dire Hit",
                     where="1F, on the rock between the central ledges (hidden)"),
                item("item-silvercave-max-elixir", "Max Elixir", where="1F, northwest corner"),
                item("item-silvercave-ultra-ball-1f-se", "Ultra Ball",
                     where="1F, southeast area near the 2F entrance (hidden)"),
                item("item-silvercave-max-potion", "Max Potion",
                     where="2F, on the rock just west of the 2F entrance (hidden)"),
                item("item-silvercave-pp-up", "PP Up",
                     where="2F, western shoreline (needs Surf and Waterfall)"),
                item("item-silvercave-max-revive", "Max Revive",
                     where="2F, far western end (needs Surf and Waterfall)"),
                item("item-silvercave-ultra-ball-2f", "Ultra Ball",
                     where="2F, east of the triple stairway"),
                item("item-silvercave-calcium", "Calcium",
                     where="2F, northeastern interior (needs Surf and Waterfall)"),
                item("item-silvercave-full-restore", "Full Restore",
                     where="2F, far northeastern end (needs Surf and Waterfall)"),
            ),
            ach("315282", note="catch on 1F (Morning/Day, 10%)"),
            ach("315283", note="breed Magmar and hatch a Magby"),
            ach("315281", note="catch on 2F or in the Chambers (Night only)"),
        ]},
        {"heading": "11.2 · The summit — Red", "items": [
            step("Climb to the top of Mt. Silver to battle Red — the highest-level Trainer "
                 "in the game. His team is mid-to-low 70s with a Lv. 81 Pikachu, and he "
                 "carries two Full Restores; bring your best six.",
                 where="Mt. Silver summit", npc="Red"),
            trainers(
                trainer("trainer-mtsilver-red", "Pokémon Trainer Red",
                        team="Pikachu Lv. 81, Snorlax Lv. 75, Venusaur Lv. 77, "
                             "Charizard Lv. 77, Blastoise Lv. 77, Espeon Lv. 73",
                        reward="P7700", note="has two Full Restores"),
            ),
            ach("315284", note="206 Pokémon registered before Red"),
            ach("5958", "Defeat Pokémon Trainer Red at the summit of Mt. Silver!"),
            ach("199619", "Optional challenge: beat Red in Set style, Johto-only, ≤ Lv. "
                "65, no Pack items (all Johto Legendaries allowed).",
                ["Lugia, Ho-Oh, Suicune and a strong Tyranitar/Dragonite make this "
                 "manageable; pace your healing between battles outside of combat."],
                type_label="Challenge"),
            ach("5959", "Optional challenge: defeat Red using only a single Pokémon.",
                type_label="Challenge"),
        ]},
    ],
}

# ===========================================================================
# Roundup — Collectible & Challenge master checklist
# ===========================================================================
roundup = {
    "id": "ch-roundup", "title": "Roundup — Collectible & Challenge Checklist",
    "kind": "roundup",
    "intro": ("These achievements span the whole game — work them in alongside the route. "
              "They cover full-region trainer/item sweeps, the complete Unown set, every "
              "trade and gift, the fishing rods, the Battle Tower, and the grand "
              "'Gotta Catch 'Em All' capstone."),
    "achievements": [f"ach-{i}" for i in [
        "199636",  # Let the Unown Be Known
        "5955",    # Alphabet Scoop
        "199639",  # The Reel Pokédex (3 rods)
        "199559",  # Go Ahead, Make My Day (Week Siblings)
        "199565",  # More Valuable than Any Dollar (gift Pokémon)
        "199592",  # Link Cable Not Included (every trade)
        "199629",  # Cute, Soft, & Made with Love (Poké Dolls)
        "199602",  # Strength from Numbers (vitamins)
        "199579",  # Fun to Sell Off, Not to Eat (Nugget)
        "199577",  # Practicing 1 Move 10,000 Times (PP Up)
        "199621",  # The Anger of a Gentle 'Mon (Frustration/Return)
        "199626",  # Didn't Know You Had It in You! (Hidden Power)
        "199560",  # Landly Legend (every Trainer Johto)
        "199562",  # Flourishing Findings (every item Johto)
        "199583",  # Urban Underdog (every Trainer Kanto)
        "199584",  # Colorful Collector (every item Kanto)
        "199563",  # Machine Learning (every TM/HM)
        "5936",    # Game of Death-Defiance (Battle Tower 7)
        "199628",  # Local Competition (Battle Tower Johto-only)
        "5954",    # Gotta Catch 'Em All - Crystal
    ]],
}

# Register every roundup achievement (with light callouts) before assembly.
_ROUNDUP_META = {
    "199636": ("Solve every Ruins of Alph puzzle chamber and grab all hidden items.", None),
    "5955": ("Catch all 26 forms of Unown (all puzzle chambers must be unlocked).", None),
    "199639": ("Collect the Old, Good and Super Rods.", None),
    "199559": ("Receive all 7 gifts from the Week Siblings (one per day of the week).", None),
    "199565": ("Receive every in-game Gift Pokémon.", None),
    "199592": ("Complete every in-game trade.", None),
    "199629": ("Own every Poké Doll that Mom buys with your savings.", None),
    "199602": ("Receive a vitamin from every Trainer rematch that rewards one.", None),
    "199579": ("Receive a Nugget from Pokéfan Beverly or Pokéfan Derek.", None),
    "199577": ("Receive a PP Up from Blackbelt Kenji.", None),
    "199621": ("Use Frustration or Return at its maximum power from your lead Pokémon.", None),
    "199626": ("Deal super-effective damage with Hidden Power.", None),
    "199560": ("Defeat every non-missable Trainer in Johto.", None),
    "199562": ("Collect every visible and hidden field item in Johto.", None),
    "199583": ("Defeat every non-missable Trainer in Kanto.", None),
    "199584": ("Collect every visible and hidden field item in Kanto.", None),
    "199563": ("Collect every finite TM and HM.", None),
    "5936": ("Clear the Battle Tower by beating 7 Trainers in a row.", None),
    "199628": ("Clear the Battle Tower using only Johto Pokémon — no Lugia or Ho-Oh.", "Challenge"),
    "5954": ("Catch all 206 obtainable Pokémon — the grand capstone of the challenge.", None),
}
for _aid, (_do, _tl) in _ROUNDUP_META.items():
    ach(_aid, _do, type_label=_tl)

# ---------------------------------------------------------------------------
SOURCES = [
    {"label": "Mewlax's Professor Oak Challenge Guide — Pokémon Crystal",
     "url": "https://www.reddit.com/user/mewlax84",
     "role": "Route",
     "note": "Turn-by-turn POC walkthrough (badge-by-badge) by u/mewlax84 — the route spine."},
    {"label": "RetroAchievements — Pokémon Crystal (base set)",
     "url": "https://retroachievements.org/game/810",
     "role": "Achievements",
     "note": "Official base-game achievement set (113): names, points, rarity, descriptions."},
    {"label": "RetroAchievements — Pokémon Crystal [Professor Oak Challenge subset]",
     "url": "https://retroachievements.org/game/24140",
     "role": "Achievements",
     "note": "POC subset (224): the catch/evolve Pokédex-completion set."},
    {"label": "RetroAchievements guides wiki — Pokémon Crystal",
     "url": "https://github.com/RetroAchievements/guides/wiki/Pokemon-Crystal-(Game-Boy-Color)",
     "role": "Strategy",
     "note": "Community guide (Set-mode gym tips, datetime/phone tricks). Note: uses older achievement names."},
    {"label": "Bulbapedia — Walkthrough: Pokémon Crystal",
     "url": "https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Crystal",
     "role": "Walkthrough",
     "note": "General story walkthrough and maps."},
]

chapters = [ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, roundup]

guide = {
    "game": {
        "title": "Pokémon Crystal — Professor Oak Challenge & Achievement Guide",
        "platform": "Game Boy Color · RetroAchievements",
        "slug": "pkmn-crystal-poc",
        "accent": "#4fa8d8",
        "spoiler_warning": True,
    },
    "sources": SOURCES,
    "achievements": list(USED.values()),  # filled as chapters reference them
    "chapters": chapters,
}

# USED is populated by ach() calls during chapter construction above.
guide["achievements"] = list(USED.values())

out = os.path.join(ROOT, "guide.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(guide, fh, ensure_ascii=False, indent=2)
print(f"wrote {out}: {len(USED)} achievements, {len(chapters)} chapters")
