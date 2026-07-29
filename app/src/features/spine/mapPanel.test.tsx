// @vitest-environment jsdom
import "fake-indexeddb/auto";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "@/features/progress/progressStore";
import { MapPanel, panFraction, panOffset } from "@/features/spine/MapPanel";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";
import type { MapView } from "@/types/mapView";

// The map is the thing a player looks at while walking a dungeon, so where it
// was left matters as much as how far it was zoomed — reopening a visit should
// return to the corner you were reading, not to the top-left of a 400% image.

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

const image = {
  src: "images/castle-gate.png",
  alt: "Castle gate and wall route",
  credit: "Fictional Quest wiki",
};

const view: MapView = { zoom: 1, panX: 0, panY: 0 };

function renderPanel(overrides: Partial<MapView> = {}, hasImage = true) {
  const onViewChange = vi.fn();
  render(
    <MapPanel
      locationName="Castle Gate"
      image={hasImage ? image : undefined}
      resolveAsset={(path) => `guides/fictional-quest/${path}`}
      view={{ ...view, ...overrides }}
      onViewChange={onViewChange}
    />,
  );
  return onViewChange;
}

describe("MapPanel", () => {
  it("renders nothing at all for a place with no map", () => {
    const { container } = render(
      <MapPanel
        locationName="Castle Gate"
        resolveAsset={(path) => path}
        view={view}
        onViewChange={vi.fn()}
      />,
    );
    // Not an empty frame with a heading over it — nothing.
    expect(container.innerHTML).toBe("");
  });

  it("shows the map, its credit, and the zoom it is at", () => {
    renderPanel();
    const map = screen.getByRole("img", { name: "Castle gate and wall route" });
    expect(map.getAttribute("src")).toBe(
      "guides/fictional-quest/images/castle-gate.png",
    );
    // Pixel art scaled up must not be smoothed.
    expect(map.className).toContain("pixelated");
    expect(screen.getByText(/Fictional Quest wiki/)).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("zooms in and out in 20% steps", () => {
    const onViewChange = renderPanel({ zoom: 2 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(onViewChange).toHaveBeenCalledWith({ zoom: 2.2, panX: 0, panY: 0 });

    cleanup();
    const out = renderPanel({ zoom: 2 });
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(out).toHaveBeenCalledWith({ zoom: 1.8, panX: 0, panY: 0 });
  });

  it("stops at 100% and 400%", () => {
    const atFloor = renderPanel({ zoom: 1 });
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(atFloor).toHaveBeenCalledWith({ zoom: 1, panX: 0, panY: 0 });

    cleanup();
    const atCeiling = renderPanel({ zoom: 4 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(atCeiling).toHaveBeenCalledWith({ zoom: 4, panX: 0, panY: 0 });
  });

  it("resets to the whole map at the top-left", () => {
    const onViewChange = renderPanel({ zoom: 3, panX: 0.8, panY: 0.5 });
    fireEvent.click(screen.getByLabelText("Reset zoom"));
    expect(onViewChange).toHaveBeenCalledWith({ zoom: 1, panX: 0, panY: 0 });
  });

  it("scales the image by width, so the box scrolls rather than the page", () => {
    renderPanel({ zoom: 2.5 });
    expect(
      screen.getByRole("img", { name: "Castle gate and wall route" }).style
        .width,
    ).toBe("250%");
  });
});

// The pan is stored as a fraction of the scrollable extent, never as pixels:
// the panel is a ~320px column on desktop and full width on a phone, so the
// same pixel offset would land somewhere else on the other posture.
describe("pan as a fraction of the extent", () => {
  it("converts a scroll position to a fraction and back", () => {
    // 900px of content in a 300px box scrolls 600px.
    expect(panFraction(150, 900, 300)).toBe(0.25);
    expect(panOffset(0.25, 900, 300)).toBe(150);
  });

  it("is 0 when nothing overflows, rather than NaN", () => {
    expect(panFraction(0, 300, 300)).toBe(0);
    expect(panOffset(0.5, 300, 300)).toBe(0);
  });
});

describe("the map remembers where it was left", () => {
  const GATE = "/chapter/c1/visit/v-castle-gate-1";

  it("keeps its zoom across a remount, per guide", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText("100%");

    fireEvent.click(screen.getByLabelText("Zoom in"));
    fireEvent.click(screen.getByLabelText("Zoom in"));
    await screen.findByText("140%");
    cleanup();

    renderGuideAt("fictional-quest", GATE);
    await waitFor(() => expect(screen.getByText("140%")).toBeDefined());
  });

  it("shows no map panel for a place that has none", async () => {
    stubGuideContent();
    // The courtyard carries no mapImage in the fixture.
    renderGuideAt("fictional-quest", "/chapter/c1/visit/v-courtyard-1");
    await screen.findByText(/Sweep courtyard/);
    expect(screen.queryByLabelText("Zoom in")).toBeNull();
  });
});
