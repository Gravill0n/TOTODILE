import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

export type ManifestEntry = {
  url: string;
  revision: string;
};

const IMAGE_EXTENSIONS = new Set([".png", ".gif", ".jpg", ".webp"]);

// Every JSON the player-facing routes fetch per guide — offline must cover
// all of them (§5.3): guide.json, the three playability inputs loadPlayability
// reads on every route (FR-E5 — approvals + layers manifest + QA signal), and
// ra-mapping.json (cleanup mastery + Sync). Offline, a non-precached fetch
// rejects with a network error — not a 404 — so absence handling never
// engages and the route loader throws.
const PLAYER_JSON_FILES = [
  "guide.json",
  "approvals.json",
  "ra-mapping.json",
  "layers/manifest.json",
  "layers/qa.report.json",
];

// Workbox precache entries for the player-facing repo content: library.json
// plus, per guide folder, the player-fetched JSONs and the guide images
// (§5.3 "assets + guide data cached"). Editor-only files (sources.json,
// deck.json, layer artifacts and pass reports) are fetched by the review
// lens alone — an online, editor-mode activity — and stay out of the
// offline cache. Content-hash revisions make a recompiled guide bust the
// cache on the next service-worker update.
export function collectContentManifestEntries(
  rootDir: string,
): ManifestEntry[] {
  const entries: ManifestEntry[] = [];

  const libraryPath = join(rootDir, "library.json");
  if (existsSync(libraryPath)) {
    entries.push(entryFor(libraryPath, "library.json"));
  }

  const guidesDir = join(rootDir, "guides");
  const slugs = existsSync(guidesDir)
    ? readdirSync(guidesDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
    : [];

  for (const slug of slugs) {
    for (const relative of PLAYER_JSON_FILES) {
      const path = join(guidesDir, slug, relative);
      if (existsSync(path)) {
        entries.push(entryFor(path, `guides/${slug}/${relative}`));
      }
    }
    for (const relative of imageFiles(join(guidesDir, slug))) {
      entries.push(
        entryFor(join(guidesDir, slug, relative), `guides/${slug}/${relative}`),
      );
    }
  }

  return entries.sort((a, b) => a.url.localeCompare(b.url));
}

function imageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(
      (dirent) => dirent.isFile() && IMAGE_EXTENSIONS.has(extname(dirent.name)),
    )
    .map((dirent) =>
      join(dirent.parentPath, dirent.name).slice(dir.length + 1),
    );
}

function entryFor(path: string, url: string): ManifestEntry {
  return {
    url,
    revision: createHash("md5").update(readFileSync(path)).digest("hex"),
  };
}
