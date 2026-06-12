import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

export type ManifestEntry = {
  url: string;
  revision: string;
};

const IMAGE_EXTENSIONS = new Set([".png", ".gif", ".jpg", ".webp"]);

// Workbox precache entries for the player-facing repo content: library.json
// plus, per guide folder, guide.json and its images (§5.3 "assets + guide
// data cached"). Editor-side files (sources.json, deck.json, ra-mapping.json,
// approvals.json, layers/) are never fetched by the app and stay out of the
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
    const guidePath = join(guidesDir, slug, "guide.json");
    if (existsSync(guidePath)) {
      entries.push(entryFor(guidePath, `guides/${slug}/guide.json`));
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
