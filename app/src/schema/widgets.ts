import { z } from "zod";
import {
  type Confidence,
  chapterId,
  confidence,
  findDuplicates,
  type ImageRef,
  imageRef,
  itemId,
  localId,
  locationId,
  sourceRefs,
  stepId,
  visitId,
  widgetId,
} from "./common.ts";

// The 7 primitives are a closed set (§14.3) — adding an 8th is a PRD-level change.
export const widgetType = z.enum([
  "checklist",
  "matrix",
  "dataTable",
  "counter",
  "flowchart",
  "mapPins",
  "prepCard",
]);

// Four scopes (§6 / Workstream A): a widget shows everywhere (global), within
// one chapter, at one location across every visit there, or only on a single
// visit. The concrete id binds on the instance; a deck slot's defaultScope
// names the *kind* only (deck.ts).
export const widgetScope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }),
  z.object({ kind: z.literal("chapter"), chapterId }),
  z.object({ kind: z.literal("location"), locationId }),
  z.object({ kind: z.literal("visit"), visitId }),
]);

// Every checkable row/cell: stable item ID (progress + RA-mapping target),
// ≥1 source reference, and a compiler confidence level (§6.3).
//
// `stepRef` links the row to the step where the route says you get this thing,
// so ticking that step ticks the row (FR-B2, 2026-07-31). It lives HERE rather
// than as `step.itemRefs[]` because the spine is compiled before the widgets:
// a spine field naming widget item ids would invert the pass order, while the
// widget pass is already anchored to the spine and has the step id in hand.
//
// Optional, and filled only where a source ties the item to that specific
// step — no source, no link (§24 / §0.2: gaps are flagged, never guessed). An
// unlinked row behaves exactly as it did before, so a widget that gains no
// links keeps its bytes and needs no re-approval.
const checkable = {
  itemId,
  sourceRefs,
  confidence,
  stepRef: stepId.optional(),
};

const widgetBase = {
  id: widgetId,
  title: z.string().min(1),
  scope: widgetScope,
  // Index of the deck slot this instance fills (§6.3 "layout position in the deck").
  deckPosition: z.int().nonnegative(),
};

export const checklistWidget = z.object({
  ...widgetBase,
  type: z.literal("checklist"),
  rows: z
    .array(
      z.object({
        ...checkable,
        label: z.string().min(1),
        note: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

const matrixAxisEntry = z.object({
  id: localId,
  label: z.string().min(1),
});

export const matrixWidget = z
  .object({
    ...widgetBase,
    type: z.literal("matrix"),
    rows: z.array(matrixAxisEntry).min(1),
    columns: z.array(matrixAxisEntry).min(1),
    cells: z
      .array(
        z.object({
          ...checkable,
          rowId: localId,
          columnId: localId,
        }),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.rows.map((r) => r.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message: `Duplicate row ID "${id}"`,
      });
    }
    for (const id of findDuplicates(value.columns.map((c) => c.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["columns"],
        message: `Duplicate column ID "${id}"`,
      });
    }
    const rowIds = new Set(value.rows.map((r) => r.id));
    const columnIds = new Set(value.columns.map((c) => c.id));
    const seenPairs = new Set<string>();
    value.cells.forEach((cell, index) => {
      if (!rowIds.has(cell.rowId)) {
        ctx.addIssue({
          code: "custom",
          path: ["cells", index, "rowId"],
          message: `Cell references unknown row "${cell.rowId}"`,
        });
      }
      if (!columnIds.has(cell.columnId)) {
        ctx.addIssue({
          code: "custom",
          path: ["cells", index, "columnId"],
          message: `Cell references unknown column "${cell.columnId}"`,
        });
      }
      const pair = `${cell.rowId}\u0000${cell.columnId}`;
      if (seenPairs.has(pair)) {
        ctx.addIssue({
          code: "custom",
          path: ["cells", index],
          message: `Duplicate cell for row "${cell.rowId}" × column "${cell.columnId}"`,
        });
      }
      seenPairs.add(pair);
    });
  });

export const dataTableWidget = z
  .object({
    ...widgetBase,
    type: z.literal("dataTable"),
    columns: z
      .array(z.object({ id: localId, label: z.string().min(1) }))
      .min(1),
    rows: z
      .array(
        z.object({
          ...checkable,
          // Informational rows (enemy stats etc.) keep a stable ID but are
          // not tappable in the tracker.
          checkable: z.boolean().default(false),
          cells: z.record(localId, z.string()),
        }),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    for (const id of findDuplicates(value.columns.map((c) => c.id))) {
      ctx.addIssue({
        code: "custom",
        path: ["columns"],
        message: `Duplicate column ID "${id}"`,
      });
    }
    const columnIds = new Set(value.columns.map((c) => c.id));
    value.rows.forEach((row, index) => {
      for (const key of Object.keys(row.cells)) {
        if (!columnIds.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["rows", index, "cells", key],
            message: `Cell references unknown column "${key}"`,
          });
        }
      }
    });
  });

export const counterWidget = z.object({
  ...widgetBase,
  type: z.literal("counter"),
  counters: z
    .array(
      z
        .object({
          ...checkable,
          label: z.string().min(1),
          // The counter completes at `target`; a manual counter's current
          // value lives in the browser-side progress store, never here.
          // A derived entry (#5) is read-only: its value is the count of
          // checked `derivedFrom` ids — it never writes `counterValues` —
          // and `target` defaults to derivedFrom.length when omitted.
          target: z.int().positive().optional(),
          derivedFrom: z.array(itemId).min(1).optional(),
        })
        .refine(
          (entry) => entry.target !== undefined || entry.derivedFrom,
          "A manual counter (no derivedFrom) requires a target",
        ),
    )
    .min(1),
});

export const flowchartWidget = z
  .object({
    ...widgetBase,
    type: z.literal("flowchart"),
    nodes: z
      .array(
        z.object({
          ...checkable,
          label: z.string().min(1),
          note: z.string().min(1).optional(),
        }),
      )
      .min(1),
    edges: z
      .array(
        z.object({
          from: itemId,
          to: itemId,
          label: z.string().min(1).optional(),
        }),
      )
      .default([]),
  })
  .superRefine((value, ctx) => {
    const nodeIds = new Set(value.nodes.map((n) => n.itemId));
    value.edges.forEach((edge, index) => {
      if (!nodeIds.has(edge.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "from"],
          message: `Edge references unknown node "${edge.from}"`,
        });
      }
      if (!nodeIds.has(edge.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "to"],
          message: `Edge references unknown node "${edge.to}"`,
        });
      }
    });
  });

