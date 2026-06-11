import { z } from "zod";
import {
  checkableId,
  findDuplicates,
  guideSlug,
  raAchievementId,
  raGameId,
  schemaVersion,
} from "./common";

export const raMappingEntry = z.object({
  raAchievementId,
  // A step ID or widget item ID from guide.json. Existence is a cross-file
  // check owned by validate-guides. Several achievements may target the same
  // item (e.g. progression + challenge on one boss step).
  targetItemId: checkableId,
});

// guides/<slug>/ra-mapping.json — standalone and optional (§6.5). RA
// achievements absent from `entries` are legal; they surface in the Sync
// receipt's "unmapped" bucket.
export const raMapping = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    raGameId,
    entries: z.array(raMappingEntry),
  })
  .superRefine((value, ctx) => {
    const ids = value.entries.map((e) => String(e.raAchievementId));
    for (const id of findDuplicates(ids)) {
      ctx.addIssue({
        code: "custom",
        path: ["entries"],
        message: `RA achievement ${id} is mapped more than once`,
      });
    }
  });

export type RaMappingEntry = z.infer<typeof raMappingEntry>;
export type RaMapping = z.infer<typeof raMapping>;
