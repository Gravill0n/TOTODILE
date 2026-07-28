import "fake-indexeddb/auto";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { validProgressSlot } from "@/testing/helpers";
import { closeGuideUiDb, readGuideUi, writeGuideUi } from "./guideUiStore";
import { closeProgressDb, readSlot, writeSlot } from "./progressStore";

afterEach(async () => {
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("guideUi store", () => {
  it("returns defaults for a guide that has never been arranged", async () => {
    const record = await readGuideUi("fictional-quest");
    expect(record).toEqual({
      guideId: "fictional-quest",
      widgetOrder: [],
      pinnedWidgetIds: [],
      mapZoom: 1,
      mapPanX: 0,
      mapPanY: 0,
    });
  });

  it("remembers where the map was zoomed, not just how far", async () => {
    await writeGuideUi({
      guideId: "fictional-quest",
      widgetOrder: [],
      pinnedWidgetIds: [],
      mapZoom: 3,
      mapPanX: 0.62,
      mapPanY: 0.25,
    });
    await closeGuideUiDb();

    const record = await readGuideUi("fictional-quest");
    expect([record.mapZoom, record.mapPanX, record.mapPanY]).toEqual([
      3, 0.62, 0.25,
    ]);
  });

  // A record written before the pan existed must still read — the store's
  // spread-over-defaults is the only forward migration these records get.
  it("defaults the pan for a record written before it existed", async () => {
    await writeGuideUi({
      guideId: "fictional-quest",
      widgetOrder: [],
      pinnedWidgetIds: [],
      mapZoom: 2,
    } as never);

    const record = await readGuideUi("fictional-quest");
    expect([record.mapZoom, record.mapPanX, record.mapPanY]).toEqual([2, 0, 0]);
  });

  it("round-trips an arrangement across connections", async () => {
    await writeGuideUi({
      guideId: "fictional-quest",
      widgetOrder: ["fictional-quest:coins", "fictional-quest:bosses"],
      pinnedWidgetIds: ["fictional-quest:bosses"],
      mapZoom: 2.4,
      mapPanX: 0.5,
      mapPanY: 0.33,
    });
    await closeGuideUiDb();

    const record = await readGuideUi("fictional-quest");
    expect(record.widgetOrder).toEqual([
      "fictional-quest:coins",
      "fictional-quest:bosses",
    ]);
    expect(record.pinnedWidgetIds).toEqual(["fictional-quest:bosses"]);
    expect(record.mapZoom).toBe(2.4);
  });

  it("keeps one record per guide", async () => {
    await writeGuideUi({
      guideId: "fictional-quest",
      widgetOrder: ["fictional-quest:coins"],
      pinnedWidgetIds: [],
      mapZoom: 1,
      mapPanX: 0,
      mapPanY: 0,
    });
    const other = await readGuideUi("other-quest");
    expect(other.widgetOrder).toEqual([]);
  });

  // The load-bearing one: Pierre's real progress lives in a v1 database. The
  // v2 upgrade only ADDS the guideUi store — every existing slot must survive.
  it("upgrades a v1 database without touching the progress it holds", async () => {
    const v1 = await openDB("totodile", 1, {
      upgrade: (database) => {
        database.createObjectStore("progress", { keyPath: "guideId" });
      },
    });
    await v1.put("progress", validProgressSlot());
    v1.close();

    const slot = await readSlot("fictional-quest");
    expect(slot.currentStepId).toBe("fictional-quest:c1:s2");
    expect(slot.stats.stepsDone).toBe(1);
    expect(slot.itemStates["fictional-quest:c1:s1"]?.state).toBe("done");

    // and the new store is there, empty, on the same connection
    expect((await readGuideUi("fictional-quest")).mapZoom).toBe(1);
  });

  it("still writes progress after the upgrade", async () => {
    const v1 = await openDB("totodile", 1, {
      upgrade: (database) => {
        database.createObjectStore("progress", { keyPath: "guideId" });
      },
    });
    v1.close();

    await writeSlot(validProgressSlot());
    await writeGuideUi({
      guideId: "fictional-quest",
      widgetOrder: [],
      pinnedWidgetIds: [],
      mapZoom: 3,
      mapPanX: 0,
      mapPanY: 0,
    });
    await closeProgressDb();

    expect((await readSlot("fictional-quest")).stats.stepsTotal).toBe(10);
    expect((await readGuideUi("fictional-quest")).mapZoom).toBe(3);
  });
});
