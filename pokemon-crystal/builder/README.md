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
