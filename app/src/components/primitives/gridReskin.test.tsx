// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "@/primitives/dataTable/DataTable";
import { Matrix } from "@/primitives/matrix/Matrix";
import { dataTableWidget, matrixWidget } from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";

const noProgress: ProgressSlice = { doneIds: new Set(), counterValues: {} };
const LEGACY_ACCENT =
  /\b(?:text|border|bg)-accent(?!-foreground)\b|\baccent-accent\b/;
const source = (p: string) => readFileSync(`src/${p}`, "utf8");

const matrix = matrixWidget.parse({
  id: "g:m",
  type: "matrix",
  title: "M",
  scope: { kind: "global" },
  deckPosition: 1,
  rows: [{ id: "r1", label: "R1" }],
  columns: [{ id: "c1", label: "C1" }],
  cells: [
    {
      itemId: "g:m:r1c1",
      rowId: "r1",
      columnId: "c1",
      sourceRefs: ["s"],
      confidence: "normal",
    },
  ],
});

const table = dataTableWidget.parse({
  id: "g:dt",
  type: "dataTable",
  title: "DT",
  scope: { kind: "global" },
  deckPosition: 2,
  columns: [{ id: "name", label: "Name" }],
  rows: [
    {
      itemId: "g:dt:a",
      checkable: true,
      cells: { name: "Alpha" },
      sourceRefs: ["s"],
      confidence: "normal",
    },
  ],
});

afterEach(cleanup);

describe("Matrix reskin (R4b)", () => {
  it("renders cells as shadcn Checkboxes inside a ScrollArea and toggles", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <Matrix widget={matrix} progress={noProgress} onToggle={onToggle} />,
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
    fireEvent.click(screen.getByLabelText("R1 × C1"));
    expect(onToggle).toHaveBeenCalledWith("g:m:r1c1");
  });

  it("uses primary, not the legacy accent utility", () => {
    expect(source("primitives/matrix/Matrix.tsx")).not.toMatch(LEGACY_ACCENT);
  });
});

describe("DataTable reskin (R4b)", () => {
  it("renders checkable cells as shadcn Checkboxes inside a ScrollArea", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <DataTable widget={table} progress={noProgress} onToggle={onToggle} />,
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).not.toBeNull();
    expect(
      container.querySelectorAll('[data-slot="checkbox"]').length,
    ).toBeGreaterThan(0);
    expect(source("primitives/dataTable/DataTable.tsx")).not.toMatch(
      LEGACY_ACCENT,
    );
  });
});
