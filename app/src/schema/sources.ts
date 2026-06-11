import { z } from "zod";
import { findDuplicates, guideSlug, localId, schemaVersion } from "./common.ts";

export const sourceType = z.enum([
  "wiki",
  "ra-set",
  "manual",
  "video",
  "map",
  "other",
]);

export const sourceEntry = z.object({
  id: localId,
  title: z.string().min(1),
  // Optional: offline sources (a paper manual, a personal playthrough) have none.
  url: z.url().optional(),
  type: sourceType,
  retrievedAt: z.iso.date(),
});

// guides/<slug>/sources.json — the source manifest every sourceRef points
// into (§6.6). Records are append-only (§24): entries may be added, never
// removed or rewritten, or existing sourceRefs would dangle.
export const sourceManifest = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    sources: z.array(sourceEntry).min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.sources.map((s) => s.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: `Duplicate source ID "${id}"`,
      });
    }
  });

export type SourceType = z.infer<typeof sourceType>;
export type SourceEntry = z.infer<typeof sourceEntry>;
export type SourceManifest = z.infer<typeof sourceManifest>;
