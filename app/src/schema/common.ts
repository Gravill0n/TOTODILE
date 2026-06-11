import { z } from "zod";

// v0. Bump rules + changelog conventions land in Phase 0 Task 4 (§9.2, §18.3).
export const SCHEMA_VERSION = 0;

// Every repo-side guide file declares the schema version it was compiled
// against (§8.2 — the files are the API).
export const schemaVersion = z.literal(SCHEMA_VERSION);

// Stable entity ID. IDs are forever — never regenerated across recompiles
// (§6.8); progress data and approvals key on them. The exact format
// (`<slug>:<chapter>:<short-id>` style) is fixed in Phase 0 Task 3.
export const stableId = z.string().min(1);

// §6.6 invariant: every step and every widget row traces to at least one
// source-manifest entry. Whether the referenced IDs exist in sources.json
// is a cross-file check owned by validate-guides.
export const sourceRefs = z.array(stableId).min(1);

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

export type StableId = z.infer<typeof stableId>;
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
