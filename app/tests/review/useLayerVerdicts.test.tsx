// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeReviewDb,
  putLayerVerdict,
  readGuideVerdicts,
} from "../../src/review/reviewStore";
import { useLayerVerdicts } from "../../src/review/useLayerVerdicts";

afterEach(async () => {
  await closeReviewDb();
  await deleteDB("totodile-review");
});

// A pre-seeded verdict marks when the hook's initial store load has landed —
// recording before that would be clobbered by the load's setState.
async function mountLoaded() {
  await putLayerVerdict("fictional-quest", "seed", {
    status: "approved",
    date: "2026-07-06T00:00:00Z",
  });
  const rendered = renderHook(() => useLayerVerdicts("fictional-quest"));
  await waitFor(() =>
    expect(rendered.result.current.byLayer.has("seed")).toBe(true),
  );
  return rendered;
}

describe("useLayerVerdicts — group verdicts (T5b)", () => {
  it("recordAll gives every member one identical verdict (same date, same note)", async () => {
    const { result } = await mountLoaded();

    act(() => {
      result.current.recordAll(
        ["widget-enc-gate", "widget-enc-yard"],
        "rejected",
        "gate table lists the wrong levels",
      );
    });

    const gate = result.current.byLayer.get("widget-enc-gate");
    expect(gate?.status).toBe("rejected");
    expect(gate?.note).toBe("gate table lists the wrong levels");
    expect(result.current.byLayer.get("widget-enc-yard")).toEqual(gate);

    // Written through to the review store, one record per member.
    await waitFor(async () => {
      const stored = await readGuideVerdicts("fictional-quest");
      expect(stored.get("widget-enc-gate")).toEqual(gate);
      expect(stored.get("widget-enc-yard")).toEqual(gate);
    });
  });

  it("clearAll removes every member's draft verdict, in memory and in the store", async () => {
    const { result } = await mountLoaded();

    act(() => {
      result.current.recordAll(
        ["widget-enc-gate", "widget-enc-yard"],
        "approved",
      );
    });
    act(() => {
      result.current.clearAll(["widget-enc-gate", "widget-enc-yard"]);
    });

    expect(result.current.byLayer.has("widget-enc-gate")).toBe(false);
    expect(result.current.byLayer.has("widget-enc-yard")).toBe(false);
    await waitFor(async () => {
      const stored = await readGuideVerdicts("fictional-quest");
      expect(stored.has("widget-enc-gate")).toBe(false);
      expect(stored.has("widget-enc-yard")).toBe(false);
      // Untouched layers survive a group clear.
      expect(stored.has("seed")).toBe(true);
    });
  });
});
