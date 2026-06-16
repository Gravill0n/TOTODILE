import { describe, expect, it } from "vitest";
import { widget, widgetItemIds } from "../../src/schema";
import {
  expectParses,
  expectRejects,
  validChecklist,
  validCounter,
  validDataTable,
  validFlowchart,
  validMapPins,
  validMatrix,
  validPrepCard,
} from "./helpers";

describe("widget (discriminated union)", () => {
  it("rejects an unknown primitive type — the 7 are a closed set (§14.3)", () => {
    expectRejects(widget, { ...validChecklist(), type: "kanban" });
  });

  it("rejects a chapter scope without a chapter ID", () => {
    expectRejects(widget, { ...validChecklist(), scope: { kind: "chapter" } });
  });

  it("parses all four scope kinds", () => {
    expectParses(widget, {
      ...validChecklist(),
      scope: { kind: "global" },
    });
    expectParses(widget, {
      ...validChecklist(),
      scope: { kind: "chapter", chapterId: "fictional-quest:c1" },
    });
    expectParses(widget, {
      ...validChecklist(),
      scope: { kind: "location", locationId: "fictional-quest:castle-gate" },
    });
    expectParses(widget, {
      ...validChecklist(),
      scope: { kind: "visit", visitId: "fictional-quest:v1" },
    });
  });

  it("rejects a location scope without a location ID", () => {
    expectRejects(widget, { ...validChecklist(), scope: { kind: "location" } });
  });

  it("rejects a visit scope without a visit ID", () => {
    expectRejects(widget, { ...validChecklist(), scope: { kind: "visit" } });
  });

  it("rejects an unknown scope kind", () => {
    expectRejects(widget, {
      ...validChecklist(),
      scope: { kind: "step", stepId: "fictional-quest:c1:s1" },
    });
  });

  it("rejects a negative deck position", () => {
    expectRejects(widget, { ...validChecklist(), deckPosition: -1 });
  });
});

describe("checklist", () => {
  it("parses a valid checklist", () => {
    expectParses(widget, validChecklist());
  });

  it("rejects an empty checklist", () => {
    expectRejects(widget, { ...validChecklist(), rows: [] });
  });

  it("rejects a row without source references (§6.6 invariant)", () => {
    const value = validChecklist();
    expectRejects(widget, {
      ...value,
      rows: [{ ...value.rows[0], sourceRefs: [] }],
    });
  });

  it("rejects a row without an item ID", () => {
    const value = validChecklist();
    expectRejects(widget, {
      ...value,
      rows: [{ ...value.rows[0], itemId: "" }],
    });
  });
});

describe("matrix", () => {
  it("parses a valid matrix", () => {
    expectParses(widget, validMatrix());
  });

  it("rejects a cell referencing an unknown row", () => {
    const value = validMatrix();
    expectRejects(widget, {
      ...value,
      cells: [{ ...value.cells[0], rowId: "row-ghost" }],
    });
  });

  it("rejects a cell referencing an unknown column", () => {
    const value = validMatrix();
    expectRejects(widget, {
      ...value,
      cells: [{ ...value.cells[0], columnId: "col-ghost" }],
    });
  });

  it("rejects two cells at the same row × column", () => {
    const value = validMatrix();
    expectRejects(widget, {
      ...value,
      cells: [
        ...value.cells,
        { ...value.cells[0], itemId: "fictional-quest:w2:dup" },
      ],
    });
  });

  it("rejects duplicate axis IDs", () => {
    const value = validMatrix();
    expectRejects(widget, {
      ...value,
      rows: [...value.rows, { id: "row-hero", label: "Hero again" }],
    });
  });
});

describe("dataTable", () => {
  it("parses a valid data table", () => {
    expectParses(widget, validDataTable());
  });

  it("defaults rows to non-checkable", () => {
    const value = validDataTable();
    const { checkable, ...row } =
      value.rows[0] ?? expect.fail("fixture has no row");
    const parsed = widget.parse({ ...value, rows: [row] });
    if (parsed.type !== "dataTable") return expect.fail("wrong union branch");
    expect(parsed.rows[0]?.checkable).toBe(false);
  });

  it("rejects a cell keyed by an unknown column", () => {
    const value = validDataTable();
    expectRejects(widget, {
      ...value,
      rows: [{ ...value.rows[0], cells: { "col-ghost": "?" } }],
    });
  });

  it("rejects duplicate column IDs", () => {
    const value = validDataTable();
    expectRejects(widget, {
      ...value,
      columns: [...value.columns, { id: "col-hp", label: "HP again" }],
    });
  });
});

describe("counter", () => {
  it("parses a valid counter", () => {
    expectParses(widget, validCounter());
  });

  it("rejects a zero target", () => {
    const value = validCounter();
    expectRejects(widget, {
      ...value,
      counters: [{ ...value.counters[0], target: 0 }],
    });
  });

  it("rejects a fractional target", () => {
    const value = validCounter();
    expectRejects(widget, {
      ...value,
      counters: [{ ...value.counters[0], target: 39.5 }],
    });
  });
});

describe("flowchart", () => {
  it("parses a valid flowchart", () => {
    expectParses(widget, validFlowchart());
  });

  it("rejects an edge from an unknown node", () => {
    const value = validFlowchart();
    expectRejects(widget, {
      ...value,
      edges: [
        { from: "fictional-quest:w5:ghost", to: "fictional-quest:w5:n2" },
      ],
    });
  });

  it("rejects an edge to an unknown node", () => {
    const value = validFlowchart();
    expectRejects(widget, {
      ...value,
      edges: [
        { from: "fictional-quest:w5:n1", to: "fictional-quest:w5:ghost" },
      ],
    });
  });
});

describe("mapPins", () => {
  it("parses a valid map-pins widget", () => {
    expectParses(widget, validMapPins());
  });

  it("rejects a pin outside the image bounds", () => {
    const value = validMapPins();
    expectRejects(widget, { ...value, pins: [{ ...value.pins[0], x: 1.2 }] });
  });

  it("rejects a missing map image", () => {
    const { image, ...value } = validMapPins();
    expectRejects(widget, value);
  });
});

describe("prepCard", () => {
  it("parses a valid prep card", () => {
    expectParses(widget, validPrepCard());
  });

  it("rejects a zero quantity", () => {
    const value = validPrepCard();
    expectRejects(widget, {
      ...value,
      items: [{ ...value.items[0], quantity: 0 }],
    });
  });
});

describe("widgetItemIds", () => {
  it("collects checkable IDs from every primitive", () => {
    const all = [
      validChecklist(1),
      validMatrix(2),
      validDataTable(3),
      validCounter(4),
      validFlowchart(5),
      validMapPins(6),
      validPrepCard(7),
    ].flatMap((value) => widgetItemIds(widget.parse(value)));
    expect(all).toEqual([
      "fictional-quest:w1:r1",
      "fictional-quest:w2:hero-fire",
      "fictional-quest:w3:sentry",
      "fictional-quest:w4:coins",
      "fictional-quest:w5:n1",
      "fictional-quest:w5:n2",
      "fictional-quest:w6:shard1",
      "fictional-quest:w7:p1",
    ]);
  });
});
