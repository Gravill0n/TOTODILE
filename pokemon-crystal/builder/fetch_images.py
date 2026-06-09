#!/usr/bin/env python3
"""
fetch_images.py — download every remote image referenced by a guide JSON into
a local folder and rewrite the JSON paths to point at the local copies.

Honours the constraint "download images into a local folder". It is
best-effort: in a locked-down sandbox some hosts are unreachable. Any image it
cannot fetch is reported so Claude can ask the user to supply the file instead
of silently shipping a broken link.

Walks these fields:
  - achievements[].badge_img
  - chapters[].sections[].items[].figure.src     (route figures)
  - chapters[].sections[].items[].figure          (chapter-level figures too)

Usage:
    python fetch_images.py guide.json --img-dir output/assets/img
"""

import argparse
import hashlib
import json
import os
import urllib.request
import urllib.error


def is_remote(url):
    return isinstance(url, str) and url.startswith(("http://", "https://"))


def local_name(url):
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        ext = ".png"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    return digest + ext


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "guide-builder/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()
    with open(dest, "wb") as fh:
        fh.write(data)
    return len(data)


def collect_urls(data):
    """Return list of (setter_callable, url) for every remote image field."""
    refs = []

    for a in data.get("achievements", []):
        url = a.get("badge_img")
        if is_remote(url):
            refs.append((lambda v, a=a: a.__setitem__("badge_img", v), url))

    for ch in data.get("chapters", []):
        for sec in ch.get("sections", []):
            for item in sec.get("items", []):
                fig = item.get("figure")
                if fig and is_remote(fig.get("src")):
                    refs.append(
                        (lambda v, f=fig: f.__setitem__("src", v), fig["src"]))
    return refs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path")
    ap.add_argument("--img-dir", required=True,
                    help="Folder to download into (e.g. output/assets/img).")
    ap.add_argument("--rel-prefix", default=None,
                    help="Path prefix written into the JSON "
                         "(default: relative 'assets/img').")
    args = ap.parse_args()

    with open(args.json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    os.makedirs(args.img_dir, exist_ok=True)
    rel_prefix = args.rel_prefix if args.rel_prefix is not None else "assets/img"

    refs = collect_urls(data)
    ok, failed = 0, []
    cache = {}
    for setter, url in refs:
        if url in cache:
            setter(cache[url])
            continue
        name = local_name(url)
        dest = os.path.join(args.img_dir, name)
        rel = rel_prefix.rstrip("/") + "/" + name
        try:
            if not os.path.exists(dest):
                download(url, dest)
            setter(rel)
            cache[url] = rel
            ok += 1
        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
            failed.append((url, str(e)))

    with open(args.json_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

    print("Downloaded/localized: " + str(ok))
    if failed:
        print("FAILED (" + str(len(failed)) + ") — ask the user to supply these files:")
        for url, err in failed:
            print("  - " + url + "  (" + err + ")")


if __name__ == "__main__":
    main()
