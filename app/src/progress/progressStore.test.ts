import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  readSlot,
  writeSlot,
} from "../../src/progress/progressStore";

afterEach(async () => {
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("progressStore", () => {
  it("returns an empty slot for a guide never opened", async () => {
    const slot = await readSlot("fresh-guide");
    expect(slot.guideId).toBe("fresh-guide");
    expect(slot.currentStepId).toBeNull();
    expect(slot.itemStates).toEqual({});
  });

  it("persists a slot across connections", async () => {
    const slot = {
      ...emptySlot("some-guide"),
      currentStepId: "some-guide:c1:s3",
      itemStates: {
        "some-guide:c1:s1": {
          state: "done" as const,
          at: "2026-06-12T08:00:00Z",
        },
      },
    };
    await writeSlot(slot);
    await closeProgressDb();
    expect(await readSlot("some-guide")).toEqual(slot);
  });

  it("keeps exactly one independent slot per guide (FR-B7)", async () => {
    await writeSlot({
      ...emptySlot("guide-a"),
      currentStepId: "guide-a:c1:s1",
    });
    await writeSlot({
      ...emptySlot("guide-b"),
      currentStepId: "guide-b:c2:s9",
    });
    await writeSlot({
      ...emptySlot("guide-a"),
      currentStepId: "guide-a:c1:s2",
    });
    expect((await readSlot("guide-a")).currentStepId).toBe("guide-a:c1:s2");
    expect((await readSlot("guide-b")).currentStepId).toBe("guide-b:c2:s9");
  });
});
