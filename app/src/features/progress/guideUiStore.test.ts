import "fake-indexeddb/auto";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { validProgressSlot } from "@/testing/helpers";
import {
  closeGuideUiDb,
  emptyGuideUi,
  readGuideUi,
  writeGuideUi,
} from "./guideUiStore";
import { closeProgressDb, readSlot, writeSlot } from "./progressStore";

afterEach(async () => {
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("guideUi store", () => {
  it("returns defaults for a guide that has never been arranged", async () => {
    const record = await readGuideUi("fictional-quest");
    expect(record).toEqual(emptyGuideUi("fictional-quest"));
  });

  it("remembers where each map was zoomed, not just how far", async () => {
    await writeGuideUi({
      ...emptyGuideUi("fictional-quest"),
      mapViews: {
        "images/ice-1f.png": { zoom: 3, panX: 0.62, panY: 0.25 },
        "images/ice-b1f.png": { zoom: 1.5, panX: 0, panY: 0.5 },
      },
    });
    await closeGuideUiDb();

    // Per map, because a place holds several now and they are different
    // pictures: 300% on floor 1 says nothing about where floor 2 should sit.
    const record = await readGuideUi("fictional-quest");
    expect(record.mapViews["images/ice-1f.png"]).toEqual({
      zoom: 3,
      panX: 0.62,
      panY: 0.25,
    });
    expect(record.mapViews["images/ice-b1f.png"]?.zoom).toBe(1.5);
  });

  // A record written before the pan existed must still read — the store's
  // spread-over-defaults is the only forward migration these records get.
  it("defaults the per-map views for a record written before they existed", async () => {
    // What a v2 record looks like: one zoom for the whole guide. The reader
    // loses that single position — an ephemeral UI detail, and there is no
    // honest way to guess which of a place's maps it belonged to.
    await writeGuideUi({
      guideId: "fictional-quest",
      widgetOrder: [],
      pinnedWidgetIds: [],
      mapZoom: 2,
      mapPanX: 0.4,
      mapPanY: 0.1,
    } as never);

    const record = await readGuideUi("fictional-quest");
    expect(record.mapViews).toEqual({});
  });

  // Same trick again for the rail sizes (task 5.5.2), and the reason the store
  // needed no version bump to gain them: an arrangement written before they
  // existed reads back with the defaults, and the database stays at v2.
  it("defaults the rail sizes for an older record, at the same DB version", async () => {
    await writeGuideUi({
      ...emptyGuideUi("fictional-quest"),
      widgetOrder: ["fictional-quest:coins"],
      pinnedWidgetIds: [],
      mapZoom: 1,
      mapPanX: 0,
      mapPanY: 0,
    } as never);
    await closeGuideUiDb();

    const record = await readGuideUi("fictional-quest");
    expect(record.leftRailPct).toBe(18);
    expect(record.rightRailPct).toBe(25);
    expect(record.mapPanePct).toBe(45);
    // The arrangement it *did* carry is untouched.
    expect(record.widgetOrder).toEqual(["fictional-quest:coins"]);
    await closeGuideUiDb();

    const opened = await openDB("totodile", 2);
    expect(opened.version).toBe(2);
    opened.close();
  });

  it("round-trips an arrangement across connections", async () => {
    await writeGuideUi({
      ...emptyGuideUi("fictional-quest"),
      widgetOrder: ["fictional-quest:coins", "fictional-quest:bosses"],
      pinnedWidgetIds: ["fictional-quest:bosses"],
      mapViews: { "images/gate.png": { zoom: 2.4, panX: 0.5, panY: 0.33 } },
    });
    await closeGuideUiDb();

    const record = await readGuideUi("fictional-quest");
    expect(record.widgetOrder).toEqual([
      "fictional-quest:coins",
      "fictional-quest:bosses",
    ]);
    expect(record.pinnedWidgetIds).toEqual(["fictional-quest:bosses"]);
    expect(record.mapViews["images/gate.png"]?.zoom).toBe(2.4);
  });

  it("keeps one record per guide", async () => {
    await writeGuideUi({
      ...emptyGuideUi("fictional-quest"),
      widgetOrder: ["fictional-quest:coins"],
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
    expect((await readGuideUi("fictional-quest")).mapViews).toEqual({});
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
      ...emptyGuideUi("fictional-quest"),
      widgetOrder: [],
      pinnedWidgetIds: [],
      mapViews: { "images/gate.png": { zoom: 3, panX: 0, panY: 0 } },
    });
    await closeProgressDb();

    expect((await readSlot("fictional-quest")).stats.stepsTotal).toBe(10);
    expect(
      (await readGuideUi("fictional-quest")).mapViews["images/gate.png"]?.zoom,
    ).toBe(3);
  });
});
