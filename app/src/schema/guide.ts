import { z } from "zod";
import { findDuplicates, schemaVersion, stableId } from "./common";
import { chapter } from "./spine";
import { widget, widgetItemIds } from "./widgets";

// guides/<slug>/guide.json — spine + widget instances (§20.1), the only file
// the player-facing app strictly needs per guide.
export const guideFile = z
  .object({
    schemaVersion,
    guideId: stableId,
    chapters: z.array(chapter).min(1),
    widgets: z.array(widget).default([]),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.chapters.map((c) => c.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: `Duplicate chapter ID "${id}"`,
      });
    }
    for (const order of findDuplicates(
      value.chapters.map((c) => String(c.order)),
    )) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: `Duplicate chapter order ${order}`,
      });
    }
    for (const id of findDuplicates(value.widgets.map((w) => w.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["widgets"],
        message: `Duplicate widget ID "${id}"`,
      });
    }
    // Step IDs and widget item IDs share one namespace: progress states and
    // RA-mapping targets address both kinds without qualification (§6.5).
    const checkableIds = [
      ...value.chapters.flatMap((c) => c.steps.map((s) => s.id)),
      ...value.widgets.flatMap(widgetItemIds),
    ];
    for (const id of findDuplicates(checkableIds)) {
      ctx.addIssue({
        code: "custom",
        message: `Checkable ID "${id}" is not unique across steps and widget items`,
      });
    }
    const chapterIds = new Set(value.chapters.map((c) => c.id));
    value.widgets.forEach((w, index) => {
      if (w.scope.kind === "chapter" && !chapterIds.has(w.scope.chapterId)) {
        ctx.addIssue({
          code: "custom",
          path: ["widgets", index, "scope", "chapterId"],
          message: `Widget "${w.id}" is scoped to unknown chapter "${w.scope.chapterId}"`,
        });
      }
    });
  });

export type GuideFile = z.infer<typeof guideFile>;
