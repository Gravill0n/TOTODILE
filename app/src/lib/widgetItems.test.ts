import { describe, expect, it } from "vitest";
import { widgetBinaryItems } from "@/lib/widgetItems";
import { guideFile, type WidgetType } from "@/schema";
import { readFixtureJson } from "@/testing/fixtureRepo";

const guide = guideFile.parse(
  readFixtureJson("guides/fictional-quest/guide.json"),
);

function widgetOf(type: WidgetType) {
  const widget = guide.widgets.find((w) => w.type === type);
  if (!widget) throw new Error(`fixture has no ${type} widget`);
  return widget;
}

describe("widgetBinaryItems", () => {
  it("returns no items for counters — their semantics differ per caller", () => {
    expect(widgetBinaryItems(widgetOf("counter"))).toEqual([]);
  });

  it("labels matrix cells as `row × column`", () => {
    const widget = widgetOf("matrix");
    if (widget.type !== "matrix") throw new Error("unreachable");
    const items = widgetBinaryItems(widget);
    expect(items.length).toBe(widget.cells.length);
    const rowLabel = widget.rows[0]?.label;
    const colLabel = widget.columns[0]?.label;
    expect(items.some((i) => i.label === `${rowLabel} × ${colLabel}`)).toBe(
      true,
    );
    expect(items.every((i) => i.checkable)).toBe(true);
  });

  it("labels dataTable rows from their cells and carries the checkable flag", () => {
    const widget = widgetOf("dataTable");
    if (widget.type !== "dataTable") throw new Error("unreachable");
    const items = widgetBinaryItems(widget);
    expect(items.length).toBe(widget.rows.length);
    for (const [i, row] of widget.rows.entries()) {
      expect(items[i]?.checkable).toBe(row.checkable);
      for (const [col, val] of Object.entries(row.cells)) {
        const label = widget.columns.find((c) => c.id === col)?.label ?? col;
        expect(items[i]?.label).toContain(`${label}: ${val}`);
      }
    }
  });

  it("carries sourceRefs and confidence for every item", () => {
    for (const type of [
      "checklist",
      "flowchart",
      "mapPins",
      "prepCard",
    ] as const) {
      const widget = widgetOf(type);
      for (const item of widgetBinaryItems(widget)) {
        expect(Array.isArray(item.sourceRefs)).toBe(true);
        expect(item.confidence).toBeDefined();
        expect(item.checkable).toBe(true);
      }
    }
  });

  it("folds a prepCard quantity into the note", () => {
    const widget = widgetOf("prepCard");
    if (widget.type !== "prepCard") throw new Error("unreachable");
    const withQty = widget.items.find((i) => i.quantity !== undefined);
    if (!withQty) return; // fixture has no quantity — nothing to pin
    const item = widgetBinaryItems(widget).find(
      (i) => i.itemId === withQty.itemId,
    );
    expect(item?.note).toContain(`×${withQty.quantity}`);
  });
});
