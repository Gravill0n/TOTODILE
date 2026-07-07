// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLayerVerdict,
  closeReviewDb,
  putLayerVerdict,
  putSpotCheck,
  readGuideSpotChecks,
  readGuideVerdicts,
} from "@/features/review/reviewStore";

afterEach(async () => {
  await closeReviewDb();
  await deleteDB("totodile-review");
});

describe("review store (FR-E3)", () => {
  it("persists verdicts across connections, grouped by layer", async () => {
    await putSpotCheck("g", "spine", {
      itemId: "g:c1:s1",
      verdict: "pass",
    });
    await putSpotCheck("g", "spine", {
      itemId: "g:c1:s2",
      verdict: "fail",
      note: "wrong location",
    });
    await closeReviewDb();

    const spine = (await readGuideSpotChecks("g")).get("spine");
    expect(spine?.get("g:c1:s1")?.verdict).toBe("pass");
    expect(spine?.get("g:c1:s2")?.verdict).toBe("fail");
    expect(spine?.get("g:c1:s2")?.note).toBe("wrong location");
  });

  it("upserts a verdict for the same item", async () => {
    await putSpotCheck("g", "spine", { itemId: "g:c1:s1", verdict: "pass" });
    await putSpotCheck("g", "spine", { itemId: "g:c1:s1", verdict: "fail" });
    const spine = (await readGuideSpotChecks("g")).get("spine");
    expect(spine?.size).toBe(1);
    expect(spine?.get("g:c1:s1")?.verdict).toBe("fail");
  });

  it("scopes reads to the requested guide", async () => {
    await putSpotCheck("g", "spine", { itemId: "g:c1:s1", verdict: "pass" });
    await putSpotCheck("other", "spine", {
      itemId: "other:c1:s1",
      verdict: "pass",
    });
    const spine = (await readGuideSpotChecks("g")).get("spine");
    expect([...(spine?.keys() ?? [])]).toEqual(["g:c1:s1"]);
  });
});

describe("layer verdicts (FR-E4)", () => {
  it("persists a verdict across connections, then upserts and clears it", async () => {
    await putLayerVerdict("g", "spine", {
      status: "rejected",
      note: "step 2 contradicts the source",
      date: "2026-06-13T10:00:00Z",
    });
    await closeReviewDb();
    expect((await readGuideVerdicts("g")).get("spine")?.status).toBe(
      "rejected",
    );

    await putLayerVerdict("g", "spine", {
      status: "approved",
      date: "2026-06-13T11:00:00Z",
    });
    const approved = (await readGuideVerdicts("g")).get("spine");
    expect(approved?.status).toBe("approved");
    expect(approved?.note).toBeUndefined();

    await clearLayerVerdict("g", "spine");
    expect((await readGuideVerdicts("g")).get("spine")).toBeUndefined();
  });

  it("still serves Task 3 spot-checks after the v2 upgrade", async () => {
    await putSpotCheck("g", "spine", { itemId: "g:c1:s1", verdict: "pass" });
    await putLayerVerdict("g", "spine", {
      status: "approved",
      date: "2026-06-13T11:00:00Z",
    });
    expect((await readGuideSpotChecks("g")).get("spine")?.size).toBe(1);
    expect((await readGuideVerdicts("g")).get("spine")?.status).toBe(
      "approved",
    );
  });
});
