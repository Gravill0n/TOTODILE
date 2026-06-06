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

def ach(aid, callout_do=None, howto=None, type_label=None, missing_info=None):
    """Return an inline-achievement reference, registering the full card once."""
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
            step("Set the clock and start the game. Your Mother gives you a PokéGear; head "
                 "to Professor Elm's lab. He asks you to visit Mr. Pokémon and lets you "
                 "take one Pokémon partner.", where="New Bark Town", npc="Prof. Elm"),
            step("Pick one starter: Chikorita (→ Bayleef Lv. 16 → Meganium Lv. 32), "
                 "Cyndaquil (→ Quilava Lv. 14 → Typhlosion Lv. 36), or Totodile (→ "
                 "Croconaw Lv. 18 → Feraligatr Lv. 30). Chikorita is the weakest start "
                 "given all the bug/flying/poison early on; Totodile fully evolves "
                 "earliest at Lv. 30.", where="Elm's Lab"),
            ach("315085", "Choose your starter from Professor Elm.",
                ["Chikorita, Cyndaquil or Totodile — you can only pick one, and you "
                 "cannot trade for the others in a POC."]),
            step("Visit Mr. Pokémon's house (north past Cherrygrove), then return to New "
                 "Bark Town to receive your Pokédex and Poké Balls — now the challenge "
                 "truly begins. Talk to Mom before leaving town to start the savings.",
                 where="Route 30 → New Bark Town", npc="Mr. Pokémon"),
            ach("315086", "Evolve your starter to its second stage by leveling up.",
                ["Chikorita → Bayleef at Lv. 16, Cyndaquil → Quilava at Lv. 14, "
                 "Totodile → Croconaw at Lv. 18."]),
            ach("315087", "Fully evolve your starter — this is required before Falkner.",
                ["Bayleef → Meganium at Lv. 32, Quilava → Typhlosion at Lv. 36, "
                 "Croconaw → Feraligatr at Lv. 30. Consider leaving it unevolved a while "
                 "so it learns moves faster for the grind."]),
        ]},
        {"heading": "1.2 · Route 29", "items": [
            step("Straight out of New Bark Town. Pidgey, Hoppip and Sentret appear "
                 "Morning/Day, Hoothoot at Night, and Rattata at all times.",
                 where="Route 29"),
            ach("315089", "Catch a Pidgey (Morning/Day).",
                ["Fully evolving Pidgey is one of the bigger grinds before Falkner."]),
            ach("315090", "Level Pidgey to Lv. 18 to get Pidgeotto."),
            ach("315091", "Level Pidgeotto to Lv. 36 to get Pidgeot."),
            ach("315093", "Catch a Hoppip (Morning/Day).",
                ["Hoppip only knows Tackle (from Lv. 10) as an attacking move, even "
                 "unevolved up to Skiploom/Jumpluff — train it patiently."]),
            ach("315094", "Level Hoppip to Lv. 18 to get Skiploom."),
            ach("315095", "Level Skiploom to Lv. 27 to get Jumpluff."),
            ach("315096", "Catch a Sentret (Morning/Day)."),
            ach("315097", "Level Sentret to Lv. 15 to get Furret."),
            ach("315098", "Catch a Hoothoot (Night)."),
            ach("315099", "Level Hoothoot to Lv. 20 to get Noctowl."),
            ach("315088", "Catch a Rattata (any time)."),
            ach("315092", "Level Rattata to Lv. 20 to get Raticate."),
        ]},
        {"heading": "1.3 · Route 46", "items": [
            step("Through the northern gate of Route 29 you reach the lower section of "
                 "Route 46. Phanpy appears in the morning, Spearow any time except night, "
                 "and Geodude at any time.", where="Route 46"),
            ach("315102", "Catch a Phanpy (Morning).",
                ["Phanpy has a 50% chance to flee each turn. If it wastes too many balls, "
                 "come back later with a Gastly that knows Mean Look."]),
            ach("315103", "Level Phanpy to Lv. 25 to get Donphan."),
            ach("315100", "Catch a Geodude (any time)."),
            ach("315101", "Level Geodude to Lv. 25 to get Graveler.",
                ["Graveler's evolution into Golem is a trade evolution, so Golem is not "
                 "obtainable in a POC."]),
            ach("315104", "Catch a Spearow (any time except Night)."),
            ach("315105", "Level Spearow to Lv. 20 to get Fearow."),
        ]},
        {"heading": "1.4 · Route 30", "items": [
            step("Pass through Cherrygrove City and head north to Route 30. Ledyba appears "
                 "in the morning, Caterpie and Weedle Morning/Day, and Spinarak, Poliwag "
                 "and Zubat at night.", where="Route 30"),
            ach("315106", "Catch a Caterpie (Morning/Day)."),
            ach("315107", "Level Caterpie to Lv. 7 to get Metapod."),
            ach("315108", "Level Metapod to Lv. 10 to get Butterfree.",
                ["Butterfree gives ridiculous EXP when flushed out of Headbutt trees "
                 "later."]),
            ach("315109", "Catch a Weedle (Morning/Day)."),
            ach("315110", "Level Weedle to Lv. 7 to get Kakuna."),
            ach("315111", "Level Kakuna to Lv. 10 to get Beedrill."),
            ach("315112", "Catch a Spinarak (Night)."),
            ach("315113", "Level Spinarak to Lv. 22 to get Ariados."),
            ach("315114", "Catch a Ledyba (Morning)."),
            ach("315115", "Level Ledyba to Lv. 18 to get Ledian."),
            ach("315116", "Catch a Zubat (Night).",
                ["Keep Zubat in your party at all times: Golbat evolves into Crobat via "
                 "high happiness, and leveling on the route you caught it gives more "
                 "friendship per level in Crystal."]),
            ach("315117", "Level Zubat to Lv. 22 to get Golbat."),
            ach("315118", "Raise Golbat's happiness (any time) to get Crobat."),
            ach("315119", "Catch a Poliwag (Night)."),
            ach("315120", "Level Poliwag to Lv. 25 to get Poliwhirl.",
                ["Poliwhirl needs a Water Stone for Poliwrath, which you cannot obtain "
                 "yet — that comes later."]),
        ]},
        {"heading": "1.5 · Route 31", "items": [
            step("Head further north onto Route 31. Bellsprout appears at all times and "
                 "Gastly at night (or get one at night in Sprout Tower). Catch a SECOND "
                 "Bellsprout for an upcoming trade.", where="Route 31"),
            ach("315121", "Catch a Bellsprout (any time) — and a second for the Onix trade."),
            ach("315122", "Level Bellsprout to Lv. 21 to get Weepinbell.",
                ["Weepinbell needs a Leaf Stone for Victreebel, handled later."]),
            ach("315123", "Catch a Gastly (Night) — on Route 31 or in Sprout Tower."),
            ach("315124", "Level Gastly to Lv. 25 to get Haunter.",
                ["Haunter's evolution into Gengar is a trade evolution, so Gengar is not "
                 "obtainable in a POC. A Haunter with Mean Look/Night Shade helps catch "
                 "roaming legendaries later."]),
        ]},
        {"heading": "1.6 · Dark Cave", "items": [
            step("Instead of heading west to Violet City, enter Dark Cave. You won't get "
                 "far, but you can stumble far enough to catch a Teddiursa in the morning "
                 "and a super-rare 1% Dunsparce.", where="Dark Cave"),
            ach("315125", "Catch a Dunsparce (1% encounter — be patient).",
                ["A Dunsparce with Rage is highly recommended for the Falkner Set "
                 "challenge: it is Normal type and takes little damage."]),
            ach("315126", "Catch a Teddiursa (Morning).",
                ["Another fleeing Pokémon — bring something to trap it if needed."]),
            ach("315127", "Level Teddiursa to Lv. 30 to get Ursaring."),
        ]},
        {"heading": "1.7 · Violet City", "items": [
            step("It is not time for the gym yet. In one of the town houses, someone wants "
                 "to trade an Onix for your Bellsprout — definitely do this, as Onix can't "
                 "be caught until much later. Sprout Tower has a Gastly at night and the "
                 "Flash HM at the top.", where="Violet City"),
            ach("315128", "Trade your spare Bellsprout for Onix.",
                ["This in-game trade is the only way to get Onix this early."]),
        ]},
        {"heading": "1.8 · Route 36 (western grass)", "items": [
            step("Head west out of Violet City. Exclusive to Crystal, a small patch of "
                 "grass here holds a Growlithe during Morning/Day.", where="Route 36"),
            ach("315129", "Catch a Growlithe (Morning/Day).",
                ["Growlithe needs a Fire Stone for Arcanine, obtained later from a "
                 "Pokégear contact."]),
        ]},
        {"heading": "1.9 · Ruins of Alph", "items": [
            step("Go through the gate house south of the Route 36 grass to reach the Ruins "
                 "of Alph. Solve the first tile puzzle to encounter Unown.",
                 where="Ruins of Alph"),
            ach("315130", "Catch an Unown (it may flee).",
                ["Catch one now; you can collect all 26 forms later once every puzzle "
                 "chamber is unlocked."]),
            step("That's the end of catching for the first section. Grind your team up — "
                 "Sprout Tower at night is great against Gastly, and Dark Cave / Route 31 "
                 "/ Ruins of Alph are good for the rest. The killers are the fully evolved "
                 "starter, Pidgeot and Ursaring.", where="Leveling tip"),
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
            ach("315131", "POC checkpoint: have all 46 obtainable Pokémon registered "
                "before you beat Falkner.",
                ["This subset milestone confirms the Part 1 dex is complete."]),
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
            step("After beating Falkner, Professor Elm calls: an aide is at the Pokémon "
                 "Center with a present — the Egg. Keep it in your party so its happiness "
                 "rises while you grind; it hatches into Togepi.",
                 where="Violet City", npc="Elm's Aide"),
            ach("315132", "Hatch the Egg into Togepi by walking with it in your party."),
            ach("315133", "Raise Togepi's happiness → Togetic."),
            step("Show the hatched Togepi to Professor Elm to receive an Everstone.",
                 where="New Bark Town", npc="Prof. Elm"),
            ach("199582", "Show Elm your hatched Togepi for the Everstone."),
        ]},
        {"heading": "2.2 · Route 32", "items": [
            step("Head south from Violet City (skip Ruins of Alph for now). Ekans appears "
                 "Morning/Day, Wooper only at Night. The Pokémon Center on this route has "
                 "a man who gives you the Old Rod.", where="Route 32"),
            ach("315134", "Catch a Wooper (Night)."),
            ach("315135", "Level Wooper to Lv. 20 → Quagsire."),
            ach("315136", "Catch an Ekans (Morning/Day)."),
            ach("315137", "Level Ekans to Lv. 22 → Arbok."),
        ]},
        {"heading": "2.3 · Old Rod fishing tour", "items": [
            step("With the Old Rod, backtrack to fish up new Pokémon. Get Fisherman "
                 "Ralph's number on Route 32 — if he calls about a Qwilfish outbreak, "
                 "come back and catch one. Catch a SECOND Krabby for a later trade.",
                 where="Old Rod", npc="Fisherman Ralph"),
            ach("315138", "Fish up a Magikarp (anywhere).",
                ["Magikarp can't battle until it learns Tackle — train it once it can."]),
            ach("315139", "Level Magikarp to Lv. 20 → Gyarados."),
            ach("315140", "Fish up a Tentacool (New Bark Town)."),
            ach("315141", "Level Tentacool to Lv. 30 → Tentacruel."),
            ach("315142", "Fish up a Krabby (Cherrygrove City) — get a second for a trade."),
            ach("315143", "Level Krabby to Lv. 28 → Kingler."),
            ach("315144", "Fish up a Goldeen (Dark Cave)."),
            ach("315145", "Level Goldeen to Lv. 33 → Seaking."),
            ach("315146", "Fish up a Qwilfish (Route 32, during a swarm).",
                ["Toggle daylight savings with Mom to force Ralph's swarm call."]),
        ]},
        {"heading": "2.4 · Union Cave & Slowpoke Well", "items": [
            step("Enter Union Cave at the south end of Route 32. Sandshrew appears "
                 "Morning/Day. The cave is bigger than it looks but you can't fully "
                 "explore it yet; the far side leads to Azalea Town.", where="Union Cave"),
            ach("315147", "Catch a Sandshrew (Morning/Day)."),
            ach("315148", "Level Sandshrew to Lv. 22 → Sandslash."),
            step("Go to Kurt's house in Azalea; he leaves for the Slowpoke Well. Follow "
                 "and defeat the Rocket grunt leading the raid, then catch a Slowpoke. "
                 "Afterward Kurt makes special balls from Apricorns.",
                 where="Slowpoke Well", npc="Kurt"),
            ach("5934", "Defeat the Rocket Grunt leading the Slowpoke Well raid."),
            ach("315149", "Catch a Slowpoke."),
            ach("315150", "Level Slowpoke to Lv. 37 → Slowbro.",
                ["Slowpoke's other evolution, Slowking, is a trade evolution — not "
                 "obtainable in a POC."]),
            ach("199601", "Receive at least 10 special Poké Balls at once from Kurt.",
                ["Hand Kurt a batch of Apricorns so he returns 10+ balls in one go."]),
        ]},
        {"heading": "2.5 · Ilex Forest", "items": [
            step("Leave Azalea west (defeat your rival first) into Ilex Forest. Grab the "
                 "Cut HM here. Paras appears any time; Psyduck, Oddish and Venonat at "
                 "Night.", where="Ilex Forest"),
            ach("315151", "Catch an Oddish (Night)."),
            ach("315152", "Level Oddish to Lv. 21 → Gloom.",
                ["Gloom needs a Leaf Stone or Sun Stone later for Vileplume/Bellossom."]),
            ach("315153", "Catch a Paras (any time)."),
            ach("315154", "Level Paras to Lv. 24 → Parasect."),
            ach("315155", "Catch a Psyduck (Night)."),
            ach("315156", "Level Psyduck to Lv. 33 → Golduck."),
            ach("315157", "Catch a Venonat (Night)."),
            ach("315158", "Level Venonat to Lv. 31 → Venomoth."),
        ]},
        {"heading": "2.6 · Headbutt trees", "items": [
            step("Even blocked off without Cut, you can Headbutt trees once Slowpoke "
                 "learns Headbutt. Try a tree and see what falls out: Pineco in Ilex "
                 "Forest, Aipom and Heracross in Azalea Town, Exeggcute back on Route 32.",
                 where="Headbutt trees"),
            ach("199596", "Headbutt a tree and run into a sleeping Pokémon."),
            ach("315161", "Headbutt an Exeggcute out of a tree (Route 32).",
                ["Exeggcute needs a Leaf Stone later for Exeggutor."]),
            ach("315159", "Headbutt a Pineco out of a tree (Ilex Forest)."),
            ach("315160", "Level Pineco to Lv. 31 → Forretress."),
            ach("315163", "Headbutt an Aipom out of a tree (Azalea Town)."),
            ach("315162", "Headbutt a Heracross out of a tree (Azalea Town).",
                ["Heracross gives huge EXP and is a great team member; not required for "
                 "the Hive milestone but part of the dex."]),
        ]},
        {"heading": "2.7 · The Hive Badge — Bugsy", "items": [
            ach("315164", "POC checkpoint: 77 Pokémon registered before Bugsy "
                "(Heracross not required)."),
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
            step("Several new Pokémon plus the Day-Care. Snubbull appears Morning/Day, "
                 "Drowzee at Night; everything else any time. Catch a SECOND Abra for an "
                 "upcoming trade and get Picnicker Gina's number (she gives Leaf Stones).",
                 where="Route 34", npc="Picnicker Gina"),
            ach("315195", "Catch a Drowzee (Night)."),
            ach("315196", "Level Drowzee to Lv. 26 → Hypno."),
            ach("315165", "Catch an Abra (any time) — and a second for the Machop trade."),
            ach("315166", "Level Abra to Lv. 16 → Kadabra.",
                ["Kadabra's evolution into Alakazam is a trade evolution — not obtainable."]),
            ach("315167", "Catch a Ditto (Route 34)."),
            ach("315168", "Catch a Snubbull (Morning/Day)."),
            ach("315169", "Level Snubbull to Lv. 23 → Granbull."),
            ach("315170", "Catch a Jigglypuff (Route 34)."),
        ]},
        {"heading": "3.2 · The Odd Egg", "items": [
            step("Talk to the old man outside the Day-Care for the Odd Egg. SAVE BEFORE "
                 "TALKING TO HIM — the species is fixed when received. It can be Pichu, "
                 "Cleffa, Igglybuff, Tyrogue, Smoochum, Elekid or Magby. Soft-reset until "
                 "you get Tyrogue (it nets four Pokémon now via the Hitmon line).",
                 where="Route 34 Day-Care", npc="Old Man"),
            ach("199561", "Receive the Odd Egg from the Day-Care Man on Route 34."),
            ach("315172", "Hatch the Odd Egg into Tyrogue (save before receiving the egg).",
                ["With the exception of Igglybuff, the others aren't available yet — "
                 "Tyrogue gives the most dex progress. There's a high shiny chance."]),
            ach("315174", "Evolve Tyrogue at Lv. 20 with Defense > Attack → Hitmonchan."),
            ach("315173", "Evolve Tyrogue at Lv. 20 with Attack > Defense → Hitmonlee."),
            ach("315175", "Evolve Tyrogue at Lv. 20 with Attack = Defense → Hitmontop."),
            step("Breed your Jigglypuff with Ditto at the Day-Care to produce Igglybuff.",
                 where="Day-Care"),
            ach("315171", "Breed Jigglypuff with Ditto and hatch an Igglybuff."),
        ]},
        {"heading": "3.3 · Goldenrod City — bike, Underground & Game Corner", "items": [
            step("The biggest city in Johto. Grab the bike. The Underground has a Coin "
                 "Case for the Game Corner, and you can trade your spare Abra for a "
                 "Machop. Crystal's Game Corner offers Cubone and Wobbuffet.",
                 where="Goldenrod City"),
            ach("315176", "Trade your spare Abra for a Machop in the Underground."),
            ach("315177", "Level Machop to Lv. 28 → Machoke.",
                ["Machoke's evolution into Machamp is a trade evolution — not obtainable."]),
            ach("315178", "Buy a Cubone with coins at the Game Corner."),
            ach("315179", "Level Cubone to Lv. 28 → Marowak."),
            ach("315180", "Buy a Wobbuffet with coins at the Game Corner."),
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
            step("North of Goldenrod, Route 35 holds an ultra-rare 1% Yanma. Through the "
                 "north gate is National Park: Nidoran♂/♀ Morning/Day, Sunkern daytime. "
                 "On Tue/Thu/Sat the Bug-Catching Contest runs here.",
                 where="Route 35 / National Park"),
            ach("315181", "Catch a Yanma (1% encounter — be patient)."),
            ach("315182", "Catch a Nidoran♀ (Morning/Day)."),
            ach("315183", "Level Nidoran♀ to Lv. 16 → Nidorina."),
            ach("315184", "Catch a Nidoran♂ (Morning/Day)."),
            ach("315185", "Level Nidoran♂ to Lv. 16 → Nidorino."),
            ach("315186", "Catch a Sunkern (daytime)."),
            ach("315188", "Catch a Scyther in the Bug-Catching Contest."),
            ach("315189", "Catch a Pinsir in the Bug-Catching Contest."),
            ach("199622", "Win the Bug-Catching Contest.",
                ["Save before entering so you can retry. Put a Pokémon to sleep and catch "
                 "it at full HP for the best score; a Scyther or Pinsir is ideal."]),
            ach("199623", "Win the contest WITHOUT catching Butterfree, Beedrill, Scyther "
                "or Pinsir."),
            ach("199624", "Win the contest with Cooltrainer Nick as a participant."),
        ]},
        {"heading": "3.5 · A stash of stones", "items": [
            step("Now evolve your stone Pokémon. Mom's Moon Stone evolves one of "
                 "Jigglypuff / Nidorina / Nidorino; two Sun Stones come from winning the "
                 "Bug Contest; Leaf and Fire Stones arrive via Gina and Schoolboy Alan's "
                 "PokéGear calls (force them with the daylight-savings trick).",
                 where="Evolution stones"),
            ach("199567", "Receive an evolution stone from a registered PokéGear Trainer.",
                ["Gina gives Leaf Stones, Alan gives Fire Stones, plus later contacts for "
                 "Water/Thunder Stones."]),
            ach("315226", "Use a Moon Stone on Jigglypuff → Wigglytuff.",
                ["You get three Moon Stones across Parts 3 and 5; spread them across "
                 "Wigglytuff, Nidoking and Nidoqueen."]),
            ach("315227", "Use a Moon Stone on Nidorino → Nidoking."),
            ach("315290", "Use a Moon Stone on Nidorina → Nidoqueen."),
            ach("315187", "Use a Sun Stone (Bug Contest prize) on Sunkern → Sunflora."),
            ach("315190", "Use a Sun Stone on Gloom → Bellossom."),
            ach("315191", "Use a Leaf Stone on Gloom → Vileplume.",
                ["Catch/raise a second Gloom so you can get both Bellossom and Vileplume."]),
            ach("315192", "Use a Leaf Stone on Exeggcute → Exeggutor."),
            ach("315193", "Use a Leaf Stone on Weepinbell → Victreebel."),
            ach("315194", "Use a Fire Stone (from Alan) on Growlithe → Arcanine."),
        ]},
        {"heading": "3.6 · The Plain Badge — Whitney", "items": [
            ach("315197", "POC checkpoint: 109 Pokémon registered before Whitney."),
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
            step("After Whitney, return to Route 36 and talk to the lady by the 'tree'. "
                 "She sends you to the Goldenrod flower shop for the SquirtBottle; bring "
                 "it back and SAVE before using it on the tree — this is your only "
                 "Sudowoodo. The man on its right then gives you the Rock Smash TM.",
                 where="Route 36", npc="Flower-shop lady"),
            ach("199564", "Catch the Sudowoodo on Route 36 and register it."),
            ach("315198", "Catch the Sudowoodo (save before using the SquirtBottle)."),
        ]},
        {"heading": "4.2 · Route 37 & Ecruteak — Eevee", "items": [
            step("Route 37 has a single new catch, Stantler, at Night only.",
                 where="Route 37"),
            ach("315199", "Catch a Stantler (Night)."),
            step("Reach Ecruteak and enter the Pokémon Center; Bill heads back to "
                 "Goldenrod. Follow him and he gives you an Eevee. Breed it five times — "
                 "use the babies for Espeon/Umbreon (higher base happiness).",
                 where="Goldenrod City", npc="Bill"),
            ach("315200", "Receive Eevee from Bill in Goldenrod."),
            ach("315203", "Use a Fire Stone on Eevee → Flareon."),
            ach("315202", "Use a Thunder Stone on Eevee → Jolteon.",
                ["Thunder Stones come from Lass Dana's PokéGear calls (Route 38)."]),
            ach("315201", "Use a Water Stone on Eevee → Vaporeon.",
                ["Water Stones come from Fisherman Tully's calls (Route 42 area)."]),
            ach("315204", "Raise Eevee's happiness during the DAY → Espeon."),
            ach("315205", "Raise Eevee's happiness during the NIGHT → Umbreon."),
        ]},
        {"heading": "4.3 · Burned Tower", "items": [
            step("Take on the Kimono Girls for the Surf HM, then visit the Burned Tower. "
                 "Koffing lurks on any floor. In the basement you disturb the three "
                 "legendary beasts — Raikou and Entei begin roaming; Suicune appears in "
                 "set locations later.", where="Burned Tower", npc="Eusine"),
            ach("199566", "Complete the Eusine sidequest in the Burned Tower."),
            ach("315206", "Catch a Koffing (Burned Tower)."),
            ach("315207", "Level Koffing to Lv. 35 → Weezing (or catch a Weezing)."),
        ]},
        {"heading": "4.4 · Route 38", "items": [
            step("West to Route 38. Magnemite any time, Tauros & Miltank Morning/Day, "
                 "Meowth at Night. Beat Lass Dana and get her number for Thunder Stones.",
                 where="Route 38", npc="Lass Dana"),
            ach("315208", "Catch a Magnemite (any time)."),
            ach("315209", "Level Magnemite to Lv. 30 → Magneton.",
                ["Magneton's evolution into Magnezone doesn't exist in Gen 2."]),
            ach("315210", "Catch a Miltank (Morning/Day)."),
            ach("315211", "Catch a Tauros (Morning/Day)."),
            ach("315212", "Catch a Meowth (Night)."),
            ach("315213", "Level Meowth to Lv. 28 → Persian."),
            step("On Route 39 between Ecruteak and Olivine, stop at Moomoo Farm and help "
                 "nurse the sick Miltank, Moomoo, back to health.",
                 where="Route 39 · Moomoo Farm"),
            ach("199580", "Nurse Moomoo back to health at Moomoo Farm."),
        ]},
        {"heading": "4.5 · Olivine City & the beaches", "items": [
            step("Reach the lighthouse top and talk to Jasmine to start Amphy's errand "
                 "(not done yet). Trade your spare Krabby for a Voltorb, grab the "
                 "Strength HM, then smash rocks on Route 40 for a chance at Shuckle.",
                 where="Olivine City"),
            ach("315214", "Trade a Krabby for Voltorb in Olivine."),
            ach("315215", "Level Voltorb to Lv. 30 → Electrode."),
            ach("315216", "Smash rocks on Route 40 to find a wild Shuckle."),
        ]},
        {"heading": "4.6 · Good Rod fishing & the Water Stone", "items": [
            step("Pick up the Good Rod in Olivine for more catches, then journey to Route "
                 "42 / Mt. Mortar. Defeat Fisherman Tully past the mountain for the final "
                 "stone contact — Water Stones now evolve several Pokémon.",
                 where="Good Rod", npc="Fisherman Tully"),
            ach("315217", "Good-Rod a Shellder (Olivine Harbor / New Bark Town)."),
            ach("315218", "Use a Water Stone on Shellder → Cloyster."),
            ach("315285", "Good-Rod a Chinchou (Olivine Harbor / New Bark Town)."),
            ach("315219", "Level Chinchou to Lv. 27 → Lanturn."),
            ach("315286", "Good-Rod a Corsola (Olivine City, Morning/Day)."),
            ach("315220", "Good-Rod a Staryu (Olivine City, Night)."),
            ach("315221", "Use a Water Stone on Staryu → Starmie."),
            ach("315287", "Catch a Marill (Mt. Mortar, Night)."),
            ach("315222", "Level Marill to Lv. 18 → Azumarill."),
            ach("315223", "Use a Water Stone on Poliwhirl → Poliwrath."),
        ]},
        {"heading": "4.7 · Route 43 — Farfetch'd", "items": [
            step("Rest in Mahogany Town, then head north to Route 43 for a Farfetch'd. "
                 "Keep going to the Lake of Rage (nothing to do there yet).",
                 where="Route 43"),
            ach("315288", "Catch a Farfetch'd (Route 43)."),
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
            step("Surf east from New Bark to Route 27 and enter Tohjo Falls to reach a "
                 "Moon Stone. In Union Cave's basement, Surf across to a grassy bit of "
                 "the Ruins of Alph for Natu and Smeargle; a Friday brings Lapras to the "
                 "lowest floor. The Aerodactyl puzzle room hides a third Moon Stone "
                 "(use Flash on the wall writing).", where="Union Cave / Ruins of Alph"),
            ach("315291", "Catch a Natu (any time, Ruins of Alph grass)."),
            ach("315228", "Level Natu to Lv. 25 → Xatu."),
            ach("315292", "Catch a Smeargle (any time except Night)."),
            ach("315229", "Catch the Lapras in Union Cave (Fridays only)."),
            ach("199591", "Catch the Union Cave Lapras and register it."),
        ]},
        {"heading": "5.2 · Route 41 & Cianwood — Eusine, Shuckie", "items": [
            step("Surf south from Olivine over Route 40 onto Route 41 (borders Cianwood) "
                 "for a Mantine. At Cianwood, grab Amphy's medicine at the pharmacy; head "
                 "north to see Suicune, where Eusine challenges you — required to meet "
                 "Suicune later. Mania here lends you the Shuckle 'Shuckie'.",
                 where="Route 41 / Cianwood City", npc="Eusine"),
            ach("315293", "Surf up a Mantine on Route 41."),
            ach("199568", "Defeat Eusine in Cianwood City."),
            ach("199630", "Raise Shuckie's Friendship high enough that Mania lets you keep it."),
            ach("199633", "Have a Shuckle turn a Berry into Berry Juice after a battle."),
            step("As the Suicune sequence continues you'll also witness it on Route 36.",
                 where="Route 36"),
            ach("199595", "Encounter Suicune on Route 36."),
        ]},
        {"heading": "5.3 · Lake of Rage & the Mahogany Rocket Hideout", "items": [
            step("Surf to the red Gyarados at the Lake of Rage. After catching/defeating "
                 "it, Lance teams up with you to raid the Rocket Hideout in Mahogany. "
                 "Inside you get the Whirlpool HM — also grab the Thief TM for a Moon "
                 "Stone later. The Fishing Guru by the lake rewards a record Magikarp.",
                 where="Lake of Rage / Mahogany Town", npc="Lance"),
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
            ach("315230", "POC checkpoint: 150 Pokémon registered before Pryce."),
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
            step("With Whirlpool, enter the Whirl Islands on Route 41. Seel appears in the "
                 "caves except at Night; Horsea is found while Surfing.",
                 where="Whirl Islands"),
            ach("315231", "Catch a Seel (caves, not Night)."),
            ach("315232", "Level Seel to Lv. 34 → Dewgong."),
            ach("315294", "Surf up a Horsea in the Whirl Islands."),
            ach("315233", "Level Horsea to Lv. 32 → Seadra (or catch a Seadra).",
                ["Seadra's evolution into Kingdra is a trade evolution — not obtainable."]),
        ]},
        {"heading": "6.2 · Cure Amphy & the two gyms", "items": [
            step("Deliver the medicine to the top of the Olivine Lighthouse to cure Amphy "
                 "— this opens Jasmine's gym. Defeat Chuck and Jasmine in a row.",
                 where="Olivine Lighthouse", npc="Jasmine"),
            ach("199569", "Cure Amphy at the top of the Olivine Lighthouse."),
            ach("5641", "Defeat Chuck in Cianwood City for the Storm Badge."),
            ach("199607", "Optional challenge: beat Chuck in Set style, Johto-only, ≤ Lv. "
                "30, no Pack items.",
                ["A Chinchou/Lanturn, Togetic, Mantine or Crobat carries this Flying-weak "
                 "gym."], type_label="Challenge"),
            ach("315295", "POC checkpoint: 154 Pokémon registered (Storm Badge)."),
            ach("5642", "Defeat Jasmine in Olivine City for the Mineral Badge."),
            ach("199608", "Optional challenge: beat Jasmine in Set style, Johto-only, ≤ "
                "Lv. 35, no Pack items.",
                ["Wooper/Quagsire (Ground) ignore her Magnetons; Sudowoodo and Heracross "
                 "bring Fighting moves."], type_label="Challenge"),
            ach("315234", "POC checkpoint: 154 Pokémon registered (Mineral Badge)."),
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
            ach("315235", "Catch Suicune."),
        ]},
        {"heading": "7.3 · Route 44 & Ice Path", "items": [
            step("With 7 badges the man blocking eastern Mahogany is gone. Route 44's "
                 "grass sits mid-water (Surf across): Lickitung Morning/Day, Tangela any "
                 "time. The Ice Path holds the Waterfall HM, Swinub & Jynx Morning/Day, "
                 "Delibird & Sneasel at Night (rates rise on lower floors).",
                 where="Route 44 / Ice Path"),
            ach("315296", "Catch a Lickitung (Route 44, Morning/Day)."),
            ach("315236", "Catch a Tangela (Route 44, any time)."),
            ach("315237", "Catch a Jynx (Ice Path, Morning/Day, lower floors)."),
            ach("315297", "Catch a Swinub (Ice Path, Morning/Day)."),
            ach("315238", "Level Swinub to Lv. 33 → Piloswine."),
            ach("315298", "Catch a Delibird (Ice Path, Night)."),
            ach("315239", "Catch a Sneasel (Ice Path, Night)."),
        ]},
        {"heading": "7.4 · Blackthorn City & Route 45", "items": [
            step("Blackthorn has a required in-game trade: a female Dragonair for a "
                 "Dodrio (available only after badge 8). South on Route 45 (bring Fly for "
                 "the ledges): Gligar any time, Skarmory Morning/Day; fish the small pond "
                 "on the right for two Dratini (one female). Then breed Dodrio→Doduo and "
                 "Jynx→Smoochum at the Day-Care.", where="Blackthorn City / Route 45"),
            ach("315299", "Catch a Gligar (Route 45, any time)."),
            ach("315240", "Catch a Skarmory (Route 45, Morning/Day)."),
            ach("315300", "Fish up two Dratini on Route 45 (one female for the trade)."),
            ach("315241", "Level Dratini to Lv. 30 → Dragonair."),
            ach("315242", "Level Dragonair to Lv. 55 → Dragonite."),
            ach("315243", "Trade a female Dragonair for Dodrio in Blackthorn."),
            ach("315244", "Breed Dodrio with Ditto and hatch a Doduo."),
            ach("315245", "Breed Jynx and hatch a Smoochum."),
        ]},
        {"heading": "7.5 · The Rising Badge — Clair", "items": [
            ach("315246", "POC checkpoint: 170 Pokémon registered before the Rising Badge."),
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
            step("After Clair, complete the trial in the Dragon's Den for your final "
                 "badge and Waterfall. Answer every question of the Master's quiz "
                 "correctly on the FIRST attempt to receive a Dratini with ExtremeSpeed. "
                 "Then see Prof. Elm in New Bark Town for the Master Ball.",
                 where="Dragon's Den", npc="Elder"),
            ach("199576", "Answer the Dragon Shrine quiz perfectly for an ExtremeSpeed "
                "Dratini."),
        ]},
        {"heading": "8.2 · Into Kanto's edge — Route 27 & Victory Road", "items": [
            step("Surf east of New Bark to Route 27 (cross Tohjo Falls via Waterfall). "
                 "Catch a Ponyta Morning/Day (more common on Route 26). In Victory Road, "
                 "catch Rhyhorn Morning/Day — or hunt the 5% Rhydon directly.",
                 where="Route 27 / Victory Road"),
            ach("315247", "Catch a Ponyta (Morning/Day)."),
            ach("315248", "Level Ponyta to Lv. 40 → Rapidash."),
            ach("315249", "Catch a Rhyhorn (Victory Road, Morning/Day)."),
            ach("315250", "Level Rhyhorn to Lv. 42 → Rhydon (or catch a wild Rhydon, 5%)."),
        ]},
        {"heading": "8.3 · The Elite Four & Champion Lance", "items": [
            step("At the Indigo Plateau your rival challenges you in an optional battle "
                 "before the League. Then take on the Elite Four and Champion Lance.",
                 where="Indigo Plateau", npc="Rival"),
            ach("199593", "Win the optional rival battle at the Indigo Plateau."),
            ach("315251", "POC checkpoint: 174 Pokémon registered before the Elite Four."),
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
            ach("199637", "Defeat every Trainer aboard the S.S. Aqua (after the first voyage)."),
            ach("315252", "Catch an Electabuzz (Route 10 grass)."),
            ach("199585", "Return the stolen Machine Part to the Power Plant staff."),
        ]},
        {"heading": "9.3 · Rock Tunnel, the radio card & Magnet Train", "items": [
            step("South to Rock Tunnel: catch Kangaskhan (lower floors) and find wild "
                 "Cubone/Marowak holding Thick Clubs. Exit south to Lavender Town's Radio "
                 "Tower for the radio expansion card (PokéFlute). In Saffron, the Copycat "
                 "wants her doll — fetch it from the Vermilion Pokémon Fan Club to get the "
                 "Magnet Train pass.", where="Rock Tunnel → Lavender → Saffron"),
            ach("315253", "Catch a Kangaskhan (Rock Tunnel, lower floors)."),
            ach("199599", "Obtain a Thick Club from a wild Cubone or Marowak."),
            ach("199640", "Receive the Magnet Train Pass from the Saffron Copycat."),
        ]},
        {"heading": "9.4 · Running around Kanto", "items": [
            step("From Saffron head toward Celadon. Route 7 at Night has Houndour and "
                 "Murkrow. In Celadon, Surf the small pool for Grimer (10% Muk). The Game "
                 "Corner sells Porygon (5,555 coins) and Larvitar (8,888). Prove to "
                 "Eusine in the Celadon Mart that you've caught Raikou/Entei/Suicune for "
                 "the Rainbow Wing. Slugma hides on Routes 16–18 in daytime.",
                 where="Kanto routes / Celadon", npc="Eusine"),
            ach("315255", "Catch a Houndour (Route 7, Night)."),
            ach("315256", "Level Houndour to Lv. 24 → Houndoom."),
            ach("315254", "Catch a Murkrow (Route 7, Night)."),
            ach("315257", "Surf up a Grimer in Celadon (10% chance of Muk)."),
            ach("315258", "Catch a Muk (or evolve Grimer at Lv. 38)."),
            ach("315259", "Buy a Porygon at the Celadon Game Corner (5,555 coins)."),
            ach("315301", "Buy a Larvitar at the Celadon Game Corner (8,888 coins).",
                ["This Larvitar comes at Lv. 40 — only 15 levels to a full Tyranitar."]),
            ach("315260", "Level Larvitar to Lv. 30 → Pupitar."),
            ach("315261", "Level Pupitar to Lv. 55 → Tyranitar."),
            ach("315302", "Catch a Slugma (Routes 16–18, daytime)."),
            ach("315262", "Level Slugma to Lv. 38 → Magcargo."),
        ]},
        {"heading": "9.5 · Chansey, Aerodactyl & the eastern routes", "items": [
            step("On Route 15 catch the 1% Chansey (Lv. 25 — repel-trick with a Lv. 24 "
                 "lead helps). Breed it so you keep one, then trade a Chansey on Route 14 "
                 "for Aerodactyl. Bill's grandfather on Route 25 rewards showing him "
                 "specific Pokémon.", where="Routes 14/15/25", npc="Bill's grandfather"),
            ach("315263", "Catch a Chansey (Route 15, 1% encounter)."),
            ach("315264", "Raise Chansey's happiness → Blissey."),
            ach("199600",
                "Obtain a Lucky Egg by catching or Thief-ing a wild Chansey."),
            ach("315303", "Trade a Chansey for Aerodactyl on Route 14."),
            ach("199588", "Show all 5 requested Pokémon to Bill's grandfather on Route 25."),
        ]},
        {"heading": "9.6 · Unlocking the rest of Kanto", "items": [
            step("Wake the Snorlax east of Vermilion with the PokéFlute (save first) to "
                 "open Diglett's Cave for Diglett. Emerge on Route 2 for Pikachu, then "
                 "Pewter (Silver Wing from the old man) and Mt. Moon for Clefairy and a "
                 "Moon Stone (Monday-night ritual needs Rock Smash). Surf at Pallet to "
                 "Route 21 for Mr. Mime.", where="Diglett's Cave → Mt. Moon → Route 21"),
            ach("199586", "Catch the Snorlax east of Vermilion and register it."),
            ach("315265", "Catch the Snorlax (wake it with the PokéFlute; save first)."),
            ach("315266", "Catch a Diglett (Diglett's Cave)."),
            ach("315267", "Catch a Dugtrio (or evolve Diglett at Lv. 26)."),
            ach("315268", "Catch a Pikachu on Route 2 (or take the Game Corner one)."),
            ach("315304", "Use a Thunder Stone on Pikachu → Raichu."),
            ach("315269", "Catch a Clefairy at Mt. Moon."),
            ach("315305", "Use a Moon Stone on Clefairy → Clefable."),
            ach("199587", "Receive a Moon Stone after the Clefairy ritual at Mt. Moon Square."),
            ach("315270", "Catch a Mr. Mime (Route 21, Morning/Day)."),
        ]},
        {"heading": "9.7 · Kanto baby Pokémon & errands", "items": [
            step("Back at the Johto Day-Care, breed your Kanto catches for their babies. "
                 "Daisy Oak in Pallet will comb a Pokémon for you.",
                 where="Day-Care / Pallet Town", npc="Daisy Oak"),
            ach("315307", "Breed Electabuzz and hatch an Elekid."),
            ach("315306", "Breed Pikachu/Raichu and hatch a Pichu."),
            ach("315271", "Breed Clefairy/Clefable and hatch a Cleffa."),
            ach("199625", "Have Daisy Oak comb your Pokémon in Pallet Town."),
        ]},
        {"heading": "9.8 · The two box legendaries", "items": [
            step("With the Rainbow Wing and Silver Wing, catch BOTH Lugia (deep in the "
                 "Whirl Islands) and Ho-Oh (top of the Tin Tower), each at Lv. 60. Heavy "
                 "Balls help on Lugia; use your Master Ball on one and catch the other "
                 "normally.", where="Whirl Islands / Tin Tower"),
            ach("5952", "Catch Lugia at the Whirl Islands."),
            ach("199589", "Catch Lugia without using a Master Ball."),
            ach("315273", "Catch Lugia."),
            ach("5953", "Catch Ho-Oh at the Tin Tower."),
            ach("199590", "Catch Ho-Oh without using a Master Ball."),
            ach("315272", "Catch Ho-Oh."),
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
            step("From the Pokémon League gates, exit west to Route 28 and the Pokémon "
                 "Center at Silver Cave. On the entrance floor (Morning/Day) catch a "
                 "Magmar to breed for Magby; Misdreavus appears on the next floor at "
                 "Night.", where="Silver Cave"),
            ach("315282", "Catch a Magmar (entrance floor, Morning/Day)."),
            ach("315283", "Breed Magmar and hatch a Magby."),
            ach("315281", "Catch a Misdreavus (next floor, Night)."),
        ]},
        {"heading": "11.2 · The summit — Red", "items": [
            step("Climb to the top of Mt. Silver to battle Red. His team is very high "
                 "level — bring your best six.", where="Mt. Silver summit", npc="Red"),
            ach("315284", "POC checkpoint: 206 Pokémon registered before Red."),
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
