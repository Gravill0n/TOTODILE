import { z } from "zod";
import { findDuplicates, guideSlug, idSlug, schemaVersion } from "./common";
import { chapter } from "./spine";
import { widget, widgetItemIds } from "./widgets";

// guides/<slug>/guide.json — spine + widget instances (§20.1), the only file
// the player-facing app strictly needs per guide.
export const guideFile = z
  .object({
    schemaVersion,
    guideId: guideSlug,
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
    // Slugs are forever, so the first segment must match the guide — unlike
    // the middle segment, which only records where the entity was minted
    // (see the grammar note in common.ts).
    const expectSlug = (
      id: string,
      path: (string | number)[],
      what: string,
    ) => {
      if (idSlug(id) !== value.guideId) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `${what} "${id}" does not carry the guide slug "${value.guideId}"`,
        });
      }
    };
    value.chapters.forEach((c, ci) => {
      expectSlug(c.id, ["chapters", ci, "id"], "Chapter ID");
      c.steps.forEach((s, si) => {
        expectSlug(s.id, ["chapters", ci, "steps", si, "id"], "Step ID");
      });
    });
    value.widgets.forEach((w, wi) => {
      expectSlug(w.id, ["widgets", wi, "id"], "Widget ID");
      for (const id of widgetItemIds(w)) {
        expectSlug(id, ["widgets", wi], "Item ID");
      }
    });
  });

export type GuideFile = z.infer<typeof guideFile>;
