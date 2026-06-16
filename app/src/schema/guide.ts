import { z } from "zod";
import { findDuplicates, guideSlug, idSlug, schemaVersion } from "./common.ts";
import { chapter, location } from "./spine.ts";
import { widget, widgetItemIds } from "./widgets.ts";

// guides/<slug>/guide.json — locations + spine + widget instances (§20.1), the
// only file the player-facing app strictly needs per guide.
export const guideFile = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    // Top-level place registry (Workstream A): visits reference these by id,
    // and the location index aggregates everything earnable at each.
    locations: z.array(location).default([]),
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
    for (const id of findDuplicates(value.locations.map((l) => l.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["locations"],
        message: `Duplicate location ID "${id}"`,
      });
    }
    // Visit IDs are minted globally per guide — they must be unique across all
    // chapters (they are FK targets for visit-scoped widgets, and steps mint
    // under them).
    const visits = value.chapters.flatMap((c) => c.visits);
    for (const id of findDuplicates(visits.map((v) => v.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: `Duplicate visit ID "${id}"`,
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
      ...visits.flatMap((v) => v.steps.map((s) => s.id)),
      ...value.widgets.flatMap(widgetItemIds),
    ];
    for (const id of findDuplicates(checkableIds)) {
      ctx.addIssue({
        code: "custom",
        message: `Checkable ID "${id}" is not unique across steps and widget items`,
      });
    }
    // FK: every visit names a location that exists.
    const locationIds = new Set(value.locations.map((l) => l.id));
    const visitIds = new Set(visits.map((v) => v.id));
    value.chapters.forEach((c, ci) => {
      c.visits.forEach((v, vi) => {
        if (!locationIds.has(v.locationId)) {
          ctx.addIssue({
            code: "custom",
            path: ["chapters", ci, "visits", vi, "locationId"],
            message: `Visit "${v.id}" references unknown location "${v.locationId}"`,
          });
        }
      });
    });
    // FK: chapter / location / visit-scoped widgets resolve to an existing id.
    const chapterIds = new Set(value.chapters.map((c) => c.id));
    value.widgets.forEach((w, index) => {
      if (w.scope.kind === "chapter" && !chapterIds.has(w.scope.chapterId)) {
        ctx.addIssue({
          code: "custom",
          path: ["widgets", index, "scope", "chapterId"],
          message: `Widget "${w.id}" is scoped to unknown chapter "${w.scope.chapterId}"`,
        });
      }
      if (w.scope.kind === "location" && !locationIds.has(w.scope.locationId)) {
        ctx.addIssue({
          code: "custom",
          path: ["widgets", index, "scope", "locationId"],
          message: `Widget "${w.id}" is scoped to unknown location "${w.scope.locationId}"`,
        });
      }
      if (w.scope.kind === "visit" && !visitIds.has(w.scope.visitId)) {
        ctx.addIssue({
          code: "custom",
          path: ["widgets", index, "scope", "visitId"],
          message: `Widget "${w.id}" is scoped to unknown visit "${w.scope.visitId}"`,
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
    value.locations.forEach((l, li) => {
      expectSlug(l.id, ["locations", li, "id"], "Location ID");
    });
    value.chapters.forEach((c, ci) => {
      expectSlug(c.id, ["chapters", ci, "id"], "Chapter ID");
      c.visits.forEach((v, vi) => {
        expectSlug(v.id, ["chapters", ci, "visits", vi, "id"], "Visit ID");
        v.steps.forEach((s, si) => {
          expectSlug(
            s.id,
            ["chapters", ci, "visits", vi, "steps", si, "id"],
            "Step ID",
          );
        });
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
