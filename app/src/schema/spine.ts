import { z } from "zod";
import {
  chapterId,
  confidence,
  findDuplicates,
  imageRef,
  raAchievementId,
  sourceRefs,
  stepId,
} from "./common.ts";

export const step = z.object({
  id: stepId,
  order: z.int().nonnegative(),
  text: z.string().min(1),
  location: z.string().min(1).optional(),
  // Grouping label within the chapter (e.g. "2.1 · Descent Through the
  // Castle"); renderers may group consecutive steps that share one.
  section: z.string().min(1).optional(),
  // Presence of `missable` is the flag; `deadline` is the human-readable
  // "do this before X" description shown in the missable banner (§6.2, FR-B5).
  missable: z.object({ deadline: z.string().min(1) }).optional(),
  // RA achievement IDs earnable at this step — inline badge on the play view.
  // The reverse link (RA achievement → item) lives in the RA mapping (§6.5).
  achievementRefs: z.array(raAchievementId).default([]),
  images: z.array(imageRef).default([]),
  sourceRefs,
  confidence,
});

export const chapter = z
  .object({
    id: chapterId,
    title: z.string().min(1),
    intro: z.string().min(1).optional(),
    order: z.int().nonnegative(),
    steps: z.array(step).min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.steps.map((s) => s.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: `Duplicate step ID "${id}" in chapter "${value.id}"`,
      });
    }
    for (const order of findDuplicates(
      value.steps.map((s) => String(s.order)),
    )) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: `Duplicate step order ${order} in chapter "${value.id}"`,
      });
    }
  });

export type Step = z.infer<typeof step>;
export type Chapter = z.infer<typeof chapter>;
