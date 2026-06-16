import { z } from "zod";
import { layerReport } from "./approvals.ts";
import {
  findDuplicates,
  guideSlug,
  idSlug,
  localId,
  schemaVersion,
} from "./common.ts";
import { chapter, location } from "./spine.ts";
import { widget, widgetItemIds } from "./widgets.ts";

// Compiler pass artifacts and reports (COMPILER_PASS_CONTRACT.md, FR-D1/D2).
// guides/<slug>/layers/<id>.json + <id>.report.json are the only channel
// between passes and the review lens — passes never write approvals.json.

export const passId = z.enum([
  "source-gathering",
  "spine",
  "widget",
  "ra-mapping",
  "qa",
]);

// layers/spine.json — the locations + chapter/visit/step tree, exactly the
// shape guide.json's locations/chapters take at assembly (contract §3).
export const spineLayer = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    pass: z.literal("spine"),
    locations: z.array(location).default([]),
    chapters: z.array(chapter).min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.chapters.map((c) => c.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: `Duplicate chapter ID "${id}"`,
      });
    }
    for (const id of findDuplicates(value.locations.map((l) => l.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["locations"],
        message: `Duplicate location ID "${id}"`,
      });
    }
    const visits = value.chapters.flatMap((c) => c.visits);
    for (const id of findDuplicates(visits.map((v) => v.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: `Duplicate visit ID "${id}"`,
      });
    }
    const stepIds = visits.flatMap((v) => v.steps.map((s) => s.id));
    for (const id of findDuplicates(stepIds)) {
      ctx.addIssue({
        code: "custom",
        path: ["chapters"],
        message: `Duplicate step ID "${id}"`,
      });
    }
    // FK: every visit names a location that exists.
    const locationIds = new Set(value.locations.map((l) => l.id));
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
      });
    });
  });

// layers/widget-<seg>.json — one widget instance per layer ("per-widget-pass",
// §6 entity 7), exactly the shape of a guide.json.widgets element.
export const widgetLayer = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    pass: z.literal("widget"),
    widget,
  })
  .superRefine((value, ctx) => {
    if (idSlug(value.widget.id) !== value.guideId) {
      ctx.addIssue({
        code: "custom",
        path: ["widget", "id"],
        message: `Widget ID "${value.widget.id}" does not carry the guide slug "${value.guideId}"`,
      });
    }
    for (const id of findDuplicates(widgetItemIds(value.widget))) {
      ctx.addIssue({
        code: "custom",
        path: ["widget"],
        message: `Duplicate item ID "${id}"`,
      });
    }
  });

// The ra-mapping layer artifact is the existing raMapping schema — assembly
// is a file copy (contract §3); no separate schema here.

export const reportInput = z.object({
  file: z.string().min(1),
  // Same digest as contentHash, without the "sha256:" prefix (contract §5).
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "Expected 64 lowercase hex chars"),
});

// layers/<id>.report.json — what the review lens reads (FR-E2) and copies
// verbatim into approvals layerRecord.report on a verdict.
export const passReportFile = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    pass: passId,
    // Matches the filename base and the approvals layerRecord.id: "spine",
    // "widget-<seg>", "ra-mapping", "source-gathering", "qa".
    layer: localId,
    generatedAt: z.iso.datetime(),
    // Provenance: every file the pass read (contract §6 staleness check).
    inputs: z.array(reportInput).default([]),
    report: layerReport,
    notes: z.array(z.string().min(1)).default([]),
  })
  .superRefine((value, ctx) => {
    const expected =
      value.pass === "widget"
        ? /^widget-/.test(value.layer)
        : value.layer === value.pass;
    if (!expected) {
      ctx.addIssue({
        code: "custom",
        path: ["layer"],
        message: `Layer "${value.layer}" does not belong to pass "${value.pass}"`,
      });
    }
  });

export type PassId = z.infer<typeof passId>;
export type SpineLayer = z.infer<typeof spineLayer>;
export type WidgetLayer = z.infer<typeof widgetLayer>;
export type ReportInput = z.infer<typeof reportInput>;
export type PassReportFile = z.infer<typeof passReportFile>;
