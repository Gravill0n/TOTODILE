# Summary: React app to regroup video game guides/trackers
Date: 2026-06-09 | Ideas: ~85 (25 distilled) | Forks: 2

## Key Themes
- Guide-as-data: guides are static JSON in the repo, no backend; the React app renders them; old single-file HTML survives as a "print lens"
- 7 widget primitives (checklist, matrix, data table, counter, flowchart/chain, map pins, prep-card); a genre = a default arrangement ("deck") — new genre = config, not code
- Production rework: schema-first multi-pass compiler (spine → widgets → RA mapping → QA), each pass a smaller skill, source manifest per guide
- Human-in-the-loop QA: user approves each layer inside the app (review lens) via confidence flags + random spot-checks against source excerpts
- Simple RA sync: one manual Sync button (first press = backfill) + sync receipt; mapping lives in its own file
- One responsive app, two postures: desktop = browse/review, phone = burst-driven companion landing on the current step (Now screen); offline-first PWA

## Top Ideas (all, condensed)
1. Guide-as-data (JSON + one render engine)  2. Companion phone use  3. One-button RA sync + backfill
4. Widgets/Lego blocks  5. Genre = default deck  6. 7 primitives  7. Spine + organs
8. Multi-pass compiler as smaller skills  9. Schema-first  10. Source manifest
11. Confidence flags  12. Random spot-check  13. In-app review lens
14. Now screen landing  15. Responsive postures  16. Offline-first PWA
17. Missables radar (derived widget)  18. Cleanup mode  19. Skip ≠ done → cleanup list
20. HTML→JSON migration of 5 existing guides  21. Print lens back to single-file HTML
22. Pokémon Crystal as pilot guide (schema v0 seeded from ML PiT build/guide.json)
23. Sync receipt  24. RA mapping as standalone community-fixable file  25. Per-primitive "Now card"

## Forks Explored
- RA sync mechanics: explored polling/rich-presence/session modes → decided to keep just a manual Sync button
- Companion UX: explored always-on couch mode → decided companion = responsive app checked in bursts

Full session: brainstorm-react-app-to-regroup-video-game-guides-trackers-20260609-2036.md
