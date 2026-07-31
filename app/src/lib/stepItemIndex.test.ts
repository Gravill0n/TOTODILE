import { describe, expect, it } from "vitest";
import { stepItemIndex } from "@/lib/widgetItems";
import { guideFile } from "@/schema";
import { validGuide } from "@/testing/helpers";

// The link a widget row carries to the step that hands it to you (§6.5,
// 2026-07-31). The index is the play view's lookup: given the step just
// ticked, which rows go with it.

function guideWithLinks(links: Record<string, string>) {
  const base = validGuide();
  const widgets = base.widgets.map((widget) => {
    if (widget.type !== "checklist") return widget;
    const rows = (widget as { rows: { itemId: string }[] }).rows.map((row) =>
      links[row.itemId] ? { ...row, stepRef: links[row.itemId] } : row,
    );
    return { ...widget, rows };
  });
  return guideFile.parse({ ...base, widgets });
}

describe("stepItemIndex", () => {
  it("is empty for a guide whose rows carry no links", () => {
    expect(stepItemIndex(guideFile.parse(validGuide())).size).toBe(0);
  });

  it("keys the rows by the step that hands them over", () => {
    const guide = guideWithLinks({
      "fictional-quest:w1:r1": "fictional-quest:c1:s1",
    });
    expect(stepItemIndex(guide).get("fictional-quest:c1:s1")).toEqual([
      "fictional-quest:w1:r1",
    ]);
  });

  it("collects every row a single step hands over", () => {
    const base = validGuide();
    const widgets = base.widgets.map((widget) =>
      widget.type === "prepCard"
        ? {
            ...widget,
            items: (widget as { items: object[] }).items.map((item) => ({
              ...item,
              stepRef: "fictional-quest:c1:s2",
            })),
          }
        : widget,
    );
    const guide = guideFile.parse({ ...base, widgets });
    const linked = stepItemIndex(guide).get("fictional-quest:c1:s2") ?? [];
    expect(linked.length).toBeGreaterThan(0);
    expect(linked.every((id) => id.includes(":w7:"))).toBe(true);
  });

  it("indexes rows from every primitive, not just checklists", () => {
    const base = validGuide();
    // A map pin and a matrix cell, which reach the index through
    // widgetCheckables rather than a per-type branch.
    const widgets = base.widgets.map((widget) => {
      if (widget.type === "mapPins") {
        const pins = (widget as { pins: object[] }).pins.map((pin) => ({
          ...pin,
          stepRef: "fictional-quest:c1:s1",
        }));
        return { ...widget, pins };
      }
      if (widget.type === "matrix") {
        const cells = (widget as { cells: object[] }).cells.map((cell) => ({
          ...cell,
          stepRef: "fictional-quest:c1:s1",
        }));
        return { ...widget, cells };
      }
      return widget;
    });
    const linked =
      stepItemIndex(guideFile.parse({ ...base, widgets })).get(
        "fictional-quest:c1:s1",
      ) ?? [];
    expect(linked.some((id) => id.includes(":w6:"))).toBe(true);
    expect(linked.some((id) => id.includes(":w2:"))).toBe(true);
  });
});

describe("stepRef is checked, not trusted", () => {
  it("refuses a link to a step that does not exist", () => {
    expect(() =>
      guideWithLinks({ "fictional-quest:w1:r1": "fictional-quest:c9:s9" }),
    ).toThrow(/links to unknown step/);
  });

  it("accepts a row with no link at all — the common case", () => {
    expect(() => guideFile.parse(validGuide())).not.toThrow();
  });
});
