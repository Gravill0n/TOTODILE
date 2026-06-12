import { z } from "zod";
import { checkableId, guideSlug, schemaVersion, stepId } from "./common.ts";

// Browser-side progress (§6 entity 8). The slot itself never lands in the
// repo; its schema lives here because the export file is part of the
// versioned data contract (§8.2, FR-B6) and must stay forward-importable.

export const itemState = z.object({
  // "skipped" is the explicit skip-for-later state, distinct from done
  // (FR-B2); the two are mutually exclusive by construction.
  state: z.enum(["done", "skipped"]),
  at: z.iso.datetime(),
});

// Denormalized at write time by the progress hook so the library screen
// can show completion % and current chapter (FR-A3) without fetching
// every guide.json.
export const progressStats = z.object({
  stepsDone: z.int().nonnegative(),
  stepsTotal: z.int().nonnegative(),
  currentChapterTitle: z.string().nullable(),
});

// Exactly one slot per guide (FR-B7).
export const progressSlot = z.object({
  guideId: guideSlug,
  currentStepId: stepId.nullable(),
  itemStates: z.record(checkableId, itemState),
  counterValues: z.record(checkableId, z.int().nonnegative()),
  stats: progressStats,
  lastActivityAt: z.iso.datetime(),
});

export const progressExport = z.object({
  kind: z.literal("totodile-progress"),
  schemaVersion,
  exportedAt: z.iso.datetime(),
  slots: z.array(progressSlot),
});

export type ItemState = z.infer<typeof itemState>;
export type ProgressStats = z.infer<typeof progressStats>;
export type ProgressSlot = z.infer<typeof progressSlot>;
export type ProgressExport = z.infer<typeof progressExport>;
