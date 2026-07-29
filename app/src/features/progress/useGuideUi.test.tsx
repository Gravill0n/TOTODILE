// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeGuideUiDb,
  emptyGuideUi,
  readGuideUi,
  writeGuideUi,
} from "@/features/progress/guideUiStore";
import { useGuideUi } from "@/features/progress/useGuideUi";

afterEach(async () => {
  await closeGuideUiDb();
  await deleteDB("totodile");
});

describe("useGuideUi", () => {
  it("renders defaults before the store has answered", () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    expect(result.current.mapZoom).toBe(1);
    expect(result.current.widgetOrder).toEqual([]);
    expect(result.current.pinnedWidgetIds).toEqual([]);
  });

  it("hydrates a stored arrangement", async () => {
    await writeGuideUi({
      ...emptyGuideUi("fictional-quest"),
      widgetOrder: ["fictional-quest:bosses", "fictional-quest:coins"],
      pinnedWidgetIds: ["fictional-quest:bosses"],
      mapZoom: 1.8,
      mapPanX: 0.2,
      mapPanY: 0.4,
    });

    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.mapZoom).toBe(1.8));
    expect(result.current.widgetOrder).toEqual([
      "fictional-quest:bosses",
      "fictional-quest:coins",
    ]);
  });

  it("writes the zoom through immediately", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setMapView({ zoom: 2.2, panX: 0, panY: 0 }));

    expect(result.current.mapZoom).toBe(2.2);
    await waitFor(async () =>
      expect((await readGuideUi("fictional-quest")).mapZoom).toBe(2.2),
    );
  });

  it("writes the pan through with the zoom", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setMapView({ zoom: 3, panX: 0.4, panY: 0.75 }));

    expect(result.current.mapPanX).toBe(0.4);
    expect(result.current.mapPanY).toBe(0.75);
    await waitFor(async () => {
      const stored = await readGuideUi("fictional-quest");
      expect([stored.mapZoom, stored.mapPanX, stored.mapPanY]).toEqual([
        3, 0.4, 0.75,
      ]);
    });
  });

  it("clamps the pan to the scrollable extent", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setMapView({ zoom: 2, panX: 1.4, panY: -0.2 }));
    expect(result.current.mapPanX).toBe(1);
    expect(result.current.mapPanY).toBe(0);
  });

  it("clamps the zoom to the range the map panel offers", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setMapView({ zoom: 9, panX: 0, panY: 0 }));
    expect(result.current.mapZoom).toBe(4);

    act(() => result.current.setMapView({ zoom: 0.1, panX: 0, panY: 0 }));
    expect(result.current.mapZoom).toBe(1);
  });

  // The two groups report separately — the columns when a rail moves, the
  // nested one when the map/widget split moves — so a partial write must not
  // reset whatever the other group last said.
  it("writes one division without disturbing the others", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setRailLayout({ leftRailPct: 30 }));
    await waitFor(async () => {
      expect((await readGuideUi("fictional-quest")).leftRailPct).toBe(30);
    });

    act(() => result.current.setRailLayout({ mapPanePct: 70 }));
    const stored = await readGuideUi("fictional-quest");
    expect(stored.mapPanePct).toBe(70);
    expect(stored.leftRailPct).toBe(30);
  });

  it("clamps a division to something a reader can still use", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    // A rail dragged to nothing would be unusable and, once stored,
    // unrecoverable without clearing site data.
    act(() =>
      result.current.setRailLayout({ leftRailPct: 0, rightRailPct: 99 }),
    );
    await waitFor(() => expect(result.current.leftRailPct).toBe(8));
    expect(result.current.rightRailPct).toBe(45);
  });

  it("toggles a pin on and back off", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.togglePinned("fictional-quest:bosses"));
    expect(result.current.pinnedWidgetIds).toEqual(["fictional-quest:bosses"]);

    act(() => result.current.togglePinned("fictional-quest:bosses"));
    expect(result.current.pinnedWidgetIds).toEqual([]);
    await waitFor(async () =>
      expect((await readGuideUi("fictional-quest")).pinnedWidgetIds).toEqual(
        [],
      ),
    );
  });

  it("records a reordering", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() =>
      result.current.setWidgetOrder([
        "fictional-quest:coins",
        "fictional-quest:bosses",
      ]),
    );

    await waitFor(async () =>
      expect((await readGuideUi("fictional-quest")).widgetOrder).toEqual([
        "fictional-quest:coins",
        "fictional-quest:bosses",
      ]),
    );
  });
});
