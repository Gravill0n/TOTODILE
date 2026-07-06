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
// Planned guides are backlog entries: a manifest row with no compiled
// content (and possibly no guides/<slug>/ folder) yet.
export const guideStatus = z.enum(["planned", "in-compilation", "playable"]);

export const libraryEntry = z.object({
  // The guide slug (kebab-case, §20.3) — also the guides/<slug>/ folder name
  // and the progress-store key, so it is stable forever.
  id: guideSlug,
  title: z.string().min(1),
  game: z.string().min(1),
  platform: z.string().min(1),
  // Absent for guides without an RA set; Sync is unavailable for them.
  raGameId: raGameId.optional(),
  // Absent until the sources-pass bootstrap picks the deck (Pierre's call) —
  // a planned backlog entry has no deck yet. Once guides/<slug>/deck.json
  // exists, validate-guides requires it and cross-checks it.
  deckId: localId.optional(),
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
