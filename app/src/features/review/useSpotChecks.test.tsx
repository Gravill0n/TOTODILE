// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { closeReviewDb, putSpotCheck } from "@/features/review/reviewStore";
import { useSpotChecks } from "@/features/review/useSpotChecks";

afterEach(async () => {
  await closeReviewDb();
  await deleteDB("totodile-review");
});

describe("useSpotChecks — load/record race", () => {
  it("a verdict recorded while the initial load is in flight survives it", async () => {
    await putSpotCheck("fictional-quest", "spine", {
      itemId: "fictional-quest:c1:s1",
      verdict: "pass",
    });
    const { result } = renderHook(() => useSpotChecks("fictional-quest"));
    // Record before the store load has resolved — the load must merge under
    // this verdict, not clobber it.
    act(() => {
      result.current.record("widget-w1", {
        itemId: "fictional-quest:w1:r1",
        verdict: "fail",
      });
    });
    await waitFor(() =>
      expect(result.current.byLayer.get("spine")?.size).toBe(1),
    );
    expect(
      result.current.byLayer.get("widget-w1")?.get("fictional-quest:w1:r1")
        ?.verdict,
    ).toBe("fail");
  });
});
