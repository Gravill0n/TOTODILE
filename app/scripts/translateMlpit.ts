// One-off Phase 0 Task 7 translation: ml-partners-in-time/build/guide.json
// (legacy hand-built format) → schema v0 under guides/ml-partners-in-time/.
// Purely mechanical — no content is invented; anything that does not map
// is enumerated in layers/translation-report.md. Run manually:
//   node scripts/translateMlpit.ts
// Kept for reproducibility until the Phase 2 compiler recompiles ML PiT
// formally (Phase 5 task 4). The legacy folder is read-only: this script
// only reads from it and copies images out.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import type { Chapter, GuideFile, Step } from "../src/schema/index.ts";
import {
  genreDeck,
  guideFile,
  raMapping,
  SCHEMA_VERSION,
  sourceManifest,
} from "../src/schema/index.ts";

const SLUG = "ml-partners-in-time";
// From the legacy source manifest: retroachievements.org/game/3118.
const RA_GAME_ID = 3118;
// The legacy build has no per-source retrieval dates; this is the last git
// commit date of ml-partners-in-time/build/guide.json.
const RETRIEVED_AT = "2026-06-07";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const legacyDir = join(repoRoot, "ml-partners-in-time");
const outDir = join(repoRoot, "guides", SLUG);

type LegacyFigure = {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
};
type LegacyItem = {
  type: "step" | "achievement";
  text?: string;
  where?: string;
  npc?: string;
  figure?: LegacyFigure;
  ach?: string;
};
type LegacyChapter = {
  id: string;
  title: string;
  kind: "route" | "roundup";
  intro?: string;
  sections?: { heading: string; items: LegacyItem[] }[];
  achievements?: string[];
};
type LegacyAchievement = {
  id: string;
  name: string;
  callout_do: string;
  missable?: boolean;
  missing_info?: string;
};
type LegacyGuide = {
  game: { title: string; platform: string };
  sources: { label: string; url: string; role: string; note: string }[];
  achievements: LegacyAchievement[];
  chapters: LegacyChapter[];
};

const legacy = JSON.parse(
  readFileSync(join(legacyDir, "build", "guide.json"), "utf8"),
) as LegacyGuide;

const achievementById = new Map(legacy.achievements.map((a) => [a.id, a]));
const report: string[] = [];
const flagged: string[] = [];

function raIdOf(legacyAchId: string): number {
  const raId = Number(legacyAchId.replace(/^ach-/, ""));
  if (!Number.isInteger(raId) || raId <= 0) {
    throw new Error(`Cannot derive RA achievement ID from "${legacyAchId}"`);
  }
  return raId;
}

function lookupAch(legacyAchId: string): LegacyAchievement {
  const ach = achievementById.get(legacyAchId);
  if (!ach) throw new Error(`Unknown achievement reference "${legacyAchId}"`);
  return ach;
}

// ── Images: copy referenced figures out of the read-only legacy folder ──
const copiedImages = new Set<string>();
function translateFigure(figure: LegacyFigure) {
  const name = basename(figure.src);
  if (!copiedImages.has(name)) {
    mkdirSync(join(outDir, "images"), { recursive: true });
    copyFileSync(
      join(legacyDir, "output", figure.src),
      join(outDir, "images", name),
    );
    copiedImages.add(name);
  }
  return {
    src: `images/${name}`,
    alt: figure.alt,
    ...(figure.caption ? { caption: figure.caption } : {}),
    ...(figure.credit ? { credit: figure.credit } : {}),
  };
}

// ── Route chapters → spine ──────────────────────────────────────────────
const mappingEntries: { raAchievementId: number; targetItemId: string }[] = [];
const chapters: Chapter[] = [];

