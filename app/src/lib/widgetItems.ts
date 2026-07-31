import type { Confidence, GuideFile, Widget } from "@/schema";
import { widgetCheckables } from "@/schema";

// One entry per binary (toggle-to-done) item a widget exposes, with the
// human label derived per primitive — matrix/dataTable items have no label
// of their own, so they are built from the axes / cell values. Counters are
// excluded: their done semantics differ per caller (review shows the target,
// cleanup tracks value-vs-target), so nothing shared survives the split.
export type WidgetBinaryItem = {
  itemId: string;
  label: string;
  // Row-level note; prepCard folds its ×quantity in front of the note.
  note?: string;
  sourceRefs: string[];
  confidence: Confidence;
  // dataTable rows may be informational-only; everything else is checkable.
  checkable: boolean;
};

export function joinDetail(parts: (string | undefined)[]): string | undefined {
  const kept = parts.filter((part): part is string => Boolean(part));
  return kept.length > 0 ? kept.join(" · ") : undefined;
}

export function widgetBinaryItems(widget: Widget): WidgetBinaryItem[] {
  const item = (
    itemId: string,
    label: string,
    row: { sourceRefs: string[]; confidence: Confidence },
    note?: string,
    checkable = true,
  ): WidgetBinaryItem => ({
    itemId,
    label,
    ...(note !== undefined ? { note } : {}),
    sourceRefs: row.sourceRefs,
    confidence: row.confidence,
    checkable,
  });

  switch (widget.type) {
    case "checklist":
      return widget.rows.map((row) =>
        item(row.itemId, row.label, row, row.note),
      );
    case "flowchart":
      return widget.nodes.map((node) =>
        item(node.itemId, node.label, node, node.note),
      );
    case "mapPins":
      return widget.pins.map((pin) => item(pin.itemId, pin.label, pin));
    case "prepCard":
      return widget.items.map((entry) =>
        item(
          entry.itemId,
          entry.label,
          entry,
          joinDetail([
            entry.quantity ? `×${entry.quantity}` : undefined,
            entry.note,
          ]),
        ),
      );
    case "matrix": {
      const rowLabel = new Map(widget.rows.map((r) => [r.id, r.label]));
      const colLabel = new Map(widget.columns.map((c) => [c.id, c.label]));
      return widget.cells.map((cell) =>
        item(
          cell.itemId,
          `${rowLabel.get(cell.rowId) ?? cell.rowId} × ${colLabel.get(cell.columnId) ?? cell.columnId}`,
          cell,
        ),
      );
    }
    case "dataTable": {
      const colLabel = new Map(widget.columns.map((c) => [c.id, c.label]));
      return widget.rows.map((row) => {
        const cells = Object.entries(row.cells)
          .map(([col, val]) => `${colLabel.get(col) ?? col}: ${val}`)
          .join(" · ");
        return item(row.itemId, cells, row, undefined, row.checkable);
      });
    }
    case "counter":
      return [];
  }
}

// Every widget item a step is linked to, keyed by step id (2026-07-31).
// Built once per guide: the play view asks this on every tick, and walking
// 318 widgets each time would be work proportional to the guide on every tap.
//
// One direction only. A step knows what it hands you; a row does not decide
// that the step is walked — ticking one of a step's five items must not
// declare the step done.
export function stepItemIndex(guide: GuideFile): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const widget of guide.widgets) {
    for (const row of widgetCheckables(widget)) {
      if (row.stepRef === undefined) continue;
      index.set(row.stepRef, [...(index.get(row.stepRef) ?? []), row.itemId]);
    }
  }
  return index;
}
