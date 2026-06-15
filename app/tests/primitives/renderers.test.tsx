// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetRenderer } from "../../src/primitives/WidgetRenderer";
import type { ProgressSlice } from "../../src/progress/progressSlice";
import {
  guideFile,
  matrixWidget,
  type Widget,
  type WidgetType,
} from "../../src/schema";

const guide = guideFile.parse(
  JSON.parse(
    readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "fixtures",
        "repo",
        "guides",
        "fictional-quest",
        "guide.json",
      ),
      "utf8",
    ),
  ),
);

function widgetOf(type: WidgetType): Widget {
  const widget = guide.widgets.find((w) => w.type === type);
  if (!widget) throw new Error(`fixture has no ${type} widget`);
  return widget;
}

const noProgress: ProgressSlice = { doneIds: new Set(), counterValues: {} };

function renderWidget(type: WidgetType, progress: ProgressSlice = noProgress) {
  const onToggle = vi.fn();
  const onAdjustCounter = vi.fn();
  const onResetCounter = vi.fn();
  render(
    <WidgetRenderer
      widget={widgetOf(type)}
      progress={progress}
      onToggle={onToggle}
      onAdjustCounter={onAdjustCounter}
      onResetCounter={onResetCounter}
      resolveAsset={(path) => `guides/fictional-quest/${path}`}
    />,
  );
  return { onToggle, onAdjustCounter, onResetCounter };
}

afterEach(cleanup);

describe("checklist (full)", () => {
  it("renders rows with notes and toggles by item ID", () => {
    const { onToggle } = renderWidget("checklist");
    expect(
      screen.getByText("From the gatekeeper after the lantern errand"),
    ).toBeDefined();
    fireEvent.click(screen.getByLabelText("Gate key"));
    expect(onToggle).toHaveBeenCalledWith("fictional-quest:treasure:gate-key");
  });

  it("marks flagged rows", () => {
    renderWidget("checklist");
    expect(screen.getByLabelText("Flagged by the compiler")).toBeDefined();
  });
});

describe("dataTable (full)", () => {
  it("renders columns and gives checkboxes only to checkable rows", () => {
    const { onToggle } = renderWidget("dataTable");
    // Table + card layouts both exist in the DOM (CSS hides one per posture),
    // so every checkable row yields exactly two checkboxes.
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(
      screen.getAllByText(/Counter after the second thrust/),
    ).not.toHaveLength(0);
    const checkbox = screen.getAllByRole("checkbox")[0];
    if (!checkbox) throw new Error("no checkbox");
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(
      "fictional-quest:bestiary:gilded-slime",
    );
  });
});

