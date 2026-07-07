// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlagMark } from "@/primitives/FlagMark";
import { Flowchart } from "@/primitives/flowchart/Flowchart";
import { MapPins } from "@/primitives/mapPins/MapPins";
import type { ProgressSlice } from "@/progress/progressSlice";
import { flowchartWidget, mapPinsWidget, type Widget } from "@/schema";
import { WidgetDeck } from "@/shell/WidgetDeck";

const noProgress: ProgressSlice = { doneIds: new Set(), counterValues: {} };
const LEGACY_ACCENT =
  /\b(?:text|border|bg)-accent(?!-foreground)\b|\baccent-accent\b/;
const source = (p: string) => readFileSync(`src/${p}`, "utf8");

const mapPins = mapPinsWidget.parse({
  id: "g:mp",
  type: "mapPins",
  title: "Map",
  scope: { kind: "global" },
  deckPosition: 1,
  image: { src: "images/m.png", alt: "Map" },
  pins: [
    {
      itemId: "g:mp:p1",
      label: "Pin one",
      x: 0.5,
      y: 0.5,
      sourceRefs: ["s"],
      confidence: "normal",
    },
  ],
});

const flowchart = flowchartWidget.parse({
  id: "g:fc",
  type: "flowchart",
  title: "Chain",
  scope: { kind: "global" },
  deckPosition: 2,
  nodes: [
    {
      itemId: "g:fc:n1",
      label: "Node one",
      sourceRefs: ["s"],
      confidence: "normal",
    },
  ],
  edges: [],
});

afterEach(cleanup);

describe("FlagMark reskin (R4c)", () => {
  it("is a lucide icon but keeps its accessible label", () => {
    const { container } = render(<FlagMark />);
    expect(screen.getByLabelText("Flagged by the compiler")).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("MapPins reskin (R4c)", () => {
  it("uses primary, not the legacy accent utility", () => {
    render(
      <MapPins
        widget={mapPins}
        progress={noProgress}
        onToggle={vi.fn()}
        resolveAsset={(p) => p}
      />,
    );
    expect(source("primitives/mapPins/MapPins.tsx")).not.toMatch(LEGACY_ACCENT);
  });
});

describe("Flowchart reskin (R4c)", () => {
  it("uses a shadcn Checkbox and toggles by node id", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <Flowchart
        widget={flowchart}
        progress={noProgress}
        onToggle={onToggle}
      />,
    );
    expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
    fireEvent.click(screen.getByLabelText("Node one"));
    expect(onToggle).toHaveBeenCalledWith("g:fc:n1");
  });
});

describe("WidgetDeck reskin (R4c)", () => {
  it("renders each widget in a shadcn Card", () => {
    const { container } = render(
      <WidgetDeck
        widgets={[flowchart as Widget]}
        progress={noProgress}
        onToggle={vi.fn()}
        onAdjustCounter={vi.fn()}
        onResetCounter={vi.fn()}
        resolveAsset={(p) => p}
      />,
    );
    expect(container.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(screen.getByText("Chain")).toBeTruthy();
  });
});
