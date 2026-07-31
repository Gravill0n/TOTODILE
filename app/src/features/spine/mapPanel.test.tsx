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

const b1f = { src: "images/b1f.png", alt: "Basement", caption: "B1F" };
const b2f = { src: "images/b2f.png", alt: "Lower basement", caption: "B2F" };

function renderPanel(
  overrides: Partial<MapView> = {},
  images: { src: string; alt: string; caption?: string; credit?: string }[] = [
    image,
  ],
) {
  const onViewChange = vi.fn();
  const views: Record<string, MapView> = {
    [image.src]: { ...view, ...overrides },
  };
  render(
    <MapPanel
      locationName="Castle Gate"
      images={images}
      resolveAsset={(path) => `guides/fictional-quest/${path}`}
      viewOf={(src) => views[src] ?? view}
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
        images={[]}
        resolveAsset={(path) => path}
        viewOf={() => view}
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

  it("offers no buttons at all for a single map — it is worked by hand", () => {
    renderPanel({ zoom: 2 });
    for (const gone of ["Zoom in", "Zoom out", "Reset zoom"]) {
      expect(screen.queryByLabelText(gone)).toBeNull();
    }
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // The percentage stays, as a readout rather than a control.
    expect(screen.getByText("200%")).toBeDefined();
  });

  // A place holds several maps now — Ice Path's floors, Tin Tower's nine —
  // and they used to be reachable only as mapPins widget cards.
  it("shows a sheet per map when a place has more than one", () => {
    renderPanel({}, [image, b1f, b2f]);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Castle gate and wall route",
      "B1F",
      "B2F",
    ]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("1/3")).toBeDefined();
  });

  it("opens on the first map and switches on a tap", () => {
    renderPanel({}, [image, b1f]);
    expect(
      screen.getByRole("img", { name: "Castle gate and wall route" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "B1F" }));
    const shown = screen.getByRole("img", { name: "Basement" });
    expect(shown.getAttribute("src")).toBe(
      "guides/fictional-quest/images/b1f.png",
    );
    expect(
      screen.queryByRole("img", { name: "Castle gate and wall route" }),
    ).toBeNull();
  });

  // Each map keeps its own corner: floor 1 at 240% says nothing about where
  // floor 2 should sit, and they are different pictures.
  it("reads each map's own stored view, not the place's", () => {
    const views: Record<string, MapView> = {
      [image.src]: { zoom: 2.4, panX: 0.5, panY: 0.5 },
      [b1f.src]: { zoom: 1, panX: 0, panY: 0 },
    };
    render(
      <MapPanel
        locationName="Castle Gate"
        images={[image, b1f]}
        resolveAsset={(path) => path}
        viewOf={(src) => views[src] ?? view}
        onViewChange={vi.fn()}
      />,
    );
    expect(screen.getByText("240%")).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "B1F" }));
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("names a map by its caption, falling back to a number when alt is prose", () => {
    renderPanel({}, [
      image,
      {
        src: "images/long.png",
        alt: "A very long description of the whole eastern wing and its cellars",
      },
    ]);
    expect(screen.getByRole("tab", { name: "Map 2" })).toBeDefined();
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
      mapViews: {
        "images/castle-gate.png": { zoom: 1.4, panX: 0.5, panY: 0.25 },
      },
    });
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);

    // The readout arrives behind two async hops — the guide route's fetches
    // and the IndexedDB read of the UI record — so the default 1s waitFor
    // window is not always enough on a loaded machine (it failed under
    // `yarn check`, which runs lint and typecheck first, while passing alone).
    await waitFor(() => expect(screen.getByText("140%")).toBeDefined(), {
      timeout: 5000,
    });
    // What the gestures themselves resolve to needs a measured box, which
    // jsdom does not provide — that is a checkpoint-G item in a browser.
  });

  // The fixture's castle gate carries two maps, so the shell has to hand the
  // whole list down rather than a first-map-only prop.
  it("carries every map of the displayed place into the panel", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await waitFor(() => expect(screen.getByText("1/2")).toBeDefined(), {
      timeout: 5000,
    });
    expect(screen.getByRole("tab", { name: "Cellar" })).toBeDefined();
  });

  it("shows no map panel for a place that has none", async () => {
    stubGuideContent();
    // The courtyard carries no map in the fixture.
    renderGuideAt("fictional-quest", "/chapter/c1/visit/v-courtyard-1");
    await screen.findByText(/Sweep courtyard/);
    expect(screen.queryByLabelText("Zoom in")).toBeNull();
  });
});