describe("counter (full)", () => {
  it("shows value/target and fires adjust and reset", () => {
    const { onAdjustCounter, onResetCounter } = renderWidget("counter", {
      doneIds: new Set(),
      counterValues: { "fictional-quest:counters:blue-coins": 7 },
    });
    expect(screen.getByText("7 / 40")).toBeDefined();
    expect(screen.getByText("0 / 10")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Increment Blue coins"));
    expect(onAdjustCounter).toHaveBeenCalledWith(
      "fictional-quest:counters:blue-coins",
      1,
    );
    fireEvent.click(screen.getByLabelText("Decrement Blue coins"));
    expect(onAdjustCounter).toHaveBeenCalledWith(
      "fictional-quest:counters:blue-coins",
      -1,
    );
    fireEvent.click(screen.getByLabelText("Reset Glow beans"));
    expect(onResetCounter).toHaveBeenCalledWith(
      "fictional-quest:counters:beans",
    );
  });

  it("shows the done treatment at target", () => {
    renderWidget("counter", {
      doneIds: new Set(),
      counterValues: { "fictional-quest:counters:blue-coins": 40 },
    });
    expect(screen.getByText(/40 \/ 40 ✓/)).toBeDefined();
  });
});

describe("matrix (full grid)", () => {
  it("renders a grid with row and column headers and toggles by cell ID", () => {
    const { onToggle } = renderWidget("matrix");
    // Dense 2×2 fixture → one checkbox per cell.
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(
      screen.getByRole("columnheader", { name: "Fire badge" }),
    ).toBeDefined();
    expect(
      screen.getByRole("columnheader", { name: "Tide badge" }),
    ).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "Mira" })).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "Theo" })).toBeDefined();
    fireEvent.click(screen.getByLabelText("Mira × Fire badge"));
    expect(onToggle).toHaveBeenCalledWith("fictional-quest:badges:mira-fire");
  });

  it("reflects done cells from progress", () => {
    renderWidget("matrix", {
      doneIds: new Set(["fictional-quest:badges:mira-fire"]),
      counterValues: {},
    });
    expect(
      (screen.getByLabelText("Mira × Fire badge") as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Theo × Tide badge") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("renders sparse holes as empty cells and marks flagged cells", () => {
    const onToggle = vi.fn();
    // Inline so the shared fixture stays dense and stable: row B × col Y has
    // no cell (a hole), and row A × col X is compiler-flagged.
    const sparse = matrixWidget.parse({
      id: "fictional-quest:sparse",
      type: "matrix",
      title: "Sparse",
      scope: { kind: "global" },
      deckPosition: 9,
      rows: [
        { id: "row-a", label: "Row A" },
        { id: "row-b", label: "Row B" },
      ],
      columns: [
        { id: "col-x", label: "Col X" },
        { id: "col-y", label: "Col Y" },
      ],
      cells: [
        {
          itemId: "fictional-quest:sparse:a-x",
          rowId: "row-a",
          columnId: "col-x",
          sourceRefs: ["src-wiki"],
          confidence: "flagged",
        },
        {
          itemId: "fictional-quest:sparse:b-x",
          rowId: "row-b",
          columnId: "col-x",
          sourceRefs: ["src-wiki"],
          confidence: "normal",
        },
        {
          itemId: "fictional-quest:sparse:a-y",
          rowId: "row-a",
          columnId: "col-y",
          sourceRefs: ["src-wiki"],
          confidence: "normal",
        },
      ],
    });
    render(
      <WidgetRenderer
        widget={sparse}
        progress={noProgress}
        onToggle={onToggle}
        onAdjustCounter={vi.fn()}
        onResetCounter={vi.fn()}
        resolveAsset={(path) => path}
      />,
    );
    // 3 cells present, 1 hole (Row B × Col Y) → 3 checkboxes.
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.queryByLabelText("Row B × Col Y")).toBeNull();
    expect(screen.getByLabelText("Flagged by the compiler")).toBeDefined();
  });
});

describe("mapPins (degraded list, §9.3)", () => {
  it("shows the map image and lists every pin", () => {
    const { onToggle } = renderWidget("mapPins");
    const image = screen.getByAltText("Map of the Sunken Vault");
    expect(image.getAttribute("src")).toBe(
      "guides/fictional-quest/images/vault-map.png",
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    fireEvent.click(screen.getByLabelText("Shard — east alcove"));
    expect(onToggle).toHaveBeenCalledWith(
      "fictional-quest:vault-map:shard-east",
    );
  });
});

describe("flowchart (degraded list, §9.3)", () => {
  it("lists nodes in order with notes and toggles by node ID", () => {
    const { onToggle } = renderWidget("flowchart");
    expect(screen.getByText("Pick it up in the courtyard")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Vault key"));
    expect(onToggle).toHaveBeenCalledWith("fictional-quest:trade:vault-key");
  });
});

describe("prepCard (degraded list, §9.3)", () => {
  it("lists items with quantities and toggles by item ID", () => {
    const { onToggle } = renderWidget("prepCard");
    expect(screen.getByText("×5")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Tide badge equipped"));
    expect(onToggle).toHaveBeenCalledWith(
      "fictional-quest:warden-prep:tide-badge",
    );
  });
});
