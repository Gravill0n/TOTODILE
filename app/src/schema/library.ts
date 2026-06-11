import { z } from "zod";
import {
  findDuplicates,
  guideSlug,
  language,
  localId,
  raGameId,
  schemaVersion,
} from "./common.ts";

// In-compilation guides open into the review lens, never play (§7 S1).
export const guideStatus = z.enum(["in-compilation", "playable"]);

export const libraryEntry = z.object({
  // The guide slug (kebab-case, §20.3) — also the guides/<slug>/ folder name
  // and the progress-store key, so it is stable forever.
  id: guideSlug,
  title: z.string().min(1),
  game: z.string().min(1),
  platform: z.string().min(1),
  // Absent for guides without an RA set; Sync is unavailable for them.
  raGameId: raGameId.optional(),
  deckId: localId,
  language,
  status: guideStatus,
  cover: z.string().min(1).optional(),
});

// /library.json — one file = the library (§6.1).
export const libraryManifest = z
  .object({
    schemaVersion,
    guides: z.array(libraryEntry),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.guides.map((g) => g.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["guides"],
        message: `Duplicate guide ID "${id}"`,
      });
    }
  });

export type GuideStatus = z.infer<typeof guideStatus>;
export type LibraryEntry = z.infer<typeof libraryEntry>;
export type LibraryManifest = z.infer<typeof libraryManifest>;
