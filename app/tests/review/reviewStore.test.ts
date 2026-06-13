// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeReviewDb,
  putSpotCheck,
  readGuideSpotChecks,
} from "../../src/review/reviewStore";

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
