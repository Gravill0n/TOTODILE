import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  migrateLocations,
  refreshReportInputs,
  sha256,
} from "./migrateMapImagesCore.ts";

// One-shot: `location.mapImage` → `location.mapImages[]` across the compiled
// guides (2026-07-31). See migrateMapImagesCore.ts for what it does and why it
// is allowed to refresh two recorded input digests. Idempotent — re-running it
// on a migrated repo writes nothing.
//
//   node scripts/migrateMapImages.ts [--write] [slug…]
//
// Without --write it reports and touches nothing. Run `yarn validate-guides`
// afterwards: the manifest digest for each spine layer will be stale until
// `yarn build-layers-manifest <slug>` re-derives it.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const slugs = args.filter((arg) => !arg.startsWith("--"));

const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

// Two spaces, trailing newline — what every other writer in scripts/ emits, so
// the diff is the migration and not a reformat.
const writeJson = (path: string, body: unknown) =>
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`);

const guidesDir = join(repoRoot, "guides");
const targets =
  slugs.length > 0
    ? slugs
    : readdirSync(guidesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

let wroteAnything = false;

for (const slug of targets) {
  const dir = join(guidesDir, slug);
  const guidePath = join(dir, "guide.json");
  const spinePath = join(dir, "layers", "spine.json");
  const wrote: string[] = [];

  // guide.json carries the widgets, so it is the one file that knows which
  // maps a location can adopt — but the SPINE layer owns locations, and QA
  // reassembles guide.json from it. Migrating guide.json alone would hand the
  // adopted maps to the next `yarn assemble-guide` to throw away, so the same
  // widget list is applied to both. It is also the right place for review:
  // the spine layer is what Pierre re-approves.
  const widgets = existsSync(guidePath)
    ? ((readJson(guidePath).widgets ?? []) as never[])
    : [];

  if (existsSync(guidePath)) {
    const guide = readJson(guidePath);
    const counts = migrateLocations(guide as never);
    const next = `${JSON.stringify(guide, null, 2)}\n`;
    if (next !== readFileSync(guidePath, "utf8")) {
      if (write) writeJson(guidePath, guide);
      wrote.push("guide.json");
    }
    console.log(
      `${slug}: ${counts.locations} location(s), ${counts.shapeConverted} map(s) converted, ` +
        `${counts.adopted} adopted from pin widgets, ${counts.multiMap} place(s) now hold more than one`,
    );
  }

  if (existsSync(spinePath)) {
    const spine = readJson(spinePath);
    migrateLocations(spine as never, widgets);
    const next = `${JSON.stringify(spine, null, 2)}\n`;
    if (next !== readFileSync(spinePath, "utf8")) {
      if (write) writeJson(spinePath, spine);
      wrote.push("layers/spine.json");
    }
  }

  // The digest refresh runs after both files are on disk, so it hashes what a
  // pass would now read.
  const layersDir = join(dir, "layers");
  const digestOf = (file: string) => {
    const path = join(dir, file);
    return existsSync(path) ? sha256(readFileSync(path)) : null;
  };
  let refreshed = 0;
  if (existsSync(layersDir) && write) {
    for (const name of readdirSync(layersDir).filter((n) =>
      n.endsWith(".report.json"),
    )) {
      const path = join(layersDir, name);
      const report = readJson(path);
      if (refreshReportInputs(report as never, digestOf)) {
        writeJson(path, report);
        refreshed += 1;
      }
    }
  }

  if (wrote.length > 0 || refreshed > 0) {
    wroteAnything = true;
    console.log(
      `  ${write ? "wrote" : "would write"} ${wrote.join(", ") || "no layer files"}` +
        (refreshed > 0 ? ` · refreshed ${refreshed} report digest(s)` : ""),
    );
  }
}

if (!write) {
  console.log(
    wroteAnything
      ? "\nDry run — nothing written. Re-run with --write."
      : "\nNothing to migrate.",
  );
}
