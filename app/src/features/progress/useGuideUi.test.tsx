// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeGuideUiDb,
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
      guideId: "fictional-quest",
      widgetOrder: ["fictional-quest:bosses", "fictional-quest:coins"],
      pinnedWidgetIds: ["fictional-quest:bosses"],
      mapZoom: 1.8,
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

    act(() => result.current.setMapZoom(2.2));

    expect(result.current.mapZoom).toBe(2.2);
    await waitFor(async () =>
      expect((await readGuideUi("fictional-quest")).mapZoom).toBe(2.2),
    );
  });

  it("clamps the zoom to the range the map panel offers", async () => {
    const { result } = renderHook(() => useGuideUi("fictional-quest"));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.setMapZoom(9));
    expect(result.current.mapZoom).toBe(4);

    act(() => result.current.setMapZoom(0.1));
    expect(result.current.mapZoom).toBe(1);
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
