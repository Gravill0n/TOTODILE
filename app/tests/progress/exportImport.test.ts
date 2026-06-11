import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  importSlots,
  readAllSlots,
  writeSlot,
} from "../../src/progress/progressStore";
import { progressExport, SCHEMA_VERSION } from "../../src/schema";
import { validProgressSlot } from "../schema/helpers";

afterEach(async () => {
  await closeProgressDb();
  await deleteDB("totodile");
});

function secondSlot() {
  return {
    ...emptySlot("other-quest"),
    currentStepId: "other-quest:c1:s1",
    lastActivityAt: "2026-06-12T09:00:00Z",
  };
}

describe("export/import round trip (§12.4 scenario 3)", () => {
  it("reimports an export to an identical state", async () => {
    const slotA = validProgressSlot();
    const slotB = secondSlot();
    await writeSlot(slotA);
    await writeSlot(slotB);

    // Export exactly what the Settings screen exports.
    const payload = progressExport.parse({
      kind: "totodile-progress",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      slots: await readAllSlots(),
    });

    // "The other device": wipe everything, then import.
    await closeProgressDb();
    await deleteDB("totodile");
    await importSlots(payload.slots);

    const restored = await readAllSlots();
    expect(restored).toHaveLength(2);
    expect(restored.find((s) => s.guideId === "fictional-quest")).toEqual(
      slotA,
    );
    expect(restored.find((s) => s.guideId === "other-quest")).toEqual(slotB);
  });

  it("import replaces the existing slot for a guide wholesale", async () => {
    await writeSlot({
      ...validProgressSlot(),
      counterValues: { "fictional-quest:counters:blue-coins": 99 },
    });
    await importSlots([validProgressSlot()]);
    const restored = await readAllSlots();
    expect(restored).toHaveLength(1);
    expect(restored[0]?.counterValues).toEqual({
      "fictional-quest:counters:blue-coins": 7,
    });
  });
});
