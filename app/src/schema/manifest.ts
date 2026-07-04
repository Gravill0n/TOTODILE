import { z } from "zod";
import { findDuplicates, guideSlug, localId, schemaVersion } from "./common.ts";
import { widgetScope } from "./widgets.ts";

// guides/<slug>/layers/manifest.json — the review-lens roster source at any
// pipeline point (contract §2 rule 9). Each reviewable pass run (spine, widget
// fill, ra-mapping) upserts its entry, so review can start after a stage
// without waiting for qa.report.json. source-gathering, extract-data, and qa
// are process passes and never appear here (same exclusion as the roster,
// review/layerRoster.ts).
export const manifestLayerKind = z.enum(["spine", "widget", "ra-mapping"]);

// Denormalized from the widget artifact so the lens can group cards by deck
// slot without fetching every layers/widget-*.json; validate-guides checks it
// against the artifact, so it cannot drift silently.
export const manifestWidgetMeta = z.object({
  // Index of the deck slot the instance fills — the merge key for slot cards.
  deckPosition: z.int().nonnegative(),
  scope: widgetScope,
  title: z.string().min(1),
});

export const manifestEntry = z.object({
  // "spine", "widget-<seg>", or "ra-mapping" — the artifact basename and the
  // approvals layerRecord.id.
  id: localId,
  kind: manifestLayerKind,
  artifact: z.string().min(1),
  report: z.string().min(1),
  // Digest of the artifact's exact bytes, without the "sha256:" prefix — same
  // rule as reportInput (contract §5). Gives the lens a contentHash and the
  // skill gates a staleness check before qa.report.json exists.
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "Expected 64 lowercase hex chars"),
  widget: manifestWidgetMeta.optional(),
});

function kindOfLayerId(
  id: string,
): z.infer<typeof manifestLayerKind> | undefined {
  if (id === "spine" || id === "ra-mapping") return id;
  if (/^widget-/.test(id)) return "widget";
  return undefined;
}

export const layersManifest = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    // Empty before the spine pass has run — a legal "nothing to review yet".
    entries: z.array(manifestEntry).default([]),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.entries.map((e) => e.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["entries"],
        message: `Duplicate entry ID "${id}"`,
      });
    }
    value.entries.forEach((entry, index) => {
      const expectedKind = kindOfLayerId(entry.id);
      if (expectedKind === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "id"],
          message: `"${entry.id}" is not a reviewable layer ID (expected "spine", "widget-<seg>", or "ra-mapping")`,
        });
      } else if (entry.kind !== expectedKind) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "kind"],
          message: `Entry "${entry.id}" declares kind "${entry.kind}" but the ID implies "${expectedKind}"`,
        });
      }
      if (entry.kind === "widget" && entry.widget === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "widget"],
          message: `Widget entry "${entry.id}" is missing its widget metadata`,
        });
      }
      if (entry.kind !== "widget" && entry.widget !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "widget"],
          message: `Entry "${entry.id}" is not a widget layer but carries widget metadata`,
        });
      }
      // The paths are derivable from the ID; storing them keeps the file
      // self-describing, so hold them to the convention.
      if (entry.artifact !== `layers/${entry.id}.json`) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "artifact"],
          message: `Expected "layers/${entry.id}.json"`,
        });
      }
      if (entry.report !== `layers/${entry.id}.report.json`) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "report"],
          message: `Expected "layers/${entry.id}.report.json"`,
        });
      }
    });
  });

export type ManifestLayerKind = z.infer<typeof manifestLayerKind>;
export type ManifestWidgetMeta = z.infer<typeof manifestWidgetMeta>;
export type ManifestEntry = z.infer<typeof manifestEntry>;
export type LayersManifest = z.infer<typeof layersManifest>;
