// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readGuideUi, writeGuideUi } from "@/features/progress/guideUiStore";
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

  it("offers no buttons at all — the map is worked by hand", () => {
    renderPanel({ zoom: 2 });
    for (const gone of ["Zoom in", "Zoom out", "Reset zoom"]) {
      expect(screen.queryByLabelText(gone)).toBeNull();
    }
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // The percentage stays, as a readout rather than a control.
    expect(screen.getByText("200%")).toBeDefined();
  });

  it("hands the map to the wheel and the pointer, within 100–400%", () => {
    renderPanel({ zoom: 2 });
    // react-zoom-pan-pinch owns the gestures; what this pins is that the map
    // is inside it and bounded, rather than a plain scrolling box.
    expect(document.querySelector(".react-transform-wrapper")).not.toBeNull();
    const map = screen.getByRole("img", { name: "Castle gate and wall route" });
    expect(map.closest(".react-transform-component")).not.toBeNull();
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

  it("reads its zoom back from the guide's record", async () => {
    // Written the way a gesture would leave it.
    await writeGuideUi({
      ...(await readGuideUi("fictional-quest")),
      mapZoom: 1.4,
      mapPanX: 0.5,
      mapPanY: 0.25,
    });
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);

    await waitFor(() => expect(screen.getByText("140%")).toBeDefined());
    // What the gestures themselves resolve to needs a measured box, which
    // jsdom does not provide — that is a checkpoint-G item in a browser.
  });

  it("shows no map panel for a place that has none", async () => {
    stubGuideContent();
    // The courtyard carries no mapImage in the fixture.
    renderGuideAt("fictional-quest", "/chapter/c1/visit/v-courtyard-1");
    await screen.findByText(/Sweep courtyard/);
    expect(screen.queryByLabelText("Zoom in")).toBeNull();
  });
});
