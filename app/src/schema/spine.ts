import { z } from "zod";
import {
  chapterId,
  confidence,
  findDuplicates,
  imageRef,
  locationId,
  raAchievementId,
  sourceRefs,
  stepId,
  visitId,
} from "./common.ts";

// The checkable leaf (§6, Workstream A). Steps carry terse keyword beats shown
// by default (#11) with optional full prose one tap away; place identity moved
// up to the enclosing visit, so a step no longer carries free-text `location`
// or a `section` grouping label — visits provide both.
export const step = z.object({
  id: stepId,
  order: z.int().nonnegative(),
  // Terse beats, shown by default (#11); ≥1 so a step always says something.
  keywords: z.array(z.string().min(1)).min(1),
  // Full prose, expandable on demand.
  detail: z.string().min(1).optional(),
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

// A stable place in the guide (§6, Workstream A): the navigation target the
// location index aggregates around. Lives in a top-level `locations[]` on the
// spine layer and guide.json; visits reference one by `locationId`.
export const location = z.object({
  id: locationId,
  name: z.string().min(1),
  mapImage: imageRef.optional(),
});

// One occurrence of being at a location within a chapter — the editorial
// granularity of the spine. Revisits are multiple visits sharing a
// `locationId`. A visit is structure, not checkable: it holds no progress
// state of its own, only its ordered steps.
export const visit = z
  .object({
    id: visitId,
    locationId,
    order: z.int().nonnegative(),
    steps: z.array(step).min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.steps.map((s) => s.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: `Duplicate step ID "${id}" in visit "${value.id}"`,
      });
    }
    for (const order of findDuplicates(
      value.steps.map((s) => String(s.order)),
    )) {
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: `Duplicate step order ${order} in visit "${value.id}"`,
      });
    }
  });

// A chapter now groups visits (was steps) — a titled arc of the route; place
// aggregation is the location index's job, not the chapter's.
export const chapter = z
  .object({
    id: chapterId,
    title: z.string().min(1),
    intro: z.string().min(1).optional(),
    order: z.int().nonnegative(),
    visits: z.array(visit).min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.visits.map((v) => v.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["visits"],
        message: `Duplicate visit ID "${id}" in chapter "${value.id}"`,
      });
    }
    for (const order of findDuplicates(
      value.visits.map((v) => String(v.order)),
    )) {
      ctx.addIssue({
        code: "custom",
        path: ["visits"],
        message: `Duplicate visit order ${order} in chapter "${value.id}"`,
      });
    }
  });

export type Step = z.infer<typeof step>;
export type Location = z.infer<typeof location>;
export type Visit = z.infer<typeof visit>;
export type Chapter = z.infer<typeof chapter>;
