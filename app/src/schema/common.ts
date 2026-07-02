import { z } from "zod";

// Versioning conventions live in ./CHANGELOG.md (§9.2, §18.3): every contract
// change bumps the version and ships a migration note; guides migrate at
// recompile, never in the browser.

// The version the compiler emits.
export const SCHEMA_VERSION = 2;

// The versions the app and validate-guides read. Holds two versions only
// during a declared vN → vN+1 transition window (§18.3), then drops back
// to one. v1 → v2 window open: pokemon-crystal (and library.json) still
// declare v1 until their next recompile stamps v2.
export const SUPPORTED_SCHEMA_VERSIONS = [1, SCHEMA_VERSION] as const;

// Every repo-side guide file declares the schema version it was compiled
// against (§8.2 — the files are the API).
export const schemaVersion = z.literal(SUPPORTED_SCHEMA_VERSIONS);

// ─── Stable-ID grammar (§20.3) — fixed forever ──────────────────────────────
//
// Every ID is one or more kebab-case segments joined by ":":
//
//   segment      [a-z0-9]+(-[a-z0-9]+)*
//   guide slug   <slug>                        pokemon-crystal
//   chapter ID   <slug>:<chapter>              pokemon-crystal:c2
//   location ID  <slug>:<loc>                  pokemon-crystal:azalea-town
//   visit ID     <slug>:<visit>                pokemon-crystal:v-azalea-1
//   step ID      <slug>:<visit>:<short-id>     pokemon-crystal:v-azalea-1:s3
//   widget ID    <slug>:<widget>               pokemon-crystal:badges
//   item ID      <slug>:<widget>:<short-id>    pokemon-crystal:badges:rising
//   local ID     <segment>                     src-wiki — sources, layers,
//                                              decks, matrix axes, table columns
//
// IDs are never regenerated across recompiles (§6.8): progress data, RA
// mappings, and approvals key on them. The first segment is always the guide
// slug (enforced in guide.ts — slugs are stable forever). The middle segment
// records where the entity was *minted*: steps now mint under their visit, and
// if a recompile later moves a step to another visit (or an item to another
// widget), the ID keeps its original spelling. Containment is a minting
// convention, not a validated invariant, precisely so IDs can survive
// restructuring. locationId and visitId share the 2-segment shape of chapterId.

const SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
const oneSegment = new RegExp(`^${SEGMENT}$`);
const twoSegments = new RegExp(`^${SEGMENT}:${SEGMENT}$`);
const threeSegments = new RegExp(`^(?:${SEGMENT}:){2}${SEGMENT}$`);

export const guideSlug = z
  .string()
  .regex(
    oneSegment,
    'Expected a kebab-case guide slug, e.g. "pokemon-crystal"',
  );
export const chapterId = z
  .string()
  .regex(twoSegments, 'Expected "<slug>:<chapter>"');
export const locationId = z
  .string()
  .regex(twoSegments, 'Expected "<slug>:<location>"');
export const visitId = z
  .string()
  .regex(twoSegments, 'Expected "<slug>:<visit>"');
export const stepId = z
  .string()
  .regex(threeSegments, 'Expected "<slug>:<visit>:<short-id>"');
export const widgetId = z
  .string()
  .regex(twoSegments, 'Expected "<slug>:<widget>"');
export const itemId = z
  .string()
  .regex(threeSegments, 'Expected "<slug>:<widget>:<short-id>"');

// What progress states, RA-mapping targets, and spot-checks address: a step
// ID or a widget item ID — indistinguishable by design (§6.5), they share one
// checkable namespace per guide (enforced in guide.ts).
export const checkableId = z
  .string()
  .regex(
    threeSegments,
    "Expected a 3-segment checkable ID (step or widget item)",
  );

// IDs that never leave their containing file.
export const localId = z
  .string()
  .regex(oneSegment, "Expected a single kebab-case segment");

export function idSlug(id: string): string {
  return id.split(":")[0] ?? "";
}

// §6.6 invariant: every step and every widget row traces to at least one
// source-manifest entry. Whether the referenced IDs exist in sources.json
// is a cross-file check owned by validate-guides.
export const sourceRefs = z.array(localId).min(1);

// Compiler confidence on an emitted datum (FR-D2/D3); flagged rows surface
// in the review lens.
export const confidence = z.enum(["normal", "flagged"]);

// Guide content language (§5.6). App chrome carries no guide strings.
export const language = z.enum(["en", "fr"]);

export const imageRef = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().min(1).optional(),
  credit: z.string().min(1).optional(),
});

export const raGameId = z.int().positive();
export const raAchievementId = z.int().positive();

export type GuideSlug = z.infer<typeof guideSlug>;
export type ChapterId = z.infer<typeof chapterId>;
export type LocationId = z.infer<typeof locationId>;
export type VisitId = z.infer<typeof visitId>;
export type StepId = z.infer<typeof stepId>;
export type WidgetId = z.infer<typeof widgetId>;
export type ItemId = z.infer<typeof itemId>;
export type CheckableId = z.infer<typeof checkableId>;
export type LocalId = z.infer<typeof localId>;
export type Confidence = z.infer<typeof confidence>;
export type Language = z.infer<typeof language>;
export type ImageRef = z.infer<typeof imageRef>;

export function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