export const mapPinsWidget = z.object({
  ...widgetBase,
  type: z.literal("mapPins"),
  image: imageRef,
  pins: z
    .array(
      z.object({
        ...checkable,
        label: z.string().min(1),
        // Pin position as fractions of the image dimensions, so pins survive
        // any rendered size.
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
      }),
    )
    .min(1),
});

export const prepCardWidget = z.object({
  ...widgetBase,
  type: z.literal("prepCard"),
  items: z
    .array(
      z.object({
        ...checkable,
        label: z.string().min(1),
        quantity: z.int().positive().optional(),
        note: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

// The effective completion target of a counter entry (#5): explicit
// `target`, or the whole derivedFrom set. The schema guarantees one of the
// two exists; the 0 is for the type system only.
export function counterTarget(entry: {
  target?: number | undefined;
  derivedFrom?: string[] | undefined;
}): number {
  return entry.target ?? entry.derivedFrom?.length ?? 0;
}

export const widget = z.discriminatedUnion("type", [
  checklistWidget,
  matrixWidget,
  dataTableWidget,
  counterWidget,
  flowchartWidget,
  mapPinsWidget,
  prepCardWidget,
]);

export type WidgetType = z.infer<typeof widgetType>;
export type WidgetScope = z.infer<typeof widgetScope>;
export type ChecklistWidget = z.infer<typeof checklistWidget>;
export type MatrixWidget = z.infer<typeof matrixWidget>;
export type DataTableWidget = z.infer<typeof dataTableWidget>;
export type CounterWidget = z.infer<typeof counterWidget>;
export type FlowchartWidget = z.infer<typeof flowchartWidget>;
export type MapPinsWidget = z.infer<typeof mapPinsWidget>;
export type PrepCardWidget = z.infer<typeof prepCardWidget>;
export type Widget = z.infer<typeof widget>;

export type WidgetCheckable = {
  itemId: string;
  sourceRefs: string[];
  confidence: Confidence;
  /** The step where the route says you get this — see `checkable` above. */
  stepRef?: string | undefined;
};

// All checkable rows/cells a widget exposes, regardless of primitive.
export function widgetCheckables(value: Widget): WidgetCheckable[] {
  switch (value.type) {
    case "checklist":
      return value.rows;
    case "matrix":
      return value.cells;
    case "dataTable":
      return value.rows;
    case "counter":
      return value.counters;
    case "flowchart":
      return value.nodes;
    case "mapPins":
      return value.pins;
    case "prepCard":
      return value.items;
  }
}

// All checkable item IDs a widget exposes — the namespace progress states
// and RA-mapping targets key into.
export function widgetItemIds(value: Widget): string[] {
  return widgetCheckables(value).map((c) => c.itemId);
}

// Every image a widget references. Only mapPins carries one today; the
// exhaustive switch means a new primitive that gains an image cannot be added
// without deciding whether it belongs here (validate-guides resolves these
// against the guide folder, and guides/*/images/** is Git LFS-tracked).
export function widgetImages(value: Widget): ImageRef[] {
  switch (value.type) {
    case "mapPins":
      return [value.image];
    case "checklist":
    case "matrix":
    case "dataTable":
    case "counter":
    case "flowchart":
    case "prepCard":
      return [];
  }
}