for (const legacyChapter of legacy.chapters) {
  if (legacyChapter.kind !== "route") continue;
  const match = legacyChapter.id.match(/^chapter-(\d+)$/);
  if (!match)
    throw new Error(`Unexpected route chapter id "${legacyChapter.id}"`);
  const chapterIdStr = `${SLUG}:c${match[1]}`;

  const steps: Step[] = [];
  let lastStep: Step | undefined;
  for (const section of legacyChapter.sections ?? []) {
    for (const item of section.items) {
      if (item.type === "step") {
        if (!item.text)
          throw new Error(`Step without text in ${legacyChapter.id}`);
        const step: Step = {
          id: `${chapterIdStr}:s${steps.length + 1}`,
          order: steps.length,
          text: item.npc ? `${item.npc} — ${item.text}` : item.text,
          section: section.heading,
          achievementRefs: [],
          images: item.figure ? [translateFigure(item.figure)] : [],
          sourceRefs: ["src-walkthrough"],
          confidence: "normal",
          ...(item.where ? { location: item.where } : {}),
        };
        steps.push(step);
        lastStep = step;
      } else if (item.type === "achievement") {
        if (!item.ach) throw new Error("Achievement item without ach id");
        if (!lastStep) {
          throw new Error(
            `Callout ${item.ach} has no preceding step to anchor to`,
          );
        }
        const ach = lookupAch(item.ach);
        lastStep.achievementRefs.push(raIdOf(ach.id));
        if (!lastStep.sourceRefs.includes("src-ra")) {
          lastStep.sourceRefs.push("src-ra");
        }
        mappingEntries.push({
          raAchievementId: raIdOf(ach.id),
          targetItemId: lastStep.id,
        });
        if (ach.missable) {
          if (lastStep.missable) {
            report.push(
              `Step ${lastStep.id} anchors more than one missable achievement; only the first callout ("${lastStep.missable.deadline}") became the step's missable deadline.`,
            );
          } else {
            lastStep.missable = { deadline: ach.callout_do };
          }
        }
        if (ach.missing_info) {
          lastStep.confidence = "flagged";
          flagged.push(
            `${lastStep.id} (${ach.id} "${ach.name}"): ${ach.missing_info}`,
          );
        }
      }
    }
  }
  chapters.push({
    id: chapterIdStr,
    title: legacyChapter.title,
    intro: legacyChapter.intro,
    order: chapters.length,
    steps,
  });
}

// ── Roundup chapters → checklist widgets (both fill the checklist slot) ──
const widgets: GuideFile["widgets"] = [];
for (const legacyChapter of legacy.chapters) {
  if (legacyChapter.kind !== "roundup") continue;
  const shortId = legacyChapter.id.replace(/^chapter-/, "");
  widgets.push({
    id: `${SLUG}:${shortId}`,
    type: "checklist",
    title: legacyChapter.title,
    scope: { kind: "global" },
    deckPosition: 0,
    rows: (legacyChapter.achievements ?? []).map((legacyAchId) => {
      const ach = lookupAch(legacyAchId);
      mappingEntries.push({
        raAchievementId: raIdOf(ach.id),
        targetItemId: `${SLUG}:${shortId}:${ach.id}`,
      });
      if (ach.missing_info) {
        flagged.push(
          `${SLUG}:${shortId}:${ach.id} ("${ach.name}"): ${ach.missing_info}`,
        );
      }
      return {
        itemId: `${SLUG}:${shortId}:${ach.id}`,
        label: ach.name,
        note: ach.callout_do,
        sourceRefs: ["src-ra"],
        confidence: ach.missing_info
          ? ("flagged" as const)
          : ("normal" as const),
      };
    }),
  });
  if (legacyChapter.intro) {
    report.push(
      `Roundup intro for "${legacyChapter.title}" has no home on a checklist widget and was dropped: "${legacyChapter.intro}"`,
    );
  }
}

// ── Assemble + validate before writing anything ─────────────────────────
const guide = {
  schemaVersion: SCHEMA_VERSION,
  guideId: SLUG,
  chapters,
  widgets,
};

const sources = {
  schemaVersion: SCHEMA_VERSION,
  guideId: SLUG,
  sources: [
    {
      id: "src-ra",
      title: legacy.sources[0]?.label ?? "RetroAchievements set",
      url: "https://retroachievements.org/game/3118",
      type: "ra-set",
      retrievedAt: RETRIEVED_AT,
    },
    {
      id: "src-walkthrough",
      title:
        legacy.sources[1]?.label ?? "GameFAQs FAQ/Walkthrough (route spine)",
      url: "https://gamefaqs.gamespot.com/ds/928290-mario-and-luigi-partners-in-time/faqs",
      type: "other",
      retrievedAt: RETRIEVED_AT,
    },
    {
      id: "src-maps",
      title: legacy.sources[2]?.label ?? "VGMaps region maps",
      url: "https://www.vgmaps.com/Atlas/DS/index.htm",
      type: "map",
      retrievedAt: RETRIEVED_AT,
    },
    {
      id: "src-wiki",
      title: legacy.sources[3]?.label ?? "Super Mario Wiki",
      url: "https://www.mariowiki.com/Mario_%26_Luigi:_Partners_in_Time",
      type: "wiki",
      retrievedAt: RETRIEVED_AT,
    },
  ],
};

