import { z } from "zod";
import {
  checkableId,
  findDuplicates,
  guideSlug,
  localId,
  schemaVersion,
} from "./common.ts";

export const layerKind = z.enum(["spine", "widget-pass", "ra-mapping"]);

export const layerStatus = z.enum(["draft", "approved", "rejected"]);

export const spotCheckVerdict = z.object({
  itemId: checkableId,
  verdict: z.enum(["pass", "fail"]),
  note: z.string().min(1).optional(),
});

export const approvalRecord = z.object({
  date: z.iso.datetime(),
  verdict: z.enum(["approved", "rejected"]),
  // Required on rejection — the note feeds the recompile (FR-E4).
  note: z.string().min(1).optional(),
});

export const layerReport = z.object({
  rowCount: z.int().nonnegative(),
  anomalies: z.array(z.string().min(1)).default([]),
  flaggedItemIds: z.array(checkableId).default([]),
});

export const layerRecord = z
  .object({
    id: localId,
    kind: layerKind,
    // Path to the pass output, e.g. layers/spine.json (§20.1).
    artifact: z.string().min(1),
    report: layerReport,
    // Approval hash-locks this exact content; a recompile that changes the
    // artifact produces a new draft, never mutates an approved layer (§6.8).
    // "sha256:" + hex digest of the artifact file's exact bytes
    // (COMPILER_PASS_CONTRACT.md §5).
    contentHash: z.string().min(1),
    status: layerStatus,
    approval: approvalRecord.optional(),
    spotChecks: z.array(spotCheckVerdict).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.status === "draft") {
      if (value.approval !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["approval"],
          message: "Draft layers carry no approval record",
        });
      }
      return;
    }
    if (value.approval === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["approval"],
        message: `Status "${value.status}" requires an approval record`,
      });
      return;
    }
    if (value.approval.verdict !== value.status) {
      ctx.addIssue({
        code: "custom",
        path: ["approval", "verdict"],
        message: `Approval verdict "${value.approval.verdict}" contradicts status "${value.status}"`,
      });
    }
    if (value.status === "rejected" && value.approval.note === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["approval", "note"],
        message: "Rejection requires a note — it feeds the recompile (FR-E4)",
      });
    }
  });

// guides/<slug>/approvals.json — written ONLY by the review-lens approval
// flow (§23.4); compiler passes and AI sessions never touch it.
export const approvalsFile = z
  .object({
    schemaVersion,
    guideId: guideSlug,
    layers: z.array(layerRecord),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.layers.map((l) => l.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["layers"],
        message: `Duplicate layer ID "${id}"`,
      });
    }
  });

export type LayerKind = z.infer<typeof layerKind>;
export type LayerStatus = z.infer<typeof layerStatus>;
export type SpotCheckVerdict = z.infer<typeof spotCheckVerdict>;
export type ApprovalRecord = z.infer<typeof approvalRecord>;
export type LayerReport = z.infer<typeof layerReport>;
export type LayerRecord = z.infer<typeof layerRecord>;
export type ApprovalsFile = z.infer<typeof approvalsFile>;