const mapping = {
  schemaVersion: SCHEMA_VERSION,
  guideId: SLUG,
  raGameId: RA_GAME_ID,
  entries: mappingEntries,
};

// Standard RPG deck (same shape as the fixture's deck-rpg); ML PiT only
// instantiates the checklist slot for now.
const deck = {
  schemaVersion: SCHEMA_VERSION,
  id: "deck-rpg",
  slots: [
    {
      primitive: "checklist",
      defaultTitle: "Key items",
      defaultScope: "chapter",
    },
    { primitive: "matrix", defaultTitle: "Combos", defaultScope: "global" },
    {
      primitive: "dataTable",
      defaultTitle: "Bestiary",
      defaultScope: "global",
    },
    {
      primitive: "counter",
      defaultTitle: "Collectibles",
      defaultScope: "global",
    },
    {
      primitive: "flowchart",
      defaultTitle: "Trade chain",
      defaultScope: "global",
    },
    { primitive: "mapPins", defaultTitle: "Locations", defaultScope: "global" },
    {
      primitive: "prepCard",
      defaultTitle: "Boss prep",
      defaultScope: "chapter",
    },
  ],
};

function parseOrDie<S extends z.ZodType>(
  name: string,
  schema: S,
  value: unknown,
) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `${name} failed schema validation:\n${result.error.message}`,
    );
  }
}
parseOrDie("guide.json", guideFile, guide);
parseOrDie("sources.json", sourceManifest, sources);
parseOrDie("ra-mapping.json", raMapping, mapping);
parseOrDie("deck.json", genreDeck, deck);

mkdirSync(join(outDir, "layers"), { recursive: true });
const writeJson = (file: string, value: unknown) =>
  writeFileSync(join(outDir, file), `${JSON.stringify(value, null, 2)}\n`);
writeJson("guide.json", guide);
writeJson("sources.json", sources);
writeJson("ra-mapping.json", mapping);
writeJson("deck.json", deck);

const stepCount = chapters.reduce((n, c) => n + c.steps.length, 0);
const rowCount = widgets.reduce(
  (n, w) => n + (w.type === "checklist" ? w.rows.length : 0),
  0,
);
const reportMd = `# ML PiT translation report — legacy build → schema v0

Generated by \`app/scripts/translateMlpit.ts\` from
\`ml-partners-in-time/build/guide.json\` (last committed ${RETRIEVED_AT}).
Mechanical translation: no content invented (§24, §0.2).

## Counts

- Chapters: ${chapters.length} route chapters (legacy roundup chapters became checklist widgets)
- Steps: ${stepCount}
- Checklist widgets: ${widgets.length} (${rowCount} rows)
- RA mapping entries: ${mappingEntries.length} of ${legacy.achievements.length} achievements (all mapped)
- Images copied: ${copiedImages.size}

## Flagged items (confidence "flagged")

${flagged.length === 0 ? "None." : flagged.map((f) => `- ${f}`).join("\n")}

## Translation notes

${report.length === 0 ? "None." : report.map((r) => `- ${r}`).join("\n")}

## Recorded losses (content with no schema v0 home)

- Achievement metadata bodies: \`description\`, \`howto\`, \`points\`,
  \`rarity\`, \`badge_img\`, \`type_label\` — RA metadata comes from the RA
  API at sync/compile time; the hand-written \`howto\` prose remains in the
  legacy file, which stays in the repo until the Phase 5 formal recompile.
- \`callout_do\` for step-anchored achievements (kept only where it became a
  missable deadline or a checklist row note).
- \`missable\` on the two roundup completion achievements (checklist rows
  carry no missable flag; their notes state it).
- \`game.accent\`, \`game.spoiler_warning\`, chapter \`kind\`, per-source
  \`note\` fields.
- Legacy \`game.slug\` was "ml-partners-in-time-ra"; the canonical slug is
  the existing folder name "${SLUG}" (§20.3).
- Library \`title\`/\`game\`/\`platform\` were normalized from the legacy
  display strings ("… — Achievement Guide", "Nintendo DS · RetroAchievements").
`;
writeFileSync(join(outDir, "layers", "translation-report.md"), reportMd);

console.log(
  `ok: wrote ${stepCount} steps in ${chapters.length} chapters, ${widgets.length} widgets, ${mappingEntries.length} RA entries, ${copiedImages.size} images → guides/${SLUG}/`,
);
console.log(`report: guides/${SLUG}/layers/translation-report.md`);
